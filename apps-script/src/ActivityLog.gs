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

// Calcola la colonna di provenienza (from) di un evento 'move' guardando
// l'ultimo evento 'move' con timestamp precedente a insertedTs.
function computeFrom_(events, insertedTs) {
  var previousMoves = events.filter(function(event) {
    return event.type === 'move' && compareTs_(event.ts, insertedTs) < 0;
  });

  if (!previousMoves.length) {
    return null;
  }

  var latest = previousMoves.reduce(function(best, event) {
    return (!best || compareTs_(event.ts, best.ts) > 0) ? event : best;
  }, null);

  return latest ? latest.to : null;
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
  }

  if (job.arrival_ts && compareTs_(candidate.ts, job.arrival_ts) < 0) {
    warnings.push({ field: 'arrival_ts', currentValue: job.arrival_ts, suggestedValue: candidate.ts });
  }

  return warnings;
}
