function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  template.view = (e && e.parameter && e.parameter.view) || 'board';
  template.env = normalizeEnv_(e && e.parameter && e.parameter.env);
  return template.evaluate()
    .setTitle('SigmaFlow')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// P3 (DESIGN_lock_ambiente.md §2.3): prima chiamava routeAction_
// direttamente, bypassando interamente api()/withEnvironment_ — nessuna
// risoluzione d'ambiente (P1), nessuna classificazione lettura/scrittura
// per il lock (P2). Ora delega ad api(), la stessa funzione gia' usata
// da ogni chiamata google.script.run reale — eredita entrambi i
// meccanismi senza logica nuova. Unico effetto collaterale: la risposta
// guadagna un campo data.env, come gia' avviene per ogni risposta di
// api() — nessun consumatore noto di doPost da aggiornare.
function doPost(e) {
  try {
    var params = parseRequest_(e);
    return json_(api(params.action, params));
  } catch (err) {
    return json_(fail_(err.message));
  }
}

// P2 (DESIGN_lock_ambiente.md §2.2/§4, gate confermato da Marco
// 2026-08-26): uniche azioni classificate lettura — mai scrivono
// jobs/visite/config/archivio/cestino, censite una per una contro
// routeAction_, non dedotte per intuito. Ogni altra azione di
// routeAction_ resta di scrittura e sotto lock globale, nessuna
// eccezione (moveJob/addActivityEvent/updateActivityEvent/
// deleteActivityEvent inclusi — non hanno un lock proprio, dipendono al
// 100% da questo per la sicurezza in concorrenza).
var SF_READ_ACTIONS_ = {
  getBoard: true,
  getActivityLog: true,
  getArchivio: true,
  getCestino: true,
  getMetrics: true
};

function api(action, payload) {
  try {
    payload = payload || {};
    payload.action = action;
    var requiresLock = !SF_READ_ACTIONS_[action];
    return withEnvironment_(payload.env, function() {
      var response = routeAction_(payload);
      if (response && response.success && response.data) {
        response.data.env = normalizeEnv_(payload.env);
      }
      return response;
    }, requiresLock);
  } catch (err) {
    return fail_(err.message);
  }
}

function parseRequest_(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      params = e.parameter || {};
    }
  } else {
    params = (e && e.parameter) || {};
  }
  return params;
}

function routeAction_(params) {
  var action = requireParam_(params, 'action');
  var routes = {
    getBoard: getBoard,
    addJob: addJob,
    moveJob: moveJob,
    updateJob: updateJob,
    addActivityEvent: addActivityEvent,
    getActivityLog: getActivityLog,
    updateActivityEvent: updateActivityEvent,
    deleteActivityEvent: deleteActivityEvent,
    migrateToActivityLog: migrateToActivityLog,
    migrateVisiteFromHistory: migrateVisiteFromHistory,
    deleteJob: deleteJob,
    archiveJob: archiveJob,
    getArchivio: getArchivio,
    getCestino: getCestino,
    ripristinaJob: ripristinaJob,
    duplicaJob: duplicaJob,
    eliminaJobDefinitivamente: eliminaJobDefinitivamente,
    svuotaCestino: svuotaCestino,
    updateColumnLabel: updateColumnLabel,
    addColumn: addColumn,
    updateColumn: updateColumn,
    moveColumn: moveColumn,
    updateOptionList: updateOptionList,
    seedTestData: seedTestData,
    getMetrics: getMetrics
  };

  if (!routes[action]) {
    throw new Error('Azione non supportata: ' + action);
  }

  return routes[action](params);
}

function getBoard() {
  // P2: getBoard e' una lettura, gira SENZA il lock globale (vedi api())
  // — acquireOwnLock=true fa si' che ensureCurrentSchema_() prenda un
  // lock proprio, ma solo nella rara finestra in cui deve scrivere.
  ensureCurrentSchema_(true);
  var jobs = loadJobsWithVisitSummary_();
  var columns = readColumns_();
  var board = {};
  var columnMeta = [];
  columns.forEach(function(column) {
    board[column.id] = [];
  });

  jobs.forEach(function(job) {
    var status = normalizeStatus_(job.status);
    job.status = status;
    if (!board[status]) {
      board[status] = [];
    }
    board[status].push(job);
  });

  columns.forEach(function(column) {
    var points = (board[column.id] || []).reduce(function(sum, job) {
      return sum + Number(job.size_points || 0);
    }, 0);
    columnMeta.push({
      id: column.id,
      status: column.id,
      label: column.label,
      role: column.role,
      order: column.order,
      color: column.color,
      hidden: coerceBoolean_(column.hidden),
      // M0-C: terza copia dello stesso rischio gia' corretto in
      // normalizeColumns_/writeColumns_ (Utils.gs) — column_meta e'
      // l'oggetto che arriva davvero al frontend via getBoard(), senza
      // questo campo aging_days non avrebbe mai avuto effetto visibile
      // nonostante fosse gia' letto/scritto correttamente sul foglio.
      aging_days: column.aging_days,
      count: (board[column.id] || []).length,
      points: points
    });
  });

  return ok_({
    columns: board,
    column_meta: columnMeta,
    jobs: jobs,
    options: boardOptions_(jobs),
    priority_classes: SIGMAFLOW.PRIORITY_CLASSES
  });
}

function addJob(params) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var title = requireParam_(params, 'title');
  var sizeClass = params.size_class || 'M';
  var status = validateColumnId_(params.status || firstColumnIdByRole_('backlog'));
  var now = nowIso_();
  var targetColumn = findColumn_(readColumns_(), status);
  var priority = priorityFields_(params);
  var job = {
    job_id: generateJobId(),
    title: title,
    client: params.client || '',
    ambassador: params.ambassador || '',
    status: status,
    assignee: params.assignee || '',
    tag: params.tag || '',
    size_class: sizeClass,
    size_points: SIGMAFLOW.SIZE_POINTS[sizeClass] || SIGMAFLOW.SIZE_POINTS.M,
    priority_class: priority.priority_class,
    priority_class_manual: priority.priority_class_manual,
    impact: priority.impact,
    manageability: priority.manageability,
    priority_score: priority.priority_score,
    description: params.description || '',
    due_date: params.due_date || '',
    arrival_ts: now,
    invoiced: coerceBoolean_(params.invoiced),
    card_color: normalizeCardColor_(params.card_color),
    // M0-C: la card nasce gia' in una colonna, quindi gia' "da quando"
    // ci si trova — stesso principio del suo primo evento di creazione.
    status_since_ts: now
  };

  // Evento automatico di creazione, stesso pattern dell'evento auto scritto
  // da moveJob: from null perche' non esiste una colonna di provenienza.
  // Senza questo, ogni nuova card nascerebbe con la Cronologia vuota anche
  // se arrival_ts e' gia' valorizzato correttamente sul campo strutturato.
  var creationEvent = {
    id: generateActivityEventId_(),
    ts: now,
    type: 'move',
    source: 'auto',
    to: targetColumn.id,
    from: null,
    note: ''
  };
  job.activity_log_json = serializeActivityLog_([creationEvent]);

  sheet.appendRow(jobToRow_(job));

  // Modello caso/visita: la visita 1 nasce con la card, stesso principio
  // del gate-setting in computeVisiteFromLog_ (ActivityLog.gs) applicato
  // alla colonna di destinazione iniziale — senza questo, un job creato
  // direttamente in WIP/TO DO/DONE non avrebbe alcuna riga 'visite'
  // finche' non viene spostato per la prima volta.
  var visiteSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (visiteSheet) {
    appendVisitRow_(visiteSheet, {
      job_id: job.job_id,
      numero_visita: 1,
      apertura_ts: now,
      incarico_ts: targetColumn.role === 'backlog' ? now : '',
      prep_ts: targetColumn.role === 'prep' ? now : '',
      start_ts: targetColumn.role === 'wip' ? now : '',
      consegna_ts: targetColumn.role === 'done' ? now : '',
      rientro_ts: '',
      rientro_da: '',
      t_cliente_d: 0,
      t_ente_d: 0,
      t_interno_d: 0,
      rework_cause: ''
    });
  }

  return ok_({ job_id: job.job_id, job: job });
}

