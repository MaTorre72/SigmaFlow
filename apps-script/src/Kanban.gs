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
    migrateToActivityLog: migrateToActivityLog,
    migrateVisiteFromHistory: migrateVisiteFromHistory,
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
  var jobs = loadJobsWithVisitSummary_();
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
    invoiced: coerceBoolean_(params.invoiced),
    notes: params.notes || '',
    card_color: normalizeCardColor_(params.card_color),
    checklist_json: normalizeChecklistJson_(params.checklist_json),
    correction_log_json: '[]'
  };

  // Evento automatico di creazione, stesso pattern dell'evento auto scritto
  // da moveJob: from null perche' non esiste una colonna di provenienza.
  // Senza questo, ogni nuova card nascerebbe con la Cronologia vuota anche
  // se arrival_ts e' gia' valorizzato correttamente sul campo strutturato.
  var creationEvent = {
    id: generateActivityEventId_(),
    ts: now,
    type: 'move',
    source: 'auto',
    to: targetColumn.id,
    from: null,
    note: ''
  };
  job.activity_log_json = serializeActivityLog_([creationEvent]);

  sheet.appendRow(jobToRow_(job));

  // Modello caso/visita: la visita 1 nasce con la card, stesso principio
  // del gate-setting in updateVisiteForMove_ applicato alla colonna di
  // destinazione iniziale — senza questo, un job creato direttamente in
  // WIP/TO DO/DONE non avrebbe alcuna riga 'visite' finche' non viene
  // spostato per la prima volta.
  var visiteSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (visiteSheet) {
    appendVisitRow_(visiteSheet, {
      job_id: job.job_id,
      numero_visita: 1,
      apertura_ts: now,
      incarico_ts: targetColumn.role === 'backlog' ? now : '',
      prep_ts: targetColumn.role === 'prep' ? now : '',
      start_ts: targetColumn.role === 'wip' ? now : '',
      consegna_ts: targetColumn.role === 'done' ? now : '',
      rientro_ts: '',
      rientro_da: '',
      t_cliente_d: 0,
      t_ente_d: 0,
      t_interno_d: 0,
      rework_cause: ''
    });
  }

  refreshCaseVisitCount_(ss, caseId);
  return ok_({ job_id: job.job_id, case_id: caseId, job: job });
}

function moveJob(params) {
  ensureCurrentSchema_();
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var row = findRowById_(sheet, 'job_id', requireParam_(params, 'job_id'));
  if (row < 0) {
    throw new Error('Job non trovato: ' + params.job_id);
  }

  var status = validateColumnId_(requireParam_(params, 'status'));
  var headers = getHeaderMap_(sheet);
  var now = nowIso_();
  var job = readJobFromRow_(sheet, row, headers);

  // Spostamento verso la colonna in cui la card si trova gia': nessun
  // cambiamento reale, quindi nessun evento in Cronologia (sarebbe solo
  // fuorviante, "X -> X" senza alcun significato) e nessun tocco a
  // gate/visite. Capita spesso quando la board non da' un feedback
  // visivo immediato del drag: l'utente rilascia la card piu' volte
  // pensando che non si sia spostata (segnalato da Marco in collaudo).
  if (normalizeStatus_(job.status) === status) {
    return ok_({ job_id: params.job_id, status: status, job: job });
  }

  var columns = readColumns_();
  var sourceColumn = findColumn_(columns, job.status) || { id: job.status, role: 'neutral' };
  var targetColumn = findColumn_(columns, status);

  // Il rientro da un'attesa o da completato verso WIP e' sempre vietato:
  // deve passare prima da TO DO/BACKLOG, che e' anche il punto in cui si
  // apre la nuova visita (sez. 2 di DESIGN_modello_caso_visita.md).
  var sourceClosesTowardActive = sourceColumn.role === 'stand_by' || sourceColumn.role === 'done';

  if (sourceClosesTowardActive && targetColumn.role === 'wip') {
    throw new Error('Il rientro diretto da una colonna di attesa o da completato a WIP non e consentito. Sposta prima il job in TO DO o in una colonna precedente.');
  }

  // Regola caso/visita (sez. 2): chiusura della visita aperta + apertura
  // della successiva su qualunque spostamento con provenienza stand_by/done
  // e destinazione backlog/prep. Uno spostamento tra due colonne di attesa
  // diverse, o l'ingresso in done, non apre/chiude nulla — vedi
  // updateVisiteForMove_ per gli accumulatori e consegna_ts.
  var closesVisit = sourceClosesTowardActive && (targetColumn.role === 'backlog' || targetColumn.role === 'prep');

  if (targetColumn.role === 'backlog' && !job.arrival_ts) {
    job.arrival_ts = now;
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
  if (closesVisit) {
    autoEvent.is_rework = true;
  }

  var rawLog = sheet.getRange(row, headers.activity_log_json).getValue();
  var log = parseActivityLog_(rawLog);

  // Modello caso/visita (Fase L2): start_ts/done_ts/incarico_ts/prep_ts/
  // visit_number/is_rework/rework_cause/service_time_d/lead_time_d/
  // wait_time_d non sono piu' salvati su jobs (rimossi in L5) — vivono
  // solo su 'visite'. Usa il log COSI' COM'E' PRIMA di appendere l'evento
  // di questo stesso spostamento: la ricerca dell'ingresso nella colonna
  // di attesa lasciata (sez. 4) deve guardare solo eventi realmente
  // precedenti a "now".
  updateVisiteForMove_(job, sourceColumn, targetColumn, closesVisit, log, now);

  log.push(autoEvent);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });
  sheet.getRange(row, headers.activity_log_json).setValue(serializeActivityLog_(log));

  return ok_({ job_id: params.job_id, status: status, job: job });
}

