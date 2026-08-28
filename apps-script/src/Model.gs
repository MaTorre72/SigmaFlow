function getMetrics() {
  var config = readConfig_();
  // loadJobsWithVisitSummary_ (Kanban.gs): dopo L5 parte 2/2, done_ts non
  // e' piu' un campo di jobs — serve ricalcolato per pointsStatistics_/
  // monthBuckets_, che restano esplicitamente su jobs (L4).
  var jobs = loadJobsWithVisitSummary_();
  var visite = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE));
  // N6 (DESIGN_archiviazione.md, §8/§9): le metriche storiche su una
  // finestra temporale devono includere anche l'Archivio (un caso chiuso
  // 25 giorni fa con finestra di osservazione 30 giorni puo' gia' essere
  // stato archiviato) — MAI il Cestino, che non e' letto qui ne' altrove.
  var archivedJobs = loadArchivedJobsWithVisitSummary_();
  var visiteArchivio = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));
  return ok_(calculateMetrics_(jobs, visite, config, new Date(), archivedJobs, visiteArchivio));
}

// Fase L4 (DESIGN_modello_caso_visita.md, sez. 10-11): le metriche di
// governo e di dettaglio leggono da 'visite' (la vera unita' che "fa
// coda", non il caso) invece che dai campi derivati su 'jobs'. 'jobs'
// resta necessario solo per unire anagrafica non presente su 'visite'
// (size_class) e per le metriche di stato-corrente (workload, punti),
// esplicitamente NON toccate da questa sotto-fase.
//
// Nota operativa (decisione esplicita di Marco): 'visite' e' popolata
// solo per i job toccati da uno spostamento dopo il deploy della Fase
// L2 (piu' il bootstrap minimo di ensureOpenVisit_) — la materializzazione
// storica completa e' L5, non ancora eseguita. Fino ad allora il
// cruscotto su TEST mostrera' campioni parziali per lo storico non
// ancora migrato: comportamento accettato consapevolmente, non un bug.
// archivedJobs/visiteArchivio (N6): opzionali, di default assenti — le
// chiamate esistenti (test compresi) restano valide cosi' come sono.
// Solo systemState (sotto, l'unica parte letta dal frontend — vedi
// buildSystemState_) li usa: i campi legacy top-level di questa funzione
// (MM1/MG1/lambda/distributions/...) non sono mai renderizzati in UI
// (verificato via grep su client.html), quindi restano volutamente
// invariati — estenderli all'archivio sarebbe scope non necessario.
function calculateMetrics_(jobs, visite, config, now, archivedJobs, visiteArchivio) {
  var windowDays = Number(config.observation_window_days || 30);
  var since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  var jobsById = indexBy_(jobs, 'job_id');

  // Fix del 2026-08-20 (segnalato da Marco: "Quadro avanzato" mostrava
  // E[S]=0,32 giorni mentre "Tempi e variabilita'" (systemState, stessa
  // finestra, stessi dati) mostrava 46,92 giorni per lo stesso concetto).
  // Causa: 'completed' filtrava sulle sole visite APERTE nella finestra
  // (observed, su apertura_ts) che avessero anche consegna_ts - le
  // visite lunghe aperte PRIMA della finestra ma consegnate dentro
  // restavano sistematicamente escluse, distorcendo E[S] verso il
  // basso (bias di sopravvivenza). buildSystemState_ non ha questo
  // problema: filtra 'completed' sulla consegna (consegna_ts >= since),
  // indipendentemente da quando la visita si e' aperta - allineato qui
  // alla stessa definizione, incluso l'archivio (N6) per la stessa
  // ragione di coerenza gia' applicata li'.
  var allVisite = visite.concat(visiteArchivio || []);
  var observed = allVisite.filter(function(visit) {
    return visit.apertura_ts && new Date(visit.apertura_ts) >= since;
  });
  var completed = allVisite.filter(function(visit) {
    return visit.consegna_ts && new Date(visit.consegna_ts) >= since && visitServiceTimeDays_(visit) > 0;
  });

  var serviceTimes = completed.map(visitServiceTimeDays_);

  var lambda = observed.length / windowDays;
  var stats = sampleStats_(serviceTimes);
  var teamSize = Number(config.team_size || 1);
  var mu = stats.mean > 0 ? 1 / stats.mean : 0;
  var rho = mu > 0 ? lambda / (teamSize * mu) : 0;

  var mm1 = queueMM1_(lambda, mu, rho, stats.mean);
  var mg1 = queueMG1_(lambda, rho, stats.mean, stats.secondMoment);
  var rework = reworkMetrics_(completed, lambda, teamSize, mu, stats.secondMoment);
  var stability = stabilityMetrics_(rho, rework.rho_effective, stats.cs2);
  // M9 (DESIGN_dashboard.md, §4.2): E[S0]/E[S1] (dispensa FSC, Cap. 6) -
  // tempo medio di servizio separato per prima visita (numero_visita=1)
  // e visite di rework (numero_visita>1), sullo stesso campione
  // 'completed' gia' usato per E_S/E_S2/Cs2 sopra. A differenza degli
  // altri campi di questo risultato, non era mai stato calcolato prima
  // (la ricognizione M3 lo aveva erroneamente classificato come "gia'
  // calcolato" insieme a E_K - corretto qui, non solo esposto).
  var firstPassServiceTimes = completed.filter(function(visit) { return Number(visit.numero_visita || 1) === 1; }).map(visitServiceTimeDays_);
  var reworkServiceTimes = completed.filter(function(visit) { return Number(visit.numero_visita || 1) > 1; }).map(visitServiceTimeDays_);
  var statsS0 = sampleStats_(firstPassServiceTimes);
  var statsS1 = sampleStats_(reworkServiceTimes);

  var result = {
    window_days: windowDays,
    n_jobs_observed: observed.length,
    lambda: round_(lambda),
    mu: round_(mu),
    rho: round_(rho),
    E_S: round_(stats.mean),
    E_S2: round_(stats.secondMoment),
    Var_S: round_(stats.variance),
    Cs2: round_(stats.cs2),
    E_S0: firstPassServiceTimes.length ? round_(statsS0.mean) : null,
    E_S1: reworkServiceTimes.length ? round_(statsS1.mean) : null,
    MM1: mm1,
    MG1: mg1,
    rework: rework,
    stability: stability,
    distributions: {
      size_counts: countBy_(observed.map(function(visit) {
        return { size_class: (jobsById[visit.job_id] || {}).size_class };
      }), 'size_class'),
      lead_time_by_size: leadTimeBySize_(completed, jobsById)
    }
  };
  result.systemState = buildSystemState_(jobs, visite, config, now, archivedJobs, visiteArchivio);
  return result;
}

