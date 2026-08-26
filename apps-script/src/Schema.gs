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
// status_since_ts aggiunto in M0-C: quando il job e' entrato nella
// colonna ATTUALE (non quando e' stato creato, non l'inizio
// lavorazione) — base per l'evidenziazione "aging" configurabile per
// colonna (aging_days in columns_json, vedi ensureCurrentSchema_ e
// DEFAULT_COLUMNS in Constants.gs). Scritto da addJob (alla creazione)
// e da moveJob solo sui cambi di colonna reali, mai sul self-move.
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
  'incarico_chiuso_ts',
  'status_since_ts'
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

// N1 (DESIGN_archiviazione.md, sez. 3): fogli additivi per archiviazione
// e cestino. Solo schema in questa sotto-fase — nessuna funzione di
// spostamento riga (moveJobToSheet_/archiveJob_/cestinaJob_/
// ripristinaJob_) ancora scritta, arriva in N2. jobs_archivio/
// jobs_cestino sono JOB_HEADERS con un campo timestamp in piu' (§3.1/
// 3.2); visite_archivio/visite_cestino hanno la stessa intestazione di
// VISITE_HEADERS, invariata (nessun campo nuovo li' - la visita non sa
// distinguere se il job che la possiede e' attivo, archiviato o cestinato).
var JOB_ARCHIVIO_HEADERS = JOB_HEADERS.concat(['archiviato_ts']);
var JOB_CESTINO_HEADERS = JOB_HEADERS.concat(['cestinato_ts']);
var VISITE_ARCHIVIO_HEADERS = VISITE_HEADERS.slice();
var VISITE_CESTINO_HEADERS = VISITE_HEADERS.slice();

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
  // N1: da qui in poi setupSigmaFlow crea fino a cinque fogli nuovi in
  // sequenza (visite, se assente, + i quattro di archivio/cestino)
  // subito dopo una cancellazione — su Apps Script reale (non
  // riproducibile nell'harness Node, che e' sincrono per costruzione)
  // questa sequenza ha causato un errore transitorio "Sheet non
  // trovato" in fase di collaudo N1. flush() forza Sheets a scrivere la
  // cancellazione prima di procedere con le creazioni successive.
  SpreadsheetApp.flush();
  renameVisiteChiusuraFields_(ss);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE, VISITE_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS_ARCHIVIO, JOB_ARCHIVIO_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE_ARCHIVIO, VISITE_ARCHIVIO_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS_CESTINO, JOB_CESTINO_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE_CESTINO, VISITE_CESTINO_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CONFIG, CONFIG_HEADERS);
  seedDefaultConfig_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
  seedAgingDaysForStandByColumns_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
  backfillStatusSinceTs_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  migrateJobDefaults_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  // Bugfix 2026-08-25: non sovrascrive piu' incondizionatamente la
  // Script Property condivisa PROP_SPREADSHEET_ID con ss.getId() - 'ss'
  // qui sopra e' gia' stato risolto da getSpreadsheet_() leggendo quella
  // stessa property (o il fallback), quindi riscriverla era quasi
  // sempre un no-op silenzioso: l'unico effetto reale era, quando la
  // property si trovava gia' sporca (puntata su TEST) per un motivo
  // esterno a questa funzione, RINFORZARE quello stato invece di
  // limitarsi al vero scopo di questa riga - il bootstrap iniziale
  // (nessuna property, nessun DEFAULT_SPREADSHEET_ID ancora
  // configurato), quando serve "ricordarsi" a quale foglio ci si e'
  // appena legati. Ora scrive solo se la property e' vuota - mai piu'
  // un chiamante involontario di setupSigmaFlow() puo' confermare uno
  // stato sporco preesistente.
  if (!PropertiesService.getScriptProperties().getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID)) {
    PropertiesService.getScriptProperties().setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, ss.getId());
  }
  PropertiesService.getScriptProperties().setProperty(SIGMAFLOW.PROP_SCHEMA_VERSION, SIGMAFLOW.SCHEMA_VERSION);
  return ok_({ spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl() });
}