// Modello caso/visita (DESIGN_modello_caso_visita.md, sez. 2-4): aggiorna
// il foglio 'visite' in occasione di uno spostamento. Non tocca 'jobs'.
function updateVisiteForMove_(job, sourceColumn, targetColumn, closesVisit, log, now) {
  var visiteSheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (!visiteSheet) {
    // Non dovrebbe succedere dopo ensureCurrentSchema_() in testa a
    // moveJob: se succede comunque, non si blocca lo spostamento sulla
    // board per un problema di sola derivazione metriche.
    return;
  }

  var opened = ensureOpenVisit_(visiteSheet, job, now);
  var activeVisit = opened.visit;
  var activeRow = opened.row;

  // Sez. 4: gli accumulatori per tipo si incrementano ad ogni USCITA da
  // una colonna stand_by, qualunque sia la destinazione (un'altra attesa,
  // backlog/prep, o done) — quindi anche quando closesVisit e' false.
  if (sourceColumn.role === 'stand_by') {
    accumulateWaitTime_(activeVisit, sourceColumn, log, now);
  }

  if (closesVisit) {
    activeVisit.rientro_ts = now;
    activeVisit.rientro_da = sourceColumn.id;
    writeVisitToRow_(visiteSheet, activeRow, activeVisit);

    activeVisit = {
      job_id: job.job_id,
      numero_visita: Number(activeVisit.numero_visita || 1) + 1,
      apertura_ts: now,
      incarico_ts: '',
      prep_ts: '',
      start_ts: '',
      consegna_ts: '',
      rientro_ts: '',
      rientro_da: '',
      t_cliente_d: 0,
      t_ente_d: 0,
      t_interno_d: 0,
      rework_cause: sourceColumn.id
    };
    appendVisitRow_(visiteSheet, activeVisit);
    activeRow = visiteSheet.getLastRow();
  }

  // Stessa regola "prima volta" gia' in uso per i campi su jobs, applicata
  // qui alla visita attiva: essendo ogni visita una riga nuova, non serve
  // un reset esplicito come nella derivazione a runtime superata (il bug
  // descritto in BUGFIX_derivazione_gate_dal_log.md) — la visita nasce
  // gia' vuota.
  if (targetColumn.role === 'backlog' && !activeVisit.incarico_ts) {
    activeVisit.incarico_ts = now;
  }
  if (targetColumn.role === 'prep' && !activeVisit.prep_ts) {
    activeVisit.prep_ts = now;
  }
  if (targetColumn.role === 'wip' && !activeVisit.start_ts) {
    activeVisit.start_ts = now;
  }
  if (targetColumn.role === 'done' && !activeVisit.consegna_ts) {
    // Si valorizza al primo ingresso in done, entro questa visita: non
    // chiude la visita da sola (sez. 3), la card puo' ancora rientrare.
    activeVisit.consegna_ts = now;
  }

  writeVisitToRow_(visiteSheet, activeRow, activeVisit);
}

