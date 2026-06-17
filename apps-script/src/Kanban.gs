function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  template.view = (e && e.parameter && e.parameter.view) || 'board';
  template.env = normalizeEnv_(e && e.parameter && e.parameter.env);
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
    return withEnvironment_(payload.env, function() {
      var response = routeAction_(payload);
      if (response && response.success && response.data) {
        response.data.env = normalizeEnv_(payload.env);
      }
      return response;
    });
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
    updateColumnLabel: updateColumnLabel,
    addColumn: addColumn,
    updateColumn: updateColumn,
    moveColumn: moveColumn,
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
  var columns = readColumns_();
  var board = {};
  var columnMeta = [];
  columns.forEach(function(column) {
    board[column.id] = [];
  });

  jobs.forEach(function(job) {
    var status = normalizeStatus_(job.status);
    job.status = status;
    if (!board[status]) {
      board[status] = [];
    }
    board[status].push(job);
  });

  columns.forEach(function(column) {
    var points = (board[column.id] || []).reduce(function(sum, job) {
      return sum + Number(job.size_points || 0);
    }, 0);
    columnMeta.push({
      id: column.id,
      status: column.id,
      label: column.label,
      role: column.role,
      order: column.order,
      count: (board[column.id] || []).length,
      points: points
    });
  });

  return ok_({
    columns: board,
    column_meta: columnMeta,
    jobs: jobs,
    options: boardOptions_(jobs)
  });
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
  var status = validateColumnId_(params.status || firstColumnIdByRole_('backlog'));
  var now = nowIso_();
  var jobId = generateId_('J');

  sheet.appendRow([
    jobId,
    caseId,
    Number(params.visit_number || 1),
    requireParam_(params, 'title'),
    status,
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

  var status = validateColumnId_(requireParam_(params, 'status'));

  var headers = getHeaderMap_(sheet);
  var now = nowIso_();
  var previousStatus = normalizeStatus_(sheet.getRange(row, headers.status).getValue());
  var wasAlreadyWorked = Boolean(sheet.getRange(row, headers.start_ts).getValue())
    || Boolean(sheet.getRange(row, headers.done_ts).getValue())
    || Number(sheet.getRange(row, headers.visit_number).getValue() || 1) > 1;
  sheet.getRange(row, headers.status).setValue(status);

  if (!isStandByStatus_(status) && !isDoneStatus_(status) && !sheet.getRange(row, headers.start_ts).getValue()) {
    sheet.getRange(row, headers.start_ts).setValue(now);
  }

  if (isStandByStatus_(previousStatus) && !isStandByStatus_(status) && wasAlreadyWorked) {
    markRowAsRework_(sheet, row, headers, 'stand_by_return');
  }

  if (isDoneStatus_(status)) {
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

function updateColumnLabel(params) {
  return updateColumn(params);
}

function addColumn(params) {
  var label = String(requireParam_(params, 'label')).trim();
  var role = normalizeColumnRole_(params.role || 'neutral');
  var columns = readColumns_();
  var seen = {};
  columns.forEach(function(column) {
    seen[column.id] = true;
  });
  var id = uniqueColumnId_(slugify_(params.id || label), seen);
  columns.push({
    id: id,
    label: label,
    role: role,
    order: (columns.length + 1) * 10
  });
  columns = writeColumns_(columns);
  return ok_({ column: findColumn_(columns, id), columns: columns });
}

function updateColumn(params) {
  var id = validateColumnId_(requireParam_(params, 'status'));
  var columns = readColumns_();
  var column = findColumn_(columns, id);
  if (params.label !== undefined) {
    var label = String(params.label).trim();
    if (!label) {
      throw new Error('Etichetta colonna vuota');
    }
    column.label = label;
  }
  if (params.role !== undefined) {
    column.role = normalizeColumnRole_(params.role);
  }
  columns = writeColumns_(columns);
  return ok_({ column: findColumn_(columns, id), columns: columns });
}

function moveColumn(params) {
  var id = validateColumnId_(requireParam_(params, 'status'));
  var direction = requireParam_(params, 'direction');
  var columns = readColumns_();
  var index = -1;
  columns.forEach(function(column, i) {
    if (column.id === id) {
      index = i;
    }
  });
  var target = direction === 'left' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= columns.length) {
    return ok_({ columns: columns });
  }
  var current = columns[index];
  columns[index] = columns[target];
  columns[target] = current;
  columns = writeColumns_(columns);
  return ok_({ columns: columns });
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
    return !isDoneStatus_(job.status);
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

  setCellByHeader_(sheet, row, headers, 'service_time_d', ['service_time_h'], daysBetween_(start, done));
  setCellByHeader_(sheet, row, headers, 'lead_time_d', ['lead_time_h'], daysBetween_(arrival, done));
  setCellByHeader_(sheet, row, headers, 'wait_time_d', ['wait_time_h'], daysBetween_(arrival, start));
}

function markRowAsRework_(sheet, row, headers, cause) {
  var visits = Math.max(1, Number(sheet.getRange(row, headers.visit_number).getValue() || 1));
  sheet.getRange(row, headers.visit_number).setValue(visits + 1);
  sheet.getRange(row, headers.is_rework).setValue(true);
  if (!sheet.getRange(row, headers.rework_cause).getValue()) {
    sheet.getRange(row, headers.rework_cause).setValue(cause);
  }
}

function boardOptions_(jobs) {
  var config = readConfig_();
  var assignees = parseJsonArray_(config.assignees_json);
  var tags = parseJsonArray_(config.tags_json);

  jobs.forEach(function(job) {
    assignees.push(job.assignee);
    tags.push(job.tag);
  });

  return {
    assignees: uniqueSortedValues_(assignees),
    tags: uniqueSortedValues_(tags),
    sizes: Object.keys(SIGMAFLOW.SIZE_POINTS)
  };
}
