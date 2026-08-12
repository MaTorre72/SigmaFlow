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
    addActivityEvent: addActivityEvent,
    getActivityLog: getActivityLog,
    updateActivityEvent: updateActivityEvent,
    deleteActivityEvent: deleteActivityEvent,
    correctJobTimestamps: correctJobTimestamps,
    migrateToActivityLog: migrateToActivityLog,
    deleteJob: deleteJob,
    updateColumnLabel: updateColumnLabel,
    addColumn: addColumn,
    updateColumn: updateColumn,
    moveColumn: moveColumn,
    updateOptionList: updateOptionList,
    seedTestData: seedTestData,
    markRework: markRework,
    getMetrics: getMetrics
  };

  if (!routes[action]) {
    throw new Error('Azione non supportata: ' + action);
  }

  return routes[action](params);
}

function getBoard() {
  ensureCurrentSchema_();
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
      color: column.color,
      hidden: coerceBoolean_(column.hidden),
      count: (board[column.id] || []).length,
      points: points
    });
  });

  return ok_({
    columns: board,
    column_meta: columnMeta,
    jobs: jobs,
    options: boardOptions_(jobs),
    priority_classes: SIGMAFLOW.PRIORITY_CLASSES
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
  var title = requireParam_(params, 'title');
  var caseId = params.case_id || createImplicitCase_(ss, title, params.client);
  var sizeClass = params.size_class || 'M';
  var status = validateColumnId_(params.status || firstColumnIdByRole_('backlog'));
  var now = nowIso_();
  var targetColumn = findColumn_(readColumns_(), status);
  var priority = priorityFields_(params);
  var job = {
    job_id: generateJobId(),
    case_id: caseId,
    visit_number: Number(params.visit_number || 1),
    title: title,
    client: params.client || '',
    ambassador: params.ambassador || '',
    status: status,
    assignee: params.assignee || '',
    tag: params.tag || '',
    size_class: sizeClass,
    size_points: SIGMAFLOW.SIZE_POINTS[sizeClass] || SIGMAFLOW.SIZE_POINTS.M,
    priority_class: priority.priority_class,
    priority_class_manual: priority.priority_class_manual,
    impact: priority.impact,
    manageability: priority.manageability,
    priority_score: priority.priority_score,
    description: params.description || '',
    due_date: params.due_date || '',
    arrival_ts: now,
    start_ts: targetColumn.role === 'wip' ? now : '',
    done_ts: '',
    invoiced: coerceBoolean_(params.invoiced),
    service_time_d: '',
    lead_time_d: '',
    wait_time_d: '',
    is_rework: Number(params.visit_number || 1) > 1,
    rework_cause: params.rework_cause || '',
    notes: params.notes || '',
    card_color: normalizeCardColor_(params.card_color),
    checklist_json: normalizeChecklistJson_(params.checklist_json),
    correction_log_json: '[]'
  };

  sheet.appendRow(jobToRow_(job));

  refreshCaseVisitCount_(ss, caseId);
  return ok_({ job_id: job.job_id, case_id: caseId, job: job });
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
  var job = readJobFromRow_(sheet, row, headers);
  var columns = readColumns_();
  var sourceColumn = findColumn_(columns, job.status) || { id: job.status, role: 'neutral' };
  var targetColumn = findColumn_(columns, status);

  if (sourceColumn.role === 'stand_by' && targetColumn.id === 'wip') {
    throw new Error('Il rientro diretto da una colonna di attesa a WIP non e consentito. Sposta prima il job in TO DO o in una colonna precedente.');
  }

  if (sourceColumn.role === 'stand_by' && (targetColumn.role === 'wip' || targetColumn.role === 'backlog')) {
    job.visit_number = Number(job.visit_number || 1) + 1;
    job.is_rework = true;
    job.rework_cause = sourceColumn.id;
    job.start_ts = now;
  }

  if (targetColumn.role === 'wip' && !job.start_ts) {
    job.start_ts = now;
  }

  if (targetColumn.role === 'backlog' && !job.arrival_ts) {
    job.arrival_ts = now;
  }

  if (targetColumn.role === 'done') {
    job.done_ts = now;
    if (job.start_ts && job.arrival_ts) {
      job.service_time_d = diffDays(job.start_ts, job.done_ts);
      job.lead_time_d = diffDays(job.arrival_ts, job.done_ts);
      job.wait_time_d = diffDays(job.arrival_ts, job.start_ts);
    }
  }

  job.status = status;
  writeJobToRow_(sheet, row, headers, job);
  refreshCaseVisitCount_(getSpreadsheet_(), job.case_id);

  // Evento automatico per l'activity log: scrittura diretta (non passa da
  // addActivityEvent) per evitare la doppia validazione su un movimento
  // che il sistema ha gia' autorizzato spostando la card.
  var autoEvent = {
    id: generateActivityEventId_(),
    ts: now,
    type: 'move',
    source: 'auto',
    to: targetColumn.id,
    from: sourceColumn.id,
    note: ''
  };
  if (job.is_rework) {
    autoEvent.is_rework = true;
  }

  var rawLog = sheet.getRange(row, headers.activity_log_json).getValue();
  var log = parseActivityLog_(rawLog);
  log.push(autoEvent);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });
  sheet.getRange(row, headers.activity_log_json).setValue(serializeActivityLog_(log));

  return ok_({ job_id: params.job_id, status: status, job: job });
}