function moveJob(params) {
  ensureCurrentSchema_();
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  // O1 (DESIGN_performance.md, punto C): letto una sola volta, riusato
  // anche piu' sotto per sourceColumn/targetColumn invece di rileggere
  // il foglio 'config' una seconda volta nella stessa chiamata.
  var columns = readColumns_();
  var status = validateColumnId_(requireParam_(params, 'status'), columns);
  var headers = getHeaderMap_(sheet);
  var now = nowIso_();
  var job = readJobFromRow_(sheet, row, headers);

  // Spostamento verso la colonna in cui la card si trova gia': nessun
  // cambiamento reale, quindi nessun evento in Cronologia (sarebbe solo
  // fuorviante, "X -> X" senza alcun significato) e nessun tocco a
  // gate/visite. Capita spesso quando la board non da' un feedback
  // visivo immediato del drag: l'utente rilascia la card piu' volte
  // pensando che non si sia spostata (segnalato da Marco in collaudo).
  if (normalizeStatus_(job.status) === status) {
    // Nessuna mutazione di 'visite', ma il job restituito deve comunque
    // avere i campi di rientro (altrimenti il merge lato client — M0-A2,
    // niente piu' reload completo dopo una mossa — sovrascriverebbe il
    // badge Rnn gia' corretto sulla card con dei campi assenti).
    var visiteSheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE);
    var openRow = visiteSheet ? findOpenVisitRow_(visiteSheet, job.job_id) : -1;
    applyVisitSummaryFields_(job, openRow > 0 ? readVisitFromRow_(visiteSheet, openRow) : null);
    return ok_({ job_id: params.job_id, status: status, job: job });
  }

  var sourceColumn = findColumn_(columns, job.status) || { id: job.status, role: 'neutral' };
  var targetColumn = findColumn_(columns, status);

  // Il rientro da un'attesa o da completato verso WIP e' sempre vietato:
  // deve passare prima da TO DO/BACKLOG, che e' anche il punto in cui si
  // apre la nuova visita (sez. 2 di DESIGN_modello_caso_visita.md).
  var sourceClosesTowardActive = sourceColumn.role === 'stand_by' || sourceColumn.role === 'done';

  if (sourceClosesTowardActive && targetColumn.role === 'wip') {
    throw new Error('Il rientro diretto da una colonna di attesa o da completato a WIP non e consentito. Sposta prima il job in TO DO o in una colonna precedente.');
  }

  // Regola caso/visita (sez. 2): chiusura della visita aperta + apertura
  // della successiva su qualunque spostamento con provenienza stand_by/done
  // e destinazione backlog/prep. Uno spostamento tra due colonne di attesa
  // diverse, o l'ingresso in done, non apre/chiude nulla — vedi
  // computeVisiteFromLog_ (ActivityLog.gs) per gli accumulatori e consegna_ts.
  var closesVisit = sourceClosesTowardActive && (targetColumn.role === 'backlog' || targetColumn.role === 'prep');

  if (targetColumn.role === 'backlog' && !job.arrival_ts) {
    job.arrival_ts = now;
  }

  // N2 (DESIGN_archiviazione.md, §8c): un rientro reale (apertura di una
  // nuova visita) su un caso gia' marcato "Chiuso" lo rende di nuovo
  // attivo — incarico_chiuso_ts, che guida sia il bottone "Archivia" sia
  // il trigger automatico (§4.1), non deve piu' riferirsi a una chiusura
  // ormai superata. invoiced (la spunta "Chiuso" in UI) resta invariato
  // di proposito: e' un campo separato, gestito solo da updateJob (§1) -
  // qui si tocca solo il campo che guida l'eleggibilita' all'archiviazione.
  if (closesVisit && job.incarico_chiuso_ts) {
    job.incarico_chiuso_ts = '';
  }

  job.status = status;
  // M0-C: solo qui, non nel self-move sopra (early return, la card non
  // ha mai lasciato la colonna) — "da quando" si trova nella colonna
  // ATTUALE, non da quando e' stata creata o dall'ultimo cambio di
  // qualunque altro campo.
  job.status_since_ts = now;
  // Evento automatico per l'activity log: scrittura diretta (non passa da
  // addActivityEvent) per evitare la doppia validazione su un movimento
  // che il sistema ha gia' autorizzato spostando la card.
  var autoEvent = {
    id: generateActivityEventId_(),
    ts: now,
    type: 'move',
    source: 'auto',
    to: targetColumn.id,
    from: sourceColumn.id,
    note: ''
  };
  if (closesVisit) {
    autoEvent.is_rework = true;
  }

  // O1 (DESIGN_performance.md, punto A): activity_log_json e' gia' in
  // 'job' (letto una sola volta da readJobFromRow_ sopra) - non serve
  // rileggere la stessa cella dal foglio una seconda volta.
  var log = parseActivityLog_(job.activity_log_json);

  // Modello caso/visita (Fase L2): start_ts/done_ts/incarico_ts/prep_ts/
  // visit_number/is_rework/rework_cause/service_time_d/lead_time_d/
  // wait_time_d non sono piu' salvati su jobs (rimossi in L5) — vivono
  // solo su 'visite'.
  log.push(autoEvent);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });
  job.activity_log_json = serializeActivityLog_(log);

  // O1 (DESIGN_performance.md, punto A): un solo write della riga job
  // (status/status_since_ts/activity_log_json/eventuali campi toccati
  // sopra insieme), non piu' una scrittura della riga intera seguita da
  // una seconda scrittura mirata sulla stessa cella activity_log_json.
  writeJobToRow_(sheet, row, headers, job);

  // Fase Q (DESIGN_derivazione_visite.md): unico meccanismo di
  // aggiornamento di 'visite', usato anche per lo spostamento live —
  // ricostruisce l'intera sequenza dal log (con l'evento di questa mossa
  // gia' incluso e ordinato) invece di patchare la sola riga aperta.
  var activeVisit = syncVisiteFromLog_(job, log.filter(function(event) { return event.type === 'move'; }));

  // M0-A2: il job restituito porta gia' i campi di rientro ricalcolati
  // (visit_number/is_rework/rework_cause/start_ts/done_ts) dalla visita
  // appena aggiornata da syncVisiteFromLog_ — nessuna lettura aggiuntiva,
  // la visita e' gia' in mano. Permette al client di aggiornare la sola
  // card spostata senza un reload completo.
  applyVisitSummaryFields_(job, activeVisit);

  return ok_({ job_id: params.job_id, status: status, job: job });
}

// Fase Q (DESIGN_derivazione_visite.md, §2/§3): unico meccanismo di
// aggiornamento di 'visite', usato in ogni caso in cui il log di un job
// cambia — spostamento live (moveJob), correzione manuale (addActivityEvent/
// updateActivityEvent), cancellazione (deleteActivityEvent), migrazione
// storica (migrateVisiteFromHistory_) e backfill Fase F
// (migrateSingleJobActivityLog_). Non decide mai "quale riga toccare":
// ricalcola SEMPRE l'intera sequenza di visite del job dal log intero
// (computeVisiteFromLog_, la stessa funzione gia' collaudata per la
// migrazione storica L5) e sostituisce per intero le righe esistenti del
// job in 'visite' con quelle appena calcolate — mai una patch su una riga
// sola. Elimina per costruzione la classe di bug in cui una correzione di
// un evento storico applicava il proprio effetto alla visita
// "attualmente aperta" invece che a quella storicamente pertinente
// (`applyManualMoveEffects_`/`ensureOpenVisit_`, ritirate da questa
// stessa fase). 'moveLog' deve arrivare gia' filtrato sui soli eventi
// 'move' e ordinato per ts (stesso log gia' pronto in ogni chiamante).
function syncVisiteFromLog_(job, moveLog) {
  var visiteSheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (!visiteSheet) {
    // Non dovrebbe succedere dopo ensureCurrentSchema_() in testa ai
    // chiamanti principali: se succede comunque, non si blocca l'azione
    // sul job per un problema di sola derivazione metriche.
    return null;
  }

  var result = computeVisiteFromLog_(job.job_id, moveLog);
  deleteVisiteRowsForJob_(visiteSheet, job.job_id);
  result.visite.forEach(function(visit) {
    appendVisitRow_(visiteSheet, visit);
  });

  if (result.warnings.length) {
    // Stesso formato di migrateVisiteFromHistory_ (es. RIENTRO_DIRETTO_A_WIP
    // nello storico) — non e' un errore che deve bloccare l'azione in
    // corso (l'evento e' gia' stato validato da validateSequence_ per
    // quanto riguarda QUESTA chiamata), ma non va perso in silenzio.
    Logger.log('syncVisiteFromLog_ (' + job.job_id + '): ' + JSON.stringify(result.warnings));
  }

  return result.visite.length ? result.visite[result.visite.length - 1] : null;
}

