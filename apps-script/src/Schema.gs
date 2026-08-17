// Fase L5 parte 2/2 (DESIGN_modello_caso_visita.md, sez. 6.2/9.1):
// rimossi i campi duplicati con 'visite' — visit_number, start_ts,
// done_ts, service_time_d, lead_time_d, wait_time_d, is_rework,
// rework_cause, incarico_ts, prep_ts. getBoard()/getMetrics() li
// ricalcolano al volo dalla visita piu' recente del caso
// (loadJobsWithVisitSummary_ in Kanban.gs) dove servono ancora per il
// frontend o per le metriche di stato-corrente su jobs (punti/timeline).
// Passo irreversibile: eseguito solo dopo che Marco ha verificato la
// migrazione storica (L5 parte 1/2) su TEST.
// case_id rimosso su richiesta di Marco: terminologia ufficiale/finale,
// job = caso, 1:1 — case_id era un doppione di job_id, mai un legame
// reale tra piu' righe (quel concetto non esiste nel modello attuale,
// una card = un job = un caso). markRework/markRowAsRework_ (Kanban.gs),
// l'unico codice che leggeva case_id per raggruppare righe "dello stesso
// caso", rimossi insieme per lo stesso motivo.
// notes/checklist_json/correction_log_json rimossi (sessione M0-A,
// pulizia campi non usati): nessuna UI da tempo (Fase H). checklist_json/
// correction_log_json erano ancora letti da migrateSingleJobActivityLog_
// per la migrazione una tantum verso activity_log_json/description — ora
// rimossa insieme ai campi, essendo la migrazione reale di PROD gia'
// eseguita (nessun'altra riga di questo schema potra' mai piu' avere
// queste colonne). correctJobTimestamps (Kanban.gs) non scrive piu' un
// log a parte, solo arrival_ts (suo unico uso reale rimasto).
var JOB_HEADERS = [
  'job_id',
  'title',
  'client',
  'ambassador',
  'status',
  'assignee',
  'tag',
  'size_class',
  'size_points',
  'priority_class',
  'priority_class_manual',
  'impact',
  'manageability',
  'priority_score',
  'description',
  'due_date',
  'arrival_ts',
  'invoiced',
  'card_color',
  'activity_log_json',
  'incarico_chiuso_ts'
];

// Foglio 'cases' dismesso su richiesta di Marco, dopo che 'visite' si e'
// dimostrata affidabile in L1-L5 e sulla migrazione PROD (R0-R4):
// total_visits/is_open erano ridondanti con MAX(numero_visita)/l'ultimo
// stato derivabile da 'visite', mai letti dal frontend (verificato).
// Vedi removeCasesSheet_ sotto per la rimozione automatica sui fogli
// esistenti. CASE_HEADERS rimossa: nessun altro codice la referenzia.
//
// Fase L (modello caso/visita, DESIGN_modello_caso_visita.md sez. 6.1 e
// 9.2): foglio 'visite', nuovo e separato. Identita' della riga: job_id
// + numero_visita (composta, nessun campo aggiuntivo introdotto
// rispetto a quanto elencato nel documento).
// rientro_ts/rientro_da (rinominati da chiusura_ts/chiusura_tipo su
// richiesta di Marco: il vecchio nome si confondeva con
// incarico_chiuso_ts su jobs, un concetto completamente diverso —
// questi due segnano solo quando/da dove il caso e' rientrato,
// chiudendo QUESTA visita e aprendone una nuova, non una chiusura
// definitiva). Vedi renameVisiteChiusuraFields_ sotto per la migrazione
// del nome sui dati gia' presenti.
var VISITE_HEADERS = [
  'job_id',
  'numero_visita',
  'apertura_ts',
  'incarico_ts',
  'prep_ts',
  'start_ts',
  'consegna_ts',
  'rientro_ts',
  'rientro_da',
  't_cliente_d',
  't_ente_d',
  't_interno_d',
  'rework_cause'
];

var CONFIG_HEADERS = ['key', 'value', 'description'];

// Rinomina una tantum, in loco, delle intestazioni chiusura_ts/
// chiusura_tipo -> rientro_ts/rientro_da su un foglio 'visite' che ha
// ancora il nome precedente. Necessaria perche' il riallineamento
// automatico (alignSheetHeaders_) confronta i nomi delle colonne uno a
// uno: senza questo passo tratterebbe il vecchio nome come "rimosso" e
// il nuovo come "aggiunto", perdendo i dati gia' scritti. Rinominando
// solo il testo della cella di intestazione (non i valori, che restano
// nella stessa colonna), alignSheetHeaders_ trova gia' il nome giusto e
// preserva tutto. Idempotente: se l'intestazione vecchia non c'e' piu',
// non fa nulla.
function renameVisiteChiusuraFields_(ss) {
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (!sheet || sheet.getLastRow() < 1) {
    return;
  }
  var headers = getHeaderMap_(sheet);
  if (headers.chiusura_ts) {
    sheet.getRange(1, headers.chiusura_ts).setValue('rientro_ts');
  }
  if (headers.chiusura_tipo) {
    sheet.getRange(1, headers.chiusura_tipo).setValue('rientro_da');
  }
}

// Dismissione una tantum del foglio 'cases' (non piu' in JOB_HEADERS/
// nessuna scrittura da codice dopo questa sotto-fase): elimina il
// foglio se esiste ancora. Idempotente — se gia' assente, non fa nulla.
// A differenza della rinomina di rientro_ts/rientro_da (che preserva
// dati spostandoli su un nuovo nome), qui non c'e' nulla da preservare:
// total_visits/is_open sono gia' ricavabili da 'visite'/'jobs', la
// rimozione e' pulizia, non migrazione di dati.
function removeCasesSheet_(ss) {
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CASES);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
}

