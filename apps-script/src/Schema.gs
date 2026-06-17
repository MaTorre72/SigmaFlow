var JOB_HEADERS = [
  'job_id',
  'case_id',
  'visit_number',
  'title',
  'status',
  'assignee',
  'tag',
  'size_class',
  'size_points',
  'arrival_ts',
  'start_ts',
  'done_ts',
  'service_time_d',
  'lead_time_d',
  'wait_time_d',
  'is_rework',
  'rework_cause',
  'notes'
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
  PropertiesService.getScriptProperties().setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, ss.getId());
  return ok_({ spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl() });
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return sheet;
  }

  var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  var needsHeader = headers.some(function(header, index) {
    return existing[index] !== header;
  });

  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
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
    size_XS_days: 'Giorni medi attesi per taglia XS',
    size_S_days: 'Giorni medi attesi per taglia S',
    size_M_days: 'Giorni medi attesi per taglia M',
    size_L_days: 'Giorni medi attesi per taglia L',
    size_XL_days: 'Giorni medi attesi per taglia XL',
    column_backlog: 'Etichetta colonna backlog',
    column_in_progress: 'Etichetta colonna in lavorazione',
    column_stand_by: 'Etichetta colonna stand-by',
    column_in_review: 'Etichetta colonna revisione',
    column_done: 'Etichetta colonna completati'
  };

  Object.keys(SIGMAFLOW.DEFAULT_CONFIG).forEach(function(key) {
    if (!existing[key]) {
      sheet.appendRow([key, SIGMAFLOW.DEFAULT_CONFIG[key], descriptions[key] || '']);
    }
  });
}