// O3 (DESIGN_performance.md): la ricerca del job_id e' delegata a
// TextFinder (ricerca server-side sulla sola colonna job_id) invece di
// leggere in JS ogni riga di 'visite' (O2 aveva gia' ridotto le colonne
// lette da 13 a 8, ma il costo restava comunque proporzionale al numero
// TOTALE di visite di tutto il sistema). Un vero indice posizionale
// (job -> numero di riga) e' stato scartato in fase di design: diventa
// silenziosamente sbagliato ad ogni deleteRow su 'visite' fatto per
// ALTRI job (archiviazione/cestino/ripristino), non solo per quello
// cercato — qui invece non si cachea nessuna posizione, si cerca sempre
// dal vivo. matchEntireCell evita falsi positivi tipo "JOB-1" dentro
// "JOB-10". rientro_ts viene letto solo per le righe trovate
// (tipicamente 1-3 per job, mai l'intera tabella).
function findOpenVisitRow_(sheet, jobId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { return -1; }
  var headers = getHeaderMap_(sheet);

  var jobIdColumnRange = sheet.getRange(2, headers.job_id, lastRow - 1, 1);
  var matches = jobIdColumnRange.createTextFinder(String(jobId)).matchEntireCell(true).findAll();
  for (var i = 0; i < matches.length; i++) {
    var row = matches[i].getRow();
    if (!sheet.getRange(row, headers.rientro_ts).getValue()) {
      return row;
    }
  }
  return -1;
}

function readVisitFromRow_(sheet, row) {
  var headers = getHeaderMap_(sheet);
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var visit = {};
  Object.keys(headers).forEach(function(header) {
    visit[header] = normalizeCell_(values[headers[header] - 1]);
  });
  return visit;
}

function appendVisitRow_(sheet, visit) {
  sheet.appendRow(VISITE_HEADERS.map(function(header) {
    return visit[header] === undefined ? '' : visit[header];
  }));
}

// Fase L5 parte 2/2: visit_number/is_rework/rework_cause/start_ts/
// done_ts non sono piu' salvati su jobs (rimossi, sez. 9.1 — duplicati
// con 'visite'). getBoard() e getMetrics() li ricalcolano qui al volo
// dalla visita PIU' RECENTE del caso (MAX(numero_visita)), cosi':
// - il frontend continua a funzionare senza modifiche (badge R1/R2,
//   indicatore "fermo da N giorni", storico rientri in client.html);
// - pointsStatistics_/monthBuckets_ (Model.gs) — che restano
//   esplicitamente su jobs per L4 — hanno ancora un done_ts per calcolare
//   punti completati e timeline.
function loadJobsWithVisitSummary_() {
  return loadJobsWithVisitSummaryFrom_(SIGMAFLOW.SHEETS.JOBS, SIGMAFLOW.SHEETS.VISITE);
}

// N6 (DESIGN_archiviazione.md, §8/§9): stesso ricalcolo di sopra ma sulle
// tabelle dell'Archivio - serve a getMetrics() per unire i casi archiviati
// alle metriche storiche su finestra temporale, con lo stesso done_ts/
// visit_number ricalcolato al volo che i casi attivi hanno gia'. Mai
// un equivalente per il Cestino: nessuna metrica lo legge (§8).
function loadArchivedJobsWithVisitSummary_() {
  return loadJobsWithVisitSummaryFrom_(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO, SIGMAFLOW.SHEETS.VISITE_ARCHIVIO);
}

function loadJobsWithVisitSummaryFrom_(jobsSheetName, visiteSheetName) {
  var ss = getSpreadsheet_();
  var jobs = readTable_(ss.getSheetByName(jobsSheetName));
  var visite = readTable_(ss.getSheetByName(visiteSheetName));

  var latestByJob = {};
  visite.forEach(function(visit) {
    var existing = latestByJob[visit.job_id];
    if (!existing || Number(visit.numero_visita || 1) > Number(existing.numero_visita || 1)) {
      latestByJob[visit.job_id] = visit;
    }
  });

  jobs.forEach(function(job) {
    applyVisitSummaryFields_(job, latestByJob[job.job_id]);
  });

  return jobs;
}

// Fattorizzato da loadJobsWithVisitSummary_ (M0-A2): moveJob lo riusa per
// restituire nella risposta il job gia' con i campi di rientro
// ricalcolati, cosi' il client puo' aggiornare la sola card spostata
// senza un reload completo della board (che leggerebbe di nuovo
// jobs+visite solo per un dato che il server ha gia' in mano).
function applyVisitSummaryFields_(job, visit) {
  job.visit_number = visit ? Number(visit.numero_visita || 1) : 1;
  job.is_rework = job.visit_number > 1;
  job.rework_cause = visit ? (visit.rework_cause || '') : '';
  job.start_ts = visit ? (visit.start_ts || '') : '';
  job.done_ts = visit ? (visit.consegna_ts || '') : '';
}

// M2, fix del 2026-08-20 (segnalato da Marco: la Cronologia e' lenta -
// causa reale trovata nel meccanismo di lock, non nella lettura in se':
// withEnvironment_ prende un lock GLOBALE di script per ogni singola
// chiamata api(), anche di sola lettura - il fix del ritardo di 1-2
// minuti sulla board (stessa sessione) aveva introdotto un loadBoard(true)
// dopo ogni salvataggio in Cronologia, un giro in piu' di lock proprio
// nel percorso piu' usato durante un collaudo). addActivityEvent/
// updateActivityEvent/deleteActivityEvent restituiscono ora il job gia'
// aggiornato con i campi di rientro ricalcolati (stesso contratto di
// risposta di moveJob, M0-A2) - il client aggiorna la card in stato
// locale invece di rifare un'intera chiamata getBoard() (che oltretutto
// e' molto piu' pesante di un singolo evento: rilegge jobs+visite
// per intero).
function attachOpenVisitSummary_(job) {
  var visiteSheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  var openRow = visiteSheet ? findOpenVisitRow_(visiteSheet, job.job_id) : -1;
  applyVisitSummaryFields_(job, openRow > 0 ? readVisitFromRow_(visiteSheet, openRow) : null);
  return job;
}

// Sez. 4: durata della permanenza appena conclusa nella colonna stand_by
// che si sta lasciando, sommata all'accumulatore per tipo corrispondente.
// L'ingresso in quella colonna si trova ripercorrendo il log all'indietro
// (stesso principio di computeFrom_ in ActivityLog.gs, qui applicato alla
// colonna specifica invece che "l'ultimo move in assoluto").
function accumulateWaitTime_(visit, sourceColumn, log, now) {
  var field = SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS[sourceColumn.id];
  if (!field) { return; }
  var enteredTs = lastEntryTsForColumn_(log, sourceColumn.id, now);
  if (!enteredTs) { return; }
  visit[field] = Number(visit[field] || 0) + Number(diffDays(enteredTs, now) || 0);
}

function lastEntryTsForColumn_(log, columnId, beforeTs) {
  var candidates = log.filter(function(event) {
    return event.type === 'move' && event.to === columnId && compareTs_(event.ts, beforeTs) < 0;
  });
  if (!candidates.length) { return null; }
  var latest = candidates.reduce(function(best, event) {
    return (!best || compareTs_(event.ts, best.ts) > 0) ? event : best;
  }, null);
  return latest.ts;
}

