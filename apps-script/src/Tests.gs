var SIGMAFLOW_TEST_PROP_SPREADSHEET_ID = 'SIGMAFLOW_TEST_SPREADSHEET_ID';

function seedTestData(params) {
  params = params || {};
  if (normalizeEnv_(params.env) !== 'test') {
    throw new Error('La generazione dei dati dimostrativi e consentita solo in ambiente TEST.');
  }
  return ok_(seedTestDataset_(getSpreadsheet_(), coerceBoolean_(params.replace)));
}

function generateTestDataset() {
  return withTestSpreadsheet_(function(ss) {
    return seedTestDataset_(ss, true);
  });
}

function seedTestDataset_(ss, replace) {
  if (replace) { resetTestDatabase_(ss); }
  var jobsSheet = ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  var casesSheet = ensureSheet_(ss, SIGMAFLOW.SHEETS.CASES, CASE_HEADERS);
  var sizes = ['XS', 'S', 'M', 'L', 'XL'];
  var assignees = ['Alessandra', 'Giovanni D', 'Marco', 'Altro'];
  var tags = ['AIA', 'VIA', 'rifiuti', 'acque', 'aria', 'suolo'];
  var statuses = ['backlog', 'backlog', 'todo', 'todo', 'wip', 'wip', 'wip', 'wait_client', 'wait_authority', 'wait_internal', 'done', 'done', 'done', 'done'];
  var colors = SIGMAFLOW.CARD_COLORS;
  var jobRows = [];
  var caseRows = [];
  var now = new Date();

  for (var i = 0; i < 60; i++) {
    var size = sizes[(i * 3 + Math.floor(i / 7)) % sizes.length];
    var status = statuses[(i * 5 + Math.floor(i / 9)) % statuses.length];
    var arrivalDays = 4 + ((i * 11) % 176);
    var impact = 1 + (i % 4);
    var manageability = 1 + ((i * 3) % 4);
    var priority = priorityFields_({ impact: impact, manageability: manageability });
    var visit = i % 8 === 0 ? 2 : 1;
    var arrival = testIsoDaysAgo_(now, arrivalDays);
    var started = ['todo', 'wip', 'wait_client', 'wait_authority', 'wait_internal', 'done'].indexOf(status) >= 0
      ? testIsoDaysAgo_(now, Math.max(0, arrivalDays - (1 + i % 5))) : '';
    var done = status === 'done' ? testIsoDaysAgo_(now, Math.max(0, arrivalDays - (3 + i % 12))) : '';
    var caseId = 'CASE-DEMO-' + String(i + 1);
    var jobId = 'JOB-DEMO-' + String(i + 1);
    var service = done ? diffDays(started, done) : '';
    var lead = done ? diffDays(arrival, done) : '';
    var wait = started ? diffDays(arrival, started) : '';
    var job = {
      job_id: jobId,
      case_id: caseId,
      visit_number: visit,
      title: 'Pratica dimostrativa ' + String(i + 1),
      client: 'Cliente ' + String(1 + i % 12),
      status: status,
      assignee: assignees[i % assignees.length],
      tag: tags[(i * 2 + 1) % tags.length],
      size_class: size,
      size_points: SIGMAFLOW.SIZE_POINTS[size],
      priority_class: priority.priority_class,
      priority_class_manual: false,
      impact: impact,
      manageability: manageability,
      priority_score: priority.priority_score,
      description: i % 3 === 0 ? 'Attivita con note operative e dipendenze esterne.' : '',
      due_date: testDateDaysFromNow_(now, (i % 35) - 12),
      arrival_ts: arrival,
      start_ts: started,
      done_ts: done,
      invoiced: status === 'done' && i % 3 === 0,
      service_time_d: service,
      lead_time_d: lead,
      wait_time_d: wait,
      is_rework: visit > 1,
      rework_cause: visit > 1 ? ['wait_client', 'wait_authority', 'wait_internal'][i % 3] : '',
      notes: '',
      card_color: colors[(i % (colors.length - 1)) + 1]
    };
    jobRows.push(jobToRow_(job));
    caseRows.push([caseId, job.title, job.client, visit, status !== 'done', arrival, done]);
  }

  jobsSheet.getRange(jobsSheet.getLastRow() + 1, 1, jobRows.length, JOB_HEADERS.length).setValues(jobRows);
  casesSheet.getRange(casesSheet.getLastRow() + 1, 1, caseRows.length, CASE_HEADERS.length).setValues(caseRows);
  return { jobs: jobRows.length, cases: caseRows.length, replace: replace };
}

