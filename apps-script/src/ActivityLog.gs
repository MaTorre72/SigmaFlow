// Helper per l'activity log delle card (Fase B del programma Activity Log).
// Nota: la funzione id qui sotto si chiama generateActivityEventId_ e non
// generateId_ come da specifica originale, perche' Utils.gs definisce gia'
// generateId_(prefix) per job_id/case_id — un secondo generateId_() senza
// parametri lo avrebbe sovrascritto silenziosamente (stesso scope globale
// Apps Script), rompendo la generazione di job_id/case_id esistente.

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

  if (candidate.type === 'correction' && !String(candidate.reason || '').trim()) {
    hardErrors.push('REASON_OBBLIGATORIA');
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

// Confronta l'evento candidato con i campi strutturati del job (start_ts,
// done_ts, arrival_ts) e segnala le incoerenze come suggerimenti, non errori.
function checkStructuralAlignment_(job, candidate) {
  var warnings = [];

  if (candidate.type === 'move') {
    var columns = readColumns_();
    var column = findColumn_(columns, candidate.to);

    if (column && column.role === 'wip' && (!job.start_ts || compareTs_(job.start_ts, candidate.ts) !== 0)) {
      warnings.push({ field: 'start_ts', currentValue: job.start_ts || '', suggestedValue: candidate.ts });
    }

    if (column && column.role === 'done' && (!job.done_ts || compareTs_(job.done_ts, candidate.ts) !== 0)) {
      warnings.push({ field: 'done_ts', currentValue: job.done_ts || '', suggestedValue: candidate.ts });
    }

    if (column && column.role === 'backlog' && (!job.incarico_ts || compareTs_(job.incarico_ts, candidate.ts) !== 0)) {
      warnings.push({ field: 'incarico_ts', currentValue: job.incarico_ts || '', suggestedValue: candidate.ts });
    }

    if (column && column.role === 'prep' && (!job.prep_ts || compareTs_(job.prep_ts, candidate.ts) !== 0)) {
      warnings.push({ field: 'prep_ts', currentValue: job.prep_ts || '', suggestedValue: candidate.ts });
    }
  }

  if (candidate.type === 'move' && candidate.from === null) {
    // L'evento con from null e' per costruzione l'evento di creazione
    // della card (addJob): la sua data e' sempre la fonte di arrival_ts,
    // in entrambe le direzioni (anche se corretta a una data successiva),
    // non solo quando precede il valore attuale.
    if (!job.arrival_ts || compareTs_(job.arrival_ts, candidate.ts) !== 0) {
      warnings.push({ field: 'arrival_ts', currentValue: job.arrival_ts || '', suggestedValue: candidate.ts });
    }
  } else if (job.arrival_ts && compareTs_(candidate.ts, job.arrival_ts) < 0) {
    warnings.push({ field: 'arrival_ts', currentValue: job.arrival_ts, suggestedValue: candidate.ts });
  }

  return warnings;
}

// Migrazione una tantum: correction_log_json -> activity_log_json e
// checklist_json -> description (Fase F, gate umano). Da eseguire solo
// su TEST, mai su PROD.

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
    corrections_migrated: 0,
    checklist_items_migrated: 0,
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
      summary.corrections_migrated += result.correctionsMigrated;
      summary.checklist_items_migrated += result.checklistItemsMigrated;
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

// Migra una singola card: aggiunge eventi 'correction' al log a partire
// da correction_log_json (senza duplicare) e appende la checklist in
// fondo a description. Muta l'oggetto job passato, ma NON tocca
// checklist_json/correction_log_json, che restano invariati nel foglio.
function migrateSingleJobActivityLog_(job, migrationTs) {
  var log = parseActivityLog_(job.activity_log_json);
  var correctionsMigrated = 0;
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
    log.push({
      id: generateActivityEventId_(),
      ts: job.arrival_ts || migrationTs,
      type: 'move',
      source: 'auto',
      to: backfillTo || job.status || 'backlog',
      from: null,
      note: ''
    });
    creationEventBackfilled = true;
  }

  var corrections = parseJsonArray_(job.correction_log_json);
  corrections.forEach(function(record) {
    var ts = record.ts || job.arrival_ts || migrationTs;
    var alreadyMigrated = log.some(function(event) {
      return event.type === 'correction' &&
        event.field === record.field &&
        event.old === record.old &&
        event.new === record.new &&
        event.ts === ts;
    });
    if (alreadyMigrated) {
      return;
    }
    log.push({
      id: generateActivityEventId_(),
      ts: ts,
      type: 'correction',
      source: 'manual',
      field: record.field,
      old: record.old,
      new: record.new,
      reason: record.reason || ''
    });
    correctionsMigrated++;
  });

  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  // Ricalcola i campi strutturati rileggendo tutto il log dall'inizio,
  // nello stesso ordine cronologico in cui sono avvenuti: e' l'unico modo
  // per tenerli coerenti quando il log e' stato completato con un evento
  // di creazione ricostruito (che non passa da addActivityEvent, l'unica
  // via che allinea i campi in tempo reale). Riusa la stessa logica di
  // allineamento della scrittura live, cosi' il risultato e' identico a
  // quello che si sarebbe ottenuto se gli eventi fossero stati registrati
  // uno per uno nel tempo.
  log.filter(function(event) { return event.type === 'move'; })
    .sort(function(a, b) { return compareTs_(a.ts, b.ts); })
    .forEach(function(moveEvent) {
      applyStructuralAlignment_(job, checkStructuralAlignment_(job, moveEvent));
    });

  job.activity_log_json = serializeActivityLog_(log);

  // La spec non lo dice esplicitamente per la checklist (a differenza delle
  // correzioni, dove la deduplicazione e' richiesta), ma senza questa guardia
  // un secondo lancio della migrazione duplicherebbe il blocco in description.
  var checklistItemsMigrated = 0;
  var checklist = parseJsonArray_(job.checklist_json);
  var checklistMarker = '--- Checklist migrata ---';
  var alreadyAppended = String(job.description || '').indexOf(checklistMarker) !== -1;
  if (checklist.length && !alreadyAppended) {
    var lines = checklist.map(function(item) {
      checklistItemsMigrated++;
      return '[' + (coerceBoolean_(item.done) ? 'x' : ' ') + '] ' + String(item.text || '');
    });
    job.description = String(job.description || '') + '\n\n' + checklistMarker + '\n' + lines.join('\n');
  }

  return { correctionsMigrated: correctionsMigrated, checklistItemsMigrated: checklistItemsMigrated, creationEventBackfilled: creationEventBackfilled };
}

