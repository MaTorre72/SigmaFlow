var SIGMAFLOW_TEST_PROP_SPREADSHEET_ID = 'SIGMAFLOW_TEST_SPREADSHEET_ID';

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
    testMetrics,
    testMissingRequiredParam
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
    assertTrue_(response.data.job_id.indexOf('J-') === 0, 'job_id dovrebbe iniziare con J-');
    assertTrue_(response.data.case_id.indexOf('C-') === 0, 'case_id dovrebbe iniziare con C-');

    var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(1, jobs.length, 'jobs dovrebbe contenere una riga');
    assertEquals_('backlog', jobs[0].status, 'status iniziale');
    assertEquals_(5, Number(jobs[0].size_points), 'size_points S');

    var cases = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.CASES));
    assertEquals_(1, cases.length, 'cases dovrebbe contenere una riga');
    assertEquals_(1, Number(cases[0].total_visits), 'total_visits caso');
  });
}

function testMoveJobLifecycle() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Lifecycle job', size_class: 'M' }).data;

    var progress = moveJob({ job_id: created.job_id, status: 'in_progress' });
    assertTrue_(progress.success, 'moveJob in_progress dovrebbe riuscire');

    var afterProgress = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('in_progress', afterProgress.status, 'status in_progress');
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

    moveJob({ job_id: created.job_id, status: 'in_progress' });
    moveJob({ job_id: created.job_id, status: 'stand_by' });
    var returned = moveJob({ job_id: created.job_id, status: 'in_review' });

    assertTrue_(returned.success, 'moveJob da stand_by dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('in_review', job.status, 'status dopo ritorno da stand_by');
    assertEquals_(2, Number(job.visit_number), 'visit_number automatico');
    assertTrue_(coerceBoolean_(job.is_rework), 'is_rework automatico');
    assertEquals_('stand_by_return', job.rework_cause, 'causa rework automatica');
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
  });
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
  var props = PropertiesService.getScriptProperties();
  var previousId = props.getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
  var testId = props.getProperty(SIGMAFLOW_TEST_PROP_SPREADSHEET_ID);

  if (!testId) {
    throw new Error('Script Property mancante: ' + SIGMAFLOW_TEST_PROP_SPREADSHEET_ID);
  }

  props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, testId);
  try {
    callback(SpreadsheetApp.openById(testId));
  } finally {
    if (previousId) {
      props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, previousId);
    } else {
      props.deleteProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
    }
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
    'done',
    'tester@sigmapiu.it',
    'test',
    data.size_class || 'M',
    SIGMAFLOW.SIZE_POINTS[data.size_class || 'M'],
    arrivalIso,
    startIso,
    now,
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