function testIsoDaysAgo_(now, days) {
  return Utilities.formatDate(new Date(now.getTime() - days * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// Timestamp saldamente nel passato per i test sull'activity log: evita che
// un evento risulti "nel futuro" per il tempo reale trascorso tra le
// chiamate durante l'esecuzione dei test.
function testTsMinutesAgo_(minutesAgo) {
  return Utilities.formatDate(new Date(Date.now() - minutesAgo * 60000), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// I job nascono con arrival_ts = adesso: per testare eventi nel passato
// senza scatenare il warning strutturale legittimo su arrival_ts, la
// spostiamo indietro (180 min fa) subito dopo la creazione.
function testAddJobWithPastArrival_(params) {
  var created = addJob(params).data;
  var correction = correctJobTimestamps({
    job_id: created.job_id,
    arrival_ts: testTsMinutesAgo_(180),
    reason: 'setup test'
  });
  if (!correction.success) {
    throw new Error('setup correctJobTimestamps fallita: ' + correction.error);
  }
  return created.job_id;
}

function testDateDaysFromNow_(now, days) {
  return Utilities.formatDate(new Date(now.getTime() + days * 864e5), SIGMAFLOW.TZ, 'yyyy-MM-dd');
}

function configureTestEnvironment() {
  PropertiesService.getScriptProperties().setProperty(
    SIGMAFLOW_TEST_PROP_SPREADSHEET_ID,
    SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID
  );

  return {
    success: true,
    property: SIGMAFLOW_TEST_PROP_SPREADSHEET_ID,
    spreadsheetId: SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID,
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID
  };
}

function runAllTestsAndLog() {
  var result = runAllTests();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function runAllTests() {
  var results = [];
  var tests = [
    testSetupSchema,
    testAddJob,
    testMoveJobLifecycle,
    testMarkRework,
    testAutomaticReworkFromStandBy,
    testStandByCannotReturnDirectlyToWip,
    testPriorityHelpers,
    testPriorityUpdate,
    testCardColor,
    testAmbassadorAndChecklist,
    testEditableOptions,
    testDynamicColumnsAndOptions,
    testMetrics,
    testSystemStateInsufficientData,
    testDataQualityThresholds,
    testSystemStateSeparatesFlowFromTimeSamples,
    testSystemStateWorkload,
    testMissingRequiredParam,
    testAddActivityEventMoveValido,
    testAddActivityEventTsFuturo,
    testAddActivityEventColonnaNonTrovata,
    testAddActivityEventReasonObbligatoria,
    testAddActivityEventSequenceWarningsSenzaForce,
    testAddActivityEventSequenceWarningsConForce,
    testAddActivityEventStructuralWarningsSenzaAlign,
    testAddActivityEventStructuralWarningsConAlign,
    testAddActivityEventNotaValida,
    testUpdateActivityEventManual,
    testUpdateActivityEventBloccoAuto,
    testDeleteActivityEventManual,
    testDeleteActivityEventBloccoAuto,
    testGetActivityLogOrdinato,
    testGetActivityLogFromRicalcolato,
    testMoveJobScriveEventoAuto,
    testMigrateToActivityLogChecklist,
    testReworkFromStandByToBacklogKeepsStartTs,
    testMoveToPrepSetsPrepTsNotStartTs,
    testMoveToWipStillSetsStartTs,
    testMoveToBacklogSetsIncaricoTs
  ];

  tests.forEach(function(testFn) {
    results.push(runSingleTest_(testFn));
  });

  var failed = results.filter(function(result) {
    return !result.passed;
  });

  return {
    success: failed.length === 0,
    passed: results.length - failed.length,
    failed: failed.length,
    results: results
  };
}

function testSetupSchema() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS), JOB_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.CASES), CASE_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG), CONFIG_HEADERS);
  });
}

function testAddJob() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);

    var response = addJob({
      title: 'Test job',
      assignee: 'tester@sigmapiu.it',
      tag: 'test',
      size_class: 'S'
    });

    assertTrue_(response.success, 'addJob dovrebbe riuscire');
    assertTrue_(response.data.job_id.indexOf('JOB-') === 0, 'job_id dovrebbe iniziare con JOB-');
    assertTrue_(response.data.case_id.indexOf('CASE-') === 0, 'case_id dovrebbe iniziare con CASE-');

    var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(1, jobs.length, 'jobs dovrebbe contenere una riga');
    assertEquals_('backlog', jobs[0].status, 'status iniziale');
    assertEquals_(5, Number(jobs[0].size_points), 'size_points S');
    assertEquals_('p4_assess', jobs[0].priority_class, 'priority_class default');

    var cases = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.CASES));
    assertEquals_(1, cases.length, 'cases dovrebbe contenere una riga');
    assertEquals_(1, Number(cases[0].total_visits), 'total_visits caso');
  });
}

function testMoveJobLifecycle() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Lifecycle job', size_class: 'M' }).data;

    var progress = moveJob({ job_id: created.job_id, status: 'wip' });
    assertTrue_(progress.success, 'moveJob wip dovrebbe riuscire');

    var afterProgress = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('wip', afterProgress.status, 'status wip');
    assertTrue_(Boolean(afterProgress.start_ts), 'start_ts valorizzato');

    Utilities.sleep(1000);
    var done = moveJob({ job_id: created.job_id, status: 'done' });
    assertTrue_(done.success, 'moveJob done dovrebbe riuscire');

    var afterDone = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('done', afterDone.status, 'status done');
    assertTrue_(Boolean(afterDone.done_ts), 'done_ts valorizzato');
    assertTrue_(Number(afterDone.lead_time_d) >= 0, 'lead_time_d numerico');
    assertTrue_(Number(afterDone.wait_time_d) >= 0, 'wait_time_d numerico');
  });
}

