function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
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

function getSpreadsheetForEnv_(env) {
  if (env === 'test') {
    var props = PropertiesService.getScriptProperties();
    var testId = props.getProperty(SIGMAFLOW.PROP_TEST_SPREADSHEET_ID) || SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID;
    if (!testId) {
      throw new Error('Database TEST non configurato');
    }
    return SpreadsheetApp.openById(testId);
  }

  return getSpreadsheet_();
}

function normalizeEnv_(env) {
  return env === 'test' ? 'test' : 'prod';
}

function withEnvironment_(env, callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var props = PropertiesService.getScriptProperties();
  var previousId = props.getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
  var ss = getSpreadsheetForEnv_(normalizeEnv_(env));

  try {
    props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, ss.getId());
    return callback(ss);
  } finally {
    if (previousId) {
      props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, previousId);
    } else {
      props.deleteProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
    }
    lock.releaseLock();
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function nowIso_() {
  return Utilities.formatDate(new Date(), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function generateId_(prefix) {
  var stamp = Utilities.formatDate(new Date(), SIGMAFLOW.TZ, 'yyyyMMdd-HHmmss');
  var suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return prefix + '-' + stamp + '-' + suffix;
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
  if (!startIso || !endIso) {
    return '';
  }
  var start = new Date(startIso);
  var end = new Date(endIso);
  return Math.max(0, (end.getTime() - start.getTime()) / 864e5);
}

function coerceBoolean_(value) {
  return value === true || value === 'TRUE' || value === 'true';
}

function readConfig_() {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
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
  var config = readConfig_();
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
        order: column.order
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
    return {
      id: id,
      status: id,
      label: String(column.label || id),
      role: normalizeColumnRole_(column.role),
      order: Number(column.order || ((index + 1) * 10))
    };
  }).sort(function(a, b) {
    return a.order - b.order;
  });

  return ensureRequiredColumnRoles_(columns);
}

function writeColumns_(columns) {
  columns = ensureRequiredColumnRoles_(columns).map(function(column, index) {
    return {
      id: column.id,
      label: column.label,
      role: normalizeColumnRole_(column.role),
      order: (index + 1) * 10
    };
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

function validateColumnId_(id) {
  var columns = readColumns_();
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