// N6: archivedJobs/visiteArchivio opzionali (default []) — le chiamate
// dirette gia' esistenti nei test (senza questi due parametri) restano
// valide, leggono solo jobs/visite attivi come prima. Le metriche su una
// finestra temporale (§8: Flusso/Rientri/Tempi/Capacita'/"Andamento del
// carico"/quadro di dettaglio) uniscono l'archivio senza filtri — un caso
// chiuso e archiviato dentro la finestra osservata non deve sparire dal
// conteggio solo perche' e' stato spostato fisicamente di foglio.
// "Lavoro presente" (currentWorkload_) e "punti aperti"/"per taglia"/"per
// assegnatario" (openJobs dentro pointsStatistics_) restano SOLO su jobs
// attivi, mai sull'archivio, per definizione (§8: nessuno dei due e'
// "presente"). Il Cestino non entra mai in questa funzione.
function buildSystemState_(jobs, visite, config, now, archivedJobs, visiteArchivio) {
  archivedJobs = archivedJobs || [];
  var allVisite = visite.concat(visiteArchivio || []);
  var windowDays = Math.max(1, Number(config.observation_window_days || 30));
  var teamSize = Math.max(1, Number(config.team_size || 1));
  var since = new Date(now.getTime() - windowDays * 864e5);
  var columns = columnsFromConfig_(config);
  var columnMap = {};
  columns.forEach(function(column) {
    columnMap[column.id] = column;
  });

  var observed = allVisite.filter(function(visit) {
    return visit.apertura_ts && new Date(visit.apertura_ts) >= since;
  });
  var completed = allVisite.filter(function(visit) {
    return visit.consegna_ts && new Date(visit.consegna_ts) >= since;
  });
  var completedSamples = completed.filter(function(visit) {
    return visitServiceTimeDays_(visit) > 0;
  });
  var initiatives = initiativeGroups_(observed);
  var completedInitiatives = initiativeGroups_(completed);
  var initiativeList = Object.keys(initiatives).map(function(key) { return initiatives[key]; });
  var completedList = Object.keys(completedInitiatives).map(function(key) { return completedInitiatives[key]; });
  var reworked = initiativeList.filter(function(item) { return item.reentries > 0; });
  var serviceTimes = completedSamples.map(visitServiceTimeDays_);
  var stats = sampleStats_(serviceTimes);
  var enoughCompleted = completedSamples.length >= 5 && stats.mean > 0;

  var newRate = initiativeList.length / windowDays;
  var completedRate = completedList.length / windowDays;
  var reworkShare = initiativeList.length ? reworked.length / initiativeList.length : null;
  var conditionalReentries = reworked.length ? reworked.reduce(function(sum, item) {
    return sum + item.reentries;
  }, 0) / reworked.length : null;
  var averagePassages = reworkShare === null ? null : 1 + reworkShare * (conditionalReentries || 0);
  var totalPassageRate = averagePassages === null ? null : newRate * averagePassages;
  var reworkPassageRate = totalPassageRate === null ? null : Math.max(0, totalPassageRate - newRate);
  var effectiveCapacity = enoughCompleted ? teamSize / stats.mean : null;
  var theoreticalCapacity = positiveOrNull_(config.theoretical_capacity_per_day);
  var effectiveLoad = effectiveCapacity && totalPassageRate !== null ? totalPassageRate / effectiveCapacity : null;
  var residualCapacity = effectiveCapacity === null || totalPassageRate === null ? null : effectiveCapacity - totalPassageRate;
  var availableShare = effectiveLoad === null ? null : 1 - effectiveLoad;
  var dataQuality = dataQuality_(initiativeList.length, completedSamples.length);
  var systemStatus = systemStatus_(effectiveLoad, dataQuality);
  var variability = variabilityInterpretation_(enoughCompleted ? stats.cs2 : null);
  var prudentTime = enoughCompleted ? stats.mean + Math.sqrt(stats.variance) : null;
  var highObserved = enoughCompleted && serviceTimes.length ? Math.max.apply(null, serviceTimes) : null;
  var mg1 = enoughCompleted && effectiveLoad < 1
    ? queueMG1_(totalPassageRate, effectiveLoad, stats.mean, stats.secondMoment)
    : unstableQueue_();
  // M4 (DESIGN_dashboard.md, §4.2): stabilityMetrics_ era gia' calcolata in
  // calculateMetrics_ (Cap. 15 della dispensa FSC) ma mai passata a
  // systemState, quindi mai renderizzata (vedi ricognizione M3) - qui si
  // ricalcola con gli stessi ingredienti gia' in scope di buildSystemState_
  // (nessun nuovo dato raccolto): rho "grezzo" (solo lavoro nuovo, senza
  // rientri) = newRate/effectiveCapacity, rho effettivo (con rientri) =
  // effectiveLoad gia' calcolato sopra, variabilita' = stats.cs2.
  var rawRho = enoughCompleted && effectiveCapacity ? newRate / effectiveCapacity : null;
  var stability = rawRho === null || effectiveLoad === null
    ? null
    : stabilityMetrics_(rawRho, effectiveLoad, stats.cs2);
  // M5 (DESIGN_dashboard.md, §4.2): T_cliente/T_ente/T_interno (dispensa
  // FSC §10, "dove si blocca il lavoro") - somma di un campo gia'
  // accumulato per ogni visita (accumulateWaitTime_, Kanban.gs) ogni volta
  // che una visita esce da una colonna stand_by, mai finora sommato.
  // Stessa finestra ("observed") gia' usata per flowMetrics/reworkMetrics,
  // per restare coerente con le altre metriche calcolate su periodo.
  //
  // Fix del 2026-08-20 (segnalato da Marco: "Attesa enti: 0,65 giorni"
  // con 15 card ferme in attesa enti in quel momento, palesemente
  // irragionevole): accumulateWaitTime_ scrive t_*_d solo quando una
  // visita ESCE da una colonna stand_by - una card ancora ferma lì
  // ORA non ha ancora accumulato nulla nella tabella 'visite', quindi
  // sumVisitField_ da sola conta solo le attese gia' concluse, mai
  // quelle in corso. Aggiunta l'attesa in corso per ogni job
  // attualmente in una colonna stand_by, usando status_since_ts (M0-C,
  // "da quando la card e' nella colonna attuale") - lo stesso campo
  // gia' usato dal badge di invecchiamento sulla board (client.html).
  // Fix del 2026-08-20, parte 2 (segnalato da Marco: i giorni mostrati
  // sono totali complessivi, non chiaro; utile anche una media e un'idea
  // di distribuzione, non solo il totale): da una somma unica per tipo a
  // un campione di singole occorrenze di attesa (una per visita gia'
  // chiusa con quel tipo di attesa valorizzato, una per ogni job ancora
  // fermo ora in quel tipo di attesa) - waitStats_ ne deriva totale,
  // numero di occorrenze, media, minimo, massimo.
  // R5 (DESIGN_R_S.md, §3.5): questo campione resta SOLO sulle attese
  // gia' concluse - lo "stato attuale" (job ancora fermi ora, senza
  // tetto di finestra) e' ora una lista a se' (currentlyBlocked_,
  // sotto), non piu' mescolato qui.
  // R5, correzione aggiuntiva (addendum di collaudo, 2026-08-28): i
  // campioni vengono da TUTTO lo storico (allVisite), non da 'observed'
  // (finestra di osservazione) - lo scopo qui e' il collo di bottiglia
  // storico ("Dove si blocca il lavoro"), non un tasso sulla finestra
  // (quello resta lambda/mu/rho/capacita', invariati, ancora su
  // 'observed' per il loro scopo diverso).
  var waitSamplesByField = { t_cliente_d: [], t_ente_d: [], t_interno_d: [] };
  allVisite.forEach(function(visit) {
    Object.keys(waitSamplesByField).forEach(function(field) {
      var value = Number(visit[field] || 0);
      if (value > 0) { waitSamplesByField[field].push(value); }
    });
  });
  var waitTime = {
    client: waitStats_(waitSamplesByField.t_cliente_d),
    authority: waitStats_(waitSamplesByField.t_ente_d),
    internal: waitStats_(waitSamplesByField.t_interno_d)
  };
  // R5 (corretto in collaudo, addendum §R5): riga di riepilogo (quarta
  // riga della tabella "Dove si blocca il lavoro") - aggrega le tre
  // righe per tipo su tutte e cinque le colonne, non solo "Totale
  // (giorni)" (gia' presente prima di questa correzione). La media e'
  // totale/occorrenze su tutte le attese insieme, NON la media delle tre
  // medie di riga (peserebbe ogni tipo allo stesso modo indipendentemente
  // da quante occorrenze porta). I tipi senza occorrenze sono esclusi da
  // min/max (altrimenti falserebbero il risultato).
  waitTime.summary = waitSummaryRow_(waitTime.client, waitTime.authority, waitTime.internal);
  // M6 (DESIGN_dashboard.md, §4.2): B_lat(t) (dispensa FSC §10,
  // "esposizione futura a rientri") - consegne recenti (consegna_ts nella
  // finestra osservata) la cui visita non e' mai rientrata (rientro_ts
  // vuoto: e' ancora "l'ultima visita del caso", DESIGN_modello_caso_visita.md
  // §8) e il cui caso non e' ancora formalmente chiuso
  // (incarico_chiuso_ts vuoto). Solo jobs attivi: un caso archiviato ha
  // per costruzione incarico_chiuso_ts valorizzato (archiveJob_ lo
  // richiede), quindi non puo' mai comparire qui.
  var jobsById = indexBy_(jobs, 'job_id');
  var latentBacklogCount = completed.filter(function(visit) {
    if (visit.rientro_ts) { return false; }
    var job = jobsById[visit.job_id];
    return Boolean(job) && !job.incarico_chiuso_ts;
  }).length;
  // M7 (DESIGN_dashboard.md, §4.2, decisione di Marco 2026-08-19): profilo
  // di ritardo (Cap. 13 della dispensa FSC, "quanto e quando rientra il
  // lavoro") - a differenza di M4-M6 richiede tutta la storia disponibile
  // (allVisite, non filtrata sulla finestra di osservazione: una stima
  // statistica beneficia di piu' campioni, e il documento tratta la
  // finestra "flusso" e il profilo di ritardo come due concetti distinti),
  // non solo un'aggregazione su periodo.
  var delayProfile = delayProfile_(allVisite);
  var workload = currentWorkload_(jobs, columnMap);
  // R9.14, ottimizzazione: un solo parsing di activity_log_json per
  // job, condiviso da "Lavoro accettato" (points.timeline, sotto) e
  // "Lavoro in corso" (activeWipWeekly, piu' avanti) - vedi commento su
  // buildJobIntervalsIndex_ (Model.gs) per il perche'.
  var jobIntervalsIndex = buildJobIntervalsIndex_(jobs, archivedJobs, columnMap, now);
  var points = pointsStatistics_(jobs, archivedJobs, columnMap, since, now, assigneeOrderFromConfig_(config, jobs), jobIntervalsIndex);
  // R5: stato attuale dei job fermi ora (su jobs attivi, nessun tetto
  // di finestra). Il grafico "Andamento mensile dell'attesa" (che
  // usava waitTimeMonthBuckets_ su allVisite, finestra fissa a 6 mesi)
  // e' stato rimosso su richiesta di Marco (R10.1, terzo giro di
  // correzioni) - waitTimeMonthBuckets_ non serviva a nient'altro,
  // rimossa insieme alla visualizzazione (nessun codice morto).
  var currentlyBlocked = currentlyBlocked_(jobs, columnMap, now);
  // S3 (fasce sulla lista "Fermi ora"): percentili storici del tempo di
  // ciclo su tutte le visite chiuse disponibili - non dipende piu' dallo
  // strumento diagnostico S2 (wipCycleTimeScatter_/visitActiveInterval_,
  // rimossi in sede di correzione collaudo, addendum §S2/S3: il WIP
  // andava espresso in punti a grana settimanale, non contando le visite
  // concorrenti), che comunque non avrebbe portato altro valore utile
  // qui oltre alla stessa lista di tempi di ciclo gia' ottenibile
  // direttamente da visitServiceTimeDays_.
  var cycleTimeSamples = allVisite.map(visitServiceTimeDays_).filter(function(days) { return days > 0; }).sort(function(a, b) { return a - b; });
  var MIN_CYCLE_TIME_SAMPLES_FOR_BANDS = 20;
  var cycleTimeBands = cycleTimeSamples.length >= MIN_CYCLE_TIME_SAMPLES_FOR_BANDS ? {
    p50: percentile_(cycleTimeSamples, 0.50),
    p85: percentile_(cycleTimeSamples, 0.85),
    p95: percentile_(cycleTimeSamples, 0.95)
  } : null;
  if (cycleTimeBands) {
    currentlyBlocked.forEach(function(item) {
      if (item.elapsed_days <= cycleTimeBands.p50) { item.band = 'green'; }
      else if (item.elapsed_days <= cycleTimeBands.p85) { item.band = 'yellow'; }
      else { item.band = 'red'; }
    });
  }
  // S2/S3 (corretto in collaudo, addendum): WIP espresso in punti a
  // grana settimanale (non in numero di visite concorrenti), aggregato
  // su 26 settimane. S6: la tendenza reale si legge sulla media mobile
  // (wipMovingAverage_, ordinata per WIP crescente), mai sulle settimane
  // grezze collegate in ordine cronologico (il WIP osservato oscilla,
  // non e' monotono nel tempo).
  // S4: wip_medio di ogni settimana e' ora il WIP ATTIVO ricostruito dal
  // log dei passaggi di colonna (activeWipWeeklyFromLog_), non piu' la
  // stima cumulata "entrato meno completato" (che includeva il backlog).
  // S5: finestra configurabile (default 26), non piu' un letterale
  // ripetuto in tre punti.
  var wipTrendWeeks = Number(config.wip_trend_weeks || 26);
  var activeWipWeekly = activeWipWeeklyFromLog_(jobs, archivedJobs, columnMap, now, wipTrendWeeks, jobIntervalsIndex);
  var flowWeeklyBuckets = flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, wipTrendWeeks, activeWipWeekly.weekly);
  // S6 (sostituisce wipBands_): media mobile a numero fisso di campioni
  // invece di fasce a larghezza fissa, piu' i due fit teorici (curva
  // tratteggiata), fittati sui punti grezzi di flowWeeklyBuckets, mai
  // sulla media mobile.
  var wipMovingAverage = wipMovingAverage_(flowWeeklyBuckets, WIP_MOVING_AVERAGE_WINDOW_);
  var cycleTimeFit = cycleTimeTheoreticalFit_(flowWeeklyBuckets);
  var throughputFit = throughputTheoreticalFit_(flowWeeklyBuckets);

  // Chiesto da Marco (2026-08-20): mostrare "dove e' possibile" ogni
  // tasso anche in punti, non solo in iniziative/visite - le
  // grandezze di teoria delle code (capacita', assorbimento, margine)
  // sono pero' tassi di VISITE, non di punti (i punti sono un
  // attributo del caso, non della singola visita). Fattore di
  // conversione stimato: dimensione media dei casi arrivati nella
  // finestra osservata (punti aggiunti / iniziative nuove) - un solo
  // fattore, riusato per ogni conversione lato client, sempre indicato
  // come stima ("~") mai come valore esatto.
  var avgPointsPerInitiative = initiativeList.length ? round_(points.added_points / initiativeList.length) : null;

  return {
    dataQuality: dataQuality,
    systemStatus: systemStatus,
    flowMetrics: {
      window_days: windowDays,
      new_initiatives_observed: initiativeList.length,
      new_initiatives_per_day: round_(newRate),
      // R6.3 (addendum di collaudo): alias di newRate, gia' calcolato -
      // nessun nuovo calcolo, solo il nome con cui il pannello
      // "Rilavorazione" lo mostra fianco a fianco al carico da
      // rilavorazione (mai piu' isolato).
      new_work_per_day: round_(newRate),
      completed_initiatives: completedList.length,
      completed_per_day: completedList.length ? round_(completedRate) : null,
      // R6.6: passaggi (visite) chiusi nella finestra, non lavori -
      // 'completed' e' l'array di visite prima del raggruppamento per
      // caso di initiativeGroups_ (completedList conta lavori distinti).
      completed_passages: completed.length,
      estimated_capacity_per_day: effectiveCapacity === null ? null : round_(effectiveCapacity),
      entry_exit_difference: completedList.length ? round_(newRate - completedRate) : null,
      avg_points_per_initiative: avgPointsPerInitiative,
      // R6.2: numero di persone usato per calcolare la capacita' - le
      // etichette lo mostrano esplicitamente, non piu' un moltiplicatore
      // implicito.
      team_size: teamSize
    },
    reworkMetrics: {
      initiatives_with_rework: reworkShare === null ? null : round_(reworkShare),
      average_reentries_when_reworked: conditionalReentries === null ? null : round_(conditionalReentries),
      average_passages_per_initiative: averagePassages === null ? null : round_(averagePassages),
      total_passages_per_day: totalPassageRate === null ? null : round_(totalPassageRate),
      additional_passages_from_rework: reworkPassageRate === null ? null : round_(reworkPassageRate),
      by_cause: reworkByCause_(observed)
    },
    workloadMetrics: workload,
    timeMetrics: {
      completed_samples: completedSamples.length,
      average_service_days: enoughCompleted ? round_(stats.mean) : null,
      variability: enoughCompleted ? round_(stats.cs2) : null,
      variability_level: variability.level,
      variability_message: variability.message,
      high_observed_days: highObserved === null ? null : round_(highObserved),
      prudent_service_days: prudentTime === null ? null : round_(prudentTime),
      estimated_wait_days: mg1.Wq,
      estimated_total_days: mg1.W,
      waiting_message: waitingMessage_(effectiveLoad)
    },
    capacityMetrics: {
      theoretical_per_day: theoreticalCapacity,
      effective_per_day: effectiveCapacity === null ? null : round_(effectiveCapacity),
      absorbed_by_new_work: round_(newRate),
      absorbed_by_rework: reworkPassageRate === null ? null : round_(reworkPassageRate),
      effective_load: effectiveLoad === null ? null : round_(effectiveLoad),
      residual_per_day: residualCapacity === null ? null : round_(residualCapacity),
      available_share: availableShare === null ? null : round_(availableShare),
      safety_margin: availableShare === null ? null : round_(availableShare)
    },
    pointsMetrics: points,
    waitTimeMetrics: {
      window_days: windowDays,
      client: waitTime.client,
      authority: waitTime.authority,
      internal: waitTime.internal,
      summary: waitTime.summary
    },
    currentlyBlocked: currentlyBlocked,
    cycleTimeBands: cycleTimeBands,
    latentBacklogMetrics: {
      window_days: windowDays,
      count: latentBacklogCount
    },
    delayProfileMetrics: delayProfile,
    flowWeeklyBuckets: flowWeeklyBuckets,
    wipMovingAverage: wipMovingAverage,
    cycleTimeFit: cycleTimeFit,
    throughputFit: throughputFit,
    // S4: trasparenza sulla copertura del log - job esclusi dal calcolo
    // del WIP attivo perche' activity_log_json e' vuoto/non interpretabile
    // (nessun evento 'move' da cui ricostruire la timeline di colonna).
    // Non stimati alla cieca: semplicemente non contribuiscono a nessuna
    // settimana finche' il loro log non e' completo.
    wipCoverage: {
      excluded_jobs: activeWipWeekly.excluded_job_ids.length,
      excluded_job_ids: activeWipWeekly.excluded_job_ids
    },
    stabilityMetrics: stability === null ? null : {
      margin: stability.margin,
      congestion_factor: stability.congestion_factor,
      variability_factor: stability.variability_factor,
      system_state: stability.system_state
    },
    scenarioReadiness: {
      active: false,
      message: 'La simulazione non e ancora attiva. La struttura e pronta per confrontare scenari futuri.',
      scenarios: scenariosFromConfig_(config)
    },
    descriptions: metricDescriptions_()
  };
}