function testMarkRework() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rework source', size_class: 'L' }).data;
    moveJob({ job_id: created.job_id, status: 'done' });

    var rework = markRework({
      job_id: created.job_id,
      rework_cause: 'client_request',
      size_class: 'S'
    });

    assertTrue_(rework.success, 'markRework dovrebbe riuscire');

    var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(2, jobs.length, 'dovrebbero esserci due job');

    var second = jobs.filter(function(job) {
      return job.job_id === rework.data.job_id;
    })[0];

    assertEquals_(2, Number(second.visit_number), 'visit_number rework');
    assertTrue_(coerceBoolean_(second.is_rework), 'is_rework TRUE');
    assertEquals_('client_request', second.rework_cause, 'causa rework');
  });
}

function testAutomaticReworkFromStandBy() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Stand-by rework', size_class: 'M' }).data;

    moveJob({ job_id: created.job_id, status: 'wip' });
    var beforeReturn = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    var startTsBeforeReturn = beforeReturn.start_ts;

    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(returned.success, 'moveJob da stand_by dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('todo', job.status, 'status dopo ritorno da stand_by');
    assertEquals_(2, Number(job.visit_number), 'visit_number automatico');
    assertTrue_(coerceBoolean_(job.is_rework), 'is_rework automatico');
    assertEquals_('wait_client', job.rework_cause, 'causa rework automatica');
    assertEquals_(startTsBeforeReturn, job.start_ts, 'start_ts non deve essere ringiovanito da un rientro in TO DO (prep)');
  });
}

function testReworkFromStandByToBacklogKeepsStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Stand-by rework verso backlog', size_class: 'M' }).data;

    moveJob({ job_id: created.job_id, status: 'wip' });
    var beforeReturn = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    var startTsBeforeReturn = beforeReturn.start_ts;

    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'backlog' });

    assertTrue_(returned.success, 'moveJob da stand_by a backlog dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('backlog', job.status, 'status dopo ritorno da stand_by a backlog');
    assertEquals_(2, Number(job.visit_number), 'visit_number automatico');
    assertTrue_(coerceBoolean_(job.is_rework), 'is_rework automatico');
    assertEquals_('wait_client', job.rework_cause, 'causa rework automatica');
    assertEquals_(startTsBeforeReturn, job.start_ts, 'start_ts non deve essere ringiovanito da un rientro in BACKLOG');
  });
}

function testMoveToPrepSetsPrepTsNotStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in preparazione', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'todo' });
    assertTrue_(moved.success, 'moveJob verso todo (prep) dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertTrue_(Boolean(job.prep_ts), 'prep_ts valorizzato all\'ingresso in TO DO');
    assertTrue_(!job.start_ts, 'start_ts NON deve valorizzarsi all\'ingresso in TO DO (prep)');
  });
}

function testMoveToWipStillSetsStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in lavorazione', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'wip' });
    assertTrue_(moved.success, 'moveJob verso wip dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertTrue_(Boolean(job.start_ts), 'start_ts valorizzato all\'ingresso in WIP (non-regressione)');
  });
}

function testMoveToBacklogSetsIncaricoTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in backlog', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'backlog' });
    assertTrue_(moved.success, 'moveJob verso backlog dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertTrue_(Boolean(job.incarico_ts), 'incarico_ts valorizzato all\'ingresso in BACKLOG');
  });
}

function testPriorityHelpers() {
  assertEquals_(1, calcPriorityScore(1, 1), 'score 1x1');
  assertEquals_('p4_assess', suggestPriorityClass(1), 'classe non urgente');
  assertEquals_('p4_assess', suggestPriorityClass(1.99), 'non urgente fino a 2');
  assertEquals_(2, calcPriorityScore(2, 2), 'score 2x2');
  assertEquals_('p1_plan', suggestPriorityClass(2), 'classe da pianificare');
  assertEquals_('p1_plan', suggestPriorityClass(2.99), 'da pianificare fino a 3');
  assertEquals_('p2_urgent', suggestPriorityClass(3), 'urgente con margine da 3');
  assertEquals_(3.46, calcPriorityScore(3, 4), 'score 3x4');
  assertEquals_('p2_urgent', suggestPriorityClass(3.46), 'classe urgente con margine');
  assertEquals_('p2_urgent', suggestPriorityClass(3.99), 'urgente con margine fino a 4');
  assertEquals_(4, calcPriorityScore(4, 4), 'score 4x4');
  assertEquals_('p3_critical', suggestPriorityClass(4), 'classe urgente');
}

function testStandByCannotReturnDirectlyToWip() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro vietato', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    var failed = false;
    try {
      moveJob({ job_id: created.job_id, status: 'wip' });
    } catch (err) {
      failed = err.message.indexOf('non e consentito') !== -1;
    }
    assertTrue_(failed, 'rientro diretto da attesa a WIP dovrebbe fallire');
  });
}