function updateJob(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  ['title', 'client', 'ambassador', 'assignee', 'tag', 'size_class', 'description', 'due_date', 'card_color'].forEach(function(field) {
    if (params[field] !== undefined && headers[field]) {
      job[field] = params[field];
    }
  });

  if (params.size_class) {
    job.size_points = SIGMAFLOW.SIZE_POINTS[params.size_class] || SIGMAFLOW.SIZE_POINTS.M;
  }
  if (params.card_color !== undefined) {
    job.card_color = normalizeCardColor_(params.card_color);
  }

  if (params.invoiced !== undefined) {
    // La casella "Chiuso" (ex "Fatturato", nome cambiato su richiesta di
    // Marco) attiva/svuota incarico_chiuso_ts alla spunta — il campo
    // manuale di chiusura definitiva dell'incarico gia' presente in
    // schema dalla Fase L1 (DESIGN_modello_caso_visita.md, sez. 3),
    // indipendente da qualunque movimento sulla board.
    var newInvoiced = coerceBoolean_(params.invoiced);
    if (newInvoiced !== coerceBoolean_(job.invoiced)) {
      job.incarico_chiuso_ts = newInvoiced ? nowIso_() : '';
    }
    job.invoiced = newInvoiced;
  }

  var priorityChanged = params.impact !== undefined || params.manageability !== undefined || params.priority_class !== undefined;
  if (params.impact !== undefined) {
    job.impact = params.impact;
  }
  if (params.manageability !== undefined) {
    job.manageability = params.manageability;
  }
  if (params.priority_class !== undefined) {
    job.priority_class = params.priority_class;
    job.priority_class_manual = Boolean(params.priority_class);
  }
  if (priorityChanged) {
    var priority = priorityFields_({
      impact: job.impact,
      manageability: job.manageability,
      priority_class: coerceBoolean_(job.priority_class_manual) ? job.priority_class : ''
    });
    job.impact = priority.impact;
    job.manageability = priority.manageability;
    job.priority_score = priority.priority_score;
    if (!coerceBoolean_(job.priority_class_manual)) {
      job.priority_class = priority.priority_class;
    }
  }

  writeJobToRow_(sheet, row, headers, job);
  return ok_({ job_id: params.job_id, job: job });
}

// Costruisce l'evento candidato solo con i campi effettivamente forniti,
// per non riempire il log di chiavi vuote/undefined.
function buildActivityEventCandidate_(params, log) {
  var candidate = {
    id: generateActivityEventId_(),
    ts: params.ts,
    type: params.type,
    source: 'manual'
  };
  candidate.from = computeFromForCandidate_(log, candidate);
  if (params.type === 'move') {
    candidate.to = params.to;
  }
  if (params.type === 'correction') {
    candidate.reason = params.reason;
  }
  ['note', 'field', 'old', 'new'].forEach(function(key) {
    if (params[key] !== undefined) {
      candidate[key] = params[key];
    }
  });
  return candidate;
}

function addActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  requireParam_(params, 'type');
  requireParam_(params, 'ts');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  // O1 (DESIGN_performance.md, punto D): copia del job COSI' COM'ERA,
  // prima di qualunque mutazione - passata a writeJobToRow_ per scrivere
  // solo le celle davvero cambiate.
  var originalJob = Object.assign({}, job);
  var log = parseActivityLog_(job.activity_log_json);
  var candidate = buildActivityEventCandidate_(params, log);

  // N1 (DESIGN_archiviazione.md, §8b): 'old' di un evento 'correction'
  // nuovo non arriva mai dal client (non e' nel form) — si registra qui
  // il valore reale del campo PRIMA della correzione, letto dal job
  // appena caricato. Su modifica di un evento gia' esistente resta
  // invece quello originale (ereditato da 'existing' in
  // updateActivityEvent): un correttivo storico non riscrive il proprio
  // "prima", solo il proprio "dopo".
  if (candidate.type === 'correction' && candidate.old === undefined) {
    candidate.old = job[candidate.field] !== undefined ? job[candidate.field] : '';
  }

  var validation = validateSequence_(log, candidate);
  if (validation.hardErrors.length) {
    return ok_({ ok: false, hardErrors: validation.hardErrors });
  }

  if (validation.sequenceWarnings.length && !coerceBoolean_(params.force)) {
    return ok_({ ok: false, requiresForce: true, warnings: validation.sequenceWarnings });
  }

  log.push(candidate);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  // I campi strutturati (arrival_ts/incarico_ts/prep_ts/start_ts/done_ts)
  // sono una cache derivata dal log, non uno stato indipendente: si
  // allineano sempre in automatico al valore suggerito dall'evento appena
  // registrato, senza chiedere conferma all'utente. I dettagli di questi
  // campi restano interni: l'utente cura solo la cronologia.
  applyStructuralAlignment_(job, checkStructuralAlignment_(job, candidate));
  // P5/P5b: ricalcolo finale, dal log intero - vedi recomputeCurrentStatus_/
  // recomputeIncaricoChiusoTs_.
  recomputeCurrentStatus_(job, log);
  recomputeIncaricoChiusoTs_(job, log);
  // Fase Q (DESIGN_derivazione_visite.md): 'visite' ricostruita per
  // intero dal log completo, non piu' dal solo candidato appena toccato.
  syncVisiteFromLog_(job, log.filter(function(event) { return event.type === 'move'; }));

  job.activity_log_json = serializeActivityLog_(log);
  writeJobToRow_(sheet, row, headers, job, originalJob);

  return ok_({ ok: true, job_id: jobId, event: candidate, job: attachOpenVisitSummary_(job) });
}

// P5 (DESIGN_lock_ambiente.md §2.5): job.status/status_since_ts devono
// sempre riflettere l'evento 'move' cronologicamente PIU' RECENTE
// dell'intero log ordinato - non l'ultimo evento toccato dalla chiamata
// in corso, che puo' essere un evento vecchio appena corretto/aggiunto
// (Bug 1) o l'evento appena cancellato, lasciando lo stato bloccato sul
// suo valore (Bug 2). Funzione pura: nessun effetto su 'visite' (quelli
// restano in applyManualMoveEffects_, legati al candidato specifico).
// 'log' deve arrivare gia' ordinato per ts (stesso sort gia' fatto da
// ogni chiamante prima di invocarla) - l'ultimo elemento dell'array e'
// per costruzione il piu' recente anche a parita' di ts.
function recomputeCurrentStatus_(job, log) {
  var moves = (log || []).filter(function(event) { return event.type === 'move'; });
  if (!moves.length) {
    return;
  }
  var mostRecentMove = moves[moves.length - 1];
  job.status = mostRecentMove.to;
  job.status_since_ts = mostRecentMove.ts;
}

// P5b (DESIGN_lock_ambiente.md §2.5, richiesto da Marco dopo il punto
// esplorativo di P5 - stesso principio di recomputeCurrentStatus_,
// applicato a incarico_chiuso_ts): un incarico chiuso va riaperto solo
// se nel log esiste un vero rientro (move da una colonna stand_by/done
// verso backlog/prep) SUCCESSIVO alla chiusura registrata - non per
// qualunque candidato che rappresenti quel pattern, indipendentemente
// da quando e' davvero accaduto rispetto alla chiusura. Un rientro
// vecchio dimenticato, corretto in Cronologia DOPO che il caso e' gia'
// stato richiuso da eventi piu' recenti, non deve riaprirlo per errore.
// Funzione pura: nessun effetto su 'visite'. Chiamata solo da
// addActivityEvent/updateActivityEvent (mai da deleteActivityEvent:
// una volta azzerato, il valore originale di incarico_chiuso_ts non e'
// piu' recuperabile dal solo log - stesso limite, per lo stesso motivo,
// di applyManualMoveEffects_ che gia' non tocca gli effetti su visite
// in cancellazione).
function recomputeIncaricoChiusoTs_(job, log) {
  if (!job.incarico_chiuso_ts) {
    return;
  }
  var columns = readColumns_();
  var moves = (log || []).filter(function(event) { return event.type === 'move'; });
  var reopenedAfterClosure = moves.some(function(event) {
    // < 0 (non <=): a parita' esatta di istante (es. rientro registrato
    // "ora" subito dopo una chiusura fatta anch'essa "ora") il rientro
    // deve comunque contare come successivo, non essere scartato per un
    // pareggio - la precisione dei timestamp non garantisce mai un vero
    // ordinamento stretto tra due azioni ravvicinate nello stesso secondo.
    if (compareTs_(event.ts, job.incarico_chiuso_ts) < 0) {
      return false;
    }
    var sourceColumn = event.from ? findColumn_(columns, event.from) : null;
    var targetColumn = findColumn_(columns, event.to);
    if (!sourceColumn || !targetColumn) {
      return false;
    }
    var sourceClosesTowardActive = sourceColumn.role === 'stand_by' || sourceColumn.role === 'done';
    return sourceClosesTowardActive && (targetColumn.role === 'backlog' || targetColumn.role === 'prep');
  });
  if (reopenedAfterClosure) {
    job.incarico_chiuso_ts = '';
  }
}