function updateJob(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  ['title', 'client', 'ambassador', 'assignee', 'tag', 'size_class', 'description', 'due_date', 'notes', 'card_color', 'checklist_json'].forEach(function(field) {
    if (params[field] !== undefined && headers[field]) {
      job[field] = params[field];
    }
  });

  if (params.size_class) {
    job.size_points = SIGMAFLOW.SIZE_POINTS[params.size_class] || SIGMAFLOW.SIZE_POINTS.M;
  }
  if (params.card_color !== undefined) {
    job.card_color = normalizeCardColor_(params.card_color);
  }
  if (params.checklist_json !== undefined) {
    job.checklist_json = normalizeChecklistJson_(params.checklist_json);
  }

  if (params.invoiced !== undefined) {
    job.invoiced = coerceBoolean_(params.invoiced);
  }

  var priorityChanged = params.impact !== undefined || params.manageability !== undefined || params.priority_class !== undefined;
  if (params.impact !== undefined) {
    job.impact = params.impact;
  }
  if (params.manageability !== undefined) {
    job.manageability = params.manageability;
  }
  if (params.priority_class !== undefined) {
    job.priority_class = params.priority_class;
    job.priority_class_manual = Boolean(params.priority_class);
  }
  if (priorityChanged) {
    var priority = priorityFields_({
      impact: job.impact,
      manageability: job.manageability,
      priority_class: coerceBoolean_(job.priority_class_manual) ? job.priority_class : ''
    });
    job.impact = priority.impact;
    job.manageability = priority.manageability;
    job.priority_score = priority.priority_score;
    if (!coerceBoolean_(job.priority_class_manual)) {
      job.priority_class = priority.priority_class;
    }
  }

  writeJobToRow_(sheet, row, headers, job);
  return ok_({ job_id: params.job_id, job: job });
}

// Costruisce l'evento candidato solo con i campi effettivamente forniti,
// per non riempire il log di chiavi vuote/undefined.
function buildActivityEventCandidate_(params, log) {
  var candidate = {
    id: generateActivityEventId_(),
    ts: params.ts,
    type: params.type,
    source: 'manual',
    from: computeFrom_(log, params.ts)
  };
  if (params.type === 'move') {
    candidate.to = params.to;
  }
  if (params.type === 'correction') {
    candidate.reason = params.reason;
  }
  ['note', 'field', 'old', 'new'].forEach(function(key) {
    if (params[key] !== undefined) {
      candidate[key] = params[key];
    }
  });
  return candidate;
}

function addActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  requireParam_(params, 'type');
  requireParam_(params, 'ts');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseActivityLog_(job.activity_log_json);
  var candidate = buildActivityEventCandidate_(params, log);

  var validation = validateSequence_(log, candidate);
  if (validation.hardErrors.length) {
    return ok_({ ok: false, hardErrors: validation.hardErrors });
  }

  if (validation.sequenceWarnings.length && !coerceBoolean_(params.force)) {
    return ok_({ ok: false, requiresForce: true, warnings: validation.sequenceWarnings });
  }

  var structuralWarnings = checkStructuralAlignment_(job, candidate);
  var alignFields = params.align_fields || {};
  var uncoveredWarnings = structuralWarnings.filter(function(warning) {
    return alignFields[warning.field] === undefined;
  });
  if (uncoveredWarnings.length) {
    return ok_({ ok: false, alignmentRequired: true, structuralWarnings: structuralWarnings });
  }

  log.push(candidate);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  Object.keys(alignFields).forEach(function(field) {
    if (JOB_HEADERS.indexOf(field) !== -1) {
      job[field] = alignFields[field];
    }
  });

  job.activity_log_json = serializeActivityLog_(log);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ ok: true, job_id: jobId, event: candidate });
}