function testPriorityUpdate() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Priorita automatica', impact: 4, manageability: 4 }).data;
    assertEquals_('p3_critical', created.job.priority_class, 'priorita automatica iniziale');

    var manual = updateJob({ job_id: created.job_id, priority_class: 'p1_plan' });
    assertEquals_('p1_plan', manual.data.job.priority_class, 'priorita manuale');

    var automatic = updateJob({ job_id: created.job_id, priority_class: '', impact: 2, manageability: 2 });
    assertEquals_('p1_plan', automatic.data.job.priority_class, 'ritorno a priorita automatica');
    assertTrue_(!coerceBoolean_(automatic.data.job.priority_class_manual), 'flag manuale disattivato');
  });
}

function testCardColor() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Card colorata', card_color: '#DDEBF7' }).data;
    assertEquals_('#DDEBF7', created.job.card_color, 'colore in creazione');
    var updated = updateJob({ job_id: created.job_id, card_color: '#E2F0D9' });
    assertEquals_('#E2F0D9', updated.data.job.card_color, 'colore aggiornato');
  });
}

function testAmbassadorAndChecklist() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    updateOptionList({ kind: 'ambassadors', operation: 'add', value: 'Referente Cliente' });
    var created = addJob({
      title: 'Progetto con referente',
      client: 'Cliente prova',
      ambassador: 'Referente Cliente',
      checklist_json: JSON.stringify([{ text: 'Controllo documenti', done: false }])
    }).data;
    assertEquals_('Referente Cliente', created.job.ambassador, 'ambasciatore in creazione');
    var updated = updateJob({
      job_id: created.job_id,
      checklist_json: JSON.stringify([{ text: 'Controllo documenti', done: true }])
    });
    var checklist = JSON.parse(updated.data.job.checklist_json);
    assertTrue_(checklist[0].done, 'checklist completata');
    assertTrue_(getBoard().data.options.ambassadors.indexOf('Referente Cliente') !== -1, 'ambasciatore nel menu');
  });
}

function testEditableOptions() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var added = updateOptionList({ kind: 'assignees', operation: 'add', value: 'Nuovo nome' });
    assertEquals_('Nuovo nome', added.data.values[added.data.values.length - 1], 'nuovo valore in coda');
    var moved = updateOptionList({ kind: 'assignees', operation: 'move', value: 'Nuovo nome', direction: 'up' });
    assertTrue_(moved.data.values.indexOf('Nuovo nome') < added.data.values.indexOf('Nuovo nome'), 'ordine manuale');
    var removed = updateOptionList({ kind: 'assignees', operation: 'remove', value: 'Nuovo nome' });
    assertTrue_(removed.data.values.indexOf('Nuovo nome') === -1, 'valore non usato eliminato');

    updateOptionList({ kind: 'assignees', operation: 'add', value: 'Nome in uso' });
    addJob({ title: 'Card assegnata', assignee: 'Nome in uso' });
    var failed = false;
    try {
      updateOptionList({ kind: 'assignees', operation: 'remove', value: 'Nome in uso' });
    } catch (err) {
      failed = err.message.indexOf('non può essere rimossa') !== -1;
    }
    assertTrue_(failed, 'valore usato non eliminabile');
  });
}

function testDynamicColumnsAndOptions() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);

    var added = addColumn({ label: 'Attesa cliente', role: 'stand_by' });
    assertTrue_(added.success, 'addColumn dovrebbe riuscire');
    assertEquals_('stand_by', added.data.column.role, 'ruolo nuova colonna');

    var inserted = addColumn({ label: 'Inserita', role: 'neutral', after_status: 'backlog' });
    var insertedColumns = inserted.data.columns;
    var insertedIndex = insertedColumns.map(function(item) { return item.id; }).indexOf(inserted.data.column.id);
    assertEquals_('backlog', insertedColumns[insertedIndex - 1].id, 'posizione nuova colonna');

    var moved = moveColumn({ status: added.data.column.id, direction: 'left' });
    assertTrue_(moved.success, 'moveColumn dovrebbe riuscire');

    var renamed = updateColumn({
      status: added.data.column.id,
      label: 'Attesa esterna',
      role: 'stand_by'
    });
    assertTrue_(renamed.success, 'updateColumn dovrebbe riuscire');

    var created = addJob({
      title: 'Dropdown job',
      status: added.data.column.id,
      assignee: 'anna@sigmapiu.it',
      tag: 'permessi',
      size_class: 'XS'
    }).data;
    assertTrue_(created.job_id.indexOf('JOB-') === 0, 'job creato nella nuova colonna');

    var board = getBoard();
    var column = board.data.column_meta.filter(function(item) {
      return item.status === added.data.column.id;
    })[0];
    assertEquals_('Attesa esterna', column.label, 'nome colonna aggiornato');
    assertEquals_(3, Number(column.points), 'somma punti colonna');
    assertTrue_(board.data.options.assignees.indexOf('anna@sigmapiu.it') !== -1, 'assegnatario in dropdown');
    assertTrue_(board.data.options.tags.indexOf('permessi') !== -1, 'tag in dropdown');
  });
}