// Fase Q (DESIGN_derivazione_visite.md, §3): non tocca piu' 'visite' —
// gli effetti sulla visita (apertura/chiusura, accumulo attese, campi
// gate incarico_ts/prep_ts/start_ts/consegna_ts) sono ormai interamente
// derivati dal log intero da computeVisiteFromLog_/syncVisiteFromLog_,
// chiamata a parte da ogni chiamante con il log completo aggiornato.
// Resta solo il campo strutturato ancora su jobs (arrival_ts).
// applyManualMoveEffects_/alignOpenVisitFields_/ensureOpenVisit_
// (che scrivevano sempre sulla visita "attualmente aperta", mai su
// quella storicamente pertinente a un evento vecchio corretto/aggiunto)
// sono state ritirate insieme a questa semplificazione.
function applyStructuralAlignment_(job, warnings) {
  warnings.forEach(function(warning) {
    if (JOB_HEADERS.indexOf(warning.field) !== -1) {
      job[warning.field] = warning.suggestedValue;
    }
  });
}

function getActivityLog(params) {
  var jobId = requireParam_(params, 'job_id');
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseActivityLog_(job.activity_log_json);

  // Ricalcola "from" per ogni evento move al momento della lettura, cosi'
  // resta coerente anche su dati migrati senza from o dopo modifiche/cancellazioni.
  var recalculated = recalculateMoveFrom_(log);

  return ok_({ job_id: jobId, log: recalculated });
}

function updateActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  var eventId = requireParam_(params, 'event_id');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  // O1 (DESIGN_performance.md, punto D): vedi commento in addActivityEvent.
  var originalJob = Object.assign({}, job);
  var log = parseActivityLog_(job.activity_log_json);

  var existing = log.filter(function(event) { return event.id === eventId; })[0];
  if (!existing) {
    throw new Error('Evento non trovato: ' + eventId);
  }
  // Qualunque evento e' correggibile, auto o manuale: il diario deve poter
  // essere reso corretto e coerente dall'utente. La cancellazione resta
  // invece bloccata per gli eventi auto (vedi deleteActivityEvent) perche'
  // cancellare cancella un pezzo di storia reale, mentre correggerne la
  // data la rende semplicemente piu' accurata.

  var remaining = log.filter(function(event) { return event.id !== eventId; });

  // Parte dall'evento esistente e sovrascrive solo i campi passati in
  // params, poi ricalcola from sul log privato dell'evento in modifica.
  var mergedParams = Object.assign({}, existing, params);
  var candidate = buildActivityEventCandidate_(mergedParams, remaining);
  candidate.id = existing.id;

  var validation = validateSequence_(remaining, candidate);
  if (validation.hardErrors.length) {
    return ok_({ ok: false, hardErrors: validation.hardErrors });
  }

  if (validation.sequenceWarnings.length && !coerceBoolean_(params.force)) {
    return ok_({ ok: false, requiresForce: true, warnings: validation.sequenceWarnings });
  }

  remaining.push(candidate);
  remaining.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  applyStructuralAlignment_(job, checkStructuralAlignment_(job, candidate));
  // P5/P5b: ricalcolo finale, dal log intero - vedi recomputeCurrentStatus_/
  // recomputeIncaricoChiusoTs_.
  recomputeCurrentStatus_(job, remaining);
  recomputeIncaricoChiusoTs_(job, remaining);
  // Fase Q (DESIGN_derivazione_visite.md): 'visite' ricostruita per
  // intero dal log completo, non piu' dal solo candidato appena toccato.
  syncVisiteFromLog_(job, remaining.filter(function(event) { return event.type === 'move'; }));

  job.activity_log_json = serializeActivityLog_(remaining);
  writeJobToRow_(sheet, row, headers, job, originalJob);

  return ok_({ ok: true, job_id: jobId, event: candidate, job: attachOpenVisitSummary_(job) });
}

function deleteActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  var eventId = requireParam_(params, 'event_id');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  // O1 (DESIGN_performance.md, punto D): vedi commento in addActivityEvent.
  var originalJob = Object.assign({}, job);
  var log = parseActivityLog_(job.activity_log_json);

  var existing = log.filter(function(event) { return event.id === eventId; })[0];
  if (!existing) {
    throw new Error('Evento non trovato: ' + eventId);
  }
  if (existing.source === 'auto') {
    throw new Error('EVENTO_AUTO_NON_ELIMINABILE');
  }

  var remaining = log.filter(function(event) { return event.id !== eventId; });

  // Ricalcola "from" per gli eventi move rimasti, cosi' l'evento successivo
  // a quello cancellato torna a puntare alla colonna di provenienza corretta.
  var recalculated = recalculateMoveFrom_(remaining);

  // La cancellazione puo' rendere l'ultimo campo strutturato alimentato
  // dall'evento cancellato non piu' rappresentativo: si riallinea in
  // automatico all'evento move piu' recente rimasto, con lo stesso
  // meccanismo (silenzioso) usato per l'aggiunta/modifica di un evento.
  var moves = recalculated.filter(function(event) { return event.type === 'move'; });
  var lastMove = moves.length ? moves[moves.length - 1] : null;
  if (lastMove) {
    applyStructuralAlignment_(job, checkStructuralAlignment_(job, lastMove));
  }
  // P5 (Bug 2, DESIGN_lock_ambiente.md §2.5): prima di questo fix,
  // job.status non veniva MAI riallineato qui. recomputeCurrentStatus_ e'
  // pura (nessun effetto su visite) - risolve senza reintrodurre il
  // problema.
  recomputeCurrentStatus_(job, recalculated);
  // Fase Q (DESIGN_derivazione_visite.md, §3): prima di questo fix,
  // deleteActivityEvent non toccava MAI 'visite' (il vecchio meccanismo a
  // patch, applyManualMoveEffects_, non era richiamabile qui senza
  // rischiare di duplicare/spostare visite su cancellazioni non
  // correlate — commento storico, ora superato). La ricostruzione
  // completa e' per natura idempotente: ricalcolare da capo l'intero log
  // rimasto dopo la cancellazione da' sempre lo stesso risultato,
  // qualunque sia l'evento cancellato — nessun rischio residuo.
  syncVisiteFromLog_(job, moves);

  job.activity_log_json = serializeActivityLog_(recalculated);
  writeJobToRow_(sheet, row, headers, job, originalJob);

  return ok_({ job_id: jobId, event_id: eventId, job: attachOpenVisitSummary_(job) });
}

// Non piu' esposta via routeAction_/UI: le correzioni utente passano
// dall'evento "Correzione" in Cronologia (addActivityEvent), che scrive
// su activity_log_json invece che su un log separato. Questa funzione
// resta solo per uso interno di test (testAddJobWithPastArrival_), che
// deve spostare arrival_ts nel passato senza generare un evento visibile
// nel diario.
// Fase L5 parte 2/2: start_ts/done_ts non sono piu' campi di jobs
// (rimossi, vivono solo su 'visite') — questa funzione di supporto ai
// test ne correggeva anche loro, ora corregge solo arrival_ts (unico
// campo rimasto in JOB_HEADERS che questa funzione tocca), il suo unico
// uso reale (testAddJobWithPastArrival_).
function correctJobTimestamps(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var jobId = requireParam_(params, 'job_id');
  var reason = String(params.reason || '').trim();
  if (!reason) {
    throw new Error('Il motivo della correzione e obbligatorio');
  }

  var newArrival = params.arrival_ts;
  if (newArrival === undefined || newArrival === '') {
    throw new Error('Specificare arrival_ts');
  }
  if (!isValidIso8601_(newArrival)) {
    throw new Error('Formato data non valido per arrival_ts: ' + newArrival);
  }

  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  job.arrival_ts = newArrival;
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ job_id: jobId, corrections_applied: 1, job: job });
}