// Se non esiste ancora una visita aperta per questo caso (job creato
// prima della Fase L, o migrazione storica L5 non ancora eseguita), ne
// crea una minima al volo per non bloccare lo spostamento: la
// materializzazione storica di L5 e' autorevole e la sovrascrivera'.
function ensureOpenVisit_(visiteSheet, job, now) {
  var row = findOpenVisitRow_(visiteSheet, job.job_id);
  if (row > 0) {
    return { row: row, visit: readVisitFromRow_(visiteSheet, row) };
  }

  // Bootstrap raro (dopo L5 ogni job con un log dovrebbe gia' avere le
  // sue righe 'visite' dalla migrazione storica): senza altra
  // informazione (job non porta piu' i campi gate — rimossi in L5), si
  // assume visita 1.
  var visit = {
    job_id: job.job_id,
    numero_visita: 1,
    apertura_ts: job.arrival_ts || now,
    incarico_ts: '',
    prep_ts: '',
    start_ts: '',
    consegna_ts: '',
    rientro_ts: '',
    rientro_da: '',
    t_cliente_d: 0,
    t_ente_d: 0,
    t_interno_d: 0,
    rework_cause: ''
  };
  appendVisitRow_(visiteSheet, visit);
  return { row: visiteSheet.getLastRow(), visit: visit };
}

function findOpenVisitRow_(sheet, jobId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { return -1; }
  var headers = getHeaderMap_(sheet);
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][headers.job_id - 1] === jobId && !values[i][headers.rientro_ts - 1]) {
      return i + 2;
    }
  }
  return -1;
}

function readVisitFromRow_(sheet, row) {
  var headers = getHeaderMap_(sheet);
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var visit = {};
  Object.keys(headers).forEach(function(header) {
    visit[header] = normalizeCell_(values[headers[header] - 1]);
  });
  return visit;
}

function writeVisitToRow_(sheet, row, visit) {
  var values = VISITE_HEADERS.map(function(header) {
    return visit[header] === undefined ? '' : visit[header];
  });
  sheet.getRange(row, 1, 1, VISITE_HEADERS.length).setValues([values]);
}

function appendVisitRow_(sheet, visit) {
  sheet.appendRow(VISITE_HEADERS.map(function(header) {
    return visit[header] === undefined ? '' : visit[header];
  }));
}

// Fase L5 parte 2/2: visit_number/is_rework/rework_cause/start_ts/
// done_ts non sono piu' salvati su jobs (rimossi, sez. 9.1 — duplicati
// con 'visite'). getBoard() e getMetrics() li ricalcolano qui al volo
// dalla visita PIU' RECENTE del caso (MAX(numero_visita)), cosi':
// - il frontend continua a funzionare senza modifiche (badge R1/R2,
//   indicatore "fermo da N giorni", storico rientri in client.html);
// - pointsStatistics_/monthBuckets_ (Model.gs) — che restano
//   esplicitamente su jobs per L4 — hanno ancora un done_ts per calcolare
//   punti completati e timeline.
function loadJobsWithVisitSummary_() {
  var ss = getSpreadsheet_();
  var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  var visite = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE));

  var latestByJob = {};
  visite.forEach(function(visit) {
    var existing = latestByJob[visit.job_id];
    if (!existing || Number(visit.numero_visita || 1) > Number(existing.numero_visita || 1)) {
      latestByJob[visit.job_id] = visit;
    }
  });

  jobs.forEach(function(job) {
    var latest = latestByJob[job.job_id];
    job.visit_number = latest ? Number(latest.numero_visita || 1) : 1;
    job.is_rework = job.visit_number > 1;
    job.rework_cause = latest ? (latest.rework_cause || '') : '';
    job.start_ts = latest ? (latest.start_ts || '') : '';
    job.done_ts = latest ? (latest.consegna_ts || '') : '';
  });

  return jobs;
}