function testMetrics() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    appendCompletedJob_(ss, {
      title: 'Metric S',
      size_class: 'S',
      service_time_d: 2,
      lead_time_d: 6,
      wait_time_d: 4,
      visit_number: 1,
      is_rework: false
    });
    appendCompletedJob_(ss, {
      title: 'Metric rework',
      size_class: 'M',
      service_time_d: 4,
      lead_time_d: 10,
      wait_time_d: 6,
      visit_number: 2,
      is_rework: true,
      rework_cause: 'internal_review'
    });

    var metrics = getMetrics();
    assertTrue_(metrics.success, 'getMetrics dovrebbe riuscire');
    assertEquals_(2, metrics.data.n_jobs_observed, 'n_jobs_observed');
    assertTrue_(metrics.data.E_S > 0, 'E_S positivo');
    assertTrue_(metrics.data.rework.p1 > 0, 'p1 rework positivo');
    assertTrue_(metrics.data.stability.system_state, 'system_state valorizzato');
    assertTrue_(metrics.data.systemState, 'systemState valorizzato');
    assertEquals_('low', metrics.data.systemState.dataQuality.level, 'qualita dati bassa');
  });
}

function testSystemStateInsufficientData() {
  var now = new Date();
  var state = buildSystemState_([{
    job_id: 'JOB-TEST-1',
    case_id: 'CASE-TEST-1',
    status: 'backlog',
    arrival_ts: nowIso_(),
    visit_number: 1
  }], SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_('low', state.dataQuality.level, 'qualita dati insufficiente');
  assertEquals_('unknown', state.systemStatus.code, 'stato non stimabile');
  assertEquals_(null, state.capacityMetrics.effective_load, 'carico non stimabile');
  assertEquals_(null, state.timeMetrics.average_service_days, 'tempo medio non stimabile');
  assertEquals_(null, buildSystemState_([], SIGMAFLOW.DEFAULT_CONFIG, now).reworkMetrics.initiatives_with_rework, 'rientri non stimabili senza iniziative');
}

function testDataQualityThresholds() {
  assertEquals_('low', dataQuality_(9, 5).level, 'qualita bassa sotto 10');
  assertEquals_('medium', dataQuality_(10, 5).level, 'qualita media da 10');
  assertEquals_('medium', dataQuality_(30, 5).level, 'qualita media fino a 30');
  assertEquals_('good', dataQuality_(31, 5).level, 'qualita buona oltre 30');
}

function testSystemStateSeparatesFlowFromTimeSamples() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 2 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [{
    job_id: 'JOB-DONE-NO-TIME',
    case_id: 'CASE-DONE-NO-TIME',
    status: 'done',
    arrival_ts: arrival,
    done_ts: nowIso_(),
    visit_number: 1
  }];

  var state = buildSystemState_(jobs, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_(1, state.flowMetrics.completed_initiatives, 'uscite conteggiate anche senza tempo valido');
  assertEquals_(0, state.timeMetrics.completed_samples, 'campioni tempo esclusi se mancanti');
  assertEquals_(null, state.capacityMetrics.effective_per_day, 'capacita non stimabile senza tempi');
}

function testSystemStateWorkload() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 2 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [];
  for (var i = 0; i < 5; i++) {
    jobs.push({
      job_id: 'JOB-DONE-' + i,
      case_id: 'CASE-DONE-' + i,
      status: 'done',
      arrival_ts: arrival,
      done_ts: nowIso_(),
      service_time_d: 2,
      visit_number: i === 0 ? 2 : 1,
      invoiced: false
    });
  }
  jobs.push({ job_id: 'READY', case_id: 'READY', status: 'backlog', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'PREP', case_id: 'PREP', status: 'todo', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'WIP', case_id: 'WIP', status: 'wip', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'WAIT', case_id: 'WAIT', status: 'wait_client', arrival_ts: arrival, visit_number: 1 });

  var config = Object.assign({}, SIGMAFLOW.DEFAULT_CONFIG, {
    columns_json: JSON.stringify(SIGMAFLOW.DEFAULT_COLUMNS),
    observation_window_days: 30,
    team_size: 4
  });
  var state = buildSystemState_(jobs, config, now);

  assertEquals_(1, state.workloadMetrics.ready, 'lavoro pronto');
  assertEquals_(1, state.workloadMetrics.preparing, 'lavoro in preparazione');
  assertEquals_(1, state.workloadMetrics.in_progress, 'lavoro in corso');
  assertEquals_(5, state.workloadMetrics.can_return, 'lavoro che puo rientrare');
  assertEquals_(1, state.workloadMetrics.waiting_client, 'attesa cliente');
  assertTrue_(state.capacityMetrics.effective_per_day > 0, 'capacita effettiva stimata');
  assertTrue_(state.reworkMetrics.average_passages_per_initiative > 1, 'passaggi medi con rientro');
  assertTrue_(state.pointsMetrics.completed_points > 0, 'punti completati');
  assertEquals_(40, state.pointsMetrics.completed_points, 'fallback punti M per job legacy');
  assertEquals_(6, state.pointsMetrics.timeline.length, 'sei mesi nel grafico');
  assertTrue_(!state.scenarioReadiness.active, 'simulazione scenari non attiva');
  assertEquals_(3, Object.keys(state.scenarioReadiness.scenarios).length, 'tre scenari predisposti');
}

