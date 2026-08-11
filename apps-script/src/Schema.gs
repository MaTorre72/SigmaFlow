var JOB_HEADERS = [
  'job_id',
  'case_id',
  'visit_number',
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
  'start_ts',
  'done_ts',
  'invoiced',
  'service_time_d',
  'lead_time_d',
  'wait_time_d',
  'is_rework',
  'rework_cause',
  'notes',
  'card_color',
  'checklist_json',
  'correction_log_json'
];

var CASE_HEADERS = [
  'case_id',
  'title',
  'client',
  'total_visits',
  'is_open',
  'created_ts',
  'closed_ts'
];

var CONFIG_HEADERS = ['key', 'value', 'description'];

function setupSigmaFlow() {
  var ss = getSpreadsheet_();
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CASES, CASE_HEADERS);
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
