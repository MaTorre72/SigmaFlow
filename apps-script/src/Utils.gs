// P1 (DESIGN_lock_ambiente.md, §2.1): l'ambiente risolto per la singola
// chiamata NON vive piu' nella Script Property condivisa
// PROP_SPREADSHEET_ID (persistente e condivisa tra esecuzioni separate,
// causa di fondo degli incidenti del 2026-08-19 e 2026-08-25 — una
// property sporca da un'esecuzione interrotta sopravvive e viene
// ereditata dalla richiesta successiva), ma in questa variabile globale:
// ogni esecuzione Apps Script parte in un'isolate V8 nuova, senza
// memoria condivisa tra esecuzioni — una variabile dichiarata qui e'
// per costruzione isolata alla singola chiamata, senza bisogno di un
// finally per "proteggerla" da altre richieste in corso. Mai persistita.
var __sfRoutedSpreadsheetId_ = null;

function getSpreadsheet_() {
  var id = __sfRoutedSpreadsheetId_;
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  if (SIGMAFLOW.DEFAULT_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  }

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Nessuno spreadsheet configurato. Esegui setupSigmaFlow() da uno Spreadsheet collegato.');
  }

  return active;
}

// Bugfix 2026-08-25 (incidente RICORRENTE, gia' capitato il 2026-08-19 -
// vedi PROGRAMMA_STATO.md): il ramo 'prod' delegava a getSpreadsheet_(),
// che legge PRIMA la Script Property ambientale CONDIVISA
// (PROP_SPREADSHEET_ID) e solo se vuota ricade sull'id fisso di PROD.
// Se quella property resta sporca (puntata su TEST) per qualunque
// motivo - un'esecuzione interrotta prima del proprio 'finally', un
// test lanciato a mano dall'editor, setupSigmaFlow() eseguita mentre la
// property era gia' sporca - OGNI richiesta 'prod' (l'ambiente di
// default, usato ogni volta che l'URL non specifica esplicitamente
// env=test) la eredita silenziosamente: mostra dati di TEST sul
// deployment pubblico, e ripersiste la stessa sporcizia nel proprio
// 'finally' (withEnvironment_ restituisce la property al valore
// "precedente", che e' proprio quello sporco). 'prod' ora risolve
// SEMPRE l'id fisso DEFAULT_SPREADSHEET_ID, esattamente come 'test'
// risolve gia' il proprio id fisso subito sopra - mai la property
// ambientale. Il fallback a getSpreadsheet_() resta solo per il
// bootstrap iniziale (DEFAULT_SPREADSHEET_ID non ancora configurato),
// caso che oggi non si presenta piu' in pratica.
function getSpreadsheetForEnv_(env) {
  if (env === 'test') {
    var props = PropertiesService.getScriptProperties();
    var testId = props.getProperty(SIGMAFLOW.PROP_TEST_SPREADSHEET_ID) || SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID;
    if (!testId) {
      throw new Error('Database TEST non configurato');
    }
    return SpreadsheetApp.openById(testId);
  }

  if (SIGMAFLOW.DEFAULT_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  }

  return getSpreadsheet_();
}

function normalizeEnv_(env) {
  return env === 'test' ? 'test' : 'prod';
}

