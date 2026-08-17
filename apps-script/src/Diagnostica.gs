// Sessione diagnostica (2026-08-17), SOLO LETTURA: nessuna funzione qui
// dentro scrive su jobs/visite/config. Serve a misurare il peso reale
// di activity_log_json su TEST prima di progettare l'archiviazione
// (prossima sessione) — vedi PROGRAMMA_STATO.md per i risultati e il
// contesto. File temporaneo: da rimuovere a fine sessione diagnostica
// una volta raccolti i numeri, non fa parte del prodotto.
//
// Eseguire dall'editor Apps Script, ambiente TEST:
// - runActivityLogDiagnostics()   -> punti 1, 2, 3, 5 (peso, distribuzione,
//   correlazione con le visite, proiezione di crescita)
// - runReadTimingDiagnostics()    -> punto 4 (costo di lettura reale,
//   Sheets API, 5 ripetizioni)
// Il risultato va letto da "Visualizza registri" (Logger.log) dopo
// l'esecuzione, oppure come valore di ritorno se lanciata da un altro
// script.

function runActivityLogDiagnostics() {
  var ss = getSpreadsheet_();
  var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  var visite = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE));
  var columns = readColumns_();

  var doneIds = {};
  columns.forEach(function(column) {
    if (column.role === 'done') { doneIds[column.id] = true; }
  });

  var maxVisitByJob = {};
  visite.forEach(function(visit) {
    var n = Number(visit.numero_visita || 1);
    if (!maxVisitByJob[visit.job_id] || n > maxVisitByJob[visit.job_id]) {
      maxVisitByJob[visit.job_id] = n;
    }
  });

  var rows = jobs.map(function(job) {
    var logStr = String(job.activity_log_json || '');
    var logBytes = byteLength_(logStr);
    var rowBytes = JOB_HEADERS.reduce(function(sum, header) {
      return sum + byteLength_(String(job[header] === undefined ? '' : job[header]));
    }, 0);
    var isDone = Boolean(doneIds[normalizeStatus_(job.status)]);
    var maxVisit = maxVisitByJob[job.job_id] || 1;
    var growth = activityLogGrowth_(logStr);
    return {
      job_id: job.job_id,
      status: job.status,
      is_done: isDone,
      log_bytes: logBytes,
      row_bytes: rowBytes,
      log_share_of_row: rowBytes > 0 ? round2_(logBytes / rowBytes * 100) : null,
      max_visit_number: maxVisit,
      event_count: growth.eventCount,
      span_days: growth.spanDays,
      events_per_month: growth.eventsPerMonth
    };
  });

  var totalRowBytes = rows.reduce(function(a, r) { return a + r.row_bytes; }, 0);
  var totalLogBytes = rows.reduce(function(a, r) { return a + r.log_bytes; }, 0);

  return {
    generated_at: nowIso_(),
    jobs_total: rows.length,
    peso_reale: Object.assign(
      summarizeBytes_(rows.map(function(r) { return r.log_bytes; }), rows),
      {
        // Richiesto al punto 1: quanto pesa activity_log_json sul
        // totale trasportato da una lettura completa di jobs (somma di
        // TUTTI i campi su TUTTE le righe, non la media per singola
        // card di log_share_of_row).
        total_row_bytes_tutti_i_campi: totalRowBytes,
        share_of_full_jobs_read_percent: totalRowBytes > 0 ? round2_(totalLogBytes / totalRowBytes * 100) : null
      }
    ),
    distribuzione_per_stato: {
      done: summarizeBytes_(rows.filter(function(r) { return r.is_done; }).map(function(r) { return r.log_bytes; }), rows.filter(function(r) { return r.is_done; })),
      attive: summarizeBytes_(rows.filter(function(r) { return !r.is_done; }).map(function(r) { return r.log_bytes; }), rows.filter(function(r) { return !r.is_done; }))
    },
    correlazione_visite: correlateWithVisits_(rows),
    proiezione_crescita: summarizeGrowth_(rows),
    nota_metodologica: 'log_bytes = Utilities.newBlob(activity_log_json).getBytes().length (UTF-8 reale). ' +
      'row_bytes = somma byte di tutti i campi di JOB_HEADERS per quella riga, stessa unita\' di misura. ' +
      'is_done = colonna con role \'done\' in columns_json al momento della lettura (dipende dalla configurazione corrente).'
  };
}