// Stesso ordine mostrato nella tendina "Assegnatario" della board
// (boardOptions_ in Kanban.gs): valori salvati in assignees_json, poi in
// coda gli eventuali assegnatari presenti solo sui job e non ancora
// salvati nell'elenco — cosi' "Punti per assegnatario" in dashboard segue
// lo stesso ordine, non quello (arbitrario) di comparizione nel foglio.
function assigneeOrderFromConfig_(config, jobs) {
  var values = parseJsonArray_(config.assignees_json);
  jobs.forEach(function(job) { values.push(job.assignee); });
  return orderedUniqueValues_(values);
}

// N6: openJobs resta derivato SOLO da jobs (attivi) — "punti aperti"/"per
// taglia"/"per assegnatario" non includono mai l'archivio (§8, sono
// "lavoro presente" per definizione). allJobs (jobs + archivedJobs) copre
// invece le metriche storiche su finestra temporale: completati, aggiunti,
// "Andamento del carico"/"Carico mensile" (monthBuckets_) e "per colonna"
// (pointsByColumn_, gia' non filtrata a solo openJobs prima di N6).
function pointsStatistics_(jobs, archivedJobs, columnMap, since, now, assigneeOrder, jobIndex) {
  var allJobs = jobs.concat(archivedJobs || []);
  // R7: "Aperti (ora)" mescolava Pipeline commerciale (stadio 0,
  // preventivi non ancora acquisiti) con Lavoro impegnato (stadi 1-4) -
  // eliminato come numero unico, sostituito da due popolazioni distinte
  // che non vanno mai sommate in un solo totale.
  var pipelineJobs = jobs.filter(function(job) { return workStage_(job, columnMap) === 0; });
  var committedJobs = jobs.filter(function(job) {
    var stage = workStage_(job, columnMap);
    return stage >= 1 && stage <= 4;
  });
  var completed = allJobs.filter(function(job) {
    return job.done_ts && new Date(job.done_ts) >= since;
  });
  var added = allJobs.filter(function(job) {
    return job.arrival_ts && new Date(job.arrival_ts) >= since;
  });
  var months = monthBuckets_(allJobs, now, 6, columnMap, jobIndex);

  return {
    pipeline_points: sumJobPoints_(pipelineJobs),
    pipeline_cards: pipelineJobs.length,
    committed_points: sumJobPoints_(committedJobs),
    committed_cards: committedJobs.length,
    completed_points: sumJobPoints_(completed),
    added_points: sumJobPoints_(added),
    // Consolidamento dashboard (segnalato da Marco, 2026-08-20): il
    // pannello "Flusso e carico" mostra conteggio E punti nella stessa
    // tabella, invece di leggerli da due fonti separate — servono i
    // conteggi anche per aggiunte/completate, non solo per aperte.
    completed_cards: completed.length,
    added_cards: added.length,
    timeline: months,
    // R7: le distribuzioni per taglia/assegnatario restano sul Lavoro
    // impegnato (stadi 1-4) - un preventivo non ancora acquisito non e'
    // ancora lavoro da distribuire nel team.
    by_size: pointsBreakdown_(committedJobs, 'size_class', ['XS', 'S', 'M', 'L', 'XL']),
    by_column: pointsByColumn_(allJobs, columnMap),
    by_assignee: pointsBreakdown_(committedJobs, 'assignee', assigneeOrder)
  };
}

// R9.14 (addendum di collaudo): 'open_points' era un saldo cumulato
// approssimato (entrato meno completato, mese dopo mese) - confrontava
// un'approssimazione con la fotografia vera della card "Lavoro
// accettato (attuale)" di Vista Rapida, per questo i due numeri non
// coincidevano mai. Sostituito da 'accepted_points', ricostruito con lo
// stesso motore di stockSeriesFromLog_ usato per "Lavoro in corso" (S4),
// sui role di "Lavoro accettato" (stadi 1-4) - stesso calcolo, stesso
// nome, sopra (Vista Rapida) e sotto (questo grafico/tabella).
// 'columnMap' e' facoltativo (retrocompatibilita' coi chiamanti che non
// hanno bisogno di 'accepted_points', es. i test che verificano solo
// entered/completed) - senza, i bucket restano a 0. 'jobIndex'
// (facoltativo, da buildJobIntervalsIndex_) evita di riparsare il log
// una seconda volta quando il chiamante l'ha gia' costruito per
// "Lavoro in corso" (S4) - senza, lo ricostruisce da 'jobs'+columnMap
// (che qui e' gia' l'unione jobs+archivedJobs decisa dal chiamante,
// pointsStatistics_ - passato senza un secondo array di archiviati,
// altrimenti li conterebbe due volte).
function monthBuckets_(jobs, now, count, columnMap, jobIndex) {
  var first = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  var buckets = [];
  var byKey = {};
  for (var i = 0; i < count; i++) {
    var date = new Date(first.getFullYear(), first.getMonth() + i, 1);
    var nextDate = new Date(first.getFullYear(), first.getMonth() + i + 1, 1);
    var key = Utilities.formatDate(date, SIGMAFLOW.TZ, 'yyyy-MM');
    var bucket = { key: key, label: Utilities.formatDate(date, SIGMAFLOW.TZ, 'MM/yyyy'), start: date, end: nextDate, entered_points: 0, completed_points: 0, entered_cards: 0, completed_cards: 0, accepted_points: 0, net_points: 0 };
    buckets.push(bucket);
    byKey[key] = bucket;
  }

  jobs.forEach(function(job) {
    var points = jobPoints_(job);
    var arrivalKey = job.arrival_ts ? Utilities.formatDate(new Date(job.arrival_ts), SIGMAFLOW.TZ, 'yyyy-MM') : '';
    var doneKey = job.done_ts ? Utilities.formatDate(new Date(job.done_ts), SIGMAFLOW.TZ, 'yyyy-MM') : '';
    if (byKey[arrivalKey]) {
      byKey[arrivalKey].entered_points += points;
      byKey[arrivalKey].entered_cards++;
    }
    if (byKey[doneKey]) {
      byKey[doneKey].completed_points += points;
      byKey[doneKey].completed_cards++;
    }
  });

  if (jobIndex || columnMap) {
    var index = jobIndex || buildJobIntervalsIndex_(jobs, [], columnMap, now);
    var accepted = stockSeriesFromIndex_(index, buckets, ['backlog', 'prep', 'wip', 'stand_by']);
    buckets.forEach(function(bucket, bucketIndex) { bucket.accepted_points = accepted.values[bucketIndex]; });
  }
  // 'start'/'end' servivano solo come input a stockSeriesFromIndex_ qui
  // sopra - mai letti dal client (drawPointsTimeline/renderMonthlyLoad
  // usano solo key/label/i campi _points). Tolti prima di restituire:
  // sono oggetti Date reali, e google.script.run ha una serializzazione
  // diversa da una chiamata diretta - nessun motivo di far attraversare
  // quel confine a un valore che non serve dall'altra parte.
  buckets.forEach(function(bucket) {
    bucket.net_points = bucket.entered_points - bucket.completed_points;
    delete bucket.start;
    delete bucket.end;
  });
  return buckets;
}