function testMissingRequiredParam() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);

    var failed = false;
    try {
      addJob({ size_class: 'S' });
    } catch (err) {
      failed = err.message.indexOf('Parametro mancante: title') !== -1;
    }

    assertTrue_(failed, 'addJob senza title dovrebbe fallire');
  });
}

// --- Fase G: suite completa activity log (17 nuovi test) ---

function testAddActivityEventMoveValido() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Evento move valido', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var ts = testTsMinutesAgo_(60);

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: ts, to: wipCol.id, align_fields: { start_ts: ts } });

    assertTrue_(result.success, 'addActivityEvent move dovrebbe riuscire');
    assertTrue_(result.data.ok === true, 'evento move valido: ok true');
    assertEquals_('move', result.data.event.type, 'type move');
    assertEquals_(wipCol.id, result.data.event.to, 'to corretto');
  });
}

function testAddActivityEventTsFuturo() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Evento ts futuro', size_class: 'M' });
    var future = Utilities.formatDate(new Date(Date.now() + 365 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

    var result = addActivityEvent({ job_id: jobId, type: 'note', ts: future, note: 'x' });

    assertTrue_(result.data.ok === false, 'ts nel futuro: ok false');
    assertTrue_(result.data.hardErrors.indexOf('TS_IN_FUTURO') !== -1, 'hardErrors contiene TS_IN_FUTURO');
  });
}

function testAddActivityEventColonnaNonTrovata() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Colonna inesistente', size_class: 'M' });

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: testTsMinutesAgo_(60), to: 'colonna_che_non_esiste' });

    assertTrue_(result.data.ok === false, 'colonna non trovata: ok false');
    assertTrue_(result.data.hardErrors.indexOf('COLONNA_NON_TROVATA') !== -1, 'hardErrors contiene COLONNA_NON_TROVATA');
  });
}

function testAddActivityEventReasonObbligatoria() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Reason obbligatoria', size_class: 'M' });

    var result = addActivityEvent({ job_id: jobId, type: 'correction', ts: testTsMinutesAgo_(60), field: 'arrival_ts', old: '', new: testTsMinutesAgo_(90) });

    assertTrue_(result.data.ok === false, 'reason vuota: ok false');
    assertTrue_(result.data.hardErrors.indexOf('REASON_OBBLIGATORIA') !== -1, 'hardErrors contiene REASON_OBBLIGATORIA');
  });
}

function testAddActivityEventSequenceWarningsSenzaForce() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Sequence warning senza force', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var t1 = testTsMinutesAgo_(60);
    var first = addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: wipCol.id, align_fields: { start_ts: t1 } });
    assertTrue_(first.data.ok, 'primo move dovrebbe riuscire');

    var t2 = testTsMinutesAgo_(59);
    var second = addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: wipCol.id, align_fields: { start_ts: t1 } });

    assertTrue_(second.data.ok === false, 'secondo move con colonna doppia: ok false');
    assertTrue_(second.data.requiresForce === true, 'requiresForce true');
    assertTrue_(second.data.warnings.length > 0, 'warnings presenti');

    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(2, log.length, 'nessuna scrittura extra: solo evento di creazione + primo move');
  });
}

function testAddActivityEventSequenceWarningsConForce() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Sequence warning con force', size_class: 'M' });
    var columns = readColumns_();
    var standByCol = columns.filter(function(c) { return c.role === 'stand_by'; })[0];
    var t1 = testTsMinutesAgo_(60);
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: standByCol.id });

    var t2 = testTsMinutesAgo_(59);
    var forced = addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: standByCol.id, force: true });

    assertTrue_(forced.data.ok === true, 'con force:true dovrebbe riuscire');
    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(3, log.length, 'evento di creazione + due move nel log dopo force');
  });
}

function testAddActivityEventStructuralWarningsSenzaAlign() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Structural warning senza align', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: testTsMinutesAgo_(60), to: wipCol.id });

    assertTrue_(result.data.ok === false, 'senza align_fields: ok false');
    assertTrue_(result.data.alignmentRequired === true, 'alignmentRequired true');
    assertTrue_(result.data.structuralWarnings.length > 0, 'structuralWarnings presenti');

    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(1, log.length, 'nessuna scrittura extra senza align_fields: resta solo l\'evento di creazione');
  });
}

function testAddActivityEventStructuralWarningsConAlign() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Structural warning con align', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var ts = testTsMinutesAgo_(60);

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: ts, to: wipCol.id, align_fields: { start_ts: ts } });

    assertTrue_(result.data.ok === true, 'con align_fields dovrebbe riuscire');
    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === jobId; })[0];
    assertEquals_(ts, job.start_ts, 'start_ts aggiornato atomicamente dal campo strutturato');
  });
}