// Sez. 4: durata della permanenza appena conclusa nella colonna stand_by
// che si sta lasciando, sommata all'accumulatore per tipo corrispondente.
// L'ingresso in quella colonna si trova ripercorrendo il log all'indietro
// (stesso principio di computeFrom_ in ActivityLog.gs, qui applicato alla
// colonna specifica invece che "l'ultimo move in assoluto").
function accumulateWaitTime_(visit, sourceColumn, log, now) {
  var field = SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS[sourceColumn.id];
  if (!field) { return; }
  var enteredTs = lastEntryTsForColumn_(log, sourceColumn.id, now);
  if (!enteredTs) { return; }
  visit[field] = Number(visit[field] || 0) + Number(diffDays(enteredTs, now) || 0);
}

function lastEntryTsForColumn_(log, columnId, beforeTs) {
  var candidates = log.filter(function(event) {
    return event.type === 'move' && event.to === columnId && compareTs_(event.ts, beforeTs) < 0;
  });
  if (!candidates.length) { return null; }
  var latest = candidates.reduce(function(best, event) {
    return (!best || compareTs_(event.ts, best.ts) > 0) ? event : best;
  }, null);
  return latest.ts;
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
    // La casella "Chiuso" (ex "Fatturato", nome cambiato su richiesta di
    // Marco) attiva/svuota incarico_chiuso_ts alla spunta — il campo
    // manuale di chiusura definitiva dell'incarico gia' presente in
    // schema dalla Fase L1 (DESIGN_modello_caso_visita.md, sez. 3),
    // indipendente da qualunque movimento sulla board.
    var newInvoiced = coerceBoolean_(params.invoiced);
    if (newInvoiced !== coerceBoolean_(job.invoiced)) {
      job.incarico_chiuso_ts = newInvoiced ? nowIso_() : '';
    }
    job.invoiced = newInvoiced;
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
    source: 'manual'
  };
  candidate.from = computeFromForCandidate_(log, candidate);
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

  log.push(candidate);
  log.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  // I campi strutturati (arrival_ts/incarico_ts/prep_ts/start_ts/done_ts)
  // sono una cache derivata dal log, non uno stato indipendente: si
  // allineano sempre in automatico al valore suggerito dall'evento appena
  // registrato, senza chiedere conferma all'utente. I dettagli di questi
  // campi restano interni: l'utente cura solo la cronologia.
  applyStructuralAlignment_(job, checkStructuralAlignment_(job, candidate));

  job.activity_log_json = serializeActivityLog_(log);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ ok: true, job_id: jobId, event: candidate });
}

function applyStructuralAlignment_(job, warnings) {
  warnings.forEach(function(warning) {
    if (JOB_HEADERS.indexOf(warning.field) !== -1) {
      job[warning.field] = warning.suggestedValue;
    }
  });
  alignOpenVisitFields_(job, warnings);
}

// Fase L3 (DESIGN_modello_caso_visita.md, sez. 11): le correzioni manuali
// dell'utente in Cronologia (addActivityEvent/updateActivityEvent/
// deleteActivityEvent) e il ricalcolo durante la migrazione Fase F
// (migrateSingleJobActivityLog_, unico altro chiamante di
// applyStructuralAlignment_) allineano lo stesso campo anche sulla
// visita APERTA corrente del caso — non quella a cui l'evento corretto
// apparteneva storicamente: identificarla con precisione, per un evento
// che puo' risalire a una visita gia' chiusa da tempo, e' compito della
// migrazione storica autorevole di L5, non di questo allineamento live.
var JOB_FIELD_TO_VISIT_FIELD_ = {
  incarico_ts: 'incarico_ts',
  prep_ts: 'prep_ts',
  start_ts: 'start_ts',
  done_ts: 'consegna_ts'
};