// Restituisce un ARRAY (non un oggetto): l'ordine delle chiavi di un
// oggetto JS non e' garantito nell'attraversare il confine
// google.script.run tra server e client (a differenza dell'ordine degli
// elementi di un array, sempre preservato) — usare un oggetto qui era la
// causa della dashboard che mostrava taglie/colonne in un ordine diverso
// da quello corretto calcolato lato server.
function pointsBreakdown_(jobs, field, orderedKeys) {
  var result = {};
  jobs.forEach(function(job) {
    var key = String(job[field] || 'Non assegnato');
    if (!result[key]) { result[key] = { key: key, label: key, cards: 0, points: 0 }; }
    result[key].cards++;
    result[key].points += jobPoints_(job);
  });
  var keys = Object.keys(result);
  if (orderedKeys) {
    keys = orderedKeys.filter(function(key) { return result[key] !== undefined; })
      .concat(keys.filter(function(key) { return orderedKeys.indexOf(key) === -1; }));
  }
  return keys.map(function(key) { return result[key]; });
}

function pointsByColumn_(jobs, columnMap) {
  var result = {};
  jobs.forEach(function(job) {
    var status = normalizeStatus_(job.status);
    var column = columnMap[status] || { label: status };
    if (!result[status]) { result[status] = { key: status, label: column.label || status, cards: 0, points: 0, order: Number(column.order || 0) }; }
    result[status].cards++;
    result[status].points += jobPoints_(job);
  });
  return Object.keys(result).map(function(key) { return result[key]; })
    .sort(function(a, b) { return a.order - b.order; });
}

function sumJobPoints_(jobs) {
  return jobs.reduce(function(sum, job) { return sum + jobPoints_(job); }, 0);
}

// M5 (DESIGN_dashboard.md, §4.2): somma un accumulatore t_*_d su un
// insieme di visite - il campo resta 0 finche' la visita non e' mai
// uscita dalla colonna stand_by corrispondente (accumulateWaitTime_).
function sumVisitField_(visite, field) {
  return visite.reduce(function(sum, visit) { return sum + Number(visit[field] || 0); }, 0);
}

function jobPoints_(job) {
  var stored = Number(job.size_points);
  if (stored > 0) { return stored; }
  return SIGMAFLOW.SIZE_POINTS[job.size_class || 'M'] || SIGMAFLOW.SIZE_POINTS.M;
}

// Fase L4: raggruppa le VISITE per caso (job_id — il caso non ha piu'
// bisogno di un case_id separato per questo, essendo 'visite' gia'
// indicizzata sul caso). R1 (DESIGN_R_S.md, §3.1): conta i rientri
// OSSERVATI nell'insieme ricevuto (una riga con numero_visita > 1 e'
// gia', per costruzione, un rientro avvenuto nella finestra filtrata dal
// chiamante), non la posizione del caso in tutta la sua storia
// (numero_visita - 1 dell'ultima visita osservata sovrastimava i rientri
// per i casi con rientri sia dentro sia fuori dalla finestra).
function initiativeGroups_(visite) {
  return visite.reduce(function(groups, visit) {
    var key = visit.job_id;
    if (!groups[key]) {
      groups[key] = { id: key, reentries: 0 };
    }
    if (Number(visit.numero_visita || 1) > 1) {
      groups[key].reentries++;
    }
    return groups;
  }, {});
}

// R4 (CRITERI_governo_metriche_2026-08-26.md §6): scompone i rientri
// osservati nella finestra per causa (rework_cause sulla visita che
// e' rientrata) - distingue quota controllabile (cliente + interno,
// leva: gating) da quota non controllabile (enti, nessuna leva
// diretta). Opera sullo stesso insieme filtrato per finestra di
// initiativeGroups_ (coerenza tra le due letture).
function reworkByCause_(visite) {
  var counts = { wait_client: 0, wait_authority: 0, wait_internal: 0 };
  visite.forEach(function(visit) {
    if (Number(visit.numero_visita || 1) > 1 && counts.hasOwnProperty(visit.rework_cause)) {
      counts[visit.rework_cause]++;
    }
  });
  var total = counts.wait_client + counts.wait_authority + counts.wait_internal;
  var controllable = counts.wait_client + counts.wait_internal;
  return {
    total: total,
    client: counts.wait_client,
    authority: counts.wait_authority,
    internal: counts.wait_internal,
    controllable_share: total ? round_(controllable / total) : null,
    external_share: total ? round_(counts.wait_authority / total) : null
  };
}

function columnsFromConfig_(config) {
  return normalizeColumns_(config);
}

// R7 (DESIGN_R_S_addendum_collaudo.md, sez. R7): unica fonte di verita'
// per lo stadio di lavoro (0-6), mappata 1:1 sul 'role' gia' esistente
// in columns_json (nessun campo nuovo) piu' 'invoiced' per distinguere
// stadio 5 da 6. Riusata ovunque serve una di queste popolazioni
// (pointsStatistics_, currentWorkload_) invece di ricalcolare filtri
// leggermente diversi in punti diversi.
//   0 Preventivo    - role 'neutral'
//   1 Backlog       - role 'backlog'
//   2 Preparazione  - role 'prep'
//   3 Lavorazione   - role 'wip' (WIP in senso stretto)
//   4 Attesa        - role 'stand_by'
//   5 Da fatturare  - role 'done', invoiced falso
//   6 Chiuso        - role 'done', invoiced vero
function workStage_(job, columnMap) {
  var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral' };
  switch (column.role) {
    case 'backlog': return 1;
    case 'prep': return 2;
    case 'wip': return 3;
    case 'stand_by': return 4;
    case 'done': return coerceBoolean_(job.invoiced) ? 6 : 5;
    default: return 0;
  }
}

// Chiesto da Marco (2026-08-20): anche il lavoro presente in punti, non
// solo in conteggio card - stesso ciclo, un secondo accumulatore in
// parallelo (_points per ogni categoria _count esistente).
// R7: 'ready'/'preparing'/'in_progress'/'blocked' (stadi 1-4, "Lavoro
// impegnato") e 'can_return' (stadio 5, "Da fatturare") restano campi
// distinti dello stesso oggetto (nessuna somma li mescola qui) - la
// separazione in due card, mai sommate, e' un vincolo di
// presentazione lato client (dashboard.html/client.html), non di
// questa funzione. Classificazione centralizzata via workStage_,
// riusata anche da pointsStatistics_.
function currentWorkload_(jobs, columnMap) {
  var result = {
    ready: 0, ready_points: 0,
    preparing: 0, preparing_points: 0,
    in_progress: 0, in_progress_points: 0,
    can_return: 0, can_return_points: 0,
    blocked: 0, blocked_points: 0,
    waiting_client: 0, waiting_client_points: 0,
    waiting_authority: 0, waiting_authority_points: 0,
    waiting_internal: 0, waiting_internal_points: 0
  };
  jobs.forEach(function(job) {
    var stage = workStage_(job, columnMap);
    var points = jobPoints_(job);
    if (stage === 1) { result.ready++; result.ready_points += points; }
    if (stage === 2) { result.preparing++; result.preparing_points += points; }
    if (stage === 3) { result.in_progress++; result.in_progress_points += points; }
    if (stage === 4) { result.blocked++; result.blocked_points += points; }
    if (stage === 5) { result.can_return++; result.can_return_points += points; }
    if (job.status === 'wait_client') { result.waiting_client++; result.waiting_client_points += points; }
    if (job.status === 'wait_authority') { result.waiting_authority++; result.waiting_authority_points += points; }
    if (job.status === 'wait_internal') { result.waiting_internal++; result.waiting_internal_points += points; }
  });
  return result;
}

function dataQuality_(observedCount, completedCount) {
  var level = observedCount < 10 ? 'low' : (observedCount <= 30 ? 'medium' : 'good');
  var labels = { low: 'BASSA', medium: 'MEDIA', good: 'BUONA' };
  var messages = {
    low: 'I dati sono ancora troppo pochi per leggere bene il sistema.',
    medium: 'La lettura e utile, ma ancora sensibile a pochi casi anomali.',
    good: 'La lettura e piu rappresentativa del funzionamento recente.'
  };
  if (completedCount < 5) {
    messages[level] += ' Servono almeno 5 lavori completati per stimare tempi e capacita.';
  }
  return {
    level: level,
    label: labels[level],
    message: messages[level],
    observed_initiatives: observedCount,
    completed_samples: completedCount,
    capacity_estimable: completedCount >= 5
  };
}

function systemStatus_(load, dataQuality) {
  if (load === null) {
    return {
      code: 'unknown',
      label: 'DATI INSUFFICIENTI',
      message: 'Il sistema non mostra una misura affidabile del carico: servono piu lavori completati.'
    };
  }
  if (load < 0.70) {
    return { code: 'stable', label: 'STABILE', message: 'Il sistema ha margine operativo.' };
  }
  if (load < 0.85) {
    return { code: 'attention', label: 'ATTENZIONE', message: 'Il sistema regge, ma il margine si sta riducendo.' };
  }
  if (load <= 1) {
    return { code: 'stressed', label: 'SOTTO PRESSIONE', message: 'Il sistema e vicino alla saturazione. Rientri e tempi variabili possono aumentare rapidamente le attese.' };
  }
  return { code: 'critical', label: 'CRITICO', message: 'Il carico supera la capacita disponibile. Il lavoro tendera ad accumularsi.' };
}

// R10.4 (terzo giro di correzioni, 2026-08-28): soglie confermate da
// Marco (dispensa FSC) - sostituiscono le precedenti 0,5/1 (indicative,
// mai confermate da una fonte esplicita).
function variabilityInterpretation_(value) {
  if (value === null) {
    return { level: null, message: 'Dato non ancora stimabile.' };
  }
  if (value < 0.75) {
    return { level: 'BASSA', message: 'I tempi sono abbastanza regolari.' };
  }
  if (value <= 1.33) {
    return { level: 'MEDIA', message: 'I tempi cambiano in modo sensibile tra un lavoro e l altro.' };
  }
  return { level: 'ALTA', message: 'Pochi lavori lunghi possono bloccare molta capacita.' };
}

function waitingMessage_(load) {
  if (load === null) { return 'Dato non ancora stimabile.'; }
  if (load < 0.70) { return 'Attesa tendenzialmente bassa.'; }
  if (load < 0.85) { return 'Attesa in aumento.'; }
  if (load <= 1) { return 'Attesa sensibile: il sistema e quasi pieno.'; }
  return 'Accumulo probabile: il carico supera la capacita.';
}

function scenariosFromConfig_(config) {
  if (config.scenarios_json) {
    try {
      return JSON.parse(config.scenarios_json);
    } catch (err) {
      // Usa gli scenari standard se il JSON non e valido.
    }
  }
  return SIGMAFLOW.SCENARIOS;
}

function positiveOrNull_(value) {
  var number = Number(value);
  return number > 0 ? round_(number) : null;
}