// Versione di setupSigmaFlow() eseguibile direttamente dall'editor Apps
// Script, sicura sull'ambiente TEST — stesso motivo/pattern di
// migrateActivityLogOnTest/migrateVisiteFromHistoryOnTest (ActivityLog.gs):
// setupSigmaFlow() da sola userebbe lo spreadsheet puntato al momento
// dalla Script Property condivisa SIGMAFLOW_SPREADSHEET_ID (oggi
// potenzialmente PROD, o un valore sporco lasciato da un'esecuzione
// interrotta — stesso rischio gia' documentato piu' volte in questo
// progetto), mentre questa risolve sempre e solo lo spreadsheet
// registrato in SIGMAFLOW_TEST_SPREADSHEET_ID (withTestSpreadsheet_,
// Tests.gs) — utile anche per allineare lo schema (fogli
// archivio/cestino inclusi) su una copia di PROD puntata come TEST.
function setupSigmaFlowOnTest() {
  return withTestSpreadsheet_(function(ss) {
    return setupSigmaFlow();
  });
}

// P2 (DESIGN_lock_ambiente.md, gate confermato da Marco 2026-08-26):
// getBoard() e' classificata lettura e non prende piu' il lock globale
// (vedi api()/withEnvironment_ in Kanban.gs/Utils.gs) — ma nella rara
// finestra post-deploy in cui PROP_SCHEMA_VERSION non e' ancora
// allineata, questa funzione chiama setupSigmaFlow(), che SCRIVE per
// davvero (crea fogli, backfilla colonne). Senza un lock, piu' getBoard()
// concorrenti in quella finestra scriverebbero lo schema in parallelo.
//
// acquireOwnLock (default false, nessun chiamante esistente cambia
// comportamento senza passarlo esplicitamente): true solo dal chiamante
// che gira SENZA gia' avere il lock globale (getBoard). moveJob() la
// chiama invece senza passare true — gira gia' dentro il lock globale
// di withEnvironment_ (azione di scrittura, resta sotto lock come
// prima di P2), quindi una seconda acquisizione qui sarebbe ridondante
// e non testabile per certo come rientrante nel vero runtime Apps
// Script (mai assunta senza verificarla). Doppio controllo dopo aver
// preso il proprio lock: un'altra esecuzione concorrente potrebbe aver
// gia' allineato lo schema nel frattempo, evita una seconda chiamata
// ridondante a setupSigmaFlow().
function ensureCurrentSchema_(acquireOwnLock) {
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(SIGMAFLOW.PROP_SCHEMA_VERSION) === SIGMAFLOW.SCHEMA_VERSION) { return; }

  if (!acquireOwnLock) {
    setupSigmaFlow();
    return;
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (properties.getProperty(SIGMAFLOW.PROP_SCHEMA_VERSION) === SIGMAFLOW.SCHEMA_VERSION) { return; }
    setupSigmaFlow();
  } finally {
    lock.releaseLock();
  }
}