function testAddActivityEventNotaValida() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Nota valida', size_class: 'M' });

    var result = addActivityEvent({ job_id: jobId, type: 'note', ts: testTsMinutesAgo_(60), note: 'promemoria di test' });

    assertTrue_(result.data.ok === true, 'evento note dovrebbe riuscire');
    assertEquals_('promemoria di test', result.data.event.note, 'nota salvata correttamente');
  });
}

function testUpdateActivityEventManual() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Update evento manual', size_class: 'M' });
    var added = addActivityEvent({ job_id: jobId, type: 'note', ts: testTsMinutesAgo_(60), note: 'nota originale' });
    var eventId = added.data.event.id;

    var updated = updateActivityEvent({ job_id: jobId, event_id: eventId, note: 'nota corretta' });

    assertTrue_(updated.data.ok === true, 'update dovrebbe riuscire');
    assertEquals_('nota corretta', updated.data.event.note, 'nota aggiornata');
    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(2, log.length, 'evento di creazione + la nota aggiornata (sostituita, non duplicata)');
  });
}

function testUpdateActivityEventBloccoAuto() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Update blocco auto', size_class: 'M' });
    var moved = moveJob({ job_id: jobId, status: 'todo' });
    var log = getActivityLog({ job_id: jobId }).data.log;
    var autoEventId = log[0].id;
    assertEquals_('auto', log[0].source, 'evento generato da moveJob e\' auto');

    var failed = false;
    try {
      updateActivityEvent({ job_id: jobId, event_id: autoEventId, note: 'tentativo' });
    } catch (err) {
      failed = err.message.indexOf('EVENTO_AUTO_NON_MODIFICABILE') !== -1;
    }
    assertTrue_(failed, 'updateActivityEvent su evento auto dovrebbe fallire');
  });
}

function testDeleteActivityEventManual() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Delete evento manual', size_class: 'M' });
    var columns = readColumns_();
    var todoCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var waitCol = columns.filter(function(c) { return c.role === 'stand_by'; })[0];
    var t1 = testTsMinutesAgo_(90);
    var t2 = testTsMinutesAgo_(60);
    var t3 = testTsMinutesAgo_(30);
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: todoCol.id, align_fields: { start_ts: t1 } });
    var e2 = addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: waitCol.id });
    var e3 = addActivityEvent({ job_id: jobId, type: 'move', ts: t3, to: todoCol.id, force: true, align_fields: { start_ts: t3 } });

    var del = deleteActivityEvent({ job_id: jobId, event_id: e2.data.event.id });

    assertTrue_(del.success, 'delete dovrebbe riuscire');
    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(3, log.length, 'evento di creazione + due move rimasti dopo la cancellazione');
    var remaining3 = log.filter(function(e) { return e.id === e3.data.event.id; })[0];
    assertEquals_(todoCol.id, remaining3.from, 'from dell\'evento successivo ricalcolato dopo la cancellazione');
  });
}

function testDeleteActivityEventBloccoAuto() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Delete blocco auto', size_class: 'M' });
    moveJob({ job_id: jobId, status: 'todo' });
    var log = getActivityLog({ job_id: jobId }).data.log;
    var autoEventId = log[0].id;

    var failed = false;
    try {
      deleteActivityEvent({ job_id: jobId, event_id: autoEventId });
    } catch (err) {
      failed = err.message.indexOf('EVENTO_AUTO_NON_ELIMINABILE') !== -1;
    }
    assertTrue_(failed, 'deleteActivityEvent su evento auto dovrebbe fallire');
  });
}

function testGetActivityLogOrdinato() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Log ordinato', size_class: 'M' });
    var columns = readColumns_();
    var todoCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var doneCol = columns.filter(function(c) { return c.role === 'done'; })[0];
    var t1 = testTsMinutesAgo_(60);
    var t2 = testTsMinutesAgo_(30);
    // Inseriti fuori ordine cronologico apposta.
    addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: doneCol.id, align_fields: { done_ts: t2 } });
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: todoCol.id, align_fields: { start_ts: t1 } });

    var log = getActivityLog({ job_id: jobId }).data.log;

    assertEquals_(3, log.length, 'evento di creazione + due move nel log');
    assertEquals_(t1, log[0].ts, 'primo evento e\' il piu\' vecchio (precede anche l\'evento di creazione, creato con arrival_ts nel passato)');
    assertEquals_(t2, log[1].ts, 'secondo evento e\' il successivo in ordine cronologico');
  });
}

function testGetActivityLogFromRicalcolato() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'From ricalcolato', size_class: 'M' });
    var columns = readColumns_();
    var todoCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var doneCol = columns.filter(function(c) { return c.role === 'done'; })[0];
    var t1 = testTsMinutesAgo_(60);
    var t2 = testTsMinutesAgo_(30);
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: todoCol.id, align_fields: { start_ts: t1 } });
    addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: doneCol.id, align_fields: { done_ts: t2 } });

    var log = getActivityLog({ job_id: jobId }).data.log;

    assertEquals_(null, log[0].from, 'primo evento non ha un move precedente: from null');
    assertEquals_(todoCol.id, log[1].from, 'secondo evento: from ricalcolato sul move precedente');
  });
}