function metricDescriptions_() {
  return {
    new_initiatives_per_day: 'Numero medio di nuove iniziative entrate ogni giorno.',
    total_passages_per_day: 'Passaggi di lavoro richiesti ogni giorno, compresi i rientri.',
    effective_load: 'Quota della capacita effettiva richiesta dal lavoro osservato.',
    ready: 'Lavori visibili e pronti, non ancora avviati.',
    in_progress: 'Lavori attualmente aperti e gestiti dal team.',
    can_return: 'Lavori conclusi ma non ancora fatturati, ancora esposti a richieste successive.',
    prudent_service_days: 'Tempo medio aumentato della variabilita osservata, usato come riferimento prudenziale.'
  };
}

// M5, fix del 2026-08-20 (segnalato da Marco: i totali di "Dove si
// blocca il lavoro" da soli non bastano - serve anche una media, e
// un'idea di min/max). 'samples' e' un array di durate positive in
// giorni, una per occorrenza di attesa (una visita chiusa con quel tipo
// di attesa, o un job ancora fermo li' ora) - non filtra ne' aggrega
// altro, il chiamante decide cosa raccogliere.
function waitStats_(samples) {
  if (!samples.length) {
    return { total_days: 0, occurrences: 0, average_days: null, min_days: null, max_days: null };
  }
  var total = samples.reduce(function(sum, value) { return sum + value; }, 0);
  return {
    total_days: round_(total),
    occurrences: samples.length,
    average_days: round_(total / samples.length),
    min_days: round_(Math.min.apply(null, samples)),
    max_days: round_(Math.max.apply(null, samples))
  };
}

// R5 (corretto in collaudo, addendum §R5): riga di riepilogo della
// tabella "Dove si blocca il lavoro" - aggrega le tre righe per tipo
// (waitStats_) su tutte le colonne, non solo il totale giorni (gia'
// presente prima di questa correzione). La media e' totale/occorrenze
// su tutte le attese insieme, NON la media aritmetica delle tre medie
// di riga (peserebbe ogni tipo allo stesso modo indipendentemente da
// quante occorrenze porta). Un tipo senza occorrenze e' escluso da
// min/max (altrimenti 0/null falserebbero il risultato).
function waitSummaryRow_(client, authority, internal) {
  var rows = [client, authority, internal].filter(function(row) { return row.occurrences > 0; });
  var allOccurrences = client.occurrences + authority.occurrences + internal.occurrences;
  var allTotalDays = client.total_days + authority.total_days + internal.total_days;
  return {
    total_days: round_(allTotalDays),
    occurrences: allOccurrences,
    average_days: allOccurrences ? round_(allTotalDays / allOccurrences) : null,
    min_days: rows.length ? round_(Math.min.apply(null, rows.map(function(row) { return row.min_days; }))) : null,
    max_days: rows.length ? round_(Math.max.apply(null, rows.map(function(row) { return row.max_days; }))) : null
  };
}

function sampleStats_(values) {
  if (!values.length) {
    return { mean: 0, secondMoment: 0, variance: 0, cs2: 0 };
  }

  var mean = values.reduce(function(sum, value) {
    return sum + value;
  }, 0) / values.length;

  var secondMoment = values.reduce(function(sum, value) {
    return sum + value * value;
  }, 0) / values.length;

  var variance = Math.max(0, secondMoment - mean * mean);
  var cs2 = mean > 0 ? variance / (mean * mean) : 0;

  return { mean: mean, secondMoment: secondMoment, variance: variance, cs2: cs2 };
}

function queueMM1_(lambda, mu, rho, meanServiceDays) {
  if (mu <= 0 || rho >= 1) {
    return unstableQueue_();
  }

  var wq = rho / (mu * (1 - rho));
  var w = wq + meanServiceDays;
  return {
    Wq: round_(wq),
    W: round_(w),
    Lq: round_(lambda * wq),
    L: round_(lambda * w)
  };
}

function queueMG1_(lambda, rho, meanServiceDays, secondMoment) {
  if (rho >= 1) {
    return unstableQueue_();
  }

  var wq = lambda * secondMoment / (2 * (1 - rho));
  var w = wq + meanServiceDays;
  return {
    Wq: round_(wq),
    W: round_(w),
    Lq: round_(lambda * wq),
    L: round_(lambda * w)
  };
}

function reworkMetrics_(completed, lambda, teamSize, mu, secondMoment) {
  // 'completed' e' ora un array di visite (Fase L4): una visita e' essa
  // stessa un rientro se numero_visita > 1 — non serve piu' un flag
  // is_rework separato, la posizione nella sequenza lo dice gia'.
  var reworked = completed.filter(function(visit) {
    return Number(visit.numero_visita || 1) > 1;
  });

  var p1 = completed.length ? reworked.length / completed.length : 0;
  var r = reworked.length ? reworked.reduce(function(sum, visit) {
    return sum + Math.max(0, Number(visit.numero_visita || 1) - 1);
  }, 0) / reworked.length : 0;
  var expectedVisits = 1 + p1 * r;
  var lambdaEffective = lambda * expectedVisits;
  var rhoEffective = mu > 0 ? lambdaEffective / (teamSize * mu) : 0;
  var wq = rhoEffective >= 1 ? null : lambdaEffective * secondMoment / (2 * (1 - rhoEffective));

  return {
    p1: round_(p1),
    r: round_(r),
    E_K: round_(expectedVisits),
    lambda_effective: round_(lambdaEffective),
    rho_effective: round_(rhoEffective),
    Wq: wq === null ? null : round_(wq)
  };
}

function stabilityMetrics_(rho, rhoEffective, cs2) {
  var state = 'stable';
  if (rhoEffective >= 1) {
    state = 'unstable';
  } else if (rhoEffective >= 0.85) {
    state = 'critical';
  } else if (rhoEffective >= 0.70) {
    state = 'stressed';
  }

  return {
    margin: round_(1 - rhoEffective),
    congestion_factor: rho >= 1 ? null : round_(rho / (1 - rho)),
    variability_factor: round_((1 + cs2) / 2),
    system_state: state
  };
}

// M7 (DESIGN_dashboard.md, §4.2): profilo di ritardo (dispensa FSC, Cap.
// 13). Definizione originaria del capitolo: D_i = rientro_ts -
// consegna_ts, "si osservano solo i casi che rientrano DOPO una
// consegna". Corretto il 2026-08-20 (segnalato da Marco: 0 campioni su
// dati reali con 8-9 rientri veri) - quella definizione stretta non e'
// applicabile a SigmaFlow, dove le colonne di attesa stanno PRIMA di
// "DA INVIARE/FATTURARE" (DESIGN_modello_caso_visita.md §1, nota di
// fedelta' al modello): un rientro tipico qui chiude la visita SENZA
// mai passare da consegna_ts, quindi il campione restava quasi sempre
// vuoto. Stessa estensione deliberata gia' adottata per p1/r in
// reworkMetrics_ ("qualunque riapertura", non solo dopo consegna_ts,
// §1 della stessa nota: "due letture possibili... Cap. 11 esteso,
// adottato"): un rientro e' qualunque visita con rientro_ts
// valorizzato, a prescindere da consegna_ts. D_i diventa il tempo di
// attesa REALE accumulato in quella visita prima del rientro
// (t_cliente_d + t_ente_d + t_interno_d, gia' calcolato da
// accumulateWaitTime_ — lo stesso dato gia' esposto in "Dove si blocca
// il lavoro", M5) invece di rientro_ts - consegna_ts (quasi sempre non
// calcolabile su dati reali). alpha = rientri osservati / visite
// "chiuse" in qualche modo (consegnate o rientrate - stessa nozione di
// "chiusura" gia' usata da visitServiceTimeDays_ per il tempo di
// servizio). k[m] = istogramma discretizzato di {D_i} su bin di 7
// giorni (Delta, l'esempio esplicito del capitolo: "spesso sufficiente
// e piu' semplice da stimare/aggiornare" della KDE continua),
// normalizzato a somma 1; l'ultimo bin raccoglie la coda (>= bin_days *
// (bin_count-1)) per restare un array di dimensione fissa. Nessuna
// correzione per censura a destra (il capitolo la introduce come
// raffinamento successivo, non come requisito minimo) - documentato
// come limite noto, non un bug.
function delayProfile_(visite) {
  var MIN_SAMPLES = 5;
  var BIN_DAYS = 7;
  var BIN_COUNT = 8;

  var reentries = visite.filter(function(visit) { return Boolean(visit.rientro_ts); });
  var closedVisits = visite.filter(function(visit) {
    return visitServiceTimeDays_(visit) > 0 || Boolean(visit.rientro_ts);
  });
  var delays = reentries
    .map(function(visit) {
      return Number(visit.t_cliente_d || 0) + Number(visit.t_ente_d || 0) + Number(visit.t_interno_d || 0);
    })
    .filter(function(days) { return days >= 0; });

  if (delays.length < MIN_SAMPLES) {
    return { sample_size: delays.length, alpha: null, bin_days: BIN_DAYS, kernel: null };
  }

  var kernelCounts = new Array(BIN_COUNT).fill(0);
  delays.forEach(function(days) {
    var bin = Math.min(Math.floor(days / BIN_DAYS), BIN_COUNT - 1);
    kernelCounts[bin]++;
  });

  // S1 (DESIGN_R_S.md §3.6): 80° percentile del tempo di attesa prima del
  // rientro - servira' per tarare la finestra H (Area 4/Fase T, fuori da
  // questo documento), calcolato sullo stesso campione 'delays' (tutto lo
  // storico disponibile, non filtrato sulla finestra di osservazione).
  var sortedDelays = delays.slice().sort(function(a, b) { return a - b; });

  return {
    sample_size: delays.length,
    alpha: closedVisits.length ? round_(reentries.length / closedVisits.length) : null,
    bin_days: BIN_DAYS,
    kernel: kernelCounts.map(function(count) { return round_(count / delays.length); }),
    p80_days: round_(percentile_(sortedDelays, 0.80))
  };
}

// S1/S3: percentile per rango (nearest-rank) su un campione ordinato
// crescente - sufficiente per l'uso qui (soglie indicative, non un
// requisito statistico stringente); p in [0,1].
function percentile_(sortedAscendingValues, p) {
  if (!sortedAscendingValues.length) { return null; }
  var index = Math.min(sortedAscendingValues.length - 1, Math.ceil(p * sortedAscendingValues.length) - 1);
  return sortedAscendingValues[Math.max(0, index)];
}

// R5: elenco dei job attualmente fermi in una colonna di attesa,
// ordinato per giorni trascorsi decrescenti - lo "stato attuale" che
// serve per sollecitare, distinto dal trend mensile sopra (che copre
// solo attese gia' concluse). S3 (DESIGN_R_S.md §3.8): il campo 'band'
// (verde/giallo/rosso) viene aggiunto dal chiamante (buildSystemState_)
// solo quando ci sono abbastanza campioni storici di tempo di ciclo -
// qui resta assente, comportamento identico a prima di S3.
function currentlyBlocked_(jobs, columnMap, now) {
  var result = [];
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)];
    var field = column ? SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS[column.id] : null;
    if (!field || !job.status_since_ts) { return; }
    var elapsed = Number(diffDays(job.status_since_ts, now) || 0);
    if (elapsed <= 0) { return; }
    result.push({ job_id: job.job_id, title: job.title, client: job.client, wait_type: field, elapsed_days: round_(elapsed) });
  });
  return result.sort(function(a, b) { return b.elapsed_days - a.elapsed_days; });
}