// Bugfix: PROP_SCHEMA_VERSION e' una Script Property CONDIVISA su tutto
// il progetto Apps Script, non separata per spreadsheet — rischio gia'
// documentato (AUDIT_MIGRAZIONE_PROD.md §0.1), qui materializzato per
// davvero. Le sessioni di collaudo su TEST (M0-A/B/C) hanno gia' portato
// quella property al valore corrente: al primo caricamento reale di
// PROD dopo il deploy, ensureCurrentSchema_() ha visto "versione gia'
// allineata" e saltato setupSigmaFlow() — pur non avendo MAI toccato lo
// schema del foglio PROD vero (notes/checklist_json/correction_log_json
// ancora presenti, status_since_ts mai aggiunto).
//
// Esegue setupSigmaFlow() direttamente sul foglio PROD vero, bypassando
// il controllo sulla property condivisa (setupSigmaFlow e' additiva e
// idempotente su ogni suo singolo passo — nessun rischio nuovo rispetto
// a quanto gia' verificato su TEST e sulla copia di PROD in sessioni
// precedenti). Stesso pattern di sicurezza di
// eseguiMigrazioneCompletaSuProd (ActivityLog.gs): id e nome scritti
// come due valori indipendenti, si ferma da sola se non corrispondono;
// nome senza underscore finale per restare visibile nel menu Esegui.
function allineaSchemaSuProd() {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  if (ss.getName() !== 'SigmaFlow Database') {
    throw new Error('Nome foglio inatteso ("' + ss.getName() + '"), controllo di sicurezza fallito. Nessuna modifica eseguita.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var previousSpreadsheetId = __sfRoutedSpreadsheetId_;
  __sfRoutedSpreadsheetId_ = ss.getId();
  try {
    return setupSigmaFlow();
  } finally {
    __sfRoutedSpreadsheetId_ = previousSpreadsheetId;
    lock.releaseLock();
  }
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
    archiviazione_giorni_default: 'Giorni dopo la chiusura oltre cui un caso e\' eleggibile all\'archiviazione automatica',
    backup_retention_giorni: 'Giorni di backup PROD da conservare prima che i piu\' vecchi vengano eliminati',
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

// M0-C: migrazione una tantum, non un fallback a runtime — aggiunge
// aging_days: 5 (stesso valore del comportamento fisso precedente,
// nessun cambio osservabile al momento del deploy) alle sole colonne
// con role 'stand_by' che ne sono ancora prive dentro columns_json.
// Idempotente: una colonna che ha gia' aging_days (a 5 o a un valore
// diverso scelto da Marco dal pannello Impostazioni colonna) non viene
// toccata. Colonne di altro ruolo restano senza aging_days — nessuna
// evidenziazione per loro, identico a oggi. A differenza di
// ensureConfigValueIfEmpty_ (che sostituisce l'intero valore solo se
// vuoto), qui si modifica il singolo campo dentro ogni colonna,
// preservando etichetta/colore/ordine/ruolo gia' configurati.
function seedAgingDaysForStandByColumns_(sheet) {
  var rows = readTable_(sheet);
  var headers = getHeaderMap_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key !== 'columns_json') { continue; }
    var columns = parseJsonArray_(rows[i].value);
    if (!columns.length) { return; }
    var changed = false;
    columns.forEach(function(column) {
      if (column.role === 'stand_by' && column.aging_days === undefined) {
        column.aging_days = 5;
        changed = true;
      }
    });
    if (changed) {
      sheet.getRange(i + 2, headers.value).setValue(JSON.stringify(columns));
    }
    return;
  }
}

// M0-C, correzione post-collaudo su TEST: la migrazione additiva di
// M0-C aggiungeva la sola colonna status_since_ts allo schema (giusto
// per principio: mai inventare un valore per righe gia' esistenti), ma
// lascia vuoti tutti i job gia' presenti — e daysSince('') ritorna 0,
// quindi restano silenziosamente esclusi dall'aging finche' non
// vengono spostati almeno una volta. Proprio le card ferme da piu'
// tempo, che nessuno tocca, sono quelle che il meccanismo dovrebbe
// segnalare.
//
// Backfill una tantum: per ogni job con status_since_ts vuoto, cerca
// nel suo activity_log_json l'evento move piu' recente con to===status
// attuale — stesso pattern di ricerca all'indietro gia' usato da
// lastEntryTsForColumn_ (Kanban.gs, sez. 4 accumulo attese), riusato
// cosi' com'e' invece di reimplementarlo (passando "adesso" come limite
// superiore: ogni evento nel log e' per definizione nel passato,
// esattamente l'uso per cui quella funzione e' gia' pensata). Se il log
// non contiene un evento simile (dato storico incompleto o anomalo),
// ricade su arrival_ts. Se anche quello e' vuoto, il campo resta
// vuoto — nessuna base su cui stimare una data, meglio "non ancora
// noto" che una data inventata (stesso principio applicato in tutta la
// migrazione PROD di questa sessione).
// Idempotente: un job che ha gia' status_since_ts (valorizzato da una
// mossa reale successiva a M0-C) non viene toccato.
function backfillStatusSinceTs_(sheet) {
  var jobs = readTable_(sheet);
  if (!jobs.length) { return { jobs_backfilled: 0, jobs_total: 0 }; }
  var now = nowIso_();
  var changed = false;
  var backfilled = 0;
  var rows = jobs.map(function(job) {
    if (job.status_since_ts) { return jobToRow_(job); }
    var log = parseActivityLog_(job.activity_log_json);
    var entryTs = lastEntryTsForColumn_(log, job.status, now);
    job.status_since_ts = entryTs || job.arrival_ts || '';
    if (job.status_since_ts) {
      backfilled++;
      changed = true;
    }
    return jobToRow_(job);
  });
  if (changed) {
    sheet.getRange(2, 1, rows.length, JOB_HEADERS.length).setValues(rows);
  }
  return { jobs_backfilled: backfilled, jobs_total: jobs.length };
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
