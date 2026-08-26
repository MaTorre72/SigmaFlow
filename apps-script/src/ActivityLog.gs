// Helper per l'activity log delle card (Fase B del programma Activity Log).
// Nota: la funzione id qui sotto si chiama generateActivityEventId_ e non
// generateId_ come da specifica originale, perche' Utils.gs definisce gia'
// generateId_(prefix) per job_id — un secondo generateId_() senza
// parametri lo avrebbe sovrascritto silenziosamente (stesso scope globale
// Apps Script), rompendo la generazione di job_id esistente.

function generateActivityEventId_() {
  return Utilities.getUuid();
}

// Interpreta in modo sicuro il JSON dell'activity log: mai un errore fatale.
function parseActivityLog_(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return [];
  }

  var events;
  try {
    events = JSON.parse(rawValue);
  } catch (err) {
    return [];
  }

  if (!Array.isArray(events)) {
    return [];
  }

  return events.slice().sort(function(a, b) {
    return compareTs_(a.ts, b.ts);
  });
}

function serializeActivityLog_(events) {
  return JSON.stringify(events);
}

// Ricalcola 'from' per ogni evento 'move' di un log GIA' completo (nessun
// evento da inserire), scorrendolo in ordine e propagando il 'to'
// dell'evento move precedente. Il log va gia' ordinato per ts (come
// restituito da parseActivityLog_): a parita' di timestamp esatto,
// l'ordine risultante e' quello dell'array (Array.prototype.sort e'
// stabile), non un confronto indipendente evento per evento.
//
// Sostituisce il vecchio computeFrom_(events, insertedTs), che calcolava
// il from di OGNI evento cercando "l'ultimo evento con ts < insertedTs"
// indipendentemente dagli altri: con due eventi allo STESSO timestamp
// esatto (facile da ottenere: il campo data/ora della Cronologia in
// client.html ha precisione al minuto, isoToDatetimeLocal_ tronca i
// secondi), nessuno dei due risultava "prima" dell'altro, ed entrambi
// finivano per calcolare lo stesso from guardando solo l'evento distinto
// precedente — producendo in Cronologia coppie come "WIP -> WIP" o
// "TO DO -> TO DO" invece della sequenza reale. Bug segnalato da Marco
// durante il collaudo della Fase L3, presente pero' fin dalla Fase G
// (introduzione dell'activity log), non causato dal modello caso/visita.
function recalculateMoveFrom_(events) {
  var lastTo = null;
  return events.map(function(event) {
    if (event.type !== 'move') {
      return event;
    }
    var updated = Object.assign({}, event);
    updated.from = lastTo;
    lastTo = event.to;
    return updated;
  });
}