// N2 (DESIGN_archiviazione.md, §4/§9): funzione unica di spostamento
// riga condivisa da archiviazione, cestino e ripristino (§6b) — non tre
// implementazioni parallele. Sposta la riga job + tutte le sue righe
// 'visite' da un foglio sorgente a un foglio destinazione, valorizzando
// gli eventuali campi extra richiesti dal percorso (archiviato_ts/
// cestinato_ts). transformJobFn, se passato, puo' correggere il job
// (es. fallback di colonna in ripristinaJob_) dopo l'applicazione dei
// campi extra e prima della scrittura sulla destinazione.
//
// Sotto lock (piu' utenti potrebbero archiviare/cestinare/ripristinare
// contemporaneamente) e idempotente: se il job non e' piu' nella
// sorgente ma e' gia' presente nella destinazione, una chiamata
// precedente (o concorrente, nella stessa finestra di lock) ha gia'
// completato lo spostamento — non e' un errore da segnalare una seconda
// volta.
function moveJobToSheet_(jobId, sourceJobsSheetName, sourceVisiteSheetName, destJobsSheetName, destVisiteSheetName, destJobHeaders, extraFields, transformJobFn) {
  extraFields = extraFields || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getSpreadsheet_();
    var sourceJobsSheet = ss.getSheetByName(sourceJobsSheetName);
    var destJobsSheet = ss.getSheetByName(destJobsSheetName);
    var sourceVisiteSheet = ss.getSheetByName(sourceVisiteSheetName);
    var destVisiteSheet = ss.getSheetByName(destVisiteSheetName);

    var sourceRow = findRowById_(sourceJobsSheet, 'job_id', jobId);
    if (sourceRow < 0) {
      if (findRowById_(destJobsSheet, 'job_id', jobId) >= 0) {
        return ok_({ job_id: jobId, already_moved: true });
      }
      throw new Error('Job non trovato: ' + jobId);
    }

    var sourceHeaders = getHeaderMap_(sourceJobsSheet);
    var job = readJobFromRow_(sourceJobsSheet, sourceRow, sourceHeaders);
    Object.keys(extraFields).forEach(function(key) {
      job[key] = extraFields[key];
    });
    if (transformJobFn) {
      transformJobFn(job);
    }

    destJobsSheet.appendRow(destJobHeaders.map(function(header) {
      return job[header] === undefined ? '' : job[header];
    }));

    if (sourceVisiteSheet && destVisiteSheet) {
      readTable_(sourceVisiteSheet).filter(function(visit) {
        return visit.job_id === jobId;
      }).forEach(function(visit) {
        appendVisitRow_(destVisiteSheet, visit);
      });
    }

    sourceJobsSheet.deleteRow(sourceRow);
    if (sourceVisiteSheet) {
      deleteVisiteRowsForJob_(sourceVisiteSheet, jobId);
    }

    return ok_({ job_id: jobId, job: job });
  } finally {
    lock.releaseLock();
  }
}

// Elimina, dal basso verso l'alto (per non far scivolare gli indici di
// riga durante il ciclo), tutte le righe 'visite' di un job — usata da
// moveJobToSheet_ per portare con se' l'intera cronologia delle visite
// (§3.1: "un caso archiviato porta con se' tutte le sue visite").
function deleteVisiteRowsForJob_(sheet, jobId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { return; }
  var headers = getHeaderMap_(sheet);
  var values = sheet.getRange(2, headers.job_id, lastRow - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === jobId) {
      sheet.deleteRow(i + 2);
    }
  }
}

// Bugfix 2026-08-25 (decisione esplicita di Marco): il bottone "Archivia"
// deve essere sempre disponibile per qualunque card, in qualunque stato —
// nessun vincolo, ne' lato client ne' lato server. Rimossa la regola di
// eleggibilita' precedente (§4.1 di DESIGN_archiviazione.md, N2:
// "solo casi chiusi possono essere archiviati", verificata sia qui sia
// dal bottone client updateArchiveButtonState_) — qualunque job, chiuso
// o no, puo' essere archiviato in ogni momento. L'archiviazione
// *automatica* (archiveEligibleJobs_) resta invariata: seleziona da sola,
// PRIMA di chiamare questa funzione, solo i casi con incarico_chiuso_ts
// valorizzato e oltre soglia — non dipende dal controllo appena rimosso.
function archiveJob_(jobId) {
  // Se il job non e' piu' in 'jobs' (gia' spostato da una chiamata
  // precedente/concorrente), moveJobToSheet_ gestisce l'idempotenza da
  // solo, nessun controllo aggiuntivo da fare qui.
  return moveJobToSheet_(
    jobId,
    SIGMAFLOW.SHEETS.JOBS, SIGMAFLOW.SHEETS.VISITE,
    SIGMAFLOW.SHEETS.JOBS_ARCHIVIO, SIGMAFLOW.SHEETS.VISITE_ARCHIVIO,
    JOB_ARCHIVIO_HEADERS,
    { archiviato_ts: nowIso_() }
  );
}

// Wrapper §4.2: nessuna eleggibilita' richiesta, qualunque card in
// qualunque colonna puo' finire nel Cestino.
function cestinaJob_(jobId) {
  return moveJobToSheet_(
    jobId,
    SIGMAFLOW.SHEETS.JOBS, SIGMAFLOW.SHEETS.VISITE,
    SIGMAFLOW.SHEETS.JOBS_CESTINO, SIGMAFLOW.SHEETS.VISITE_CESTINO,
    JOB_CESTINO_HEADERS,
    { cestinato_ts: nowIso_() }
  );
}

// Wrapper §6b, simmetrico inverso: da Cestino a 'jobs'/'visite'. Nessun
// campo extra da valorizzare (JOB_HEADERS non ha cestinato_ts, quindi
// il campo si perde da solo scrivendo solo le colonne di destinazione);
// transformJobFn applica il fallback a colonna 'backlog' se lo status
// conservato non corrisponde piu' a nessuna colonna esistente
// (columns_json potrebbe essere cambiato nel frattempo).
function ripristinaJob_(jobId) {
  return moveJobToSheet_(
    jobId,
    SIGMAFLOW.SHEETS.JOBS_CESTINO, SIGMAFLOW.SHEETS.VISITE_CESTINO,
    SIGMAFLOW.SHEETS.JOBS, SIGMAFLOW.SHEETS.VISITE,
    JOB_HEADERS,
    {},
    function(job) {
      if (!findColumn_(readColumns_(), job.status)) {
        job.status = firstColumnIdByRole_('backlog');
      }
    }
  );
}

// Azione API esposta dal bottone "Archivia" (§4.1) — wrapper sottilissimo
// su archiveJob_, unico punto in cui vive la regola di eleggibilita'.
function archiveJob(params) {
  return archiveJob_(requireParam_(params, 'job_id'));
}

// N4 (DESIGN_archiviazione.md, §6/§6b): liste sola lettura per le viste
// Archivio/Cestino - anagrafica + riepilogo cronologia, lette direttamente
// da jobs_archivio/visite_archivio o jobs_cestino/visite_cestino (§6:
// "nessuna ricostruzione dal log necessaria"). Stessa forma per entrambe
// (§6b: "stessa forma della vista Archivio") - un solo helper, non due
// implementazioni parallele.
function getArchivio() {
  return ok_({ items: readArchivedList_(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO, SIGMAFLOW.SHEETS.VISITE_ARCHIVIO) });
}

function getCestino() {
  return ok_({ items: readArchivedList_(SIGMAFLOW.SHEETS.JOBS_CESTINO, SIGMAFLOW.SHEETS.VISITE_CESTINO) });
}

function readArchivedList_(jobsSheetName, visiteSheetName) {
  var ss = getSpreadsheet_();
  var jobs = readTable_(ss.getSheetByName(jobsSheetName));

  var visitCounts = {};
  readTable_(ss.getSheetByName(visiteSheetName)).forEach(function(visit) {
    visitCounts[visit.job_id] = (visitCounts[visit.job_id] || 0) + 1;
  });

  return jobs.map(function(job) {
    return {
      job_id: job.job_id,
      title: job.title,
      client: job.client,
      assignee: job.assignee,
      tag: job.tag,
      description: job.description,
      status: job.status,
      arrival_ts: job.arrival_ts,
      incarico_chiuso_ts: job.incarico_chiuso_ts,
      // Presente solo sulla tabella pertinente (jobs_archivio o
      // jobs_cestino) - readTable_ non valorizza campi assenti
      // dall'intestazione del foglio letto, l'altro resta undefined da
      // solo, nessun filtro esplicito necessario.
      archiviato_ts: job.archiviato_ts,
      cestinato_ts: job.cestinato_ts,
      total_visits: visitCounts[job.job_id] || 0
    };
  });
}

