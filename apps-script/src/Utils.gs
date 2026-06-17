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
  var config = readConfig_();
  var labels = {};
  SIGMAFLOW.STATUSES.forEach(function(status) {
    labels[status] = config['column_' + status] || SIGMAFLOW.DEFAULT_COLUMN_LABELS[status] || status;
  });
  return labels;
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