function getActivityLog(params) {
  var jobId = requireParam_(params, 'job_id');
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseActivityLog_(job.activity_log_json);

  // Ricalcola "from" per ogni evento move al momento della lettura, cosi'
  // resta coerente anche su dati migrati senza from o dopo modifiche/cancellazioni.
  var recalculated = log.map(function(event) {
    if (event.type !== 'move') {
      return event;
    }
    var updated = Object.assign({}, event);
    updated.from = computeFrom_(log, event.ts);
    return updated;
  });

  return ok_({ job_id: jobId, log: recalculated });
}

function updateActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  var eventId = requireParam_(params, 'event_id');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseActivityLog_(job.activity_log_json);

  var existing = log.filter(function(event) { return event.id === eventId; })[0];
  if (!existing) {
    throw new Error('Evento non trovato: ' + eventId);
  }
  if (existing.source === 'auto') {
    throw new Error('EVENTO_AUTO_NON_MODIFICABILE');
  }

  var remaining = log.filter(function(event) { return event.id !== eventId; });

  // Parte dall'evento esistente e sovrascrive solo i campi passati in
  // params, poi ricalcola from sul log privato dell'evento in modifica.
  var mergedParams = Object.assign({}, existing, params);
  var candidate = buildActivityEventCandidate_(mergedParams, remaining);
  candidate.id = existing.id;

  var validation = validateSequence_(remaining, candidate);
  if (validation.hardErrors.length) {
    return ok_({ ok: false, hardErrors: validation.hardErrors });
  }

  if (validation.sequenceWarnings.length && !coerceBoolean_(params.force)) {
    return ok_({ ok: false, requiresForce: true, warnings: validation.sequenceWarnings });
  }

  var structuralWarnings = checkStructuralAlignment_(job, candidate);
  var alignFields = params.align_fields || {};
  var uncoveredWarnings = structuralWarnings.filter(function(warning) {
    return alignFields[warning.field] === undefined;
  });
  if (uncoveredWarnings.length) {
    return ok_({ ok: false, alignmentRequired: true, structuralWarnings: structuralWarnings });
  }

  remaining.push(candidate);
  remaining.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  Object.keys(alignFields).forEach(function(field) {
    if (JOB_HEADERS.indexOf(field) !== -1) {
      job[field] = alignFields[field];
    }
  });

  job.activity_log_json = serializeActivityLog_(remaining);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ ok: true, job_id: jobId, event: candidate });
}

function deleteActivityEvent(params) {
  var jobId = requireParam_(params, 'job_id');
  var eventId = requireParam_(params, 'event_id');

  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseActivityLog_(job.activity_log_json);

  var existing = log.filter(function(event) { return event.id === eventId; })[0];
  if (!existing) {
    throw new Error('Evento non trovato: ' + eventId);
  }
  if (existing.source === 'auto') {
    throw new Error('EVENTO_AUTO_NON_ELIMINABILE');
  }

  var remaining = log.filter(function(event) { return event.id !== eventId; });

  // Ricalcola "from" per gli eventi move rimasti, cosi' l'evento successivo
  // a quello cancellato torna a puntare alla colonna di provenienza corretta.
  var recalculated = remaining.map(function(event) {
    if (event.type !== 'move') {
      return event;
    }
    var updated = Object.assign({}, event);
    updated.from = computeFrom_(remaining, event.ts);
    return updated;
  });

  // Warning informativi (non bloccanti per la cancellazione): confronta
  // l'ultimo evento move rimasto con i campi strutturati del job, per
  // segnalare eventuali incoerenze introdotte dalla cancellazione.
  var moves = recalculated.filter(function(event) { return event.type === 'move'; });
  var lastMove = moves.length ? moves[moves.length - 1] : null;
  var structuralWarnings = lastMove ? checkStructuralAlignment_(job, lastMove) : [];

  job.activity_log_json = serializeActivityLog_(recalculated);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ job_id: jobId, event_id: eventId, structuralWarnings: structuralWarnings });
}