// N5 (§7): "Duplica", solo dall'Archivio - crea un caso NUOVO attivo,
// non un ripristino. Riusa addJob (stessa creazione di qualunque caso:
// nuovo job_id, visita 1, log di creazione), non una copia riga
// parallela - cosi' arrival_ts/incarico_chiuso_ts/status/visite/log
// nascono da zero esattamente come per un caso creato a mano, senza
// bisogno di azzerarli esplicitamente uno per uno. Copia solo i campi
// che il design elenca come punto di partenza (titolo/cliente/tag/
// assegnatario/ambasciatore/taglia) - tutto il resto (priorita',
// descrizione, colore, ecc.) riparte dai default di addJob.
function duplicaJob_(jobId) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Caso non trovato in Archivio: ' + jobId);
  }
  var archivedJob = readJobFromRow_(sheet, row, getHeaderMap_(sheet));
  return addJob({
    title: archivedJob.title,
    client: archivedJob.client,
    ambassador: archivedJob.ambassador,
    tag: archivedJob.tag,
    assignee: archivedJob.assignee,
    size_class: archivedJob.size_class
  });
}

// Azione API esposta dal bottone "Duplica" in Archivio - wrapper
// sottilissimo su duplicaJob_, come archiveJob sopra su archiveJob_.
function duplicaJob(params) {
  return duplicaJob_(requireParam_(params, 'job_id'));
}

// Azione API esposta dal bottone "Ripristina" in Cestino (§6b) — wrapper
// sottilissimo su ripristinaJob_, come archiveJob sopra su archiveJob_.
function ripristinaJob(params) {
  return ripristinaJob_(requireParam_(params, 'job_id'));
}

// §6b/§4.3: "Elimina definitivamente" — cancellazione vera di una singola
// riga dal Cestino (job + tutte le sue visite), non uno spostamento.
// Insieme a svuotaCestino sotto, l'unico punto di reale perdita di dati
// in tutto il programma di archiviazione (§4.3). Mai sull'Archivio: il
// design non prevede eliminazione diretta da li', solo Duplica (N5).
function eliminaJobDefinitivamente(params) {
  var jobId = requireParam_(params, 'job_id');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO);
    var row = findRowById_(sheet, 'job_id', jobId);
    if (row < 0) {
      throw new Error('Job non trovato nel Cestino: ' + jobId);
    }
    sheet.deleteRow(row);
    deleteVisiteRowsForJob_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO), jobId);
    return ok_({ job_id: jobId, deleted: true });
  } finally {
    lock.releaseLock();
  }
}

// §6b: "Svuota cestino" — azione di gruppo, elimina tutto il contenuto
// del Cestino in un colpo solo. Stessa irreversibilita' di
// eliminaJobDefinitivamente, su piu' righe insieme.
function svuotaCestino() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getSpreadsheet_();
    var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO);
    var deletedCount = readTable_(jobsSheet).length;
    clearDataRows_(jobsSheet, JOB_CESTINO_HEADERS);
    clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO), VISITE_CESTINO_HEADERS);
    return ok_({ deleted_count: deletedCount });
  } finally {
    lock.releaseLock();
  }
}

// N3 (DESIGN_archiviazione.md, §4.1/§9): scansiona 'jobs' per i casi
// eleggibili all'archiviazione automatica — incarico_chiuso_ts
// valorizzato e oggi - incarico_chiuso_ts >= archiviazione_giorni_default
// (config, default 30, sez. 3.3) — e li archivia uno per uno. Riusa
// archiveJob_ (stessa regola di eleggibilita' del bottone manuale, un
// solo punto in cui vive) invece di duplicare lo spostamento riga. Solo
// archiviazione: il Cestino resta sempre manuale, nessuna scadenza
// automatica lo riguarda (§4.2/§9).
//
// Un errore su un singolo job (es. una condizione di gara con un'altra
// operazione concorrente sullo stesso job_id) non deve interrompere la
// scansione degli altri: raccolto in errors, non rilanciato.
function archiveEligibleJobs_() {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var config = readConfig_();
  var thresholdDays = Number(config.archiviazione_giorni_default);
  if (!thresholdDays || thresholdDays <= 0) {
    thresholdDays = Number(SIGMAFLOW.DEFAULT_CONFIG.archiviazione_giorni_default);
  }
  var now = nowIso_();

  var jobs = readTable_(sheet);
  var eligible = jobs.filter(function(job) {
    return Boolean(job.incarico_chiuso_ts) && diffDays(job.incarico_chiuso_ts, now) >= thresholdDays;
  });

  var archivedJobIds = [];
  var errors = [];
  eligible.forEach(function(job) {
    try {
      archiveJob_(job.job_id);
      archivedJobIds.push(job.job_id);
    } catch (err) {
      errors.push({ job_id: job.job_id, error: err.message });
    }
  });

  return {
    jobs_scanned: jobs.length,
    jobs_eligible: eligible.length,
    jobs_archived: archivedJobIds.length,
    archived_job_ids: archivedJobIds,
    errors: errors
  };
}

// Handler pensato per essere collegato a un trigger giornaliero a tempo
// (ScriptApp.newTrigger, sotto) — non e' raggiungibile da nessuna azione
// UI/API, solo dal trigger stesso una volta installato. Loggato invece di
// restituito silenziosamente: un trigger a tempo non ha un chiamante
// interattivo che possa leggere il valore di ritorno.
//
// Bugfix 2026-08-19: un trigger a tempo non riceve mai un parametro 'env'
// (non c'e' nessuna richiesta HTTP dietro) — a differenza di ogni azione
// UI/API, che passa sempre da api()/withEnvironment_. Prima di questo fix
// archiveEligibleJobs_() risolveva il foglio in modo "ambientale" tramite
// getSpreadsheet_(), cioe' leggeva la Script Property condivisa
// SIGMAFLOW_SPREADSHEET_ID cosi' come la trovava al momento — se quella
// property fosse rimasta bloccata su un valore sbagliato (es. un'
// esecuzione di test interrotta a meta', prima di raggiungere il proprio
// finally di ripristino: incidente reale verificatosi il 2026-08-19,
// stessa classe di rischio gia' documentata per PROP_SCHEMA_VERSION),
// il trigger avrebbe scansionato/archiviato sul foglio sbagliato — nel
// caso peggiore PROD, che il design vieta esplicitamente (§4.1/§9: "mai
// scrittura su PROD senza gate umano"). Ora il trigger fissa esplicitamente
// TEST per tutta la propria esecuzione tramite withEnvironment_ (stesso
// meccanismo, con lock, gia' usato da api() per le richieste web) — non
// dipende piu' da nessuno stato lasciato da un'esecuzione precedente.
function eseguiArchiviazioneAutomaticaGiornaliera() {
  var result = withEnvironment_('test', function() {
    return archiveEligibleJobs_();
  });
  Logger.log(
    'Archiviazione automatica: ' + result.jobs_archived + '/' + result.jobs_eligible +
    ' casi eleggibili archiviati (' + result.jobs_scanned + ' scansionati).' +
    (result.errors.length ? ' Errori: ' + JSON.stringify(result.errors) : '')
  );
  return result;
}

// Installa il trigger giornaliero che chiama eseguiArchiviazioneAutomaticaGiornaliera.
// GATE UMANO (§9, dopo N3): questa funzione contiene il passo che rende
// l'archiviazione un processo che scatta da solo, senza supervisione —
// per questo nessun altro codice di questa sessione la invoca. Va
// eseguita manualmente da Marco dall'editor Apps Script (menu Esegui ->
// installaTriggerArchiviazioneAutomatica) solo dopo aver verificato su
// TEST che eseguiArchiviazioneAutomaticaGiornaliera/archiveEligibleJobs_
// si comportano come previsto.
// Idempotente: rimuove un eventuale trigger preesistente con lo stesso
// handler prima di crearne uno nuovo, cosi' un'esecuzione ripetuta per
// errore non produce trigger duplicati che scatterebbero piu' volte al
// giorno.
function installaTriggerArchiviazioneAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'eseguiArchiviazioneAutomaticaGiornaliera') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  return ScriptApp.newTrigger('eseguiArchiviazioneAutomaticaGiornaliera')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
}

