function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  template.view = (e && e.parameter && e.parameter.view) || 'board';
  return template.evaluate()
    .setTitle('SigmaFlow')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var params = parseRequest_(e);
    return json_(routeAction_(params));
  } catch (err) {
    return json_(fail_(err.message));
  }
}

function api(action, payload) {
  try {
    payload = payload || {};
    payload.action = action;
    return routeAction_(payload);
  } catch (err) {
    return fail_(err.message);
  }
}

function parseRequest_(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      params = e.parameter || {};
    }
  } else {
    params = (e && e.parameter) || {};
  }
  return params;
}

function routeAction_(params) {
  var action = requireParam_(params, 'action');
  var routes = {
    getBoard: getBoard,
    addCase: addCase,
    addJob: addJob,
    moveJob: moveJob,
    updateJob: updateJob,
    deleteJob: deleteJob,
    markRework: markRework,
    getMetrics: getMetrics
  };

  if (!routes[action]) {
    throw new Error('Azione non supportata: ' + action);
  }

  return routes[action](params);
}

function getBoard() {
  var jobs = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  var board = {};
  SIGMAFLOW.STATUSES.forEach(function(status) {
    board[status] = [];
  });

  jobs.forEach(function(job) {
    var status = job.status || 'backlog';
    if (!board[status]) {
      board[status] = [];
    }
    board[status].push(job);
  });

  return ok_({ columns: board, jobs: jobs });
}

function addCase(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.CASES);
  var caseId = generateId_('C');
  var now = nowIso_();

  sheet.appendRow([
    caseId,
    requireParam_(params, 'title'),
    params.client || '',
    0,
    true,
    now,
    ''
  ]);

  return ok_({ case_id: caseId });
}

function addJob(params) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var caseId = params.case_id || createImplicitCase_(ss, params.title, params.client);
  var sizeClass = params.size_class || 'M';
  var now = nowIso_();
  var jobId = generateId_('J');

  sheet.appendRow([
    jobId,
    caseId,
    Number(params.visit_number || 1),
    requireParam_(params, 'title'),
    params.status || 'backlog',
    params.assignee || '',
    params.tag || '',
    sizeClass,
    SIGMAFLOW.SIZE_POINTS[sizeClass] || SIGMAFLOW.SIZE_POINTS.M,
    now,
    '',
    '',
    '',
    '',
    '',
    Number(params.visit_number || 1) > 1,
    params.rework_cause || '',
    params.notes || ''
  ]);

  refreshCaseVisitCount_(ss, caseId);
  return ok_({ job_id: jobId, case_id: caseId });
}

function moveJob(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var status = requireParam_(params, 'status');
  if (SIGMAFLOW.STATUSES.indexOf(status) === -1) {
    throw new Error('Status non valido: ' + status);
  }

  var headers = getHeaderMap_(sheet);
  var now = nowIso_();
  sheet.getRange(row, headers.status).setValue(status);

  if (status === 'in_progress' && !sheet.getRange(row, headers.start_ts).getValue()) {
    sheet.getRange(row, headers.start_ts).setValue(now);
  }

  if (status === 'done') {
    sheet.getRange(row, headers.done_ts).setValue(now);
    recalculateJobTimes_(sheet, row, headers);
    refreshCaseVisitCount_(getSpreadsheet_(), sheet.getRange(row, headers.case_id).getValue());
  }

  return ok_({ job_id: params.job_id, status: status });
}

function updateJob(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var headers = getHeaderMap_(sheet);
  ['title', 'assignee', 'tag', 'size_class', 'notes'].forEach(function(field) {
    if (params[field] !== undefined && headers[field]) {
      sheet.getRange(row, headers[field]).setValue(params[field]);
    }
  });

  if (params.size_class && headers.size_points) {
    sheet.getRange(row, headers.size_points).setValue(SIGMAFLOW.SIZE_POINTS[params.size_class] || SIGMAFLOW.SIZE_POINTS.M);
  }

  return ok_({ job_id: params.job_id });
}

function deleteJob(params) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var headers = getHeaderMap_(sheet);
  var caseId = sheet.getRange(row, headers.case_id).getValue();
  sheet.deleteRow(row);
  refreshCaseVisitCount_(ss, caseId);
  return ok_({ job_id: params.job_id });
}

function markRework(params) {
  var ss = getSpreadsheet_();
  var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  var source = jobs.filter(function(job) {
    return job.job_id === params.job_id;
  })[0];

  if (!source) {
    throw new Error('Job sorgente non trovato: ' + params.job_id);
  }

  var caseJobs = jobs.filter(function(job) {
    return job.case_id === source.case_id;
  });
  var nextVisit = caseJobs.reduce(function(max, job) {
    return Math.max(max, Number(job.visit_number || 1));
  }, 1) + 1;

  return addJob({
    title: params.title || source.title,
    case_id: source.case_id,
    visit_number: nextVisit,
    assignee: params.assignee || source.assignee,
    tag: params.tag || source.tag,
    size_class: params.size_class || source.size_class || 'M',
    rework_cause: requireParam_(params, 'rework_cause'),
    notes: params.notes || ''
  });
}

function createImplicitCase_(ss, title, client) {
  var result = addCase({ title: title || 'Nuovo caso', client: client || '' });
  return result.data.case_id;
}

function refreshCaseVisitCount_(ss, caseId) {
  if (!caseId) {
    return;
  }

  var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  var caseJobs = jobs.filter(function(job) {
    return job.case_id === caseId;
  });

  var casesSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CASES);
  var row = findRowById_(casesSheet, 'case_id', caseId);
  if (row < 0) {
    return;
  }

  var headers = getHeaderMap_(casesSheet);
  casesSheet.getRange(row, headers.total_visits).setValue(caseJobs.length);

  var open = caseJobs.some(function(job) {
    return job.status !== 'done';
  });
  casesSheet.getRange(row, headers.is_open).setValue(open);
  if (!open && caseJobs.length > 0) {
    casesSheet.getRange(row, headers.closed_ts).setValue(nowIso_());
  }
}

function recalculateJobTimes_(sheet, row, headers) {
  var arrival = sheet.getRange(row, headers.arrival_ts).getValue();
  var start = sheet.getRange(row, headers.start_ts).getValue();
  var done = sheet.getRange(row, headers.done_ts).getValue();

  if (!start) {
    start = done;
    sheet.getRange(row, headers.start_ts).setValue(start);
  }

  sheet.getRange(row, headers.service_time_h).setValue(hoursBetween_(start, done));
  sheet.getRange(row, headers.lead_time_h).setValue(hoursBetween_(arrival, done));
  sheet.getRange(row, headers.wait_time_h).setValue(hoursBetween_(arrival, start));
}