function testMoveJobScriveEventoAuto() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'MoveJob evento auto', size_class: 'M' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(moved.success, 'moveJob dovrebbe riuscire');
    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    var log = parseActivityLog_(job.activity_log_json);
    assertEquals_(2, log.length, 'evento di creazione + evento di move nel log grezzo');
    assertEquals_('auto', log[0].source, 'evento di creazione e\' auto');
    assertEquals_(null, log[0].from, 'evento di creazione: from null');
    assertEquals_('backlog', log[0].to, 'evento di creazione: to backlog');
    assertEquals_('auto', log[1].source, 'evento di move e\' auto');
    assertEquals_('backlog', log[1].from, 'evento di move: from backlog');
    assertEquals_('todo', log[1].to, 'evento di move: to todo');
  });
}

function testMigrateToActivityLogChecklist() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Migrazione checklist', size_class: 'M', description: 'Testo originale della card' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.checklist_json = JSON.stringify([{ text: 'Voce A', done: true }, { text: 'Voce B', done: false }]);
    writeJobToRow_(sheet, row, headers, job);

    var result = migrateToActivityLog({ env: 'test' });

    assertTrue_(result.success, 'migrazione dovrebbe riuscire');
    assertEquals_(2, result.data.checklist_items_migrated, 'due voci checklist migrate');

    var after = readJobFromRow_(sheet, row, headers);
    assertTrue_(after.description.indexOf('Testo originale della card') === 0, 'testo originale intatto in testa');
    assertTrue_(after.description.indexOf('--- Checklist migrata ---') !== -1, 'separatore presente');
    assertTrue_(after.description.indexOf('[x] Voce A') !== -1, 'voce completata con [x]');
    assertTrue_(after.description.indexOf('[ ] Voce B') !== -1, 'voce non completata con [ ]');
  });
}

function runSingleTest_(testFn) {
  var started = new Date();
  try {
    testFn();
    return {
      name: testFn.name,
      passed: true,
      duration_ms: new Date().getTime() - started.getTime()
    };
  } catch (err) {
    return {
      name: testFn.name,
      passed: false,
      error: err.message,
      duration_ms: new Date().getTime() - started.getTime()
    };
  }
}

function withTestSpreadsheet_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var props = PropertiesService.getScriptProperties();
  var previousId = props.getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
  var testId = props.getProperty(SIGMAFLOW_TEST_PROP_SPREADSHEET_ID);

  if (!testId) {
    lock.releaseLock();
    throw new Error('Script Property mancante: ' + SIGMAFLOW_TEST_PROP_SPREADSHEET_ID);
  }

  props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, testId);
  try {
    return callback(SpreadsheetApp.openById(testId));
  } finally {
    if (previousId) {
      props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, previousId);
    } else {
      props.deleteProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
    }
    lock.releaseLock();
  }
}

function resetTestDatabase_(ss) {
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CASES, CASE_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CONFIG, CONFIG_HEADERS);

  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS), JOB_HEADERS);
  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.CASES), CASE_HEADERS);
  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG), CONFIG_HEADERS);
  seedDefaultConfig_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
}

function clearDataRows_(sheet, headers) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function appendCompletedJob_(ss, data) {
  var now = nowIso_();
  var arrival = new Date();
  arrival.setDate(arrival.getDate() - Number(data.lead_time_d || 1));
  var start = new Date();
  start.setDate(start.getDate() - Number(data.service_time_d || 1));
  var arrivalIso = Utilities.formatDate(arrival, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var startIso = Utilities.formatDate(start, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

  var caseId = generateId_('C');
  var jobId = generateId_('J');

  ss.getSheetByName(SIGMAFLOW.SHEETS.CASES).appendRow([
    caseId,
    data.title,
    'Cliente test',
    data.visit_number || 1,
    false,
    arrivalIso,
    now
  ]);

  ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS).appendRow([
    jobId,
    caseId,
    data.visit_number || 1,
    data.title,
    data.client || 'Cliente test',
    data.ambassador || '',
    'done',
    'tester@sigmapiu.it',
    'test',
    data.size_class || 'M',
    SIGMAFLOW.SIZE_POINTS[data.size_class || 'M'],
    data.priority_class || 'p1_plan',
    false,
    data.impact || 2,
    data.manageability || 2,
    data.priority_score || 2,
    data.description || '',
    data.due_date || '',
    arrivalIso,
    startIso,
    now,
    Boolean(data.invoiced),
    data.service_time_d,
    data.lead_time_d,
    data.wait_time_d,
    Boolean(data.is_rework),
    data.rework_cause || '',
    ''
  ]);
}

function assertHeaders_(sheet, expected) {
  var actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
  expected.forEach(function(header, index) {
    assertEquals_(header, actual[index], 'header ' + sheet.getName() + ' col ' + (index + 1));
  });
}

function assertEquals_(expected, actual, message) {
  if (expected !== actual) {
    throw new Error(message + ': atteso "' + expected + '", ottenuto "' + actual + '"');
  }
}

function assertTrue_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