// §4.2: deleteJob cambia comportamento — non elimina piu' la riga, la
// sposta nel Cestino. Nome/azione API invariati (routeAction_ non
// cambia) per non toccare il contratto client/server: solo l'etichetta
// del bottone in UI e il testo di conferma cambiano (client.html).
function deleteJob(params) {
  return cestinaJob_(requireParam_(params, 'job_id'));
}

function updateColumnLabel(params) {
  return updateColumn(params);
}

function addColumn(params) {
  var label = String(requireParam_(params, 'label')).trim();
  var role = normalizeColumnRole_(params.role || 'neutral');
  var columns = readColumns_();
  var seen = {};
  columns.forEach(function(column) {
    seen[column.id] = true;
  });
  var id = uniqueColumnId_(slugify_(params.id || label), seen);
  var column = {
    id: id,
    label: label,
    role: role,
    order: (columns.length + 1) * 10,
    color: params.color || '#E8E8E8',
    hidden: coerceBoolean_(params.hidden)
  };
  if (params.aging_days !== undefined && params.aging_days !== '') {
    column.aging_days = Number(params.aging_days);
  }
  columns.push(column);
  columns = repositionColumn_(columns, id, params.after_status);
  columns = writeColumns_(columns);
  return ok_({ column: findColumn_(columns, id), columns: columns });
}

function updateColumn(params) {
  var id = validateColumnId_(requireParam_(params, 'status'));
  var columns = readColumns_();
  var column = findColumn_(columns, id);
  if (params.label !== undefined) {
    var label = String(params.label).trim();
    if (!label) {
      throw new Error('Etichetta colonna vuota');
    }
    column.label = label;
  }
  if (params.role !== undefined) {
    column.role = normalizeColumnRole_(params.role);
  }
  if (params.color !== undefined) {
    column.color = String(params.color || '#E8E8E8');
  }
  if (params.hidden !== undefined) {
    column.hidden = coerceBoolean_(params.hidden);
  }
  if (params.aging_days !== undefined) {
    // Stringa vuota = "disattiva l'evidenziazione per questa colonna",
    // scelta esplicita dell'utente dal pannello Impostazioni colonna —
    // non "campo non inviato" (quel caso non entra in questo if).
    column.aging_days = params.aging_days === '' ? undefined : Number(params.aging_days);
  }
  if (params.after_status !== undefined) {
    columns = repositionColumn_(columns, id, params.after_status);
  }
  columns = writeColumns_(columns);
  return ok_({ column: findColumn_(columns, id), columns: columns });
}

function repositionColumn_(columns, id, afterStatus) {
  if (afterStatus === undefined || afterStatus === id) { return columns; }
  var moving = findColumn_(columns, id);
  if (!moving) { return columns; }
  columns = columns.filter(function(column) { return column.id !== id; });
  if (!afterStatus) {
    columns.unshift(moving);
    return columns;
  }
  var target = -1;
  columns.forEach(function(column, index) {
    if (column.id === afterStatus) { target = index; }
  });
  columns.splice(target < 0 ? columns.length : target + 1, 0, moving);
  return columns;
}

function moveColumn(params) {
  var id = validateColumnId_(requireParam_(params, 'status'));
  var direction = requireParam_(params, 'direction');
  var columns = readColumns_();
  var index = -1;
  columns.forEach(function(column, i) {
    if (column.id === id) {
      index = i;
    }
  });
  var target = direction === 'left' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= columns.length) {
    return ok_({ columns: columns });
  }
  var current = columns[index];
  columns[index] = columns[target];
  columns[target] = current;
  columns = writeColumns_(columns);
  return ok_({ columns: columns });
}

function readJobFromRow_(sheet, row, headers) {
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var job = {};
  Object.keys(headers).forEach(function(header) {
    job[header] = normalizeCell_(values[headers[header] - 1]);
  });
  return job;
}

// O1 (DESIGN_performance.md, punto D): 'originalJob' opzionale - un
// chiamante che ha gia' in mano il job COSI' COM'ERA prima di mutarlo
// (letto da readJobFromRow_, prima di qualunque assegnazione) lo passa
// per scrivere solo le celle il cui valore e' davvero cambiato, invece
// della riga intera. Le operazioni sulla Cronologia (addActivityEvent/
// updateActivityEvent/deleteActivityEvent) e la correzione data
// (correctJobTimestamps) toccano tipicamente 1-3 dei 25 campi di
// JOB_HEADERS. Senza 'originalJob' (es. addJob/updateJob/moveJob, dove
// piu' campi cambiano insieme) si scrive la riga intera come prima -
// nessuna regressione per i chiamanti che non lo passano.
function writeJobToRow_(sheet, row, headers, job, originalJob) {
  if (!originalJob) {
    var values = JOB_HEADERS.map(function(header) {
      return job[header] === undefined ? '' : job[header];
    });
    sheet.getRange(row, 1, 1, JOB_HEADERS.length).setValues([values]);
    return;
  }

  JOB_HEADERS.forEach(function(header, index) {
    var newValue = job[header] === undefined ? '' : job[header];
    var oldValue = originalJob[header] === undefined ? '' : originalJob[header];
    if (newValue !== oldValue) {
      sheet.getRange(row, headers[header] || (index + 1)).setValue(newValue);
    }
  });
}

function jobToRow_(job) {
  return JOB_HEADERS.map(function(header) {
    return job[header] === undefined ? '' : job[header];
  });
}

function priorityFields_(params) {
  var impact = params.impact === undefined || params.impact === '' ? '' : Number(params.impact);
  var manageability = params.manageability === undefined || params.manageability === '' ? '' : Number(params.manageability);
  var score = calcPriorityScore(impact, manageability);
  var manual = Boolean(params.priority_class);
  var priorityClass = manual ? params.priority_class : suggestPriorityClass(score);
  return {
    impact: impact,
    manageability: manageability,
    priority_score: score,
    priority_class: priorityClass,
    priority_class_manual: manual
  };
}

function boardOptions_(jobs) {
  var config = readConfig_();
  var assignees = parseJsonArray_(config.assignees_json);
  var ambassadors = parseJsonArray_(config.ambassadors_json);
  var tags = parseJsonArray_(config.tags_json);

  jobs.forEach(function(job) {
    assignees.push(job.assignee);
    ambassadors.push(job.ambassador);
    tags.push(job.tag);
  });

  return {
    assignees: orderedUniqueValues_(assignees),
    ambassadors: orderedUniqueValues_(ambassadors),
    tags: orderedUniqueValues_(tags),
    sizes: Object.keys(SIGMAFLOW.SIZE_POINTS),
    card_colors: SIGMAFLOW.CARD_COLORS
  };
}

function updateOptionList(params) {
  var kind = requireParam_(params, 'kind');
  var configKey = optionConfigKey_(kind);
  var values = parseJsonArray_(readConfig_()[configKey]);
  var action = requireParam_(params, 'operation');
  var value = String(params.value || '').trim();

  if (action === 'add') {
    if (!value) { throw new Error('Inserisci un valore'); }
    values.push(value);
    values = orderedUniqueValues_(values);
  } else if (action === 'remove') {
    if (optionUsageCount_(kind, value) > 0) {
      throw new Error('Questa voce è usata da alcune card e non può essere rimossa.');
    }
    values = values.filter(function(item) { return item !== value; });
  } else if (action === 'move') {
    var index = values.indexOf(value);
    var target = params.direction === 'up' ? index - 1 : index + 1;
    if (index >= 0 && target >= 0 && target < values.length) {
      var current = values[index];
      values[index] = values[target];
      values[target] = current;
    }
  } else {
    throw new Error('Operazione elenco non supportata');
  }

  writeConfigValue_(configKey, JSON.stringify(values));
  return ok_({ kind: kind, values: values });
}

function optionConfigKey_(kind) {
  if (kind === 'assignees') { return 'assignees_json'; }
  if (kind === 'ambassadors') { return 'ambassadors_json'; }
  if (kind === 'tags') { return 'tags_json'; }
  throw new Error('Elenco non supportato: ' + kind);
}

function optionUsageCount_(kind, value) {
  var field = kind === 'assignees' ? 'assignee' : (kind === 'ambassadors' ? 'ambassador' : 'tag');
  return readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(job) {
    return String(job[field] || '') === value;
  }).length;
}

function normalizeCardColor_(value) {
  value = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
}