function alignOpenVisitFields_(job, warnings) {
  var visitWarnings = warnings.filter(function(warning) {
    return JOB_FIELD_TO_VISIT_FIELD_[warning.field] !== undefined;
  });
  if (!visitWarnings.length) {
    return;
  }

  var visiteSheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (!visiteSheet) {
    return;
  }

  var opened = ensureOpenVisit_(visiteSheet, job, nowIso_());
  var visit = opened.visit;
  visitWarnings.forEach(function(warning) {
    visit[JOB_FIELD_TO_VISIT_FIELD_[warning.field]] = warning.suggestedValue;
  });
  writeVisitToRow_(visiteSheet, opened.row, visit);
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
  var recalculated = recalculateMoveFrom_(log);

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
  // Qualunque evento e' correggibile, auto o manuale: il diario deve poter
  // essere reso corretto e coerente dall'utente. La cancellazione resta
  // invece bloccata per gli eventi auto (vedi deleteActivityEvent) perche'
  // cancellare cancella un pezzo di storia reale, mentre correggerne la
  // data la rende semplicemente piu' accurata.

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

  remaining.push(candidate);
  remaining.sort(function(a, b) { return compareTs_(a.ts, b.ts); });

  applyStructuralAlignment_(job, checkStructuralAlignment_(job, candidate));

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
  var recalculated = recalculateMoveFrom_(remaining);

  // La cancellazione puo' rendere l'ultimo campo strutturato alimentato
  // dall'evento cancellato non piu' rappresentativo: si riallinea in
  // automatico all'evento move piu' recente rimasto, con lo stesso
  // meccanismo (silenzioso) usato per l'aggiunta/modifica di un evento.
  var moves = recalculated.filter(function(event) { return event.type === 'move'; });
  var lastMove = moves.length ? moves[moves.length - 1] : null;
  if (lastMove) {
    applyStructuralAlignment_(job, checkStructuralAlignment_(job, lastMove));
  }

  job.activity_log_json = serializeActivityLog_(recalculated);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ job_id: jobId, event_id: eventId });
}

// Non piu' esposta via routeAction_/UI: le correzioni utente passano
// dall'evento "Correzione" in Cronologia (addActivityEvent), che scrive
// su activity_log_json invece che su un log separato. Questa funzione
// resta solo per uso interno di test (testAddJobWithPastArrival_), che
// deve spostare arrival_ts nel passato senza generare un evento visibile
// nel diario.
// Fase L5 parte 2/2: start_ts/done_ts non sono piu' campi di jobs
// (rimossi, vivono solo su 'visite') — questa funzione di supporto ai
// test ne correggeva anche loro, ora corregge solo arrival_ts (unico
// campo rimasto in JOB_HEADERS che questa funzione tocca), il suo unico
// uso reale (testAddJobWithPastArrival_).
function correctJobTimestamps(params) {
  var sheet = getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS);
  var jobId = requireParam_(params, 'job_id');
  var reason = String(params.reason || '').trim();
  if (!reason) {
    throw new Error('Il motivo della correzione e obbligatorio');
  }

  var newArrival = params.arrival_ts;
  if (newArrival === undefined || newArrival === '') {
    throw new Error('Specificare arrival_ts');
  }
  if (!isValidIso8601_(newArrival)) {
    throw new Error('Formato data non valido per arrival_ts: ' + newArrival);
  }

  var row = findRowById_(sheet, 'job_id', jobId);
  if (row < 0) {
    throw new Error('Job non trovato: ' + jobId);
  }

  var headers = getHeaderMap_(sheet);
  var job = readJobFromRow_(sheet, row, headers);
  var log = parseJsonArray_(job.correction_log_json);
  var correctionTs = nowIso_();

  log.push({ ts: correctionTs, field: 'arrival_ts', old: job.arrival_ts || '', new: newArrival, reason: reason });
  job.arrival_ts = newArrival;

  job.correction_log_json = JSON.stringify(log);
  writeJobToRow_(sheet, row, headers, job);

  return ok_({ job_id: jobId, corrections_applied: 1, job: job });
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