// P2 (DESIGN_lock_ambiente.md, §2.2/§4): il lock globale protegge la
// concorrenza sulle SCRITTURE (jobs/visite/config) — le azioni di sola
// lettura (getBoard/getActivityLog/getArchivio/getCestino/getMetrics,
// vedi SF_READ_ACTIONS_ in Kanban.gs) non hanno bisogno di mettersi in
// coda dietro le altre richieste in corso su tutto lo script. requiresLock
// e' un terzo parametro OPZIONALE (default true — nessun chiamante
// esistente cambia comportamento senza passarlo esplicitamente): solo
// api() lo valorizza a false per le azioni di lettura classificate.
function withEnvironment_(env, callback, requiresLock) {
  var needsLock = requiresLock !== false;
  var lock = null;
  if (needsLock) {
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
  }
  var previousId = __sfRoutedSpreadsheetId_;
  var ss = getSpreadsheetForEnv_(normalizeEnv_(env));

  try {
    __sfRoutedSpreadsheetId_ = ss.getId();
    return callback(ss);
  } finally {
    __sfRoutedSpreadsheetId_ = previousId;
    if (lock) {
      lock.releaseLock();
    }
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function nowIso_() {
  return nowRome();
}

function generateId_(prefix) {
  if (prefix === 'J') {
    return generateJobId();
  }
  var stamp = Utilities.formatDate(new Date(), SIGMAFLOW.TZ, 'yyyyMMdd-HHmmss');
  var suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return prefix + '-' + stamp + '-' + suffix;
}

function nowRome() {
  return Utilities.formatDate(new Date(), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function generateJobId() {
  return 'JOB-' + Utilities.formatDate(new Date(), SIGMAFLOW.TZ, 'yyyyMMdd') + '-' + randomSuffix_();
}

function randomSuffix_() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ATTENZIONE: la stessa formula e' duplicata in client.html,
// updateLivePriorityBadge() (anteprima dal vivo nel modale, prima
// del salvataggio) - se questa formula cambia (es. per introdurre
// WSJF/Cost of Delay, vedi Area 5), aggiornare anche li'.
function calcPriorityScore(impact, manageability) {
  var i = Number(impact);
  var m = Number(manageability);
  if (!i || !m || i < 1 || m < 1) {
    return 0;
  }
  return Math.round(Math.sqrt(i * m) * 100) / 100;
}

function suggestPriorityClass(score) {
  var value = Number(score) || 0;
  var classes = SIGMAFLOW.PRIORITY_CLASSES;
  if (value < classes.p4_assess.score_max) {
    return 'p4_assess';
  }
  if (value < classes.p1_plan.score_max) {
    return 'p1_plan';
  }
  if (value < classes.p2_urgent.score_max) {
    return 'p2_urgent';
  }
  return 'p3_critical';
}

// Confronta due timestamp ISO come istanti reali (new Date), non come
// stringhe: formati diversi (offset +02:00 vs Z vs assente, come nel caso
// dei datetime-local del frontend) rendono il confronto lessicografico
// tra stringhe inaffidabile. Restituisce <0, 0, >0 come Array.prototype.sort.
function compareTs_(a, b) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function diffDays(tsStart, tsEnd) {
  if (!tsStart || !tsEnd) {
    return '';
  }
  var start = new Date(tsStart);
  var end = new Date(tsEnd);
  var days = Math.max(0, (end.getTime() - start.getTime()) / 864e5);
  return Math.round(days * 100) / 100;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return { success: true, data: data || {} };
}

function fail_(message) {
  return { success: false, error: message };
}

function requireParam_(params, key) {
  if (params[key] === undefined || params[key] === null || params[key] === '') {
    throw new Error('Parametro mancante: ' + key);
  }
  return params[key];
}

function readTable_(sheet) {
  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  var headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return cell !== '';
    });
  }).map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      obj[header] = normalizeCell_(row[index]);
    });
    return obj;
  });
}

function normalizeCell_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return value;
}

// Svuota un foglio mantenendo solo l'intestazione — usata sia dai test
// (resetTestDatabase_) sia da svuotaCestino_ (§6b, N4: azione di gruppo
// "Svuota cestino"), da qui invece che da Tests.gs perche' e' codice di
// produzione, non solo di test.
function clearDataRows_(sheet, headers) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function getHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(header, index) {
    map[header] = index + 1;
  });
  return map;
}

function getHeaderCol_(headers, primary, aliases) {
  if (headers[primary]) {
    return headers[primary];
  }

  aliases = aliases || [];
  for (var i = 0; i < aliases.length; i++) {
    if (headers[aliases[i]]) {
      return headers[aliases[i]];
    }
  }

  return null;
}

function getCellByHeader_(sheet, row, headers, primary, aliases) {
  var col = getHeaderCol_(headers, primary, aliases);
  return col ? sheet.getRange(row, col).getValue() : '';
}