function correctJobTimestamps(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var jobId = requireParam_(params, 'job_id');
  var reason = String(params.reason || '').trim();
  if (!reason) {
    throw new Error('Il motivo della correzione e obbligatorio');
  }

  var correctableFields = ['arrival_ts', 'start_ts', 'done_ts'];
  var providedFields = correctableFields.filter(function(field) {
    return params[field] !== undefined && params[field] !== '';
  });
  if (!providedFields.length) {
    throw new Error('Specificare almeno uno tra arrival_ts, start_ts, done_ts');
  }

  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseJsonArray_(job.correction_log_json);
  var correctionTs = nowIso_();

  providedFields.forEach(function(field) {
    var newValue = params[field];
    if (!isValidIso8601_(newValue)) {
      throw new Error('Formato data non valido per ' + field + ': ' + newValue);
    }
    log.push({ ts: correctionTs, field: field, old: job[field] || '', new: newValue, reason: reason });
    job[field] = newValue;
  });

  if (job.arrival_ts && job.start_ts && new Date(job.arrival_ts).getTime() > new Date(job.start_ts).getTime()) {
    throw new Error('arrival_ts non puo essere successivo a start_ts');
  }
  if (job.start_ts && job.done_ts && new Date(job.start_ts).getTime() > new Date(job.done_ts).getTime()) {
    throw new Error('start_ts non puo essere successivo a done_ts');
  }
  if (job.arrival_ts && job.done_ts && new Date(job.arrival_ts).getTime() > new Date(job.done_ts).getTime()) {
    throw new Error('arrival_ts non puo essere successivo a done_ts');
  }

  if (job.done_ts) {
    if (job.start_ts) {
      job.service_time_d = diffDays(job.start_ts, job.done_ts);
    }
    if (job.arrival_ts) {
      job.lead_time_d = diffDays(job.arrival_ts, job.done_ts);
    }
    if (job.arrival_ts && job.start_ts) {
      job.wait_time_d = diffDays(job.arrival_ts, job.start_ts);
    }
  }

  job.correction_log_json = JSON.stringify(log);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ job_id: jobId, corrections_applied: providedFields.length, job: job });
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
  var column = {
    id: id,
    label: label,
    role: role,
    order: (columns.length + 1) * 10,
    color: params.color || '#E8E8E8',
    hidden: coerceBoolean_(params.hidden)
  };
  columns.push(column);
  columns = repositionColumn_(columns, id, params.after_status);
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
  if (params.color !== undefined) {
    column.color = String(params.color || '#E8E8E8');
  }
  if (params.hidden !== undefined) {
    column.hidden = coerceBoolean_(params.hidden);
  }
  if (params.after_status !== undefined) {
    columns = repositionColumn_(columns, id, params.after_status);
  }
  columns = writeColumns_(columns);
  return ok_({ column: findColumn_(columns, id), columns: columns });
}