function setupSigmaFlow() {
  var ss = getSpreadsheet_();
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  removeCasesSheet_(ss);
  renameVisiteChiusuraFields_(ss);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE, VISITE_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CONFIG, CONFIG_HEADERS);
  seedDefaultConfig_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
  migrateJobDefaults_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  PropertiesService.getScriptProperties().setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, ss.getId());
  PropertiesService.getScriptProperties().setProperty(SIGMAFLOW.PROP_SCHEMA_VERSION, SIGMAFLOW.SCHEMA_VERSION);
  return ok_({ spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl() });
}

function ensureCurrentSchema_() {
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(SIGMAFLOW.PROP_SCHEMA_VERSION) === SIGMAFLOW.SCHEMA_VERSION) { return; }
  setupSigmaFlow();
}

function migrateJobDefaults_(sheet) {
  var jobs = readTable_(sheet);
  if (!jobs.length) { return; }
  var changed = false;
  var rows = jobs.map(function(job) {
    if (!coerceBoolean_(job.priority_class_manual)) {
      var score = calcPriorityScore(job.impact, job.manageability);
      var priorityClass = suggestPriorityClass(score);
      if (Number(job.priority_score) !== score || job.priority_class !== priorityClass) {
        job.priority_score = score;
        job.priority_class = priorityClass;
        changed = true;
      }
    }
    if (!job.size_points && job.size_class) {
      job.size_points = SIGMAFLOW.SIZE_POINTS[job.size_class] || SIGMAFLOW.SIZE_POINTS.M;
      changed = true;
    }
    job.card_color = normalizeCardColor_(job.card_color);
    return jobToRow_(job);
  });
  if (changed) {
    sheet.getRange(2, 1, rows.length, JOB_HEADERS.length).setValues(rows);
  }
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return sheet;
  }

  alignSheetHeaders_(sheet, headers);

  return sheet;
}

function alignSheetHeaders_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var sameOrder = headers.every(function(header, index) {
    return existing[index] === header;
  });

  if (sameOrder && lastCol === headers.length) {
    sheet.setFrozenRows(1);
    return;
  }

  var oldIndex = {};
  existing.forEach(function(header, index) {
    if (header) {
      oldIndex[header] = index;
    }
  });

  var data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  var aligned = data.map(function(row) {
    return headers.map(function(header) {
      return oldIndex[header] !== undefined ? row[oldIndex[header]] : '';
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (aligned.length) {
    sheet.getRange(2, 1, aligned.length, headers.length).setValues(aligned);
  }
  sheet.setFrozenRows(1);
}

function seedDefaultConfig_(sheet) {
  var rows = readTable_(sheet);
  var existing = {};
  rows.forEach(function(row) {
    existing[row.key] = true;
  });

  var descriptions = {
    team_size: 'Numero di persone attive',
    observation_window_days: 'Finestra temporale metriche',
    theoretical_capacity_per_day: 'Capacita teorica configurata in passaggi al giorno',
    size_XS_days: 'Giorni medi attesi per taglia XS',
    size_S_days: 'Giorni medi attesi per taglia S',
    size_M_days: 'Giorni medi attesi per taglia M',
    size_L_days: 'Giorni medi attesi per taglia L',
    size_XL_days: 'Giorni medi attesi per taglia XL',
    columns_json: 'Configurazione colonne board',
    assignees_json: 'Assegnatari disponibili in formato JSON',
    ambassadors_json: 'Ambasciatori disponibili in formato JSON',
    tags_json: 'Tag disponibili in formato JSON',
    scenarios_json: 'Scenari futuri predisposti in formato JSON',
    column_backlog: 'Etichetta colonna backlog',
    column_in_progress: 'Etichetta colonna in lavorazione',
    column_stand_by: 'Etichetta colonna stand-by',
    column_in_review: 'Etichetta colonna revisione',
    column_done: 'Etichetta colonna completati'
  };

  Object.keys(SIGMAFLOW.DEFAULT_CONFIG).forEach(function(key) {
    var value = defaultConfigValue_(key);
    if (!existing[key]) {
      sheet.appendRow([key, value, descriptions[key] || '']);
    } else if (key === 'columns_json' || key === 'assignees_json' || key === 'ambassadors_json' || key === 'tags_json' || key === 'scenarios_json') {
      ensureConfigValueIfEmpty_(sheet, key, value);
    }
  });
}

function ensureConfigValueIfEmpty_(sheet, key, value) {
  var rows = readTable_(sheet);
  var headers = getHeaderMap_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key && (!rows[i].value || rows[i].value === '[]')) {
      sheet.getRange(i + 2, headers.value).setValue(value);
      return;
    }
  }
}

function defaultConfigValue_(key) {
  if (key === 'columns_json') {
    return JSON.stringify(SIGMAFLOW.DEFAULT_COLUMNS);
  }
  if (key === 'scenarios_json') {
    return JSON.stringify(SIGMAFLOW.SCENARIOS);
  }
  return SIGMAFLOW.DEFAULT_CONFIG[key];
}

function ensureConfigValue_(sheet, key, value) {
  var rows = readTable_(sheet);
  var headers = getHeaderMap_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key && rows[i].value !== value) {
      sheet.getRange(i + 2, headers.value).setValue(value);
      return;
    }
  }
}