function setCellByHeader_(sheet, row, headers, primary, aliases, value) {
  var col = getHeaderCol_(headers, primary, aliases);
  if (col) {
    sheet.getRange(row, col).setValue(value);
  }
}

function normalizeStatus_(status) {
  var value = status || 'backlog';
  return SIGMAFLOW.STATUS_ALIASES[value] || value;
}

function normalizeColumnRole_(role) {
  var value = role || 'neutral';
  return SIGMAFLOW.COLUMN_ROLES.indexOf(value) === -1 ? 'neutral' : value;
}

function findRowById_(sheet, idColumn, id) {
  var headers = getHeaderMap_(sheet);
  var col = headers[idColumn];
  if (!col) {
    throw new Error('Colonna ID non trovata: ' + idColumn);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === id) {
      return i + 2;
    }
  }
  return -1;
}

function daysBetween_(startIso, endIso) {
  return diffDays(startIso, endIso);
}

function coerceBoolean_(value) {
  return value === true || value === 'TRUE' || value === 'true';
}

// N-B1 (DESIGN_backup.md, §4): ss opzionale - se assente, risolve
// l'ambiente ambientale (invariato per ogni chiamante esistente). Il
// backup di PROD lo passa esplicitamente (il foglio PROD gia' in mano,
// aperto per id) per non dipendere dalla stessa property condivisa che
// ha causato l'incidente del 2026-08-19.
function readConfig_(ss) {
  var sheet = (ss || getSpreadsheet_()).getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
  var config = {};
  Object.keys(SIGMAFLOW.DEFAULT_CONFIG).forEach(function(key) {
    config[key] = SIGMAFLOW.DEFAULT_CONFIG[key];
  });

  readTable_(sheet).forEach(function(row) {
    var numeric = Number(row.value);
    config[row.key] = isNaN(numeric) ? row.value : numeric;
  });

  return config;
}

function readColumnLabels_() {
  var labels = {};
  readColumns_().forEach(function(column) {
    labels[column.id] = column.label;
  });
  return labels;
}

function readColumns_() {
  return normalizeColumns_(readConfig_());
}

// Normalizzazione e ordinamento delle colonne a partire da un oggetto
// config gia' in mano (non rilegge il foglio): usata sia da readColumns_
// (config dal foglio live) sia da columnsFromConfig_ in Model.gs (config
// passato come parametro, anche sintetico nei test). Prima di questa
// unificazione, columnsFromConfig_ restituiva l'array cosi' come salvato
// in columns_json, senza ordinarlo per "order": la dashboard poteva quindi
// mostrare colonne in un ordine diverso da quello reale della board.
function normalizeColumns_(config) {
  var columns = [];

  if (config.columns_json) {
    try {
      columns = JSON.parse(config.columns_json);
    } catch (err) {
      columns = [];
    }
  }

  if (!columns || !columns.length) {
    columns = SIGMAFLOW.DEFAULT_COLUMNS.map(function(column) {
      return {
        id: column.id,
        label: config['column_' + column.id] || column.label,
        role: column.role,
        order: column.order,
        aging_days: column.aging_days
      };
    });
  }

  var seen = {};
  columns = columns.map(function(column, index) {
    var id = normalizeStatus_(column.id || column.status || '');
    if (!id || seen[id]) {
      id = uniqueColumnId_(slugify_(column.label || 'colonna'), seen);
    }
    seen[id] = true;
    var normalized = {
      id: id,
      status: id,
      label: String(column.label || id),
      role: normalizeColumnRole_(column.role),
      order: Number(column.order || ((index + 1) * 10)),
      color: column.color || '#E8E8E8',
      hidden: coerceBoolean_(column.hidden)
    };
    // M0-C: come in writeColumns_, opzionale — assente = evidenziazione
    // disattivata per questa colonna. Deve arrivare al frontend intatto
    // (getBoard() espone column_meta costruito da qui), altrimenti
    // aging_days configurato non avrebbe mai effetto visibile.
    if (column.aging_days !== undefined && column.aging_days !== null && column.aging_days !== '') {
      normalized.aging_days = Number(column.aging_days);
    }
    return normalized;
  }).sort(function(a, b) {
    return a.order - b.order;
  });

  return ensureRequiredColumnRoles_(columns);
}