// S2/S3 (corretto in collaudo, addendum): aggrega la storia a grana
// settimanale (ultime weeksCount settimane) in tre numeri per settimana
// - WIP medio in punti, throughput osservato (punti completati quella
// settimana) e tempo di ciclo medio osservato (media di
// visitServiceTimeDays_ sulle visite chiuse quella settimana).
// Sostituisce la prima versione (wipCycleTimeScatter_/
// visitActiveInterval_, per-visita, WIP contato come numero grezzo di
// visite concorrenti) - il WIP va espresso in punti per essere
// confrontabile tra lavori di taglia diversa.
// S4 (DESIGN_R_S_addendum_collaudo.md, sez. S4): wip_medio arriva ora da
// fuori (activeWipWeeklyRounded, un array parallelo a weeksCount gia'
// calcolato da activeWipWeeklyFromLog_ - WIP ATTIVO ricostruito dal log
// dei passaggi di colonna), non piu' dal cumulato "entrato meno
// completato" (che includeva il tempo passato in backlog). Throughput e
// tempo di ciclo restano invariati - non c'entrano con questo problema.
function flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, weeksCount, activeWipWeeklyRounded) {
  var first = new Date(now.getTime() - weeksCount * 7 * 86400000);
  var buckets = [];
  var byKey = {};
  for (var i = 0; i < weeksCount; i++) {
    var date = new Date(first.getTime() + i * 7 * 86400000);
    var key = Utilities.formatDate(date, SIGMAFLOW.TZ, "yyyy-'W'ww");
    var bucket = { key: key, completed_points: 0, ct_samples: [] };
    buckets.push(bucket);
    byKey[key] = bucket;
  }
  // S2/S3, correzione aggiuntiva (addendum di collaudo, 2026-08-28):
  // throughput dal completamento TECNICO (consegna_ts sulla visita),
  // non dalla chiusura amministrativa (job.incarico_chiuso_ts, scritta
  // solo quando si spunta "Chiuso"/invoiced - verificato sui dati
  // reali: un solo job su 54 in tutta la storia l'ha mai valorizzato,
  // throughput quasi sempre a zero non per mancanza di consegne ma per
  // l'evento sbagliato). Bucketing per settimana sulle VISITE chiuse,
  // stessa nozione di "completato" di flow.completed_passages (R6.6):
  // solo consegna_ts, non rientro_ts (un rientro non e' un
  // completamento).
  var jobsById = indexBy_(jobs.concat(archivedJobs || []), 'job_id');
  visite.concat(visiteArchivio || []).forEach(function(visit) {
    if (visit.consegna_ts) {
      var job = jobsById[visit.job_id];
      if (job) {
        var dk = Utilities.formatDate(new Date(visit.consegna_ts), SIGMAFLOW.TZ, "yyyy-'W'ww");
        if (byKey[dk]) { byKey[dk].completed_points += jobPoints_(job); }
      }
    }
    var closeTs = visit.consegna_ts || visit.rientro_ts;
    if (!closeTs) { return; }
    var key = Utilities.formatDate(new Date(closeTs), SIGMAFLOW.TZ, "yyyy-'W'ww");
    if (!byKey[key]) { return; }
    var ct = visitServiceTimeDays_(visit);
    if (ct > 0) { byKey[key].ct_samples.push(ct); }
  });

  return buckets.map(function(b, index) {
    var ctAvg = b.ct_samples.length ? round_(b.ct_samples.reduce(function(s, v) { return s + v; }, 0) / b.ct_samples.length) : null;
    return {
      key: b.key,
      wip_medio: activeWipWeeklyRounded[index],
      throughput_punti_settimana: round_(b.completed_points),
      ct_medio_giorni: ctAvg,
      n_campioni_ct: b.ct_samples.length
    };
  });
}

// S4: classifica il ruolo di una colonna in una delle tre fasi del
// lavoro reale (WIP_COLUMN_CLASS, Constants.gs) - fallback 'backlog'
// per ruoli non mappati (non dovrebbe accadere, i ruoli sono un insieme
// chiuso, ma un fallback esplicito e' piu' sicuro di un undefined che si
// propaga in giro).
function wipColumnClass_(column) {
  return SIGMAFLOW.WIP_COLUMN_CLASS[column.role] || 'backlog';
}

// S4: ricostruisce la timeline di colonna di un job dai soli eventi
// 'move' di activity_log_json - un intervallo per ogni colonna
// attraversata, dall'ingresso (ts dell'evento) all'ingresso nella
// colonna successiva (o, per l'ultimo intervallo, incarico_chiuso_ts se
// il caso e' chiuso, altrimenti 'now' se ancora aperto). Stesso
// principio di base di computeVisiteFromLog_ (ActivityLog.gs): la
// sequenza reale viene dai 'to' degli eventi in ordine, mai da 'from'.
// Restituisce null (non un array vuoto) quando il log non ha nessun
// evento 'move' interpretabile - segnale esplicito per il chiamante di
// escludere il job dal calcolo, invece di stimarlo alla cieca.
function jobColumnIntervalsFromLog_(job, columnMap, now) {
  var moveLog = parseActivityLog_(job.activity_log_json).filter(function(event) {
    return event.type === 'move';
  });
  if (!moveLog.length) {
    return null;
  }
  var intervals = [];
  for (var i = 0; i < moveLog.length; i++) {
    var start = new Date(moveLog[i].ts);
    var end = (i + 1 < moveLog.length) ? new Date(moveLog[i + 1].ts) : new Date(job.incarico_chiuso_ts || now);
    var column = columnMap[moveLog[i].to] || { role: 'neutral' };
    // R9.14: 'role' esposto oltre a 'wip_class' - stockSeriesFromLog_ ne
    // ha bisogno per distinguere 'backlog' (stadio 1, incluso in "Lavoro
    // accettato") da 'neutral' (stadio 0, escluso) - wip_class li
    // confondeva entrambi nella classe 'backlog' (S4 non doveva
    // distinguerli, S4 guardava solo 'active').
    intervals.push({ start: start, end: end, wip_class: wipColumnClass_(column), role: column.role });
  }
  return intervals;
}

// R9.14, ottimizzazione (2026-08-28, dopo un crash reale segnalato da
// Marco su TEST - "Errore sconosciuto" caricando la dashboard): prima
// di questa modifica, ogni dashboard load ricostruiva gli intervalli di
// colonna dal log DUE VOLTE per ogni job - una volta per "Lavoro in
// corso" (S4/S6, 26 settimane) e una volta per "Lavoro accettato"
// (R9.14, monthBuckets_, 6 mesi) - stesso parsing di
// activity_log_json, stessa ricostruzione, sprecata due volte per ogni
// caricamento. Non e' confermato che questo fosse la causa del crash
// (nessuno stack trace disponibile, solo il messaggio generico lato
// client), ma e' un raddoppio di lavoro reale introdotto in questo
// giro, quindi va comunque eliminato: la ricostruzione per-job ora si
// fa una volta sola (buildJobIntervalsIndex_), condivisa tra tutte le
// popolazioni (role) che servono.
function buildJobIntervalsIndex_(jobs, archivedJobs, columnMap, now) {
  var entries = [];
  var excludedJobIds = [];
  // 'archived' per voce: necessario perche' non tutti gli usi condividono
  // la stessa popolazione - le serie storiche (settimanali/mensili)
  // includono sempre l'archivio (N6), ma un confronto "istante contro
  // istante" con un pannello live che legge solo 'jobs' (board attiva)
  // deve escludere l'archivio, altrimenti il confronto non e' piu'
  // apples-to-apples (vedi checkS4WipCoverage_).
  jobs.forEach(function(job) {
    var intervals = jobColumnIntervalsFromLog_(job, columnMap, now);
    if (!intervals) { excludedJobIds.push(job.job_id); return; }
    entries.push({ points: jobPoints_(job), intervals: intervals, archived: false });
  });
  (archivedJobs || []).forEach(function(job) {
    var intervals = jobColumnIntervalsFromLog_(job, columnMap, now);
    if (!intervals) { excludedJobIds.push(job.job_id); return; }
    entries.push({ points: jobPoints_(job), intervals: intervals, archived: true });
  });
  return { entries: entries, excluded_job_ids: excludedJobIds };
}

// R9.14: motore unico di ricostruzione "quanti punti erano in un dato
// insieme di colonne (per role), settimana/mese per settimana/mese" -
// generalizza activeWipWeeklyFromLog_ (S4, filtro fisso su 'active')
// sull'insieme di 'role' da includere, cosi' la stessa logica per-job
// serve sia "Lavoro in corso" (prep/wip/stand_by) sia "Lavoro accettato"
// (backlog/prep/wip/stand_by), riusando lo stesso indice precalcolato
// (jobIndex, da buildJobIntervalsIndex_) invece di riparsare il log.
// 'buckets' e' un array di { start, end } di qualunque durata
// (settimana o mese) - il peso e' proporzionale ai giorni di
// sovrapposizione sulla durata del singolo bucket, non fissato a 7.
function stockSeriesFromIndex_(jobIndex, buckets, includeRoles) {
  var series = buckets.map(function(b) { return { start: b.start, end: b.end, points: 0 }; });
  jobIndex.entries.forEach(function(entry) {
    entry.intervals.forEach(function(interval) {
      if (includeRoles.indexOf(interval.role) === -1) { return; }
      series.forEach(function(bucket) {
        var overlapStart = interval.start > bucket.start ? interval.start : bucket.start;
        var overlapEnd = interval.end < bucket.end ? interval.end : bucket.end;
        var overlapDays = (overlapEnd - overlapStart) / 86400000;
        var bucketDays = (bucket.end - bucket.start) / 86400000;
        if (overlapDays > 0 && bucketDays > 0) {
          bucket.points += (overlapDays / bucketDays) * entry.points;
        }
      });
    });
  });
  return {
    values: series.map(function(b) { return round_(b.points); }),
    excluded_job_ids: jobIndex.excluded_job_ids
  };
}

// Retrocompatibile: costruisce l'indice al volo e delega a
// stockSeriesFromIndex_ - usata dai chiamanti che non hanno gia' un
// indice pronto (test, usi isolati). I chiamanti "caldi" (buildSystemState_)
// costruiscono l'indice UNA volta e passano jobIndex direttamente alle
// due funzioni sopra, per non ripetere il parsing del log.
function stockSeriesFromLog_(jobs, archivedJobs, columnMap, now, buckets, includeRoles) {
  return stockSeriesFromIndex_(buildJobIntervalsIndex_(jobs, archivedJobs, columnMap, now), buckets, includeRoles);
}

// Definizione dei bucket settimanali (usata da S4/S6 - "Lavoro in
// corso", e dai test) - separata da stockSeriesFromLog_ perche' il
// bucketing mensile di "Lavoro accettato" (R9.14, monthBuckets_) usa
// bucket di durata diversa (mese solare, non 7 giorni fissi).
function weeklyBucketDefs_(now, weeksCount) {
  var first = new Date(now.getTime() - weeksCount * 7 * 86400000);
  var weeks = [];
  for (var i = 0; i < weeksCount; i++) {
    var start = new Date(first.getTime() + i * 7 * 86400000);
    weeks.push({ start: start, end: new Date(start.getTime() + 7 * 86400000) });
  }
  return weeks;
}