// Fase L5 (DESIGN_modello_caso_visita.md, sez. 7): materializzazione UNA
// TANTUM delle visite storiche per ogni caso esistente, leggendo l'intero
// activity_log_json e applicando la stessa regola di apertura/chiusura
// gia' live in moveJob/updateVisiteForMove_ (sez. 2), non piu' "derivazione
// a runtime ad ogni lettura" come nel documento precedente
// (BUGFIX_derivazione_gate_dal_log.md). Sovrascrive qualunque riga
// 'visite' preesistente: i bootstrap minimi creati da L2/L3 per i job
// toccati prima di questa migrazione sono provvisori, questa e' la
// ricostruzione autorevole. Solo TEST, mai PROD senza gate umano
// esplicito separato.

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

function migrateVisiteFromHistory_(ss) {
  var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var visiteSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  var jobs = readTable_(jobsSheet);

  var summary = {
    jobs_processed: 0,
    jobs_without_log: 0,
    visite_written: 0,
    job_fields_realigned: 0,
    coherence_warnings: []
  };

  if (!jobs.length) {
    return summary;
  }

  var allVisite = [];
  var jobRows = jobs.map(function(job) {
    var result = computeVisiteFromLog_(job);
    if (!result.visite.length) {
      summary.jobs_without_log++;
      return jobToRow_(job);
    }

    summary.jobs_processed++;
    result.warnings.forEach(function(warning) {
      summary.coherence_warnings.push(warning);
    });
    allVisite = allVisite.concat(result.visite);

    // Riallinea anche i campi derivati su jobs (non ancora rimossi, L5
    // fase 2) alla visita APERTA risultante dalla ricostruzione — la
    // stessa correzione motivata dal documento bugfix originale (Card
    // A/Card B), applicata ora con la derivazione corretta invece che
    // con quella superata basata su 'from'.
    var lastVisit = result.visite[result.visite.length - 1];
    var before = JSON.stringify([job.incarico_ts, job.prep_ts, job.start_ts, job.done_ts, job.visit_number, job.rework_cause]);
    syncJobFieldsFromVisit_(job, lastVisit);
    var after = JSON.stringify([job.incarico_ts, job.prep_ts, job.start_ts, job.done_ts, job.visit_number, job.rework_cause]);
    if (before !== after) {
      summary.job_fields_realigned++;
    }

    return jobToRow_(job);
  });

  jobsSheet.getRange(2, 1, jobRows.length, JOB_HEADERS.length).setValues(jobRows);

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
function computeVisiteFromLog_(job) {
  var log = parseActivityLog_(job.activity_log_json).filter(function(event) {
    return event.type === 'move';
  });

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
      job_id: job.job_id,
      numero_visita: visitNumber,
      apertura_ts: ts,
      incarico_ts: '',
      prep_ts: '',
      start_ts: '',
      consegna_ts: '',
      chiusura_ts: '',
      chiusura_tipo: '',
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
        job_id: job.job_id,
        code: 'RIENTRO_DIRETTO_A_WIP',
        ts: event.ts,
        from: sourceColumn.id,
        message: 'Rientro diretto da "' + sourceColumn.id + '" a WIP rilevato nello storico (evento del ' + event.ts + '), normalmente impedito dal guardia in moveJob.'
      });
    }

    if (sourceClosesTowardActive && (targetColumn.role === 'backlog' || targetColumn.role === 'prep')) {
      currentVisit.chiusura_ts = event.ts;
      currentVisit.chiusura_tipo = sourceColumn.id;
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

// Allinea i campi derivati su jobs (non ancora rimossi) alla visita
// APERTA risultante dalla ricostruzione — stesso principio del bootstrap
// di L2/allineamento di L3, applicato qui in blocco su tutto lo storico.
function syncJobFieldsFromVisit_(job, lastVisit) {
  job.incarico_ts = lastVisit.incarico_ts || '';
  job.prep_ts = lastVisit.prep_ts || '';
  job.start_ts = lastVisit.start_ts || '';
  job.done_ts = lastVisit.consegna_ts || '';
  job.visit_number = lastVisit.numero_visita;
  job.is_rework = lastVisit.numero_visita > 1;
  job.rework_cause = lastVisit.rework_cause || '';

  job.service_time_d = (job.start_ts && job.done_ts) ? diffDays(job.start_ts, job.done_ts) : '';
  job.lead_time_d = (job.arrival_ts && job.done_ts) ? diffDays(job.arrival_ts, job.done_ts) : '';
  job.wait_time_d = (job.arrival_ts && job.start_ts) ? diffDays(job.arrival_ts, job.start_ts) : '';
}