function writeColumns_(columns) {
  columns = ensureRequiredColumnRoles_(columns).map(function(column, index) {
    var normalized = {
      id: column.id,
      label: column.label,
      role: normalizeColumnRole_(column.role),
      order: (index + 1) * 10,
      color: column.color || '#E8E8E8',
      hidden: coerceBoolean_(column.hidden)
    };
    // M0-C: aging_days e' opzionale (vuoto = evidenziazione
    // disattivata per quella colonna) — a differenza degli altri campi
    // sopra, senza questo ogni salvataggio di QUALUNQUE colonna
    // (addColumn/updateColumn/moveColumn passano tutti da qui)
    // avrebbe cancellato silenziosamente aging_days da TUTTE le
    // colonne, non solo da quella toccata.
    if (column.aging_days !== undefined && column.aging_days !== null && column.aging_days !== '') {
      normalized.aging_days = Number(column.aging_days);
    }
    return normalized;
  });
  writeConfigValue_('columns_json', JSON.stringify(columns));
  return columns;
}

function ensureRequiredColumnRoles_(columns) {
  var hasBacklog = columns.some(function(column) {
    return column.role === 'backlog';
  });
  var hasDone = columns.some(function(column) {
    return column.role === 'done';
  });

  if (!hasBacklog) {
    columns.unshift({ id: 'backlog', label: 'Backlog', role: 'backlog', order: 0 });
  }
  if (!hasDone) {
    columns.push({ id: 'done', label: 'Fatto', role: 'done', order: 999 });
  }

  return columns;
}

function findColumn_(columns, id) {
  id = normalizeStatus_(id);
  return columns.filter(function(column) {
    return column.id === id;
  })[0] || null;
}

// O1 (DESIGN_performance.md, punto C): 'columns' opzionale - un
// chiamante che ha gia' letto readColumns_() (es. moveJob) lo passa per
// evitare di rileggere il foglio 'config' una seconda volta nella stessa
// chiamata. Invariato per ogni chiamante esistente che non lo passa.
function validateColumnId_(id, columns) {
  columns = columns || readColumns_();
  var status = normalizeStatus_(id);
  if (!findColumn_(columns, status)) {
    throw new Error('Colonna non valida: ' + status);
  }
  return status;
}

function isDoneStatus_(status) {
  var column = findColumn_(readColumns_(), status);
  return column && column.role === 'done';
}

function isStandByStatus_(status) {
  var column = findColumn_(readColumns_(), status);
  return column && column.role === 'stand_by';
}

function firstColumnIdByRole_(role) {
  var columns = readColumns_();
  var column = columns.filter(function(item) {
    return item.role === role;
  })[0] || columns[0];
  return column.id;
}

function firstWorkColumnId_() {
  return firstColumnIdByRole_('wip');
}

function slugify_(value) {
  return String(value || 'colonna')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'colonna';
}

function uniqueColumnId_(base, seen) {
  var id = base;
  var index = 2;
  while (seen[id]) {
    id = base + '_' + index;
    index++;
  }
  return id;
}

function isValidIso8601_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    return false;
  }
  return !isNaN(new Date(value).getTime());
}

function parseJsonArray_(value) {
  if (!value) {
    return [];
  }
  try {
    var parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function uniqueSortedValues_(values) {
  var seen = {};
  return values.filter(function(value) {
    value = String(value || '').trim();
    if (!value || seen[value]) {
      return false;
    }
    seen[value] = true;
    return true;
  }).sort();
}

function orderedUniqueValues_(values) {
  var seen = {};
  return values.filter(function(value) {
    value = String(value || '').trim();
    var key = value.toLowerCase();
    if (!value || seen[key]) { return false; }
    seen[key] = true;
    return true;
  }).map(function(value) { return String(value).trim(); });
}

function writeConfigValue_(key, value) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
  var rows = readTable_(sheet);
  var headers = getHeaderMap_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      sheet.getRange(i + 2, headers.value).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, '']);
}