function repositionColumn_(columns, id, afterStatus) {
  if (afterStatus === undefined || afterStatus === id) { return columns; }
  var moving = findColumn_(columns, id);
  if (!moving) { return columns; }
  columns = columns.filter(function(column) { return column.id !== id; });
  if (!afterStatus) {
    columns.unshift(moving);
    return columns;
  }
  var target = -1;
  columns.forEach(function(column, index) {
    if (column.id === afterStatus) { target = index; }
  });
  columns.splice(target < 0 ? columns.length : target + 1, 0, moving);
  return columns;
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
    client: params.client || source.client,
    case_id: source.case_id,
    visit_number: nextVisit,
    assignee: params.assignee || source.assignee,
    ambassador: params.ambassador || source.ambassador,
    tag: params.tag || source.tag,
    size_class: params.size_class || source.size_class || 'M',
    priority_class: params.priority_class || source.priority_class,
    impact: params.impact || source.impact,
    manageability: params.manageability || source.manageability,
    description: params.description || source.description || '',
    card_color: params.card_color || source.card_color || '',
    rework_cause: params.rework_cause || 'manual',
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

function markRowAsRework_(sheet, row, headers, cause) {
  var visits = Math.max(1, Number(sheet.getRange(row, headers.visit_number).getValue() || 1));
  sheet.getRange(row, headers.visit_number).setValue(visits + 1);
  sheet.getRange(row, headers.is_rework).setValue(true);
  if (!sheet.getRange(row, headers.rework_cause).getValue()) {
    sheet.getRange(row, headers.rework_cause).setValue(cause);
  }
}

function readJobFromRow_(sheet, row, headers) {
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var job = {};
  Object.keys(headers).forEach(function(header) {
    job[header] = normalizeCell_(values[headers[header] - 1]);
  });
  return job;
}

function writeJobToRow_(sheet, row, headers, job) {
  var values = JOB_HEADERS.map(function(header) {
    return job[header] === undefined ? '' : job[header];
  });
  sheet.getRange(row, 1, 1, JOB_HEADERS.length).setValues([values]);
}

function jobToRow_(job) {
  return JOB_HEADERS.map(function(header) {
    return job[header] === undefined ? '' : job[header];
  });
}

function priorityFields_(params) {
  var impact = params.impact === undefined || params.impact === '' ? '' : Number(params.impact);
  var manageability = params.manageability === undefined || params.manageability === '' ? '' : Number(params.manageability);
  var score = calcPriorityScore(impact, manageability);
  var manual = Boolean(params.priority_class);
  var priorityClass = manual ? params.priority_class : suggestPriorityClass(score);
  return {
    impact: impact,
    manageability: manageability,
    priority_score: score,
    priority_class: priorityClass,
    priority_class_manual: manual
  };
}

function boardOptions_(jobs) {
  var config = readConfig_();
  var assignees = parseJsonArray_(config.assignees_json);
  var ambassadors = parseJsonArray_(config.ambassadors_json);
  var tags = parseJsonArray_(config.tags_json);

  jobs.forEach(function(job) {
    assignees.push(job.assignee);
    ambassadors.push(job.ambassador);
    tags.push(job.tag);
  });

  return {
    assignees: orderedUniqueValues_(assignees),
    ambassadors: orderedUniqueValues_(ambassadors),
    tags: orderedUniqueValues_(tags),
    sizes: Object.keys(SIGMAFLOW.SIZE_POINTS),
    card_colors: SIGMAFLOW.CARD_COLORS
  };
}

function updateOptionList(params) {
  var kind = requireParam_(params, 'kind');
  var configKey = optionConfigKey_(kind);
  var values = parseJsonArray_(readConfig_()[configKey]);
  var action = requireParam_(params, 'operation');
  var value = String(params.value || '').trim();

  if (action === 'add') {
    if (!value) { throw new Error('Inserisci un valore'); }
    values.push(value);
    values = orderedUniqueValues_(values);
  } else if (action === 'remove') {
    if (optionUsageCount_(kind, value) > 0) {
      throw new Error('Questa voce è usata da alcune card e non può essere rimossa.');
    }
    values = values.filter(function(item) { return item !== value; });
  } else if (action === 'move') {
    var index = values.indexOf(value);
    var target = params.direction === 'up' ? index - 1 : index + 1;
    if (index >= 0 && target >= 0 && target < values.length) {
      var current = values[index];
      values[index] = values[target];
      values[target] = current;
    }
  } else {
    throw new Error('Operazione elenco non supportata');
  }

  writeConfigValue_(configKey, JSON.stringify(values));
  return ok_({ kind: kind, values: values });
}

function optionConfigKey_(kind) {
  if (kind === 'assignees') { return 'assignees_json'; }
  if (kind === 'ambassadors') { return 'ambassadors_json'; }
  if (kind === 'tags') { return 'tags_json'; }
  throw new Error('Elenco non supportato: ' + kind);
}

function optionUsageCount_(kind, value) {
  var field = kind === 'assignees' ? 'assignee' : (kind === 'ambassadors' ? 'ambassador' : 'tag');
  return readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(job) {
    return String(job[field] || '') === value;
  }).length;
}

function normalizeChecklistJson_(value) {
  var items;
  try { items = typeof value === 'string' ? JSON.parse(value || '[]') : (value || []); } catch (err) { items = []; }
  if (!Array.isArray(items)) { items = []; }
  return JSON.stringify(items.map(function(item) {
    return { text: String(item && item.text || '').trim(), done: coerceBoolean_(item && item.done) };
  }).filter(function(item) { return item.text; }));
}

function normalizeCardColor_(value) {
  value = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
}