// S4, generalizzata in R9.14 (addendum di collaudo): resta con questo
// nome e questa firma (usata da S4/S6, grafici diagnostici) - delega
// pero' allo stesso motore di stockSeriesFromIndex_ usato anche per
// "Lavoro accettato" (R9.14, monthBuckets_), invece di ricostruire gli
// intervalli una seconda volta con un filtro copiato. 'jobIndex'
// (facoltativo, da buildJobIntervalsIndex_) evita di riparsare il log
// quando il chiamante (buildSystemState_) l'ha gia' costruito per un
// altro uso - senza, lo costruisce al volo (retrocompatibile con i
// chiamanti/test esistenti).
function activeWipWeeklyFromLog_(jobs, archivedJobs, columnMap, now, weeksCount, jobIndex) {
  var index = jobIndex || buildJobIntervalsIndex_(jobs, archivedJobs, columnMap, now);
  var result = stockSeriesFromIndex_(index, weeklyBucketDefs_(now, weeksCount), ['prep', 'wip', 'stand_by']);
  return { weekly: result.values, excluded_job_ids: result.excluded_job_ids };
}

// S6 (addendum di collaudo, sostituisce wipBands_): media mobile
// ordinata per WIP crescente, finestra a NUMERO FISSO di campioni (non
// a larghezza fissa in punti come le vecchie fasce - si adatta meglio
// quando i campioni non sono distribuiti uniformemente lungo l'asse
// WIP: con le fasce a larghezza fissa, le fasce a WIP basso avevano
// molte settimane dentro, quelle a WIP alto ne avevano appena il
// minimo, media ballerina).
var WIP_MOVING_AVERAGE_WINDOW_ = 5;
function wipMovingAverage_(weeklyBuckets, windowSize) {
  var valid = weeklyBuckets.filter(function(b) { return b.ct_medio_giorni !== null; })
    .sort(function(a, b) { return a.wip_medio - b.wip_medio; });
  var result = [];
  for (var i = 0; i + windowSize <= valid.length; i++) {
    var windowRows = valid.slice(i, i + windowSize);
    var avg = function(f) { return round_(windowRows.reduce(function(s, w) { return s + f(w); }, 0) / windowSize); };
    result.push({
      wip_medio: avg(function(w) { return w.wip_medio; }),
      throughput_medio: avg(function(w) { return w.throughput_punti_settimana; }),
      ct_medio: avg(function(w) { return w.ct_medio_giorni; }),
      n_campioni: windowSize
    });
  }
  return result;
}

// S6: regressione lineare (minimi quadrati) y = A + Bx - base comune per
// i due fit teorici sotto, entrambi risolti per linearizzazione (mai un
// solutore non lineare iterativo: con questi pochi campioni un
// solutore iterato rischia di non convergere, o di convergere su un
// minimo locale senza un modo semplice per accorgersene).
function linearRegression_(points) {
  var n = points.length;
  if (n < 2) { return null; }
  var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach(function(p) {
    sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x;
  });
  var denom = n * sumXX - sumX * sumX;
  if (denom === 0) { return null; }
  var B = (n * sumXY - sumX * sumY) / denom;
  var A = (sumY - B * sumX) / n;
  return { A: A, B: B };
}

// S6: soglia minima per la curva tratteggiata - non tarata su quanti
// campioni ci sono oggi (sarebbe lo stesso trucco gia' trovato altrove:
// una soglia scelta per far entrare i dati attuali invece che per un
// criterio a monte). Una curva a 2 parametri ha bisogno di almeno 4-5
// volte tanti punti quanti parametri per non essere degenere.
var MIN_SAMPLES_FOR_THEORETICAL_FIT_ = 10;

// S6: fit teorico del tempo di ciclo - forma asintotica (cresce senza
// limite quando il WIP si avvicina al WIP critico del sistema),
// fittata sui PUNTI GREZZI settimanali (mai sulla media mobile -
// fittare su dati gia' smussati smorza il rumore due volte e
// restituisce una curva piu' precisa di quanto i dati giustifichino).
// Modello: ct(w) = a / (w0 - w) - linearizzato in 1/ct = (w0/a) -
// (1/a)*w, una retta in (w, 1/ct), risolta con OLS.
function cycleTimeTheoreticalFit_(weeklyBuckets) {
  var raw = weeklyBuckets.filter(function(b) { return b.ct_medio_giorni !== null && b.ct_medio_giorni > 0; });
  if (raw.length < MIN_SAMPLES_FOR_THEORETICAL_FIT_) { return null; }
  var reg = linearRegression_(raw.map(function(b) { return { x: b.wip_medio, y: 1 / b.ct_medio_giorni }; }));
  // B deve essere negativo (1/ct decresce al crescere del WIP, cioe' il
  // tempo di ciclo cresce) perche' l'asintoto abbia senso - altrimenti i
  // dati non mostrano ancora la forma attesa: meglio nessuna curva che
  // una curva fuorviante.
  if (!reg || reg.B >= 0) { return null; }
  var a = -1 / reg.B;
  var w0 = reg.A * a;
  if (w0 <= 0) { return null; }
  return { a: round_(a), w0: round_(w0), n_samples: raw.length };
}

// S6: fit teorico del throughput - forma a saturazione (cresce poi si
// appiattisce verso un massimo), stessa scelta di linearizzazione
// (Lineweaver-Burk: 1/th = 1/Tmax + (K/Tmax)*(1/w)), sui punti grezzi
// settimanali con throughput > 0 e WIP > 0 (1/0 non definito).
function throughputTheoreticalFit_(weeklyBuckets) {
  var raw = weeklyBuckets.filter(function(b) { return b.ct_medio_giorni !== null && b.throughput_punti_settimana > 0 && b.wip_medio > 0; });
  if (raw.length < MIN_SAMPLES_FOR_THEORETICAL_FIT_) { return null; }
  var reg = linearRegression_(raw.map(function(b) { return { x: 1 / b.wip_medio, y: 1 / b.throughput_punti_settimana }; }));
  if (!reg || reg.A <= 0) { return null; }
  var tMax = 1 / reg.A;
  var k = reg.B * tMax;
  if (k <= 0) { return null; }
  return { t_max: round_(tMax), k: round_(k), n_samples: raw.length };
}

// Fase L4: 'visite' non ha size_class (e' anagrafica del caso, non della
// visita) — jobsById fa da join per etichettare ciascuna visita con la
// taglia del proprio caso.
function leadTimeBySize_(visite, jobsById) {
  var groups = {};
  ['XS', 'S', 'M', 'L', 'XL'].forEach(function(size) {
    groups[size] = [];
  });

  visite.forEach(function(visit) {
    var job = jobsById[visit.job_id] || {};
    var size = job.size_class || 'M';
    if (!groups[size]) {
      groups[size] = [];
    }
    var leadTimeDays = visitLeadTimeDays_(visit);
    if (leadTimeDays > 0) {
      groups[size].push(leadTimeDays);
    }
  });

  var result = {};
  Object.keys(groups).forEach(function(size) {
    var stats = sampleStats_(groups[size]);
    result[size] = {
      count: groups[size].length,
      mean: round_(stats.mean),
      stddev: round_(Math.sqrt(stats.variance))
    };
  });
  return result;
}