// Wrapper pensati per essere lanciati dal menu Esegui: il valore di
// ritorno di una funzione non compare da solo nel "Registro di
// esecuzione" (solo avvio/fine) — Logger.log() si', sempre visibile in
// Visualizza > Registri.
function stampaDiagnosticaActivityLog() {
  var result = runActivityLogDiagnostics();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function byteLength_(str) {
  return Utilities.newBlob(str).getBytes().length;
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function median_(numbers) {
  if (!numbers.length) { return null; }
  var sorted = numbers.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? round2_((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function summarizeBytes_(byteValues, rowsForHeaviest) {
  if (!byteValues.length) {
    return { count: 0, total_bytes: 0, mean_bytes: null, median_bytes: null, heaviest: null };
  }
  var total = byteValues.reduce(function(a, b) { return a + b; }, 0);
  var heaviestRow = rowsForHeaviest.reduce(function(best, row) {
    return (!best || row.log_bytes > best.log_bytes) ? row : best;
  }, null);
  return {
    count: byteValues.length,
    total_bytes: total,
    mean_bytes: round2_(total / byteValues.length),
    median_bytes: median_(byteValues),
    heaviest: heaviestRow ? { job_id: heaviestRow.job_id, log_bytes: heaviestRow.log_bytes } : null
  };
}

// Bucket per numero di visite (1, 2, 3, 4+): media e mediana di
// log_bytes in ciascun bucket. Se i bucket con piu' visite hanno una
// media/mediana sistematicamente piu' alta, il peso cresce con i
// rientri, non e' un'anomalia isolata.
function correlateWithVisits_(rows) {
  var buckets = { '1': [], '2': [], '3': [], '4+': [] };
  rows.forEach(function(row) {
    var key = row.max_visit_number >= 4 ? '4+' : String(row.max_visit_number);
    buckets[key].push(row.log_bytes);
  });
  var result = {};
  Object.keys(buckets).forEach(function(key) {
    var values = buckets[key];
    result[key] = {
      cards: values.length,
      mean_bytes: values.length ? round2_(values.reduce(function(a, b) { return a + b; }, 0) / values.length) : null,
      median_bytes: median_(values)
    };
  });
  return result;
}

// Eventi nel log, arco temporale (primo -> ultimo evento), eventi al
// mese. Se il log e' vuoto/illeggibile o ha un solo evento, lo span non
// e' calcolabile (nessun secondo punto per stimare un ritmo) — riportato
// esplicitamente come null, non stimato a zero o a un valore arbitrario.
function activityLogGrowth_(logStr) {
  var events;
  try {
    events = logStr ? JSON.parse(logStr) : [];
  } catch (err) {
    return { eventCount: 0, spanDays: null, eventsPerMonth: null };
  }
  if (!Array.isArray(events) || events.length < 2) {
    return { eventCount: Array.isArray(events) ? events.length : 0, spanDays: null, eventsPerMonth: null };
  }
  var timestamps = events.map(function(event) { return new Date(event.ts).getTime(); }).filter(function(t) { return !isNaN(t); });
  if (timestamps.length < 2) {
    return { eventCount: events.length, spanDays: null, eventsPerMonth: null };
  }
  var minTs = Math.min.apply(null, timestamps);
  var maxTs = Math.max.apply(null, timestamps);
  var spanDays = (maxTs - minTs) / 864e5;
  if (spanDays <= 0) {
    return { eventCount: events.length, spanDays: round2_(spanDays), eventsPerMonth: null };
  }
  var eventsPerMonth = round2_((events.length - 1) / (spanDays / 30));
  return { eventCount: events.length, spanDays: round2_(spanDays), eventsPerMonth: eventsPerMonth };
}

function summarizeGrowth_(rows) {
  var withSpan = rows.filter(function(r) { return r.events_per_month !== null; });
  var withoutSpan = rows.length - withSpan.length;
  if (!withSpan.length) {
    return { cards_with_measurable_rate: 0, cards_without_measurable_rate: withoutSpan, mean_events_per_month: null, nota: 'Nessuna card ha almeno due eventi con timestamp validi: il ritmo di crescita non e\' stimabile su questo dataset.' };
  }
  var rates = withSpan.map(function(r) { return r.events_per_month; });
  var meanRate = round2_(rates.reduce(function(a, b) { return a + b; }, 0) / rates.length);
  var meanLogBytesNow = round2_(withSpan.reduce(function(a, r) { return a + r.log_bytes; }, 0) / withSpan.length);
  return {
    cards_with_measurable_rate: withSpan.length,
    cards_without_measurable_rate: withoutSpan,
    mean_events_per_month: meanRate,
    median_events_per_month: median_(rates),
    // Proiezione grezza: assume che il peso medio per evento resti
    // costante (ipotesi semplificativa, non verificata qui) e che il
    // ritmo osservato oggi si mantenga costante nei prossimi mesi.
    mean_log_bytes_today: meanLogBytesNow,
    proiezione_6_mesi_nota: 'stima grezza, non un dato misurato: vedi proiezione_crescita.mean_events_per_month e mean_log_bytes_today nel riepilogo per calcolarla a mano con l\'ipotesi che preferisci'
  };
}

// Punto 4: costo di lettura reale (Sheets API, non harness Node).
// full_getBoard_ms: getBoard() cosi' com'e' oggi (jobs+visite+colonne).
// jobs_with_log_ms: solo readTable_ su jobs, con activity_log_json.
// jobs_without_log_ms: stesso foglio, letto con getRange mirato che
// ESCLUDE la colonna activity_log_json (due letture, colonne prima e
// dopo) — SOLO per questa misura, getBoard() vero non viene toccato.
// 5 ripetizioni per misura: il tempo Apps Script e' rumoroso.
function runReadTimingDiagnostics() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var headers = getHeaderMap_(sheet);
  var logCol = headers.activity_log_json;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  var fullBoard = [];
  var jobsWithLog = [];
  var jobsWithoutLog = [];

  for (var i = 0; i < 5; i++) {
    var t0 = Date.now();
    getBoard();
    fullBoard.push(Date.now() - t0);
  }

  for (var j = 0; j < 5; j++) {
    var t1 = Date.now();
    sheet.getDataRange().getValues();
    jobsWithLog.push(Date.now() - t1);
  }

  for (var k = 0; k < 5; k++) {
    var t2 = Date.now();
    if (lastRow > 1) {
      if (logCol > 1) { sheet.getRange(2, 1, lastRow - 1, logCol - 1).getValues(); }
      if (logCol < lastCol) { sheet.getRange(2, logCol + 1, lastRow - 1, lastCol - logCol).getValues(); }
    }
    jobsWithoutLog.push(Date.now() - t2);
  }

  return {
    generated_at: nowIso_(),
    jobs_row_count: Math.max(0, lastRow - 1),
    full_getBoard_ms: timingSummary_(fullBoard),
    jobs_sheet_with_activity_log_ms: timingSummary_(jobsWithLog),
    jobs_sheet_without_activity_log_ms: timingSummary_(jobsWithoutLog),
    nota_metodologica: 'Tempi misurati server-side (Date.now() attorno alla chiamata Sheets API), NON un vero round-trip Web App via google.script.run da browser: manca il costo di dispatch/rete di una chiamata client reale, che secondo la diagnosi precedente (M0-A) e\' il costo dominante e fisso per ogni chiamata, indipendente dai byte trasportati. Questo dato isola quindi solo il contributo della lettura Sheets API stessa, utile per capire se activity_log_json pesa su QUELLA parte, non sul tempo totale percepito da chi usa la board.'
  };
}

function stampaDiagnosticaTempiLettura() {
  var result = runReadTimingDiagnostics();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function timingSummary_(samples) {
  var mean = round2_(samples.reduce(function(a, b) { return a + b; }, 0) / samples.length);
  var variance = samples.reduce(function(sum, v) { return sum + Math.pow(v - mean, 2); }, 0) / samples.length;
  return {
    samples_ms: samples,
    mean_ms: mean,
    median_ms: median_(samples),
    stdev_ms: round2_(Math.sqrt(variance))
  };
}