// Stessa correzione applicata alla scrittura di un evento nuovo/modificato
// (addActivityEvent/updateActivityEvent, tramite buildActivityEventCandidate_):
// il candidato non e' ancora nell'array, quindi non puo' riusare
// recalculateMoveFrom_ cosi' com'e'. Lo si inserisce in coda a 'events'
// (gia' ordinato) e si ordina in modo stabile per ts: a parita' di
// timestamp con un evento gia' esistente, il candidato — appena
// aggiunto/modificato dall'utente — e' considerato il piu' recente dei
// due, una convenzione deterministica ragionevole in assenza di
// un'informazione di ordine esplicita tra eventi identici nel tempo.
function computeFromForCandidate_(events, candidate) {
  var merged = events.concat([candidate]);
  var ordered = merged
    .map(function(event, index) { return { event: event, index: index }; })
    .sort(function(a, b) {
      var cmp = compareTs_(a.event.ts, b.event.ts);
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map(function(entry) { return entry.event; });

  var lastMoveTo = null;
  for (var i = 0; i < ordered.length; i++) {
    if (ordered[i].id === candidate.id) {
      break;
    }
    if (ordered[i].type === 'move') {
      lastMoveTo = ordered[i].to;
    }
  }
  return lastMoveTo;
}

// Valida un evento candidato rispetto al log esistente.
// hardErrors: bloccano sempre la scrittura.
// sequenceWarnings: superabili passando force: true.
function validateSequence_(events, candidate) {
  var hardErrors = [];
  var sequenceWarnings = [];

  if (compareTs_(candidate.ts, nowIso_()) > 0) {
    hardErrors.push('TS_IN_FUTURO');
  }

  var columns = readColumns_();
  if (candidate.type === 'move' && !findColumn_(columns, candidate.to)) {
    hardErrors.push('COLONNA_NON_TROVATA');
  }

  // M2 (DESIGN_dashboard.md, §3, opzione 2): un evento 'move' inserito a
  // mano in Cronologia che rappresenterebbe un rientro diretto da
  // un'attesa/completato a WIP deve essere vietato con la stessa regola
  // gia' applicata al drag-and-drop reale (moveJob, Kanban.gs) - non solo
  // sulla board, altrimenti la Cronologia potrebbe registrare uno stato
  // che l'interfaccia normale non permetterebbe mai di raggiungere.
  if (candidate.type === 'move' && candidate.from && !hardErrors.length) {
    var sourceColumnForReentryCheck = findColumn_(columns, candidate.from);
    var targetColumnForReentryCheck = findColumn_(columns, candidate.to);
    var sourceClosesTowardActiveForCheck = sourceColumnForReentryCheck &&
      (sourceColumnForReentryCheck.role === 'stand_by' || sourceColumnForReentryCheck.role === 'done');
    if (sourceClosesTowardActiveForCheck && targetColumnForReentryCheck && targetColumnForReentryCheck.role === 'wip') {
      hardErrors.push('RIENTRO_DIRETTO_WIP_NON_CONSENTITO');
    }
  }

  if (candidate.type === 'correction' && !String(candidate.reason || '').trim()) {
    hardErrors.push('REASON_OBBLIGATORIA');
  }

  // N1 (DESIGN_archiviazione.md, §8b): un evento 'correction' deve
  // indicare un campo correggibile (whitelist SIGMAFLOW.CORRECTABLE_FIELDS,
  // non un editor generico su qualunque colonna di jobs) e un nuovo
  // valore che sia davvero una data valida — entrambi i campi che
  // checkStructuralAlignment_/applyStructuralAlignment_ scriveranno poi
  // su job[candidate.field].
  if (candidate.type === 'correction') {
    if (SIGMAFLOW.CORRECTABLE_FIELDS.indexOf(candidate.field) === -1) {
      hardErrors.push('CAMPO_NON_CORREGGIBILE');
    } else if (!candidate.new || !isValidIso8601_(candidate.new)) {
      hardErrors.push('DATA_NON_VALIDA');
    }
  }

  // Se ci sono hard error non ha senso calcolare i warning di sequenza:
  // il candidato non verra' comunque scritto.
  if (hardErrors.length) {
    return { hardErrors: hardErrors, sequenceWarnings: sequenceWarnings };
  }

  var merged = events.concat([candidate]).slice().sort(function(a, b) {
    return compareTs_(a.ts, b.ts);
  });
  var moves = merged.filter(function(event) {
    return event.type === 'move';
  });

  var touchesCandidate = function(a, b) {
    return a.id === candidate.id || b.id === candidate.id;
  };

  for (var i = 0; i < moves.length - 1; i++) {
    var current = moves[i];
    var next = moves[i + 1];

    if (touchesCandidate(current, next)) {
      // SEQUENZA_MODIFICATA: inserendo/spostando il candidato, il from
      // dell'evento move successivo non corrisponde piu' al to precedente.
      if (next.from !== undefined && next.from !== null && next.from !== current.to) {
        sequenceWarnings.push({
          code: 'SEQUENZA_MODIFICATA',
          eventTs: next.ts,
          oldFrom: next.from,
          newFrom: current.to
        });
      }

      // COLONNA_DOPPIA: due move consecutivi verso la stessa colonna.
      if (current.to === next.to) {
        sequenceWarnings.push({
          code: 'COLONNA_DOPPIA',
          ts1: current.ts,
          ts2: next.ts,
          colonna: current.to
        });

        var column = findColumn_(columns, current.to);
        if (column && column.role === 'stand_by') {
          // ATTESA_SENZA_USCITA: si rientra nella stessa colonna di attesa
          // senza che nel mezzo ci sia stata un'uscita verso un'altra colonna.
          sequenceWarnings.push({
            code: 'ATTESA_SENZA_USCITA',
            colonna: current.to,
            ts: next.ts
          });
        }
      }
    }
  }

  return { hardErrors: hardErrors, sequenceWarnings: sequenceWarnings };
}

// Confronta l'evento candidato con i campi strutturati ancora su jobs
// (arrival_ts, incarico_chiuso_ts via CORRECTABLE_FIELDS). I gate della
// visita (start_ts/done_ts/incarico_ts/prep_ts, rimossi da jobs in L5,
// sez. 9.1) non passano piu' da qui — Fase Q (DESIGN_derivazione_visite.md):
// sono derivati per intero da computeVisiteFromLog_/syncVisiteFromLog_
// (Kanban.gs) dal log completo, mai da un warning sul solo candidato.
function checkStructuralAlignment_(job, candidate) {
  var warnings = [];

  // N1 (DESIGN_archiviazione.md, §8b): un evento 'correction' scrive
  // direttamente il campo corretto sul job, riusando lo stesso percorso
  // di applicazione (applyStructuralAlignment_) usato anche dal warning
  // arrival_ts sotto — nessuna via separata per aggiornare jobs.
  // Whitelist esplicita (SIGMAFLOW.CORRECTABLE_FIELDS), gia' verificata
  // come hard error in validateSequence_ — qui il campo e' per costruzione
  // gia' valido se si arriva fin qui.
  if (candidate.type === 'correction' && SIGMAFLOW.CORRECTABLE_FIELDS.indexOf(candidate.field) !== -1) {
    warnings.push({ field: candidate.field, currentValue: job[candidate.field] || '', suggestedValue: candidate.new });
  }

  if (candidate.type === 'move' && candidate.from === null) {
    // L'evento con from null e' per costruzione l'evento di creazione
    // della card (addJob): la sua data e' sempre la fonte di arrival_ts,
    // in entrambe le direzioni (anche se corretta a una data successiva),
    // non solo quando precede il valore attuale.
    if (!job.arrival_ts || compareTs_(job.arrival_ts, candidate.ts) !== 0) {
      warnings.push({ field: 'arrival_ts', currentValue: job.arrival_ts || '', suggestedValue: candidate.ts });
    }
  } else if (candidate.type !== 'correction' && job.arrival_ts && compareTs_(candidate.ts, job.arrival_ts) < 0) {
    // 'correction' esclusa qui apposta (N1): ha gia' il proprio warning
    // esplicito sopra, con suggestedValue = candidate.new (il valore
    // scelto dall'utente) — non candidate.ts (la data dell'EVENTO di
    // correzione, che e' tipicamente oggi anche quando corregge una data
    // lontana nel passato). Senza questa esclusione le due regole
    // scriverebbero due warning sullo stesso campo, e l'ultimo applicato
    // vincerebbe silenziosamente su quello voluto dall'utente.
    warnings.push({ field: 'arrival_ts', currentValue: job.arrival_ts, suggestedValue: candidate.ts });
  }

  return warnings;
}

// Migrazione una tantum: ricostruisce l'evento di creazione mancante in
// activity_log_json (Fase F, gate umano). Da eseguire solo su TEST, mai
// su PROD.

// Azione Web App: rifiuta esplicitamente se non chiamata con env: 'test',
// stesso pattern gia' usato da seedTestData in Tests.gs.
function migrateToActivityLog(params) {
  params = params || {};
  if (normalizeEnv_(params.env) !== 'test') {
    throw new Error('La migrazione dell\'activity log e\' consentita solo in ambiente TEST.');
  }
  return ok_(migrateActivityLogData_(getSpreadsheet_()));
}

// Versione eseguibile direttamente dall'editor Apps Script (nessun
// parametro env disponibile in quel contesto): forza esplicitamente lo
// spreadsheet di TEST con withTestSpreadsheet_, esattamente come fa
// generateTestDataset() in Tests.gs per lo stesso motivo — senza questo
// avvolgimento, un click su "Esegui" in editor userebbe lo spreadsheet
// puntato al momento dalla Script Property (oggi PROD), rischio reale
// vista l'incidente di questa notte sulla property condivisa.
function migrateActivityLogOnTest() {
  return withTestSpreadsheet_(function(ss) {
    return migrateActivityLogData_(ss);
  });
}

function migrateActivityLogData_(ss) {
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var jobs = readTable_(sheet);
  var summary = {
    cards_processed: 0,
    creation_events_backfilled: 0,
    cards_skipped: 0,
    errors: []
  };

  if (!jobs.length) {
    console.log(JSON.stringify(summary));
    return summary;
  }

  var migrationTs = nowIso_();
  var rows = jobs.map(function(job) {
    try {
      var result = migrateSingleJobActivityLog_(job, migrationTs);
      summary.cards_processed++;
      if (result.creationEventBackfilled) { summary.creation_events_backfilled++; }
      return jobToRow_(job);
    } catch (err) {
      summary.cards_skipped++;
      summary.errors.push({ job_id: job.job_id, message: err.message });
      return jobToRow_(job);
    }
  });

  sheet.getRange(2, 1, rows.length, JOB_HEADERS.length).setValues(rows);
  console.log(JSON.stringify(summary));
  return summary;
}

// Ricava una data indicativa dal job_id (formato JOB-YYYYMMDD-XXXX,
// generato da generateJobId in Utils.gs), fissando le 9:00 come ora di
// default — su richiesta di Marco, come indizio migliore della data di
// migrazione quando arrival_ts manca (§ commento in
// migrateSingleJobActivityLog_). Non fabbrica nulla se il job_id non
// segue il formato atteso o incorpora una data non valida (es. giorno
// 31 di un mese che non lo ha): ritorna null, lasciando che il chiamante
// ricada sull'ultima risorsa.
function extractDateFromJobId_(jobId) {
  var match = /^JOB-(\d{4})(\d{2})(\d{2})-/.exec(String(jobId || ''));
  if (!match) {
    return null;
  }
  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var candidate = new Date(year, month - 1, day, 9, 0, 0);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return null;
  }
  return Utilities.formatDate(candidate, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// Migra una singola card: ricostruisce l'evento di creazione mancante
// nel log. Muta l'oggetto job passato.
// Fino alla sessione M0-A migrava anche correction_log_json (verso
// eventi 'correction') e checklist_json (in coda a description): campi
// rimossi dallo schema, quel codice non poteva piu' fare nulla (la
// migrazione reale di PROD, unica destinataria, e' gia' stata eseguita
// e non lascia mai piu' queste colonne su un foglio in schema corrente).
function migrateSingleJobActivityLog_(job, migrationTs) {
  var log = parseActivityLog_(job.activity_log_json);
  var creationEventBackfilled = false;

  // Ogni card deve avere un evento di creazione (from null) come primo
  // riferimento in Cronologia, per dare all'utente un punto di partenza
  // ("questo lavoro e' entrato molto tempo fa") e per permettere il
  // calcolo di incarico_ts al primo, eventuale, rientro in BACKLOG. Le
  // card seedate per i test o mai passate da addJob possono averne il
  // log completamente vuoto: qui si sintetizza un evento di creazione
  // usando arrival_ts (o, in mancanza, il momento della migrazione).
  var hasCreationEvent = log.some(function(event) {
    return event.type === 'move' && event.from === null;
  });
  if (!hasCreationEvent) {
    // Colonna di destinazione dell'evento sintetico: se esistono gia'
    // altri move nel log, la colonna corretta e' il "from" del piu'
    // vecchio di questi (e' letteralmente da dove la card e' partita
    // prima di quel movimento) — MAI job.status attuale, che riflette
    // dove si trova ORA e produrrebbe un evento di creazione
    // contraddittorio se la card si e' gia' spostata da allora (es.
    // "creata in WIP" seguito da uno spostamento "da BACKLOG").
    // Solo se non esiste alcun altro move nel log lo stato attuale
    // coincide per forza con quello di partenza.
    var existingMoves = log.filter(function(event) { return event.type === 'move'; })
      .sort(function(a, b) { return compareTs_(a.ts, b.ts); });
    var backfillTo = existingMoves.length ? existingMoves[0].from : (job.status || 'backlog');
    // Data dell'evento sintetico: arrival_ts se presente; altrimenti,
    // invece di ricadere subito sulla data di oggi (avrebbe fatto
    // sembrare "creato oggi" un caso magari vecchio di mesi — segnalato
    // da Marco sulla migrazione PROD reale, dove molte card storiche non
    // hanno mai avuto arrival_ts valorizzato), un indizio migliore:
    // job_id incorpora la data di creazione reale (formato
    // JOB-YYYYMMDD-XXXX, generato da generateJobId in Utils.gs). Solo se
    // nessuno dei due e' disponibile si usa la data della migrazione
    // come ultima risorsa. Non fabbrica una data se il job_id non segue
    // il formato atteso (extractDateFromJobId_ ritorna null in quel caso).
    log.push({
      id: generateActivityEventId_(),
      ts: job.arrival_ts || extractDateFromJobId_(job.job_id) || migrationTs,
      type: 'move',
      source: 'auto',
      to: backfillTo || job.status || 'backlog',
      from: null,
      note: ''
    });
    creationEventBackfilled = true;
  }

  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  // Ricalcola i campi strutturati rileggendo tutto il log dall'inizio,
  // nello stesso ordine cronologico in cui sono avvenuti: e' l'unico modo
  // per tenerli coerenti quando il log e' stato completato con un evento
  // di creazione ricostruito (che non passa da addActivityEvent, l'unica
  // via che allinea i campi in tempo reale). Riusa la stessa logica di
  // allineamento della scrittura live, cosi' il risultato e' identico a
  // quello che si sarebbe ottenuto se gli eventi fossero stati registrati
  // uno per uno nel tempo.
  var backfilledMoves = log.filter(function(event) { return event.type === 'move'; })
    .sort(function(a, b) { return compareTs_(a.ts, b.ts); });
  backfilledMoves.forEach(function(moveEvent) {
    applyStructuralAlignment_(job, checkStructuralAlignment_(job, moveEvent));
  });

  // Fase Q (DESIGN_derivazione_visite.md, §2): il log del job e' appena
  // cambiato (evento di creazione backfillato) — stesso meccanismo unico
  // usato da moveJob/addActivityEvent/updateActivityEvent/deleteActivityEvent,
  // non un caso a parte. Sovrascritto comunque dalla successiva
  // migrateVisiteFromHistory_ quando questa migrazione gira dentro
  // eseguiMigrazioneCompleta_ — ridondante ma innocuo li', necessario
  // quando migrateToActivityLog/migrateActivityLogOnTest gira da sola.
  syncVisiteFromLog_(job, backfilledMoves);

  job.activity_log_json = serializeActivityLog_(log);

  return { creationEventBackfilled: creationEventBackfilled };
}

// Fase L5 (DESIGN_modello_caso_visita.md, sez. 7): materializzazione UNA
// TANTUM delle visite storiche per ogni caso esistente, leggendo l'intero
// activity_log_json e applicando la stessa regola di apertura/chiusura
// gia' live in moveJob/syncVisiteFromLog_ (Fase Q, Kanban.gs), non piu'
// "derivazione a runtime ad ogni lettura" come nel documento precedente
// (BUGFIX_derivazione_gate_dal_log.md). Sovrascrive qualunque riga
// 'visite' preesistente: i bootstrap minimi creati da L2/L3 per i job
// toccati prima di questa migrazione sono provvisori, questa e' la
// ricostruzione autorevole. Via web app/editor "normale" solo TEST — su
// PROD reale solo tramite migrateVisiteFromHistorySuProd() sotto,
// eseguita da Marco stesso, mai in automatico (2026-08-20: collaudo di
// Marco su una copia di PROD ha trovato lo stesso gap su dati reali —
// 'visite' non rifletteva 7 mesi di rientri veri di un caso, corretto
// li' da migrateVisiteFromHistoryOnTest(); gate confermato per
// replicarlo su PROD vero).

// Azione Web App: stesso pattern di migrateToActivityLog.
function migrateVisiteFromHistory(params) {
  params = params || {};
  if (normalizeEnv_(params.env) !== 'test') {
    throw new Error('La migrazione storica delle visite e\' consentita solo in ambiente TEST.');
  }
  return ok_(migrateVisiteFromHistory_(getSpreadsheet_()));
}

// Versione eseguibile direttamente dall'editor Apps Script, stesso
// motivo/pattern di migrateActivityLogOnTest.
function migrateVisiteFromHistoryOnTest() {
  return withTestSpreadsheet_(function(ss) {
    return migrateVisiteFromHistory_(ss);
  });
}

// Stesso pattern di sicurezza di allineaSchemaSuProd (Schema.gs): apre
// SIGMAFLOW.DEFAULT_SPREADSHEET_ID direttamente per id, verifica il nome
// prima di scrivere, si ferma da sola se non corrisponde. A differenza
// di setupSigmaFlow(), migrateVisiteFromHistory_(ss) accetta lo
// spreadsheet esplicitamente — non serve toccare la Script Property
// condivisa SIGMAFLOW_SPREADSHEET_ID, un rischio in meno rispetto ad
// allineaSchemaSuProd. DISTRUTTIVA su 'visite' (la svuota e la riscrive
// per intero, rileggendo activity_log_json — mai jobs_archivio/
// jobs_cestino, fuori scope di questa funzione) — da eseguire solo su
// richiesta esplicita di Marco, direttamente da lui dall'editor Apps
// Script (menu Esegui), mai da codice o gate automatico. Nome senza
// underscore finale per restare visibile nel menu Esegui, come
// allineaSchemaSuProd.
function migrateVisiteFromHistorySuProd() {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  if (ss.getName() !== 'SigmaFlow Database') {
    throw new Error('Nome foglio inatteso ("' + ss.getName() + '"), controllo di sicurezza fallito. Nessuna modifica eseguita.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return migrateVisiteFromHistory_(ss);
  } finally {
    lock.releaseLock();
  }
}

function migrateVisiteFromHistory_(ss) {
  var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var visiteSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  var jobs = readTable_(jobsSheet);

  var summary = {
    jobs_processed: 0,
    jobs_without_log: 0,
    visite_written: 0,
    coherence_warnings: []
  };

  if (!jobs.length) {
    return summary;
  }

  var allVisite = [];
  jobs.forEach(function(job) {
    var moveLog = parseActivityLog_(job.activity_log_json).filter(function(event) {
      return event.type === 'move';
    });
    var result = computeVisiteFromLog_(job.job_id, moveLog);
    if (!result.visite.length) {
      summary.jobs_without_log++;
      return;
    }

    summary.jobs_processed++;
    result.warnings.forEach(function(warning) {
      summary.coherence_warnings.push(warning);
    });
    allVisite = allVisite.concat(result.visite);
  });

  visiteSheet.clear();
  visiteSheet.getRange(1, 1, 1, VISITE_HEADERS.length).setValues([VISITE_HEADERS]);
  visiteSheet.setFrozenRows(1);
  if (allVisite.length) {
    var rows = allVisite.map(function(visit) {
      return VISITE_HEADERS.map(function(header) {
        return visit[header] === undefined ? '' : visit[header];
      });
    });
    visiteSheet.getRange(2, 1, rows.length, VISITE_HEADERS.length).setValues(rows);
  }
  summary.visite_written = allVisite.length;

  return summary;
}

// Ricostruisce la sequenza di visite di un caso dall'intero log,
// applicando in ordine cronologico la stessa regola di sez. 2. A
// differenza del vecchio checkStructuralAlignment_/replay (che leggeva
// il campo 'from' memorizzato, potenzialmente contraddittorio — vedi
// "Card A" nel documento bugfix: creazione con to=wip ma un evento
// successivo che dichiara from=backlog mai realmente visitato), questa
// funzione NON legge mai 'from': ricostruisce la sequenza delle colonne
// esclusivamente dal 'to' di ogni evento, in ordine. Un log come quello
// della Card A non puo' quindi produrre un'incoerenza qui: si usa la
// sequenza reale dei 'to', il campo 'from' (eventualmente sbagliato)
// e' semplicemente ignorato.
// Fase Q (DESIGN_derivazione_visite.md): riceve moveLog gia' filtrato/
// ordinato dal chiamante invece di rileggerlo da job.activity_log_json —
// serve anche a syncVisiteFromLog_ (Kanban.gs), chiamata con il log
// aggiornato in memoria PRIMA che job.activity_log_json venga riscritto.
function computeVisiteFromLog_(jobId, moveLog) {
  var log = moveLog || [];

  var result = { visite: [], warnings: [] };
  if (!log.length) {
    return result;
  }

  var columns = readColumns_();
  var currentVisit = null;
  var currentColumnId = null;
  var visitNumber = 0;

  function openVisit(ts, reworkCause) {
    visitNumber++;
    currentVisit = {
      job_id: jobId,
      numero_visita: visitNumber,
      apertura_ts: ts,
      incarico_ts: '',
      prep_ts: '',
      start_ts: '',
      consegna_ts: '',
      rientro_ts: '',
      rientro_da: '',
      t_cliente_d: 0,
      t_ente_d: 0,
      t_interno_d: 0,
      rework_cause: reworkCause || ''
    };
    result.visite.push(currentVisit);
  }

  openVisit(log[0].ts, '');

  log.forEach(function(event, index) {
    var sourceColumn = currentColumnId ? (findColumn_(columns, currentColumnId) || { id: currentColumnId, role: 'neutral' }) : null;
    var targetColumn = findColumn_(columns, event.to) || { id: event.to, role: 'neutral' };
    var sourceClosesTowardActive = index > 0 && sourceColumn && (sourceColumn.role === 'stand_by' || sourceColumn.role === 'done');

    if (sourceClosesTowardActive && sourceColumn.role === 'stand_by') {
      accumulateWaitTime_(currentVisit, sourceColumn, log.slice(0, index), event.ts);
    }

    if (sourceClosesTowardActive && targetColumn.role === 'wip') {
      // Nello storico non dovrebbe esistere (il guardia in moveJob lo
      // impedisce dal vivo): se compare, e' una correzione manuale che
      // lo ha aggirato o un dato precedente all'introduzione del
      // guardia. Si segnala, non si corregge automaticamente (stesso
      // principio del documento bugfix: report, non correzione cieca).
      result.warnings.push({
        job_id: jobId,
        code: 'RIENTRO_DIRETTO_A_WIP',
        ts: event.ts,
        from: sourceColumn.id,
        message: 'Rientro diretto da "' + sourceColumn.id + '" a WIP rilevato nello storico (evento del ' + event.ts + '), normalmente impedito dal guardia in moveJob.'
      });
    }

    if (sourceClosesTowardActive && (targetColumn.role === 'backlog' || targetColumn.role === 'prep')) {
      currentVisit.rientro_ts = event.ts;
      currentVisit.rientro_da = sourceColumn.id;
      openVisit(event.ts, sourceColumn.id);
    }

    if (targetColumn.role === 'backlog' && !currentVisit.incarico_ts) {
      currentVisit.incarico_ts = event.ts;
    }
    if (targetColumn.role === 'prep' && !currentVisit.prep_ts) {
      currentVisit.prep_ts = event.ts;
    }
    if (targetColumn.role === 'wip' && !currentVisit.start_ts) {
      currentVisit.start_ts = event.ts;
    }
    if (targetColumn.role === 'done' && !currentVisit.consegna_ts) {
      currentVisit.consegna_ts = event.ts;
    }

    currentColumnId = event.to;
  });

  return result;
}

// Fase "R2" (AUDIT_MIGRAZIONE_PROD.md v2, sez. 4-5): orchestratrice
// unica per i 4 passi della migrazione verso il modello caso/visita —
// backfill Fase G (activity_log_json), correzione columns_json (colonna
// 'prep' ancora con ruolo 'wip', stato pre-Fase-K), allineamento schema
// K/L1 (foglio 'visite', incarico_ts/prep_ts/incarico_chiuso_ts), L5
// parte 1 (migrazione storica delle visite). Scritta una volta, pensata
// per essere richiamata identica sia su una copia di prova sia su PROD
// vero (mai da questa sessione — solo dopo richiesta esplicita
// separata). **Non include L5 parte 2** (rimozione campi duplicati,
// irreversibile): resta sempre un gesto separato dopo revisione dei
// risultati.
//
// **Ordine di esecuzione interno diverso dall'elenco concettuale
// (1 backfill, 2 columns_json, 3 schema, 4 visite) chiesto in origine**:
// verificato con un test dedicato (vedi Tests.gs) che eseguire il
// backfill PRIMA dell'allineamento schema corrompe i dati — jobToRow_
// scrive un array nella forma di JOB_HEADERS *corrente* (25 colonne,
// con activity_log_json) dentro un foglio la cui riga di intestazione
// e' ancora quella vecchia (31 colonne, senza activity_log_json): le
// colonne si disallineano silenziosamente (dati shiftati). L'ordine
// sicuro, confermato dal test: schema PRIMA, poi backfill. I nomi dei
// campi nel risultato restano quelli richiesti, per continuita' con la
// descrizione dei 4 passi.
//
// Le funzioni riusate qui sotto (migrateActivityLogData_,
// checkStructuralAlignment_/readColumns_ al loro interno,
// migrateVisiteFromHistory_) risolvono lo spreadsheet target tramite
// getSpreadsheet_() (variabile per-esecuzione __sfRoutedSpreadsheetId_,
// P1 — DESIGN_lock_ambiente.md), non tramite il parametro 'ss' che
// ricevono in superficie — per questo l'intera orchestrazione, non solo
// l'allineamento schema, va eseguita con quella variabile valorizzata
// sul foglio target (stesso principio gia' usato da
// withTestSpreadsheet_/withEnvironment_ in Utils.gs). Verificato anche
// questo con un test dedicato: senza lo scambio, le chiamate annidate
// risolvono lo spreadsheet sbagliato e falliscono.
function eseguiMigrazioneCompleta_(ss, params) {
  params = params || {};
  var nomeAtteso = String(params.confermaNome || '');
  var nomeReale = ss.getName();
  if (nomeAtteso !== nomeReale) {
    throw new Error('confermaNome ("' + nomeAtteso + '") non corrisponde al nome del foglio target ("' + nomeReale + '"). Nessuna modifica eseguita.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var previousSpreadsheetId = __sfRoutedSpreadsheetId_;
  __sfRoutedSpreadsheetId_ = ss.getId();

  try {
    var schemaAlignment = setupSigmaFlow();
    // N1: setupSigmaFlow() apre un proprio riferimento allo spreadsheet
    // (getSpreadsheet_ -> SpreadsheetApp.openById), indipendente da
    // 'ss' qui sopra. Finche' setupSigmaFlow toccava poco lo schema il
    // vecchio 'ss' restava comunque valido; ora che cancella 'cases' e
    // crea cinque fogli nuovi nella stessa chiamata, il riferimento
    // vecchio puo' restare agganciato a uno stato di struttura non piu'
    // valido — causa vera (non solo un hiccup del servizio, come
    // ipotizzato inizialmente) di "Sheet non trovato" in
    // migrateActivityLogData_ subito dopo, trovata da Marco durante il
    // collaudo N1. Un openById successivo riallinea il riferimento.
    ss = SpreadsheetApp.openById(ss.getId());
    var backfillActivityLog = migrateActivityLogData_(ss);
    var columnsJson = fixPrepColumnRole_(ss);
    var visiteMigration = migrateVisiteFromHistory_(ss);

    var summary = {
      spreadsheet_id: ss.getId(),
      spreadsheet_name: nomeReale,
      step1_backfill_activity_log: backfillActivityLog,
      step2_columns_json: columnsJson,
      step3_schema_alignment: schemaAlignment,
      step4_migrazione_visite: visiteMigration
    };
    console.log(JSON.stringify(summary));
    return summary;
  } finally {
    __sfRoutedSpreadsheetId_ = previousSpreadsheetId;
    lock.releaseLock();
  }
}

// R3 (AUDIT_MIGRAZIONE_PROD.md v2, sez. 5): esecuzione eseguibile con un
// click dall'editor Apps Script (stesso pattern di
// migrateVisiteFromHistoryOnTest), sulla copia reale di PROD confermata
// da Marco in sessione il 2026-08-16 ("Backup di SigmaFlow Database").
//
// NOME SENZA underscore finale apposta: le funzioni con "_" alla fine
// sono trattate da Apps Script come private e nascoste dal menu
// "Esegui" dell'editor — esattamente come migrateActivityLogOnTest/
// migrateVisiteFromHistoryOnTest (pubbliche, cliccabili) rispetto alle
// funzioni interne che chiamano (con underscore). Avevo copiato per
// errore l'underscore dalla funzione principale, rendendo questo
// wrapper invisibile nel menu — segnalato da Marco, corretto qui.
//
// ID e nome sono scritti qui come due valori INDIPENDENTI apposta: id
// preso dal messaggio di Marco, nome confermato separatamente a parola
// sua. Se in futuro questo foglio venisse duplicato/rinominato e l'id
// puntasse altrove per errore, confermaNome non corrisponderebbe piu' e
// la funzione si fermerebbe da sola — lo stesso principio del controllo
// in eseguiMigrazioneCompleta_, non un'auto-conferma (ss.getName() con
// se stesso sarebbe sempre vera, inutile come controllo).
function eseguiMigrazioneCompletaSuCopiaProd() {
  var ss = SpreadsheetApp.openById('1xUMWhAK8tovUU_gHEqizi9WDoqxTULzzfaygAfYL3FI');
  return eseguiMigrazioneCompleta_(ss, { confermaNome: 'Backup di SigmaFlow Database' });
}

// P5 (AUDIT_MIGRAZIONE_PROD.md v2, sez. 5): stessa identica funzione
// gia' collaudata in R3 su "Backup di SigmaFlow Database" (copia reale
// di PROD), qui puntata sul foglio PROD vero — id e nome confermati da
// Marco in sessione il 2026-08-16, DEFAULT_SPREADSHEET_ID in
// Constants.gs. Da eseguire solo su richiesta esplicita separata, mai
// da questa sessione: nessuna riga di questo file scrive su PROD finche'
// Marco stesso non clicca "Esegui" su questa funzione nell'editor.
//
// Nome SENZA underscore finale apposta (promemoria di Marco): le
// funzioni con "_" alla fine sono nascoste dal menu "Esegui"
// dell'editor Apps Script, stesso motivo per cui
// eseguiMigrazioneCompletaSuCopiaProd non ne ha uno.
function eseguiMigrazioneCompletaSuProd() {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  return eseguiMigrazioneCompleta_(ss, { confermaNome: 'SigmaFlow Database' });
}

// P7 (DESIGN_lock_ambiente.md §2.7): migrazione una tantum sui job GIA'
// ESISTENTI, scritti in modo inaffidabile prima del fix di P5
// (recomputeCurrentStatus_/recomputeIncaricoChiusoTs_, Kanban.gs) - quel
// fix corregge status/status_since_ts/incarico_chiuso_ts solo da oggi in
// avanti, ad ogni modifica della Cronologia; i job scritti prima
// restano con qualunque valore la vecchia logica aveva prodotto.
// Verificato sui dati reali (55 job con Cronologia leggibile): 20 con
// status_since_ts disallineato, 2 con status stesso diverso da dove
// l'ultimo evento della Cronologia dice che dovrebbero essere.
//
// Riusa le due funzioni pure di P5 COSI' COME SONO (nessuna riscrittura,
// nessuna modifica): la Cronologia (activity_log_json) resta l'unica
// fonte di verita', qui applicata retroattivamente a ogni riga del
// foglio 'jobs'. Non tocca 'visite' - solo i tre campi su 'jobs'.
//
// dryRun (default true, il valore MAI usato per la scrittura reale):
// con true, nessuna scrittura sul foglio - solo il report di cosa
// cambierebbe. Con false (sempre esplicito), scrive SOLO i campi che
// differiscono, riga per riga (via writeJobToRow_ con originalJob,
// stesso principio O1) - il report e' comunque sempre calcolato e
// restituito/loggato, con un timestamp proprio per ogni esecuzione, per
// permettere un controllo a posteriori su una scrittura di massa.
//
// Riga con activity_log_json mancante o non interpretabile: saltata e
// segnalata in rows_skipped_unparsable, non blocca le altre righe -
// parseActivityLog_ non lancia mai un errore fatale (ritorna [] su
// qualunque JSON non valido), quindi il caso si riconosce da un log
// vuoto dopo il parsing, non da un'eccezione.
function recomputeExistingJobsStatus_(ss, dryRun) {
  dryRun = dryRun !== false;
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var headers = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();

  var report = {
    dry_run: dryRun,
    spreadsheet_id: ss.getId(),
    spreadsheet_name: ss.getName(),
    executed_at: nowIso_(),
    total_rows_scanned: 0,
    rows_skipped_unparsable: [],
    rows_changed: 0,
    changes_by_field: { status: 0, status_since_ts: 0, incarico_chiuso_ts: 0 },
    status_changes_detail: [],
    changes: []
  };

  for (var row = 2; row <= lastRow; row++) {
    var job = readJobFromRow_(sheet, row, headers);
    if (!job.job_id) {
      continue;
    }
    report.total_rows_scanned++;

    var log = parseActivityLog_(job.activity_log_json);
    if (!log.length) {
      report.rows_skipped_unparsable.push({ job_id: job.job_id, row: row, reason: 'activity_log_json vuoto o non interpretabile' });
      continue;
    }

    var before = {
      status: job.status,
      status_since_ts: job.status_since_ts,
      incarico_chiuso_ts: job.incarico_chiuso_ts
    };

    // Copia: recomputeCurrentStatus_/recomputeIncaricoChiusoTs_ mutano
    // l'oggetto passato - 'job' resta l'originale, per writeJobToRow_.
    var recomputed = Object.assign({}, job);
    recomputeCurrentStatus_(recomputed, log);
    recomputeIncaricoChiusoTs_(recomputed, log);

    var rowChanges = [];
    ['status', 'status_since_ts', 'incarico_chiuso_ts'].forEach(function(field) {
      if (before[field] !== recomputed[field]) {
        rowChanges.push({ field: field, before: before[field], after: recomputed[field] });
        report.changes_by_field[field]++;
      }
    });

    if (!rowChanges.length) {
      continue;
    }

    report.rows_changed++;
    var changeEntry = { job_id: job.job_id, row: row, fields: rowChanges };
    report.changes.push(changeEntry);
    if (rowChanges.some(function(change) { return change.field === 'status'; })) {
      report.status_changes_detail.push(changeEntry);
    }

    if (!dryRun) {
      writeJobToRow_(sheet, row, headers, recomputed, job);
    }
  }

  Logger.log(JSON.stringify(report));
  return report;
}

// Esegue la migrazione P7 sul foglio TEST (withTestSpreadsheet_, stesso
// meccanismo gia' usato da migrateVisiteFromHistoryOnTest/
// setupSigmaFlowOnTest) - eseguibile dall'editor Apps Script (menu
// Esegui) o via `clasp run` (execution API), mai sul foglio PROD.
function recomputeExistingJobsStatusOnTest(dryRun) {
  return withTestSpreadsheet_(function(ss) {
    return recomputeExistingJobsStatus_(ss, dryRun);
  });
}

// Wrapper senza parametri, per lanciarli con un click dal menu Esegui
// dell'editor (che chiama sempre la funzione selezionata a zero
// argomenti - non c'e' modo di passare dryRun a mano da li'). Stesso
// dryRun esplicito di sempre: Write è SEMPRE dryRun=false, mai il
// default.
function recomputeExistingJobsStatusOnTestDryRun() {
  return recomputeExistingJobsStatusOnTest(true);
}

function recomputeExistingJobsStatusOnTestWrite() {
  return recomputeExistingJobsStatusOnTest(false);
}

// Stesso pattern di sicurezza di allineaSchemaSuProd/
// migrateVisiteFromHistorySuProd: apre SIGMAFLOW.DEFAULT_SPREADSHEET_ID
// direttamente per id, verifica il nome prima di scrivere, si ferma da
// sola se non corrisponde. Nome SENZA underscore finale apposta, per
// restare visibile nel menu Esegui - da eseguire solo su richiesta
// esplicita, direttamente da Marco stesso dall'editor Apps Script (o da
// lui via `clasp run` dal proprio terminale), MAI da questa sessione o
// da un'esecuzione automatica: nessuna riga di questo file scrive su
// PROD finche' non e' Marco stesso a farlo scattare.
function recomputeExistingJobsStatusSuProd(dryRun) {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  if (ss.getName() !== 'SigmaFlow Database') {
    throw new Error('Nome foglio inatteso ("' + ss.getName() + '"), controllo di sicurezza fallito. Nessuna modifica eseguita.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return recomputeExistingJobsStatus_(ss, dryRun);
  } finally {
    lock.releaseLock();
  }
}

// Wrapper senza parametri per l'editor, stesso motivo di
// recomputeExistingJobsStatusOnTestDryRun/Write sopra.
// recomputeExistingJobsStatusSuProdWrite è LA funzione che scrive
// davvero su PROD - va lanciata solo da Marco, mai da Claude, gate o
// non gate (CLAUDE.md).
function recomputeExistingJobsStatusSuProdDryRun() {
  return recomputeExistingJobsStatusSuProd(true);
}

function recomputeExistingJobsStatusSuProdWrite() {
  return recomputeExistingJobsStatusSuProd(false);
}

// Corregge il ruolo della colonna che DEFAULT_COLUMNS assegna a 'prep'
// (oggi 'todo'/TO DO) se sul foglio live risulta ancora un ruolo
// diverso (tipicamente 'wip', stato pre-Fase-K) — trovato concretamente
// su PROD (AUDIT_MIGRAZIONE_PROD.md sez. 2.1), ma la funzione non
// assume quel valore specifico: confronta columns_json live con
// DEFAULT_COLUMNS solo per scoprire QUALE id dovrebbe avere ruolo
// 'prep', poi corregge solo il campo 'role' di quella colonna,
// lasciando label/color/order/hidden esattamente come nel foglio live.
// Nessuna modifica se il ruolo e' gia' corretto, se columns_json manca/
// e' vuoto, o se l'id atteso non compare affatto tra le colonne live
// (caso fuori scope: colonna mancante, non colonna col ruolo sbagliato).
function fixPrepColumnRole_(ss) {
  var result = { corrected: false, column_id: null, from_role: null, to_role: 'prep' };

  var configSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
  if (!configSheet) {
    return result;
  }

  var rows = readTable_(configSheet);
  var rowIndex = -1;
  var liveColumns = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === 'columns_json') {
      rowIndex = i;
      try {
        liveColumns = JSON.parse(rows[i].value);
      } catch (err) {
        liveColumns = null;
      }
      break;
    }
  }
  if (rowIndex < 0 || !Array.isArray(liveColumns) || !liveColumns.length) {
    return result;
  }

  var expectedPrepId = SIGMAFLOW.DEFAULT_COLUMNS.filter(function(column) {
    return column.role === 'prep';
  }).map(function(column) { return column.id; })[0];
  if (!expectedPrepId) {
    return result;
  }

  var changed = false;
  var updatedColumns = liveColumns.map(function(column) {
    if (column.id === expectedPrepId && column.role !== 'prep') {
      result.corrected = true;
      result.column_id = column.id;
      result.from_role = column.role;
      changed = true;
      return Object.assign({}, column, { role: 'prep' });
    }
    return column;
  });

  if (changed) {
    var headers = getHeaderMap_(configSheet);
    configSheet.getRange(rowIndex + 2, headers.value).setValue(JSON.stringify(updatedColumns));
  }

  return result;
}