function countBy_(rows, field) {
  return rows.reduce(function(acc, row) {
    var key = row[field] || 'vuoto';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function indexBy_(rows, key) {
  var map = {};
  rows.forEach(function(row) {
    map[row[key]] = row;
  });
  return map;
}

// Tempo di servizio della visita (DESIGN_modello_caso_visita.md, sez. 5):
// consegna_ts - start_ts, oppure rientro_ts - start_ts se la visita si
// e' chiusa su un rientro senza mai raggiungere done.
function visitServiceTimeDays_(visit) {
  if (visit.start_ts && visit.consegna_ts) {
    return diffDays(visit.start_ts, visit.consegna_ts);
  }
  if (visit.start_ts && visit.rientro_ts && !visit.consegna_ts) {
    return diffDays(visit.start_ts, visit.rientro_ts);
  }
  return 0;
}

// Tempo dall'apertura alla consegna della visita (include attesa
// incarico/preparazione, non solo lavorazione) — analogo di lead_time_d
// a livello di visita invece che di caso.
function visitLeadTimeDays_(visit) {
  if (visit.apertura_ts && visit.consegna_ts) {
    return diffDays(visit.apertura_ts, visit.consegna_ts);
  }
  return 0;
}

function unstableQueue_() {
  return { Wq: null, W: null, Lq: null, L: null };
}

function round_(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

// S4 (DESIGN_R_S_addendum_collaudo.md, sez. S4): diagnostica di sola
// lettura, richiesta esplicitamente prima di considerare S4 chiuso -
// (1) copertura del log (quanti job sono esclusi dal calcolo perche'
// activity_log_json non ha eventi 'move' interpretabili) e (2) verifica
// di coerenza tra il WIP attivo ricostruito per la settimana corrente e
// il totale del pannello per-colonna live (colonne non-backlog,
// non-done) - stessa fotografia, deve tornare lo stesso numero (a meno
// di arrotondamento). Nessuna scrittura.
function checkS4WipCoverage_() {
  var config = readConfig_();
  var jobs = loadJobsWithVisitSummary_();
  var archivedJobs = loadArchivedJobsWithVisitSummary_();
  var columnMap = {};
  columnsFromConfig_(config).forEach(function(column) { columnMap[column.id] = column; });
  var now = new Date();
  var weeksCount = Number(config.wip_trend_weeks || 26); // S5

  var livePanelPoints = 0;
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral' };
    if (wipColumnClass_(column) === 'active') {
      livePanelPoints += jobPoints_(job);
    }
  });
  livePanelPoints = round_(livePanelPoints);

  // R9.14, ottimizzazione: un solo parsing di activity_log_json per
  // job (buildJobIntervalsIndex_), condiviso da tutte le verifiche
  // sotto invece di riparsare il log per ognuna - questa diagnostica
  // arrivava a farlo 4-5 volte per esecuzione.
  var jobIntervalsIndex = buildJobIntervalsIndex_(jobs, archivedJobs, columnMap, now);

  // Verifica che conta davvero: "in che colonna e' questo job ADESSO,
  // secondo l'ultimo intervallo ricostruito dal log" deve dare la
  // stessa risposta di job.status (il campo che il pannello live legge
  // direttamente). Se non coincide, la ricostruzione (o l'allineamento
  // status<->log) ha un bug reale - a differenza del confronto sotto,
  // qui la fotografia e' letteralmente la stessa istante per istante,
  // nessuna media di mezzo.
  var instantWipPoints = 0;
  jobIntervalsIndex.entries.forEach(function(entry) {
    if (entry.archived) { return; } // il pannello live legge solo la board attiva
    var lastInterval = entry.intervals[entry.intervals.length - 1];
    if (lastInterval.wip_class === 'active') {
      instantWipPoints += entry.points;
    }
  });
  instantWipPoints = round_(instantWipPoints);

  // Il valore che finisce davvero in systemState.flowWeeklyBuckets (la
  // MEDIA sui 7 giorni della settimana corrente, non un'istantanea) -
  // include sempre l'archivio (N6), come in produzione.
  var weeklyAverage = activeWipWeeklyFromLog_(jobs, archivedJobs, columnMap, now, weeksCount, jobIntervalsIndex);
  var currentWeekAverage = weeklyAverage.weekly[weeklyAverage.weekly.length - 1];

  // S2/S3, correzione aggiuntiva (addendum di collaudo, 2026-08-28):
  // verifica obbligatoria dopo il fix del throughput (consegna_ts,
  // non piu' incarico_chiuso_ts) - se i grafici scatter restano vuoti
  // su TEST live, la lunghezza della media mobile (S6) e un riepilogo di
  // flowWeeklyBuckets vanno riportati esplicitamente, non dati per
  // scontato come scarsita' di dati.
  var visite = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE));
  var visiteArchivio = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));
  var flowWeekly = flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, weeksCount, weeklyAverage.weekly);
  // S6 (sostituisce wipBands_): stessa verifica di prima (i grafici
  // diagnostici mostrano dati reali, non "Dato non ancora sufficiente"),
  // ora sulla media mobile invece delle fasce a larghezza fissa.
  var movingAverage = wipMovingAverage_(flowWeekly, WIP_MOVING_AVERAGE_WINDOW_);
  var cycleFit = cycleTimeTheoreticalFit_(flowWeekly);
  var throughputFitResult = throughputTheoreticalFit_(flowWeekly);
  var weeksWithThroughput = flowWeekly.filter(function(w) { return w.throughput_punti_settimana > 0; }).length;
  var weeksWithCycleTimeSample = flowWeekly.filter(function(w) { return w.n_campioni_ct > 0; }).length;

  // R6.6, completamento: "Lavori completati" (flow.completed_initiatives)
  // e "Passaggi completati" (flow.completed_passages) vengono dallo
  // stesso insieme 'completed' (consegna_ts nella finestra, nessun
  // filtro sul tempo di servizio) - il primo e' deduplicato per job_id,
  // il secondo conta ogni visita. Coincidono solo se nessun job ha piu'
  // di una visita consegnata nella finestra - non piu' garantiti
  // uguali per costruzione (pipeline diversa da points.completed_cards,
  // che usa job.done_ts).
  var since = new Date(now.getTime() - Number(config.observation_window_days || 30) * 864e5);
  var points = pointsStatistics_(jobs, archivedJobs, columnMap, since, now, [], jobIntervalsIndex);
  var allVisite = visite.concat(visiteArchivio || []);
  var completedVisitesInWindow = allVisite.filter(function(v) {
    return v.consegna_ts && new Date(v.consegna_ts) >= since;
  });
  var completedInitiatives = Object.keys(initiativeGroups_(completedVisitesInWindow)).length;
  var completedPassages = completedVisitesInWindow.length;

  // R9.14: verifica obbligatoria, stesso principio gia' applicato a S4
  // (istante contro istante, non media contro istante - una MEDIA su
  // tutto il mese corrente, confrontata con una fotografia di adesso,
  // differirebbe legittimamente con qualunque churn nel mese, come gia'
  // visto per il WIP settimanale - non sarebbe una verifica vera).
  // "in che colonna e' questo job ADESSO, secondo l'ultimo intervallo
  // ricostruito dal log" per l'insieme di role di "Lavoro accettato"
  // (backlog/prep/wip/stand_by) deve dare lo stesso totale della card
  // live (points.committed_points, stessa popolazione via workStage_).
  var acceptedRoles = ['backlog', 'prep', 'wip', 'stand_by'];
  var instantAcceptedPoints = 0;
  jobIntervalsIndex.entries.forEach(function(entry) {
    if (entry.archived) { return; } // il pannello live legge solo la board attiva
    var lastInterval = entry.intervals[entry.intervals.length - 1];
    if (acceptedRoles.indexOf(lastInterval.role) !== -1) {
      instantAcceptedPoints += entry.points;
    }
  });
  instantAcceptedPoints = round_(instantAcceptedPoints);
  // Informativo (come current_week_average_wip sopra): la MEDIA sul
  // mese corrente che finisce davvero nel grafico "Andamento del
  // carico" (monthBuckets_.accepted_points) - puo' differire
  // legittimamente dalla fotografia di adesso con qualunque churn nel
  // mese, non e' il criterio di pass/fail.
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  var currentMonthAcceptedAverage = stockSeriesFromIndex_(jobIntervalsIndex, [{ start: monthStart, end: monthEnd }], acceptedRoles).values[0];

  return {
    executed_at: nowIso_(),
    total_jobs_scanned: jobs.length + archivedJobs.length,
    excluded_jobs: weeklyAverage.excluded_job_ids.length,
    excluded_job_ids: weeklyAverage.excluded_job_ids,
    // Verifica "istante contro istante" - questa e' quella che deve
    // tornare 0 (a meno di arrotondamento). Se non torna, il log
    // dell'ultimo evento di qualche job non concorda con job.status:
    // un problema reale di allineamento, da segnalare con i job_id
    // coinvolti, non un effetto di media settimanale.
    instant_wip_from_log: instantWipPoints,
    instant_wip_live_panel: livePanelPoints,
    instant_difference: round_(instantWipPoints - livePanelPoints),
    // Informativo, NON un criterio di pass/fail: la media sui 7 giorni
    // della settimana corrente differisce legittimamente dalla fotografia
    // di adesso se anche un solo job e' entrato o uscito da una colonna
    // 'active' durante la settimana (rientro, avvio lavorazione,
    // chiusura, archiviazione) - una differenza qui e' attesa con
    // qualunque churn reale, non e' un sintomo di bug.
    current_week_average_wip: currentWeekAverage,
    current_week_average_vs_live_panel_difference: round_(currentWeekAverage - livePanelPoints),
    // S2/S3, correzione aggiuntiva: se wip_bands_length < 3, i grafici
    // scatter mostrano "Dato non ancora sufficiente" - questi numeri
    // dicono se e' davvero scarsita' di dati o una discrepanza da
    // indagare (vedi commento sopra).
    weeks_with_throughput_gt_0: weeksWithThroughput,
    weeks_with_cycle_time_sample: weeksWithCycleTimeSample,
    wip_moving_average_length: movingAverage.length,
    cycle_time_theoretical_fit: cycleFit,
    throughput_theoretical_fit: throughputFitResult,
    // R6.6, completamento: attesa una differenza strutturale (pipeline
    // diverse), non piu' una coincidenza garantita.
    completed_initiatives_periodo: completedInitiatives,
    completed_passages_periodo: completedPassages,
    completed_cards_periodo_punti: points.completed_cards,
    // R9.14: istante-contro-istante, deve tornare 0 (a meno di
    // arrotondamento) - se non torna e' un bug reale nella ricostruzione,
    // da risolvere prima di considerare chiuso il punto, non una
    // differenza da spiegare con una nota.
    accepted_work_instant_from_log: instantAcceptedPoints,
    accepted_work_instant_live_panel: points.committed_points,
    accepted_work_instant_difference: round_(instantAcceptedPoints - points.committed_points),
    // Informativo, non un criterio di pass/fail - vedi commento sopra.
    accepted_work_current_month_average: currentMonthAcceptedAverage
  };
}

// Wrapper eseguibili dall'editor Apps Script (menu Esegui) o via
// `clasp run` - stesso pattern gia' in uso per le altre diagnostiche di
// sola lettura del progetto (withEnvironment_ con requiresLock=false,
// come fa gia' api() per le azioni classificate come lettura).
function checkS4WipCoverageOnTest() {
  return withEnvironment_('test', function() {
    var result = checkS4WipCoverage_();
    Logger.log(JSON.stringify(result));
    return result;
  }, false);
}

function checkS4WipCoverageSuProd() {
  return withEnvironment_('prod', function() {
    var result = checkS4WipCoverage_();
    Logger.log(JSON.stringify(result));
    return result;
  }, false);
}

// R6.2 (terzo giro di correzioni, 2026-08-28): l'audit del 28/08 aveva
// isolato "Tasso di servizio per persona (mu)" come l'unico valore
// incoerente con gli altri cinque della stessa pagina (E[S]/capacita'/
// rho/carico effettivo/margine) - se si ricalcola rho con mu=0,14 non
// torna il 570% mostrato, prova che il resto della pagina non usa gia'
// 0,14. Diagnostica di sola lettura, nessuna scrittura: ricalcola mu
// in due modi indipendenti (la stessa formula/popolazione di
// calculateMetrics_, e il mu implicito nella capacita' effettiva
// mostrata gia' divisa per team_size) e li confronta col valore
// effettivamente esposto (metrics.mu) - se tutti e tre coincidono,
// l'incoerenza vista nell'audit non e' piu' presente (o era un dato
// del momento, non un bug di calcolo); se calculated_mu/displayed_mu
// non coincidono, e' un bug reale nel campo "mu" specificamente.
function checkMuConsistency_() {
  var config = readConfig_();
  var jobs = loadJobsWithVisitSummary_();
  var archivedJobs = loadArchivedJobsWithVisitSummary_();
  var visite = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE));
  var visiteArchivio = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));
  var now = new Date();
  var metrics = calculateMetrics_(jobs, visite, config, now, archivedJobs, visiteArchivio);

  // Stessa formula/popolazione di calculateMetrics_ (righe 54-67),
  // ricalcolata qui in modo indipendente per il confronto.
  var windowDays = Math.max(1, Number(config.observation_window_days || 30));
  var since = new Date(now.getTime() - windowDays * 864e5);
  var allVisite = visite.concat(visiteArchivio || []);
  var completed = allVisite.filter(function(v) { return v.consegna_ts && new Date(v.consegna_ts) >= since; });
  var completedSamples = completed.filter(function(v) { return visitServiceTimeDays_(v) > 0; });
  var serviceTimes = completedSamples.map(visitServiceTimeDays_);
  var stats = sampleStats_(serviceTimes);
  var teamSize = Math.max(1, Number(config.team_size || 1));
  var recomputedMu = stats.mean > 0 ? round_(1 / stats.mean) : null;
  var effectiveCapacity = metrics.systemState.capacityMetrics.effective_per_day;
  var capacityImpliedMu = effectiveCapacity !== null ? round_(effectiveCapacity / teamSize) : null;

  return {
    displayed_mu: metrics.mu,
    recomputed_mu_same_formula: recomputedMu,
    capacity_implied_mu: capacityImpliedMu,
    displayed_matches_recomputed: metrics.mu === recomputedMu,
    displayed_matches_capacity_implied: metrics.mu === capacityImpliedMu,
    recomputed_stats_mean_days: round_(stats.mean),
    recomputed_completed_samples: completedSamples.length,
    team_size: teamSize,
    effective_capacity_per_day: effectiveCapacity,
    window_days: windowDays,
    since: since.toISOString()
  };
}

function checkMuConsistencyOnTest() {
  return withEnvironment_('test', function() {
    var result = checkMuConsistency_();
    Logger.log(JSON.stringify(result));
    return result;
  }, false);
}
