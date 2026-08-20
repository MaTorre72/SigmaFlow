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

// Genera dati dimostrativi direttamente nello schema finale/ufficiale
// (su richiesta di Marco, dopo la rimozione di case_id): niente campi
// jobs ormai rimossi da JOB_HEADERS (case_id, visit_number, start_ts,
// done_ts, service_time_d, lead_time_d, wait_time_d, is_rework,
// rework_cause — tutti spostati su 'visite' fin dalla L5) e una vera
// riga 'visite' per ogni job, coerente con quanto produce addJob/moveJob
// in produzione: senza questo, il bottone dati demo lascerebbe 'visite'
// vuota e la dashboard (che dalla L4 legge le metriche di governo da li')
// mostrerebbe zeri per tutti i job generati.
function seedTestDataset_(ss, replace) {
  if (replace) { resetTestDatabase_(ss); }
  var jobsSheet = ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  var visiteSheet = ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE, VISITE_HEADERS);
  var sizes = ['XS', 'S', 'M', 'L', 'XL'];
  var assignees = ['Alessandra', 'Giovanni D', 'Marco', 'Altro'];
  var tags = ['AIA', 'VIA', 'rifiuti', 'acque', 'aria', 'suolo'];
  var statuses = ['backlog', 'backlog', 'todo', 'todo', 'wip', 'wip', 'wip', 'wait_client', 'wait_authority', 'wait_internal', 'done', 'done', 'done', 'done'];
  var reworkCauses = ['wait_client', 'wait_authority', 'wait_internal'];
  var colors = SIGMAFLOW.CARD_COLORS;
  var jobRows = [];
  var now = new Date();
  var columns = readColumns_();
  var backlogColumn = findColumn_(columns, firstColumnIdByRole_('backlog'));

  // Durata fissa (giorni) attribuita alla prima visita dei job con rework
  // (i % 8 === 0, come nella generazione precedente): serve solo a
  // collocare la visita 1 cronologicamente prima di arrival_ts (che per
  // questi job resta la data della visita 1, non della visita 2 attuale).
  var reworkGapDays = 10;

  for (var i = 0; i < 60; i++) {
    var size = sizes[(i * 3 + Math.floor(i / 7)) % sizes.length];
    var status = statuses[(i * 5 + Math.floor(i / 9)) % statuses.length];
    var arrivalDays = 4 + ((i * 11) % 176);
    var impact = 1 + (i % 4);
    var manageability = 1 + ((i * 3) % 4);
    var priority = priorityFields_({ impact: impact, manageability: manageability });
    var hasRework = i % 8 === 0;
    var arrival = testIsoDaysAgo_(now, arrivalDays);
    var started = ['todo', 'wip', 'wait_client', 'wait_authority', 'wait_internal', 'done'].indexOf(status) >= 0
      ? testIsoDaysAgo_(now, Math.max(0, arrivalDays - (1 + i % 5))) : '';
    var prep = ['todo', 'wip', 'wait_client', 'wait_authority', 'wait_internal', 'done'].indexOf(status) >= 0 ? started : '';
    var done = status === 'done' ? testIsoDaysAgo_(now, Math.max(0, arrivalDays - (3 + i % 12))) : '';
    var jobId = 'JOB-DEMO-' + String(i + 1);
    var targetColumn = findColumn_(columns, status) || backlogColumn;

    var creationEvent = {
      id: generateActivityEventId_(),
      ts: hasRework ? testIsoDaysAgo_(now, arrivalDays + reworkGapDays) : arrival,
      type: 'move',
      source: 'auto',
      to: targetColumn.id,
      from: null,
      note: ''
    };

    var job = {
      job_id: jobId,
      title: 'Pratica dimostrativa ' + String(i + 1),
      client: 'Cliente ' + String(1 + i % 12),
      ambassador: '',
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
      // arrival_ts e' sempre la data del primo arrivo del caso (apertura
      // della visita 1), non della visita corrente: per i job con rework
      // coincide con l'apertura della visita 1 sintetica, arrivalDays +
      // reworkGapDays giorni fa.
      arrival_ts: hasRework ? testIsoDaysAgo_(now, arrivalDays + reworkGapDays) : arrival,
      invoiced: status === 'done' && i % 3 === 0,
      card_color: colors[(i % (colors.length - 1)) + 1],
      activity_log_json: serializeActivityLog_([creationEvent]),
      incarico_chiuso_ts: ''
    };
    jobRows.push(jobToRow_(job));

    if (hasRework) {
      // Visita 1: chiusa, con un rientro da una colonna di attesa —
      // stessa dinamica di updateVisiteForMove_ in Kanban.gs.
      var v1Apertura = testIsoDaysAgo_(now, arrivalDays + reworkGapDays);
      var v1Rientro = testIsoDaysAgo_(now, arrivalDays);
      var reworkCause = reworkCauses[i % reworkCauses.length];
      appendVisitRow_(visiteSheet, {
        job_id: jobId,
        numero_visita: 1,
        apertura_ts: v1Apertura,
        incarico_ts: v1Apertura,
        prep_ts: testIsoDaysAgo_(now, arrivalDays + reworkGapDays - 1),
        start_ts: testIsoDaysAgo_(now, arrivalDays + reworkGapDays - 2),
        consegna_ts: testIsoDaysAgo_(now, arrivalDays + reworkGapDays - 5),
        rientro_ts: v1Rientro,
        rientro_da: reworkCause,
        t_cliente_d: 0,
        t_ente_d: 0,
        t_interno_d: 0,
        rework_cause: ''
      });

      // Visita 2: quella attuale, aperta dal rientro della visita 1,
      // valorizzata con lo stesso stato/date correnti del job.
      appendVisitRow_(visiteSheet, {
        job_id: jobId,
        numero_visita: 2,
        apertura_ts: v1Rientro,
        incarico_ts: v1Rientro,
        prep_ts: prep,
        start_ts: started,
        consegna_ts: done,
        rientro_ts: '',
        rientro_da: '',
        t_cliente_d: 0,
        t_ente_d: 0,
        t_interno_d: 0,
        rework_cause: reworkCause
      });
    } else {
      // Visita 1: e' anche la visita corrente, ancora aperta (una card
      // "done" puo' sempre rientrare: consegna_ts si valorizza ma
      // rientro_ts resta vuoto, come da modello caso/visita).
      appendVisitRow_(visiteSheet, {
        job_id: jobId,
        numero_visita: 1,
        apertura_ts: arrival,
        incarico_ts: arrival,
        prep_ts: prep,
        start_ts: started,
        consegna_ts: done,
        rientro_ts: '',
        rientro_da: '',
        t_cliente_d: 0,
        t_ente_d: 0,
        t_interno_d: 0,
        rework_cause: ''
      });
    }
  }

  jobsSheet.getRange(jobsSheet.getLastRow() + 1, 1, jobRows.length, JOB_HEADERS.length).setValues(jobRows);
  return { jobs: jobRows.length, replace: replace };
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

// Un solo Logger.log con l'intero risultato (87 test, uno per riga)
// supera il limite di dimensione di un singolo log nell'editor Apps
// Script ("Logging output too large. Truncating output.") — tronca
// proprio a meta' dei falliti, i piu' importanti da vedere. Log
// separati, uno per riga: il riepilogo e il dettaglio dei falliti (se
// ce ne sono) non rischiano mai di essere troncati dal singolo blocco
// piu' grande (l'elenco dei nomi passati, l'unico che puo' crescere
// senza limite col numero di test).
function runAllTestsAndLog() {
  var result = runAllTests();
  var failed = result.results.filter(function(r) { return !r.passed; });

  Logger.log('SigmaFlow test suite: ' + result.passed + '/' + result.results.length + ' passati, ' + result.failed + ' falliti.');

  if (failed.length) {
    Logger.log('--- TEST FALLITI ---');
    failed.forEach(function(r) {
      Logger.log(r.name + ': ' + r.error);
    });
  }

  Logger.log('--- TEST PASSATI ---');
  Logger.log(result.results.filter(function(r) { return r.passed; }).map(function(r) { return r.name; }).join(', '));

  return result;
}

function runAllTests() {
  var results = [];
  var tests = [
    testSetupSchema,
    testSetupSchemaCreaFogliArchivioECestino,
    testSetupSchemaSeedaArchiviazioneGiorniDefault,
    testAddJob,
    testMoveJobLifecycle,
    testAutomaticReworkFromStandBy,
    testMoveJobResponseCarriesVisitSummary,
    testMoveJobToSameColumnKeepsVisitSummaryInResponse,
    testStatusSinceTsSetOnCreation,
    testStatusSinceTsUpdatesOnRealMove,
    testStatusSinceTsNotResetOnSelfMove,
    testBackfillStatusSinceTsUsesLastMoveToCurrentStatus,
    testBackfillStatusSinceTsFallsBackToArrivalTsWhenStatusNeverReachedInLog,
    testBackfillStatusSinceTsLeavesEmptyWhenNoBasisAtAll,
    testBackfillStatusSinceTsIsIdempotentOnAlreadySetJobs,
    testDefaultColumnsCarryAgingDaysToBoardMeta,
    testColumnMetaOmitsAgingDaysWhenNotConfigured,
    testSeedAgingDaysMigrationFillsOnlyMissingStandByColumns,
    testUpdateColumnPreservesOtherColumnsAgingDays,
    testUpdateColumnSetsAndClearsAgingDays,
    testStandByCannotReturnDirectlyToWip,
    testPriorityHelpers,
    testPriorityUpdate,
    testCardColor,
    testUpdateJobInvoicedTogglesIncaricoChiusoTs,
    testArchiveJobMovesJobAndVisiteToArchivio,
    testArchiveJobRejectsCaseNotClosed,
    testArchiveJobIsIdempotentOnSecondCall,
    testArchiveJobApiActionRejectsCaseNotClosed,
    testCestinaJobMovesJobAndVisiteRegardlessOfClosure,
    testDeleteJobMovesToCestinoInsteadOfDeleting,
    testRipristinaJobRestoresJobAndVisiteToOriginalStatus,
    testRipristinaJobFallsBackToBacklogColumnWhenStatusNoLongerExists,
    testMoveJobToSheetIsIdempotentWhenCalledTwice,
    testMoveJobClearsIncaricoChiusoTsOnRealReentryFromDone,
    testMoveJobDoesNotClearIncaricoChiusoTsWhenNoNewVisitOpens,
    testArchiveEligibleJobsArchivesCasesPastThreshold,
    testArchiveEligibleJobsSkipsCasesBelowThreshold,
    testArchiveEligibleJobsSkipsCasesNeverClosed,
    testArchiveEligibleJobsUsesConfiguredThreshold,
    testArchiveEligibleJobsNeverTouchesCestino,
    testEseguiArchiviazioneAutomaticaGiornalieraReturnsScanResult,
    testEseguiArchiviazioneAutomaticaGiornalieraIgnoresDirtyAmbientSpreadsheetProperty,
    testGetArchivioReturnsAnagraficaAndVisitCount,
    testGetCestinoReturnsAnagraficaAndVisitCount,
    testGetArchivioReturnsEmptyWhenSheetsMissing,
    testGetCestinoReturnsEmptyWhenSheetsMissing,
    testGetMetricsReturnsEmptyArchivedDataWhenSheetsMissing,
    testRipristinaJobApiActionRestoresJob,
    testEliminaJobDefinitivamenteRemovesJobAndVisiteFromCestino,
    testEliminaJobDefinitivamenteThrowsWhenJobNotInCestino,
    testSvuotaCestinoRemovesAllRowsFromCestino,
    testDuplicaJobCreatesNewActiveJobCopyingAnagrafica,
    testDuplicaJobDoesNotCopyClosureStatusOrVisitHistory,
    testDuplicaJobThrowsWhenJobNotInArchivio,
    testDuplicaJobApiActionWrapsDuplicaJob,
    testAmbassadorOption,
    testEditableOptions,
    testDynamicColumnsAndOptions,
    testMetrics,
    testGetMetricsUsesVisiteNotJobFields,
    testWorkloadAndPointsStayOnJobsEvenWithEmptyVisite,
    testSystemStateInsufficientData,
    testBuildSystemStateExposesStabilityMetrics,
    testBuildSystemStateStabilityMetricsNullWhenInsufficientData,
    testBuildSystemStateSumsWaitTimeByType,
    testBuildSystemStateCountsLatentBacklogFromRecentUnclosedDeliveries,
    testDelayProfileNullBelowMinimumSamples,
    testDelayProfileComputesAlphaAndKernelFromRealReentries,
    testDelayProfileAlphaCountsAllClosedVisitsNotOnlyReentered,
    testBuildSystemStateExposesDelayProfileInSystemState,
    testCalculateMetricsComputesE_S0AndE_S1SeparatelyByReworkStatus,
    testCalculateMetricsE_S0E_S1NullWhenNoSamples,
    testBuildSystemStateIncludesArchivedJobsInHistoricPoints,
    testBuildSystemStateOpenPointsNeverIncludeArchivedJobs,
    testBuildSystemStateTimelineIncludesArchivedJobs,
    testBuildSystemStatePointsByColumnIncludesArchivedJobs,
    testBuildSystemStateFlowMetricsIncludeArchivedVisite,
    testGetMetricsIncludesArchivedCaseInHistoricPoints,
    testGetMetricsNeverReadsCestino,
    testDataQualityThresholds,
    testSystemStateSeparatesFlowFromTimeSamples,
    testSystemStateWorkload,
    testMissingRequiredParam,
    testAddActivityEventMoveValido,
    testAddActivityEventTsFuturo,
    testAddActivityEventReturnsUpdatedJobInResponse,
    testUpdateActivityEventReturnsUpdatedJobInResponse,
    testDeleteActivityEventReturnsUpdatedJobInResponse,
    testAddActivityEventManualReentryUpdatesStatusAndOpensVisit,
    testAddActivityEventManualReentryDirectToWipBlocked,
    testUpdateActivityEventReentrySameEventDoesNotDuplicateVisit,
    testAddActivityEventPlainManualMoveUpdatesStatus,
    testAddActivityEventManualMoveAfterReentryContinuesUpdatingStatus,
    testAddActivityEventColonnaNonTrovata,
    testAddActivityEventReasonObbligatoria,
    testAddActivityEventSequenceWarningsSenzaForce,
    testAddActivityEventSequenceWarningsConForce,
    testAddActivityEventAutoAllineaCampoStrutturato,
    testAddActivityEventNotaValida,
    testAddActivityEventCorrectionArrivalTsValida,
    testAddActivityEventCorrectionIncaricoChiusoTsValida,
    testAddActivityEventCorrectionCampoNonCorreggibile,
    testAddActivityEventCorrectionDataNonValida,
    testUpdateActivityEventManual,
    testUpdateActivityEventCorreggeEventoAutoDiCreazione,
    testUpdateActivityEventCorreggeEventoAutoDiSpostamento,
    testDeleteActivityEventManual,
    testDeleteActivityEventBloccoAuto,
    testGetActivityLogOrdinato,
    testGetActivityLogFromRicalcolato,
    testGetActivityLogFromResolvesTiedTimestamps,
    testMoveJobScriveEventoAuto,
    testExtractDateFromJobIdParsesValidFormat,
    testExtractDateFromJobIdReturnsNullForInvalidFormat,
    testExtractDateFromJobIdReturnsNullForInvalidCalendarDate,
    testMigrateToActivityLogUsesJobIdDateWhenArrivalTsMissing,
    testMigrateToActivityLogBackfillEventoCreazione,
    testMigrateToActivityLogBackfillNonContraddiceSpostamentiReali,
    testComputeVisiteFromLogWipToWipKeepsFirstStartTs,
    testComputeVisiteFromLogStandByReentryOpensNewVisit,
    testComputeVisiteFromLogFlagsIllegalDirectReentryToWip,
    testMigrateVisiteFromHistoryEndToEnd,
    testEseguiMigrazioneCompletaRejectsWrongConfirmName,
    testFixPrepColumnRoleCorrectsGenericMismatch,
    testFixPrepColumnRoleNoOpWhenAlreadyCorrect,
    testEseguiMigrazioneCompletaEndToEndOnOldSchemaData,
    testReworkFromStandByToBacklogKeepsStartTs,
    testMoveToPrepSetsPrepTsNotStartTs,
    testMoveToWipStillSetsStartTs,
    testMoveToBacklogSetsIncaricoTs,
    testMoveJobToSameColumnIsNoOp,
    testVisitWipToWipDoesNotOpenNewVisit,
    testVisitStandByReentryOpensNewVisit,
    testVisitDoneReentryTreatedLikeStandBy,
    testDoneCannotReturnDirectlyToWip,
    testVisitConsegnaTsSetOnDoneWithoutClosingVisit,
    testVisitAccumulatesWaitTimeOnStandByExit,
    testVisitStandByToStandByDoesNotOpenNewVisit,
    testAddActivityEventAlignsOpenVisitStartTs,
    testUpdateActivityEventAlignsOpenVisitField,
    testDeleteActivityEventRealignsOpenVisit,
    testMigrateToActivityLogAlignsOpenVisit,
    testBackupRetentionDaysFallsBackToDefaultWhenConfigMissing,
    testBackupRetentionDaysReadsConfiguredValue,
    testBackupProdRejectsWrongSpreadsheetName,
    testBackupProdCreatesFullCopyInDedicatedFolder,
    testBackupFolderLivesInSameFolderAsProdSpreadsheet,
    testBackupProdNeverModifiesSourceSheet,
    testPruneOldBackupsDeletesOnlyFilesOlderThanRetention,
    testEseguiBackupGiornalieroProdReturnsBackupAndPruneResult,
    testEseguiBackupGiornalieroProdKeepsBackupWhenPruneFails
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
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE), VISITE_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG), CONFIG_HEADERS);
    assertTrue_(!ss.getSheetByName(SIGMAFLOW.SHEETS.CASES), 'foglio cases dismesso, non deve piu\' esistere');
  });
}

// N1 (DESIGN_archiviazione.md, sez. 3): i quattro fogli additivi
// (archivio/cestino) devono esistere dopo setupSigmaFlow con
// l'intestazione attesa — JOB_HEADERS piu' il campo timestamp specifico
// per i due fogli jobs_*, VISITE_HEADERS invariata per i due visite_*.
function testSetupSchemaCreaFogliArchivioECestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    // resetTestDatabase_ prepara solo jobs/visite/config (uso comune a
    // tutti gli altri test): i quattro fogli archivio/cestino li crea
    // solo setupSigmaFlow, qui chiamata esplicitamente per verificare
    // il comportamento reale di setup su un database altrimenti vuoto.
    setupSigmaFlow();
    // N1: setupSigmaFlow() apre un proprio riferimento indipendente
    // allo spreadsheet — riapertura esplicita prima di riusare 'ss'
    // per le verifiche (stessa causa gia' trovata e corretta in
    // eseguiMigrazioneCompleta_/testEseguiMigrazioneCompletaEndToEndOnOldSchemaData).
    ss = SpreadsheetApp.openById(ss.getId());
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO), JOB_ARCHIVIO_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO), VISITE_ARCHIVIO_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO), JOB_CESTINO_HEADERS);
    assertHeaders_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO), VISITE_CESTINO_HEADERS);
  });
}

// N1 (DESIGN_archiviazione.md, sez. 3.3): archiviazione_giorni_default
// deve comparire in config con il default 30 dopo un setup su un
// database vuoto.
function testSetupSchemaSeedaArchiviazioneGiorniDefault() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var config = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
    var row = config.filter(function(r) { return r.key === 'archiviazione_giorni_default'; })[0];
    assertTrue_(Boolean(row), 'archiviazione_giorni_default dovrebbe esistere in config dopo il setup');
    assertEquals_('30', String(row.value), 'default archiviazione_giorni_default');
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

    var jobs = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(1, jobs.length, 'jobs dovrebbe contenere una riga');
    assertEquals_('backlog', jobs[0].status, 'status iniziale');
    assertEquals_(5, Number(jobs[0].size_points), 'size_points S');
    assertEquals_('p4_assess', jobs[0].priority_class, 'priority_class default');
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
    var visitAfterProgress = readVisiteForJob_(ss, created.job_id)[0];
    assertTrue_(Boolean(visitAfterProgress.start_ts), 'start_ts valorizzato sulla visita (non piu\' su jobs, L5)');

    Utilities.sleep(1000);
    var done = moveJob({ job_id: created.job_id, status: 'done' });
    assertTrue_(done.success, 'moveJob done dovrebbe riuscire');

    var afterDone = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('done', afterDone.status, 'status done');
    var visitAfterDone = readVisiteForJob_(ss, created.job_id)[0];
    assertTrue_(Boolean(visitAfterDone.consegna_ts), 'consegna_ts valorizzato sulla visita (non piu\' done_ts su jobs, L5)');
  });
}

function testAutomaticReworkFromStandBy() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Stand-by rework', size_class: 'M' }).data;

    moveJob({ job_id: created.job_id, status: 'wip' });
    var startTsBeforeReturn = readVisiteForJob_(ss, created.job_id)[0].start_ts;

    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(returned.success, 'moveJob da stand_by dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('todo', job.status, 'status dopo ritorno da stand_by');

    var boardJob = getBoard().data.jobs.filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(2, Number(boardJob.visit_number), 'visit_number automatico (ricalcolato da visite in getBoard)');
    assertTrue_(coerceBoolean_(boardJob.is_rework), 'is_rework automatico');
    assertEquals_('wait_client', boardJob.rework_cause, 'causa rework automatica');

    var visiteChiuse = readVisiteForJob_(ss, created.job_id).filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    assertEquals_(startTsBeforeReturn, visiteChiuse.start_ts, 'start_ts della visita 1 non deve essere ringiovanito da un rientro in TO DO (prep)');
  });
}

// M0-A2: bugfix badge Rnn fermo dopo una mossa (M0-A aveva tolto il
// reload completo dopo moveJob, giustamente, ma senza questo la
// risposta non portava i campi di rientro ricalcolati). Verifica
// direttamente sulla risposta di moveJob, non su un getBoard()
// successivo (gia' coperto da testAutomaticReworkFromStandBy).
function testMoveJobResponseCarriesVisitSummary() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro nella risposta', size_class: 'S' }).data;

    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(returned.success, 'moveJob dovrebbe riuscire');
    assertEquals_(2, Number(returned.data.job.visit_number), 'visit_number gia\' nella risposta di moveJob');
    assertTrue_(coerceBoolean_(returned.data.job.is_rework), 'is_rework gia\' nella risposta di moveJob');
    assertEquals_('wait_client', returned.data.job.rework_cause, 'rework_cause gia\' nella risposta di moveJob');
  });
}

// Spostamento verso la stessa colonna (no-op lato visite): il job
// restituito deve comunque portare i campi di rientro gia' noti, non
// lasciarli assenti — altrimenti il merge lato client sovrascriverebbe
// un badge Rnn corretto con dei campi vuoti.
function testMoveJobToSameColumnKeepsVisitSummaryInResponse() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Self-move con rework', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    moveJob({ job_id: created.job_id, status: 'todo' });

    var selfMove = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(selfMove.success, 'self-move dovrebbe riuscire');
    assertEquals_(2, Number(selfMove.data.job.visit_number), 'visit_number presente anche su un self-move');
    assertTrue_(coerceBoolean_(selfMove.data.job.is_rework), 'is_rework presente anche su un self-move');
  });
}

// --- M0-C: status_since_ts (da quando il job e' nella colonna ATTUALE) ---

function testStatusSinceTsSetOnCreation() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Aging da creazione', size_class: 'S' }).data;
    assertTrue_(Boolean(created.job.status_since_ts), 'status_since_ts valorizzato alla creazione');
  });
}

function testStatusSinceTsUpdatesOnRealMove() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Aging su mossa reale', size_class: 'S' }).data;

    // Valore artificiale nel passato invece di un semplice sleep: la
    // risoluzione al secondo di nowIso_() nell'harness Node renderebbe
    // fragile un confronto tra due timestamp presi a distanza di pochi
    // millisecondi.
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.status_since_ts = '2020-01-01T09:00:00+02:00';
    writeJobToRow_(sheet, row, headers, job);

    var moved = moveJob({ job_id: created.job_id, status: 'wip' });

    assertTrue_(moved.data.job.status_since_ts !== '2020-01-01T09:00:00+02:00', 'status_since_ts aggiornato su una mossa reale (colonna diversa)');
  });
}

function testStatusSinceTsNotResetOnSelfMove() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Aging su self-move', size_class: 'S' }).data;
    var moved = moveJob({ job_id: created.job_id, status: 'wip' });
    var afterRealMove = moved.data.job.status_since_ts;

    var selfMove = moveJob({ job_id: created.job_id, status: 'wip' });

    assertEquals_(afterRealMove, selfMove.data.job.status_since_ts, 'status_since_ts invariato su un self-move (la card non ha mai lasciato la colonna)');
  });
}

// --- M0-C, correzione post-collaudo: backfill di status_since_ts per i
// job gia' esistenti (la migrazione additiva di M0-C lascia vuoti
// quelli mai spostati dopo il deploy, escludendoli silenziosamente
// dall'aging finche' daysSince('') === 0) ---

function testBackfillStatusSinceTsUsesLastMoveToCurrentStatus() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Backfill da log', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    // Simula un job pre-M0-C: status_since_ts vuoto, log con un move
    // verso 'backlog' (lo status attuale) non recente, seguito da un
    // move verso un'altra colonna e poi di nuovo verso 'backlog' — il
    // backfill deve trovare il PIU' RECENTE dei due verso lo status
    // attuale, non il primo in assoluto.
    job.status_since_ts = '';
    job.activity_log_json = JSON.stringify([
      { id: '1', ts: '2026-01-01T09:00:00+02:00', type: 'move', source: 'auto', to: 'backlog', from: null },
      { id: '2', ts: '2026-01-05T09:00:00+02:00', type: 'move', source: 'auto', to: 'todo', from: 'backlog' },
      { id: '3', ts: '2026-01-10T09:00:00+02:00', type: 'move', source: 'auto', to: 'backlog', from: 'todo' }
    ]);
    writeJobToRow_(sheet, row, headers, job);

    var result = backfillStatusSinceTs_(sheet);

    assertEquals_(1, result.jobs_backfilled, 'un job backfillato');
    var after = readJobFromRow_(sheet, row, headers);
    assertEquals_('2026-01-10T09:00:00+02:00', after.status_since_ts, 'status_since_ts = evento move piu\' recente verso lo status attuale, non il primo ne\' "ora"');
  });
}

function testBackfillStatusSinceTsFallsBackToArrivalTsWhenStatusNeverReachedInLog() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Backfill senza match nel log', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    // Caso limite (dato storico anomalo/incompleto): il job e' in
    // 'backlog' ma il log non contiene nessun move con to==='backlog'.
    job.status_since_ts = '';
    job.activity_log_json = JSON.stringify([
      { id: '1', ts: '2026-01-05T09:00:00+02:00', type: 'move', source: 'auto', to: 'todo', from: null }
    ]);
    writeJobToRow_(sheet, row, headers, job);

    backfillStatusSinceTs_(sheet);

    var after = readJobFromRow_(sheet, row, headers);
    assertEquals_(after.arrival_ts, after.status_since_ts, 'nessun match nel log: fallback ad arrival_ts');
  });
}

function testBackfillStatusSinceTsLeavesEmptyWhenNoBasisAtAll() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Backfill senza alcuna base', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    // Log vuoto E arrival_ts vuoto: nessuna base su cui stimare una
    // data, il campo deve restare vuoto — non inventare.
    job.status_since_ts = '';
    job.activity_log_json = '[]';
    job.arrival_ts = '';
    writeJobToRow_(sheet, row, headers, job);

    var result = backfillStatusSinceTs_(sheet);

    assertEquals_(0, result.jobs_backfilled, 'nessun job backfillato: nessuna base disponibile');
    var after = readJobFromRow_(sheet, row, headers);
    assertTrue_(!after.status_since_ts, 'status_since_ts resta vuoto, non inventato');
  });
}

function testBackfillStatusSinceTsIsIdempotentOnAlreadySetJobs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    // addJob valorizza gia' status_since_ts (comportamento normale
    // post-M0-C): il backfill non deve toccarlo.
    var created = addJob({ title: 'Gia\' valorizzato', size_class: 'S' }).data;
    var before = created.job.status_since_ts;

    var result = backfillStatusSinceTs_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));

    assertEquals_(0, result.jobs_backfilled, 'nessun job toccato: aveva gia\' status_since_ts');
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var after = readJobFromRow_(sheet, row, getHeaderMap_(sheet));
    assertEquals_(before, after.status_since_ts, 'status_since_ts invariato, idempotente');
  });
}

// --- M0-C: aging_days configurabile per colonna ---

function testDefaultColumnsCarryAgingDaysToBoardMeta() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var board = getBoard();
    var byId = {};
    board.data.column_meta.forEach(function(c) { byId[c.id] = c; });
    assertEquals_(5, byId.wait_internal.aging_days, 'aging_days di default per attesa interna');
    assertEquals_(15, byId.wait_client.aging_days, 'aging_days di default per attesa cliente');
    assertEquals_(45, byId.wait_authority.aging_days, 'aging_days di default per attesa enti');
  });
}

function testColumnMetaOmitsAgingDaysWhenNotConfigured() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var board = getBoard();
    var wip = board.data.column_meta.filter(function(c) { return c.id === 'wip'; })[0];
    assertTrue_(wip.aging_days === undefined, 'colonna senza aging_days configurato non lo riceve di default (nessuna evidenziazione)');
  });
}

function testSeedAgingDaysMigrationFillsOnlyMissingStandByColumns() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var configSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
    var headers = getHeaderMap_(configSheet);
    var rows = readTable_(configSheet);
    var rowIndex = -1;
    rows.forEach(function(row, i) { if (row.key === 'columns_json') { rowIndex = i; } });

    // Simula uno schema pre-M0-C: una colonna stand_by senza aging_days
    // (deve riceverlo), una gia' configurata a un valore non standard
    // (non deve essere toccata), una di altro ruolo (mai toccata).
    var customColumns = [
      { id: 'wait_client', label: 'ATTESA CLIENTE', role: 'stand_by', order: 5, color: '#FFD966' },
      { id: 'wait_authority', label: 'ATTESA ENTI', role: 'stand_by', order: 6, color: '#F4B942', aging_days: 20 },
      { id: 'wip', label: 'WIP', role: 'wip', order: 4, color: '#5B9BD5' }
    ];
    configSheet.getRange(rowIndex + 2, headers.value).setValue(JSON.stringify(customColumns));

    seedAgingDaysForStandByColumns_(configSheet);

    var after = JSON.parse(readTable_(configSheet).filter(function(row) { return row.key === 'columns_json'; })[0].value);
    var afterById = {};
    after.forEach(function(c) { afterById[c.id] = c; });

    assertEquals_(5, afterById.wait_client.aging_days, 'colonna stand_by priva di aging_days riceve il default 5');
    assertEquals_(20, afterById.wait_authority.aging_days, 'colonna stand_by gia\' configurata non viene sovrascritta');
    assertTrue_(afterById.wip.aging_days === undefined, 'colonna non stand_by non riceve aging_days');

    // Idempotenza: una seconda esecuzione non deve alterare un valore
    // gia' impostato (ne' il 5 appena scritto, ne' il 20 preesistente).
    seedAgingDaysForStandByColumns_(configSheet);
    var afterSecond = JSON.parse(readTable_(configSheet).filter(function(row) { return row.key === 'columns_json'; })[0].value);
    var afterSecondById = {};
    afterSecond.forEach(function(c) { afterSecondById[c.id] = c; });
    assertEquals_(5, afterSecondById.wait_client.aging_days, 'idempotente: seconda esecuzione non cambia il valore appena scritto');
    assertEquals_(20, afterSecondById.wait_authority.aging_days, 'idempotente: seconda esecuzione non cambia il valore preesistente');
  });
}

// Regressione: writeColumns_ ricostruiva ogni colonna con un elenco
// fisso di campi che non includeva aging_days — salvare QUALUNQUE
// colonna avrebbe cancellato aging_days da TUTTE le altre.
function testUpdateColumnPreservesOtherColumnsAgingDays() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    updateColumn({ status: 'wip', label: 'WIP' });
    var board = getBoard();
    var waitClient = board.data.column_meta.filter(function(c) { return c.id === 'wait_client'; })[0];
    assertEquals_(15, waitClient.aging_days, 'aging_days di un\'altra colonna non viene perso salvandone una diversa');
  });
}

function testUpdateColumnSetsAndClearsAgingDays() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var updated = updateColumn({ status: 'wait_client', aging_days: 30 });
    assertEquals_(30, updated.data.column.aging_days, 'aging_days impostato a un valore custom');

    var cleared = updateColumn({ status: 'wait_client', aging_days: '' });
    assertTrue_(cleared.data.column.aging_days === undefined, 'stringa vuota disattiva aging_days');
  });
}

function testReworkFromStandByToBacklogKeepsStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Stand-by rework verso backlog', size_class: 'M' }).data;

    moveJob({ job_id: created.job_id, status: 'wip' });
    var startTsBeforeReturn = readVisiteForJob_(ss, created.job_id)[0].start_ts;

    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'backlog' });

    assertTrue_(returned.success, 'moveJob da stand_by a backlog dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertEquals_('backlog', job.status, 'status dopo ritorno da stand_by a backlog');

    var boardJob = getBoard().data.jobs.filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(2, Number(boardJob.visit_number), 'visit_number automatico (ricalcolato da visite in getBoard)');
    assertTrue_(coerceBoolean_(boardJob.is_rework), 'is_rework automatico');
    assertEquals_('wait_client', boardJob.rework_cause, 'causa rework automatica');

    var visiteChiuse = readVisiteForJob_(ss, created.job_id).filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    assertEquals_(startTsBeforeReturn, visiteChiuse.start_ts, 'start_ts della visita 1 non deve essere ringiovanito da un rientro in BACKLOG');
  });
}

function testMoveToPrepSetsPrepTsNotStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in preparazione', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'todo' });
    assertTrue_(moved.success, 'moveJob verso todo (prep) dovrebbe riuscire');

    var visit = readVisiteForJob_(ss, created.job_id)[0];
    assertTrue_(Boolean(visit.prep_ts), 'prep_ts valorizzato all\'ingresso in TO DO');
    assertTrue_(!visit.start_ts, 'start_ts NON deve valorizzarsi all\'ingresso in TO DO (prep)');
  });
}

function testMoveToWipStillSetsStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in lavorazione', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'wip' });
    assertTrue_(moved.success, 'moveJob verso wip dovrebbe riuscire');

    var visit = readVisiteForJob_(ss, created.job_id)[0];
    assertTrue_(Boolean(visit.start_ts), 'start_ts valorizzato all\'ingresso in WIP (non-regressione)');
  });
}

function testMoveToBacklogSetsIncaricoTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ingresso in backlog', size_class: 'S' }).data;

    var moved = moveJob({ job_id: created.job_id, status: 'backlog' });
    assertTrue_(moved.success, 'moveJob verso backlog dovrebbe riuscire');

    var visit = readVisiteForJob_(ss, created.job_id)[0];
    assertTrue_(Boolean(visit.incarico_ts), 'incarico_ts valorizzato all\'ingresso in BACKLOG');
  });
}

// --- Fase L2: modello caso/visita, regola di apertura/chiusura (sez. 2/4) ---

// Segnalato da Marco: la board a volte non da' un feedback immediato del
// drag, l'utente rilascia la card piu' volte e capita di "spostarla" nella
// colonna in cui si trova gia'. Non deve produrre nessun evento in
// Cronologia (sarebbe solo rumore, "X -> X").
function testMoveJobToSameColumnIsNoOp() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Self-move', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });

    var before = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    var logBefore = parseActivityLog_(before.activity_log_json);
    var visiteBefore = readVisiteForJob_(ss, created.job_id);

    var moved = moveJob({ job_id: created.job_id, status: 'wip' });
    assertTrue_(moved.success, 'moveJob verso la stessa colonna non deve fallire');

    var after = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    var logAfter = parseActivityLog_(after.activity_log_json);
    var visiteAfter = readVisiteForJob_(ss, created.job_id);

    assertEquals_(logBefore.length, logAfter.length, 'nessun evento aggiunto in Cronologia per uno spostamento verso la stessa colonna');
    assertEquals_(visiteBefore.length, visiteAfter.length, 'nessuna nuova visita per uno spostamento verso la stessa colonna');
    assertEquals_(visiteBefore[0].start_ts, visiteAfter[0].start_ts, 'la visita esistente (dal primo, vero spostamento) non viene toccata dal self-move successivo');
  });
}

function testVisitWipToWipDoesNotOpenNewVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Wip verso wip', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });

    var moved = moveJob({ job_id: created.job_id, status: 'wip' });
    assertTrue_(moved.success, 'moveJob wip->wip dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(1, visite.length, 'wip->wip non deve aprire una nuova visita');
    assertEquals_(1, Number(visite[0].numero_visita), 'numero_visita resta 1');
    assertTrue_(!visite[0].rientro_ts, 'la visita resta aperta');
  });
}

function testVisitStandByReentryOpensNewVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Ciclo attesa-rientro', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var returned = moveJob({ job_id: created.job_id, status: 'backlog' });

    assertTrue_(returned.success, 'moveJob da stand_by a backlog dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(2, visite.length, 'il rientro da attesa deve aprire una nuova visita');

    var closed = visite.filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    var opened = visite.filter(function(v) { return Number(v.numero_visita) === 2; })[0];

    assertTrue_(Boolean(closed.rientro_ts), 'la visita 1 deve risultare chiusa');
    assertEquals_('wait_client', closed.rientro_da, 'rientro_da = colonna di provenienza');
    assertTrue_(Boolean(opened.apertura_ts), 'la visita 2 deve avere apertura_ts');
    assertTrue_(Boolean(opened.incarico_ts), 'la visita 2 deve avere incarico_ts (destinazione backlog)');
    assertEquals_('wait_client', opened.rework_cause, 'rework_cause = rientro_da della visita precedente');
  });
}

function testVisitDoneReentryTreatedLikeStandBy() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro da done', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });
    var returned = moveJob({ job_id: created.job_id, status: 'todo' });

    assertTrue_(returned.success, 'moveJob da done a todo (prep) dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(2, visite.length, 'il rientro da done deve aprire una nuova visita, come da stand_by');

    var closed = visite.filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    var opened = visite.filter(function(v) { return Number(v.numero_visita) === 2; })[0];

    assertEquals_('done', closed.rientro_da, 'rientro_da = done');
    assertTrue_(Boolean(closed.consegna_ts), 'consegna_ts della visita 1 resta valorizzato');
    assertTrue_(Boolean(opened.prep_ts), 'la visita 2 deve avere prep_ts (destinazione todo/prep)');

    var boardJob = getBoard().data.jobs.filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(2, Number(boardJob.visit_number), 'visit_number ricalcolato da visite anche per rientro da done');
  });
}

function testDoneCannotReturnDirectlyToWip() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro da done vietato verso wip', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });

    var failed = false;
    try {
      moveJob({ job_id: created.job_id, status: 'wip' });
    } catch (err) {
      failed = err.message.indexOf('non e consentito') !== -1;
    }
    assertTrue_(failed, 'rientro diretto da done a WIP dovrebbe fallire, come da stand_by');
  });
}

function testVisitConsegnaTsSetOnDoneWithoutClosingVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Consegna senza chiusura visita', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    var done = moveJob({ job_id: created.job_id, status: 'done' });

    assertTrue_(done.success, 'moveJob verso done dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(1, visite.length, 'l\'ingresso in done non apre una nuova visita');
    assertTrue_(Boolean(visite[0].consegna_ts), 'consegna_ts valorizzato al primo ingresso in done');
    assertTrue_(!visite[0].rientro_ts, 'la visita resta aperta: puo\' ancora rientrare');
  });
}

function testVisitAccumulatesWaitTimeOnStandByExit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Accumulo attesa cliente', size_class: 'S' });
    moveJob({ job_id: jobId, status: 'wip' });
    moveJob({ job_id: jobId, status: 'wait_client' });
    Utilities.sleep(1000);
    moveJob({ job_id: jobId, status: 'backlog' });

    var visite = readVisiteForJob_(ss, jobId);
    var closed = visite.filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    assertTrue_(Number(closed.t_cliente_d) >= 0, 't_cliente_d valorizzato numericamente sull\'uscita da ATTESA CLIENTE');
  });
}

// Simula un job che esisteva gia' prima del deploy della Fase L (nessuna
// riga 'visite' ancora presente) e la cui PRIMA mossa toccata dal nuovo
// codice e' proprio quella che chiude la visita (stand_by -> backlog).
// Verifica il fix al bootstrap: la visita che si chiude deve prendere il
// numero PRIMA dell'incremento (2), non quello dopo (3, riservato alla
// nuova visita che si apre nella stessa mossa).
// Nota storica: il test che copriva il bug di numerazione del bootstrap
// (numero_visita gia' incrementato usato per etichettare la visita che
// si chiude) e' stato rimosso in L5 parte 2/2: con la rimozione di
// job.visit_number da JOB_HEADERS, addJob crea sempre la riga visita 1
// al momento della creazione (vedi addJob in Kanban.gs) — lo scenario
// "nessuna riga visite ancora presente quando arriva la prima mossa" non
// e' piu' raggiungibile tramite le API pubbliche, e con esso la classe
// di bug che quel test riproduceva.

function testVisitStandByToStandByDoesNotOpenNewVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Attesa verso altra attesa', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var moved = moveJob({ job_id: created.job_id, status: 'wait_authority' });

    assertTrue_(moved.success, 'spostamento tra due colonne di attesa dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(1, visite.length, 'spostamento tra due stand_by non apre una nuova visita');
    assertTrue_(!visite[0].rientro_ts, 'la visita resta aperta');
    assertTrue_(Number(visite[0].t_cliente_d) >= 0, 't_cliente_d aggiornato sull\'uscita dalla prima attesa');
  });
}

// --- Fase L3: allineamento delle correzioni manuali sulla visita aperta ---

function testAddActivityEventAlignsOpenVisitStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Allineamento visita aperta', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var ts = testTsMinutesAgo_(60);

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: ts, to: wipCol.id });
    assertTrue_(result.data.ok === true, 'move verso wip dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, jobId);
    assertEquals_(1, visite.length, 'una visita (bootstrap) presente per il job');
    assertEquals_(ts, visite[0].start_ts, 'start_ts della visita aperta allineato al valore suggerito dall\'evento, come su jobs');
  });
}

function testUpdateActivityEventAlignsOpenVisitField() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Correzione allinea visita', size_class: 'M' });
    moveJob({ job_id: jobId, status: 'todo' });
    var log = getActivityLog({ job_id: jobId }).data.log;
    var autoMoveEvent = log.filter(function(e) { return e.source === 'auto' && e.to === 'todo'; })[0];

    var correctedTs = testTsMinutesAgo_(45);
    var result = updateActivityEvent({ job_id: jobId, event_id: autoMoveEvent.id, ts: correctedTs, to: autoMoveEvent.to });
    assertTrue_(result.data.ok === true, 'la correzione dovrebbe riuscire');

    var visite = readVisiteForJob_(ss, jobId);
    assertEquals_(1, visite.length, 'una visita presente per il job');
    assertEquals_(correctedTs, visite[0].prep_ts, 'prep_ts della visita aperta allineato alla correzione, come su jobs (todo = ruolo prep)');
  });
}

function testDeleteActivityEventRealignsOpenVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Cancellazione allinea visita', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    // M2: una colonna neutrale, non stand_by/done — un rientro diretto da
    // stand_by/done a WIP e' ora vietato anche via Cronologia manuale
    // (RIENTRO_DIRETTO_WIP_NON_CONSENTITO), lo stesso vincolo gia'
    // presente sul drag-and-drop reale (moveJob). Non e' l'oggetto di
    // questo test (riallineamento dopo cancellazione), quindi si passa da
    // una colonna neutrale invece che da un'attesa.
    var neutralCol = columns.filter(function(c) { return c.role === 'neutral'; })[0];
    var t1 = testTsMinutesAgo_(90);
    var t2 = testTsMinutesAgo_(60);
    var t3 = testTsMinutesAgo_(30);
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: wipCol.id });
    var e2 = addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: neutralCol.id });
    addActivityEvent({ job_id: jobId, type: 'move', ts: t3, to: wipCol.id, force: true });

    deleteActivityEvent({ job_id: jobId, event_id: e2.data.event.id });

    var visite = readVisiteForJob_(ss, jobId);
    assertEquals_(1, visite.length, 'una visita presente per il job');
    assertEquals_(t3, visite[0].start_ts, 'start_ts della visita aperta riallineato dopo la cancellazione, come su jobs');
  });
}

function testMigrateToActivityLogAlignsOpenVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Migrazione allinea visita', size_class: 'M' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    var pastArrival = testTsMinutesAgo_(180);
    job.arrival_ts = pastArrival;
    job.activity_log_json = '[]';
    writeJobToRow_(sheet, row, headers, job);

    migrateToActivityLog({ env: 'test' });

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(1, visite.length, 'la migrazione Fase F allinea anche la visita aperta');
    assertEquals_(pastArrival, visite[0].incarico_ts, 'incarico_ts della visita aperta allineato dal backfill, come su jobs');
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

// La casella "Chiuso" (ex "Fatturato") attiva/svuota incarico_chiuso_ts
// alla spunta, non solo il booleano invoiced — richiesto da Marco dopo
// aver scoperto che la vecchia casella non registrava nessuna data.
function testUpdateJobInvoicedTogglesIncaricoChiusoTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Chiusura incarico' }).data;
    assertTrue_(!created.job.incarico_chiuso_ts, 'incarico_chiuso_ts vuoto alla creazione');

    var closed = updateJob({ job_id: created.job_id, invoiced: true });
    assertTrue_(Boolean(closed.data.job.incarico_chiuso_ts), 'incarico_chiuso_ts valorizzato alla spunta di "Chiuso"');

    var closedTs = closed.data.job.incarico_chiuso_ts;
    var closedAgain = updateJob({ job_id: created.job_id, invoiced: true });
    assertEquals_(closedTs, closedAgain.data.job.incarico_chiuso_ts, 'nessun re-stamp se invoiced era gia\' true (non e\' una transizione)');

    var reopened = updateJob({ job_id: created.job_id, invoiced: false });
    assertTrue_(!reopened.data.job.incarico_chiuso_ts, 'incarico_chiuso_ts svuotato togliendo la spunta');
  });
}

// --- N2 (DESIGN_archiviazione.md, §4/§6b/§8c): moveJobToSheet_ e i suoi
// wrapper (archiveJob_/cestinaJob_/ripristinaJob_), eleggibilita'
// all'archiviazione, deleteJob riconvertita a Cestino, svuotamento
// automatico di incarico_chiuso_ts su rientro reale ---

function testArchiveJobMovesJobAndVisiteToArchivio() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso da archiviare', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });
    updateJob({ job_id: created.job_id, invoiced: true });

    var visiteBefore = readVisiteForJob_(ss, created.job_id);
    assertTrue_(visiteBefore.length >= 1, 'il job deve avere almeno una visita prima di archiviare');

    var archived = archiveJob_(created.job_id);
    assertTrue_(archived.success, 'archiveJob_ dovrebbe riuscire su un caso chiuso');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(0, jobsAfter.length, 'il job non deve piu\' essere in jobs dopo l\'archiviazione');

    // resetTestDatabase_ non svuota jobs_archivio/jobs_cestino tra un test
    // e l'altro (per design, pre-N2: sono fuori dal suo scopo) - lo
    // spreadsheet di test e' condiviso da tutta la suite, quindi qui si
    // filtra sempre per job_id invece di assumere la lunghezza assoluta
    // della tabella.
    var archivio = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, archivio.length, 'il job deve trovarsi in jobs_archivio');
    assertTrue_(Boolean(archivio[0].archiviato_ts), 'archiviato_ts valorizzato');

    var visiteArchivio = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO)).filter(function(v) { return v.job_id === created.job_id; });
    assertEquals_(visiteBefore.length, visiteArchivio.length, 'tutte le visite del caso devono seguire il job in visite_archivio');

    var visiteRimaste = readVisiteForJob_(ss, created.job_id);
    assertEquals_(0, visiteRimaste.length, 'nessuna visita deve restare su \'visite\' dopo l\'archiviazione');
  });
}

function testArchiveJobRejectsCaseNotClosed() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso ancora aperto', size_class: 'S' }).data;

    var failed = false;
    try {
      archiveJob_(created.job_id);
    } catch (err) {
      failed = err.message.indexOf('non e ancora chiuso') !== -1;
    }
    assertTrue_(failed, 'archiveJob_ deve rifiutare un caso senza incarico_chiuso_ts');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(1, jobsAfter.length, 'il job non deve essere stato spostato');
  });
}

function testArchiveJobIsIdempotentOnSecondCall() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Doppia archiviazione', size_class: 'S' }).data;
    updateJob({ job_id: created.job_id, invoiced: true });

    var first = archiveJob_(created.job_id);
    assertTrue_(first.success, 'prima archiviazione dovrebbe riuscire');

    var second = archiveJob_(created.job_id);
    assertTrue_(second.success, 'seconda chiamata non deve fallire (idempotenza)');
    assertTrue_(Boolean(second.data.already_moved), 'seconda chiamata deve segnalare already_moved');

    var archivio = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, archivio.length, 'nessuna riga duplicata in jobs_archivio dopo la seconda chiamata');
  });
}

function testArchiveJobApiActionRejectsCaseNotClosed() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Via azione API, non chiuso', size_class: 'S' }).data;

    var failed = false;
    try {
      archiveJob({ job_id: created.job_id });
    } catch (err) {
      failed = err.message.indexOf('non e ancora chiuso') !== -1;
    }
    assertTrue_(failed, 'l\'azione archiveJob deve rifiutare un caso non chiuso, stessa regola di archiveJob_');
  });
}

function testCestinaJobMovesJobAndVisiteRegardlessOfClosure() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso mai chiuso', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });

    var cestinato = cestinaJob_(created.job_id);
    assertTrue_(cestinato.success, 'cestinaJob_ non deve richiedere incarico_chiuso_ts');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(0, jobsAfter.length, 'il job deve lasciare jobs');

    // Filtrato per job_id: jobs_cestino non viene svuotato tra un test e
    // l'altro (vedi nota sopra in testArchiveJobMovesJobAndVisiteToArchivio).
    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, cestino.length, 'il job deve trovarsi in jobs_cestino');
    assertTrue_(Boolean(cestino[0].cestinato_ts), 'cestinato_ts valorizzato');

    var visiteCestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO)).filter(function(v) { return v.job_id === created.job_id; });
    assertTrue_(visiteCestino.length >= 1, 'le visite del caso devono seguirlo nel cestino');
  });
}

function testDeleteJobMovesToCestinoInsteadOfDeleting() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Cancellazione riconvertita', size_class: 'S' }).data;

    var response = deleteJob({ job_id: created.job_id });
    assertTrue_(response.success, 'deleteJob deve continuare a rispondere con successo');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(0, jobsAfter.length, 'il job non deve piu\' essere in jobs');

    // Filtrato per job_id: jobs_cestino non viene svuotato tra un test e
    // l'altro (vedi nota in testArchiveJobMovesJobAndVisiteToArchivio).
    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, cestino.length, 'deleteJob deve spostare la riga in jobs_cestino, non eliminarla');
  });
}

function testRipristinaJobRestoresJobAndVisiteToOriginalStatus() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Da ripristinare', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });

    cestinaJob_(created.job_id);
    var ripristinato = ripristinaJob_(created.job_id);
    assertTrue_(ripristinato.success, 'ripristinaJob_ dovrebbe riuscire');
    assertEquals_('wip', ripristinato.data.job.status, 'lo status originale deve essere preservato quando la colonna esiste ancora');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_(1, jobsAfter.length, 'il job deve essere tornato su jobs');

    // Filtrato per job_id: jobs_cestino non viene svuotato tra un test e
    // l'altro (vedi nota in testArchiveJobMovesJobAndVisiteToArchivio).
    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(0, cestino.length, 'il job non deve piu\' essere nel cestino dopo il ripristino');

    var visiteAfter = readVisiteForJob_(ss, created.job_id);
    assertTrue_(visiteAfter.length >= 1, 'le visite devono essere tornate su \'visite\'');
  });
}

function testRipristinaJobFallsBackToBacklogColumnWhenStatusNoLongerExists() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Cestinato con colonna poi rimossa', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    // Simula un job la cui colonna di provenienza non esiste piu' in
    // columns_json al momento del ripristino (scenario descritto in §6b).
    job.status = 'colonna_rimossa';
    writeJobToRow_(sheet, row, headers, job);

    cestinaJob_(created.job_id);
    var ripristinato = ripristinaJob_(created.job_id);
    assertTrue_(ripristinato.success, 'ripristinaJob_ dovrebbe riuscire anche con lo status non piu\' valido');
    assertEquals_('backlog', ripristinato.data.job.status, 'fallback alla prima colonna di ruolo backlog');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
    assertEquals_('backlog', jobsAfter[0].status, 'status persistito come backlog dopo il fallback');
  });
}

function testMoveJobToSheetIsIdempotentWhenCalledTwice() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Doppia cestinazione', size_class: 'S' }).data;

    var first = cestinaJob_(created.job_id);
    assertTrue_(first.success, 'prima chiamata dovrebbe riuscire');
    var second = cestinaJob_(created.job_id);
    assertTrue_(second.success && Boolean(second.data.already_moved), 'seconda chiamata deve essere un no-op idempotente');

    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, cestino.length, 'nessuna riga duplicata in jobs_cestino dopo la seconda chiamata');
  });
}

function testMoveJobClearsIncaricoChiusoTsOnRealReentryFromDone() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro dopo chiusura', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });
    var closed = updateJob({ job_id: created.job_id, invoiced: true });
    assertTrue_(Boolean(closed.data.job.incarico_chiuso_ts), 'incarico_chiuso_ts valorizzato prima del rientro');

    var reentry = moveJob({ job_id: created.job_id, status: 'todo' });
    assertTrue_(reentry.success, 'il rientro da done a todo dovrebbe riuscire');
    assertTrue_(!reentry.data.job.incarico_chiuso_ts, 'incarico_chiuso_ts deve essere svuotato su un rientro reale (nuova visita)');

    var jobRow = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS))[0];
    assertTrue_(!jobRow.incarico_chiuso_ts, 'incarico_chiuso_ts deve essere svuotato anche sulla riga persistita');
  });
}

function testMoveJobDoesNotClearIncaricoChiusoTsWhenNoNewVisitOpens() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Nessun rientro reale', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    var closed = updateJob({ job_id: created.job_id, invoiced: true });
    assertTrue_(Boolean(closed.data.job.incarico_chiuso_ts), 'incarico_chiuso_ts valorizzato');

    // wait_client -> wait_authority: due colonne di attesa diverse, nessuna
    // nuova visita si apre (closesVisit resta falso, sez. 2 del design
    // modello caso/visita) - incarico_chiuso_ts non deve essere toccato.
    var moved = moveJob({ job_id: created.job_id, status: 'wait_authority' });
    assertTrue_(moved.success, 'spostamento tra due colonne di attesa dovrebbe riuscire');
    assertTrue_(Boolean(moved.data.job.incarico_chiuso_ts), 'incarico_chiuso_ts non deve essere toccato se non si apre una nuova visita');
  });
}

// --- N3 (DESIGN_archiviazione.md, §4.1/§9): trigger automatico di
// archiviazione. Solo il codice scansionato/archiviante e' testato qui -
// installaTriggerArchiviazioneAutomatica (che chiama ScriptApp.newTrigger)
// non e' invocata da nessun test, per lo stesso motivo per cui non e'
// invocata da nessun altro codice di produzione: e' il passo dietro il
// gate umano di §9, riservato all'esecuzione manuale di Marco dopo
// conferma. ---

function testArchiveEligibleJobsArchivesCasesPastThreshold() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Chiuso da 35 giorni', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.incarico_chiuso_ts = testIsoDaysAgo_(new Date(), 35);
    writeJobToRow_(sheet, row, headers, job);

    var result = archiveEligibleJobs_();
    assertEquals_(1, result.jobs_archived, 'un caso chiuso da 35 giorni (soglia default 30) deve essere archiviato');
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) !== -1, 'il job_id specifico deve comparire tra gli archiviati');

    var jobsAfter = readTable_(sheet).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(0, jobsAfter.length, 'il job deve aver lasciato jobs');

    var archivio = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, archivio.length, 'il job deve trovarsi in jobs_archivio');
  });
}

function testArchiveEligibleJobsSkipsCasesBelowThreshold() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Chiuso da soli 10 giorni', size_class: 'S' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.incarico_chiuso_ts = testIsoDaysAgo_(new Date(), 10);
    writeJobToRow_(sheet, row, headers, job);

    var result = archiveEligibleJobs_();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) === -1, 'un caso chiuso da soli 10 giorni (soglia default 30) non deve essere archiviato');

    var jobsAfter = readTable_(sheet).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, jobsAfter.length, 'il job deve restare su jobs');
  });
}

function testArchiveEligibleJobsSkipsCasesNeverClosed() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Mai chiuso', size_class: 'S' }).data;

    var result = archiveEligibleJobs_();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) === -1, 'un caso senza incarico_chiuso_ts non deve mai essere considerato eleggibile');
  });
}

function testArchiveEligibleJobsUsesConfiguredThreshold() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    writeConfigValue_('archiviazione_giorni_default', '5');

    var created = addJob({ title: 'Chiuso da 10 giorni, soglia a 5', size_class: 'S' }).data;
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.incarico_chiuso_ts = testIsoDaysAgo_(new Date(), 10);
    writeJobToRow_(sheet, row, headers, job);

    var result = archiveEligibleJobs_();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) !== -1, 'con soglia configurata a 5 giorni, un caso chiuso da 10 deve essere archiviato');
  });
}

function testArchiveEligibleJobsNeverTouchesCestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Cestinato, non archiviabile automaticamente', size_class: 'S' }).data;
    cestinaJob_(created.job_id);

    var result = archiveEligibleJobs_();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) === -1, 'un job nel cestino non e\' piu\' in jobs: la scansione non lo tocca');

    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, cestino.length, 'il job deve restare nel cestino, l\'archiviazione automatica non lo riguarda mai');
  });
}

function testEseguiArchiviazioneAutomaticaGiornalieraReturnsScanResult() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Via handler del trigger', size_class: 'S' }).data;
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.incarico_chiuso_ts = testIsoDaysAgo_(new Date(), 40);
    writeJobToRow_(sheet, row, headers, job);

    var result = eseguiArchiviazioneAutomaticaGiornaliera();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) !== -1, 'il handler del trigger deve archiviare lo stesso job che archiveEligibleJobs_ archivierebbe');
  });
}

// Bugfix 2026-08-19: regressione sull'incidente reale — la Script Property
// condivisa SIGMAFLOW_SPREADSHEET_ID e' rimasta bloccata su un valore
// sporco (un'esecuzione precedente interrotta prima del proprio finally di
// ripristino). Simulato qui sporcando la property con un id chiaramente
// diverso da TEST/PROD prima di far scattare il trigger: con il bug
// presente, archiveEligibleJobs_() avrebbe risolto quello stesso id
// sporco (via getSpreadsheet_() ambientale) invece del foglio TEST vero.
function testEseguiArchiviazioneAutomaticaGiornalieraIgnoresDirtyAmbientSpreadsheetProperty() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Property ambientale sporca', size_class: 'S' }).data;
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.incarico_chiuso_ts = testIsoDaysAgo_(new Date(), 40);
    writeJobToRow_(sheet, row, headers, job);

    var props = PropertiesService.getScriptProperties();
    props.setProperty(SIGMAFLOW.PROP_SPREADSHEET_ID, 'id-sporco-non-test-non-prod');

    var result = eseguiArchiviazioneAutomaticaGiornaliera();
    assertTrue_(result.archived_job_ids.indexOf(created.job_id) !== -1, 'il trigger deve archiviare sul foglio TEST vero, non su quello indicato dalla property sporca');

    var archivio = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, archivio.length, 'il caso deve trovarsi nell\'Archivio del vero foglio TEST');

    assertEquals_('id-sporco-non-test-non-prod', props.getProperty(SIGMAFLOW.PROP_SPREADSHEET_ID), 'la property sporca preesistente deve restare intatta dopo l\'esecuzione (withEnvironment_ la ripristina sempre)');

    props.deleteProperty(SIGMAFLOW.PROP_SPREADSHEET_ID);
  });
}

// --- N4 (DESIGN_archiviazione.md, §6/§6b): viste Archivio/Cestino
// (getArchivio/getCestino) e azioni Ripristina/Elimina definitivamente/
// Svuota cestino. jobs_archivio/jobs_cestino non vengono svuotati tra un
// test e l'altro (nota gia' presente sopra, da N2) - le asserzioni
// filtrano sempre per job_id, tranne dopo svuotaCestino() stessa, che
// azzera davvero il foglio nello stesso test che la chiama. ---

function testGetArchivioReturnsAnagraficaAndVisitCount() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso in archivio', client: 'Cliente X', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });
    updateJob({ job_id: created.job_id, invoiced: true });
    archiveJob_(created.job_id);

    var result = getArchivio();
    assertTrue_(result.success, 'getArchivio deve riuscire');
    var item = result.data.items.filter(function(i) { return i.job_id === created.job_id; })[0];
    assertTrue_(Boolean(item), 'il caso archiviato deve comparire nella lista');
    assertEquals_('Caso in archivio', item.title, 'anagrafica: titolo');
    assertEquals_('Cliente X', item.client, 'anagrafica: cliente');
    assertTrue_(Boolean(item.archiviato_ts), 'riepilogo: archiviato_ts valorizzato');
    assertTrue_(Boolean(item.incarico_chiuso_ts), 'riepilogo: incarico_chiuso_ts valorizzato');
    assertTrue_(item.total_visits >= 1, 'riepilogo: numero totale di visite');
    assertEquals_(undefined, item.cestinato_ts, 'un caso in archivio non ha cestinato_ts');
  });
}

function testGetCestinoReturnsAnagraficaAndVisitCount() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso nel cestino', client: 'Cliente Y', size_class: 'S' }).data;
    cestinaJob_(created.job_id);

    var result = getCestino();
    assertTrue_(result.success, 'getCestino deve riuscire');
    var item = result.data.items.filter(function(i) { return i.job_id === created.job_id; })[0];
    assertTrue_(Boolean(item), 'il caso cestinato deve comparire nella lista');
    assertEquals_('Caso nel cestino', item.title, 'anagrafica: titolo');
    assertTrue_(Boolean(item.cestinato_ts), 'riepilogo: cestinato_ts valorizzato');
    assertEquals_(undefined, item.archiviato_ts, 'un caso nel cestino non ha archiviato_ts');
  });
}

// M1 (DESIGN_dashboard.md, §2): su PROD i fogli archivio/cestino non
// esistono ancora (nessuna sessione ha mai eseguito l'allineamento
// schema li'). Simulato qui cancellando i quattro fogli dopo un setup
// altrimenti normale - getArchivio_/getCestino_/getMetrics devono
// comportarsi come "archivio/cestino vuoto", mai lanciare.
function testGetArchivioReturnsEmptyWhenSheetsMissing() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO));
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));

    var result = getArchivio();
    assertTrue_(result.success, 'getArchivio non deve lanciare se i fogli archivio non esistono');
    assertEquals_(0, result.data.items.length, 'archivio deve risultare vuoto, non un errore');
  });
}

function testGetCestinoReturnsEmptyWhenSheetsMissing() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO));
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO));

    var result = getCestino();
    assertTrue_(result.success, 'getCestino non deve lanciare se i fogli cestino non esistono');
    assertEquals_(0, result.data.items.length, 'cestino deve risultare vuoto, non un errore');
  });
}

function testGetMetricsReturnsEmptyArchivedDataWhenSheetsMissing() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_ARCHIVIO));
    ss.deleteSheet(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));
    addJob({ title: 'Caso attivo, PROD senza archivio', size_class: 'M' });

    var result = getMetrics();
    assertTrue_(result.success, 'getMetrics non deve lanciare se i fogli archivio non esistono');
    assertEquals_(8, result.data.systemState.pointsMetrics.open_points, 'i punti aperti restano leggibili anche senza i fogli archivio');
  });
}

function testRipristinaJobApiActionRestoresJob() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Via azione API ripristinaJob', size_class: 'S' }).data;
    cestinaJob_(created.job_id);

    var result = ripristinaJob({ job_id: created.job_id });
    assertTrue_(result.success, 'l\'azione ripristinaJob deve riuscire, stessa regola di ripristinaJob_');
    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(1, jobsAfter.length, 'il job deve essere tornato su jobs');
  });
}

function testEliminaJobDefinitivamenteRemovesJobAndVisiteFromCestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Da eliminare definitivamente', size_class: 'S' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    var visiteBefore = readVisiteForJob_(ss, created.job_id);
    assertTrue_(visiteBefore.length >= 1, 'il job deve avere almeno una visita prima di cestinarlo');
    cestinaJob_(created.job_id);

    var result = eliminaJobDefinitivamente({ job_id: created.job_id });
    assertTrue_(result.success, 'eliminaJobDefinitivamente deve riuscire su un job presente nel Cestino');

    var cestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).filter(function(j) { return j.job_id === created.job_id; });
    assertEquals_(0, cestino.length, 'il job non deve piu\' essere nel Cestino');
    var visiteCestino = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO)).filter(function(v) { return v.job_id === created.job_id; });
    assertEquals_(0, visiteCestino.length, 'anche le visite del job devono essere state eliminate dal Cestino');
  });
}

function testEliminaJobDefinitivamenteThrowsWhenJobNotInCestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());

    var failed = false;
    try {
      eliminaJobDefinitivamente({ job_id: 'JOB-INESISTENTE' });
    } catch (err) {
      failed = err.message.indexOf('non trovato nel Cestino') !== -1;
    }
    assertTrue_(failed, 'eliminaJobDefinitivamente deve rifiutare un job_id non presente nel Cestino');
  });
}

function testSvuotaCestinoRemovesAllRowsFromCestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var createdA = addJob({ title: 'Cestino A', size_class: 'S' }).data;
    var createdB = addJob({ title: 'Cestino B', size_class: 'S' }).data;
    cestinaJob_(createdA.job_id);
    cestinaJob_(createdB.job_id);

    var beforeCount = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO)).length;
    assertTrue_(beforeCount >= 2, 'il Cestino deve contenere almeno i due job appena cestinati prima di svuotarlo');

    var result = svuotaCestino();
    assertTrue_(result.success, 'svuotaCestino deve riuscire');
    assertEquals_(beforeCount, result.data.deleted_count, 'deleted_count deve corrispondere al totale delle righe cancellate');

    var cestinoAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS_CESTINO));
    assertEquals_(0, cestinoAfter.length, 'il Cestino deve risultare completamente vuoto');
    var visiteCestinoAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE_CESTINO));
    assertEquals_(0, visiteCestinoAfter.length, 'anche visite_cestino deve risultare vuoto');
  });
}

// N5 (DESIGN_archiviazione.md, §7): "Duplica" crea un caso NUOVO attivo -
// copia solo titolo/cliente/tag/assegnatario/ambasciatore/taglia, tutto il
// resto riparte da zero come per un caso creato a mano (riusa addJob).
function testDuplicaJobCreatesNewActiveJobCopyingAnagrafica() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var original = addJob({
      title: 'Caso originale',
      client: 'Cliente Z',
      ambassador: '',
      tag: 'urgente',
      assignee: 'Mario',
      size_class: 'L'
    }).data;
    moveJob({ job_id: original.job_id, status: 'done' });
    updateJob({ job_id: original.job_id, invoiced: true });
    archiveJob_(original.job_id);

    var result = duplicaJob_(original.job_id);
    assertTrue_(result.success, 'duplicaJob_ deve riuscire su un job presente in Archivio');
    var duplicated = result.data.job;
    assertTrue_(duplicated.job_id !== original.job_id, 'il caso duplicato deve avere un job_id nuovo');
    assertEquals_('Caso originale', duplicated.title, 'titolo copiato');
    assertEquals_('Cliente Z', duplicated.client, 'cliente copiato');
    assertEquals_('urgente', duplicated.tag, 'tag copiato');
    assertEquals_('Mario', duplicated.assignee, 'assegnatario copiato');
    assertEquals_('L', duplicated.size_class, 'taglia copiata');

    var jobsAfter = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === duplicated.job_id; });
    assertEquals_(1, jobsAfter.length, 'il caso duplicato deve essere attivo su jobs');
  });
}

function testDuplicaJobDoesNotCopyClosureStatusOrVisitHistory() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var original = addJob({ title: 'Caso con storico', size_class: 'M' }).data;
    moveJob({ job_id: original.job_id, status: 'wip' });
    moveJob({ job_id: original.job_id, status: 'done' });
    updateJob({ job_id: original.job_id, invoiced: true });
    archiveJob_(original.job_id);

    var duplicated = duplicaJob_(original.job_id).data.job;
    assertTrue_(!duplicated.incarico_chiuso_ts, 'il duplicato non deve ereditare la chiusura incarico');
    assertEquals_(firstColumnIdByRole_('backlog'), duplicated.status, 'il duplicato riparte dalla colonna iniziale, non dallo status archiviato');

    var log = JSON.parse(duplicated.activity_log_json || '[]');
    assertEquals_(1, log.length, 'il duplicato deve avere solo il proprio evento di creazione, nessuna cronologia pregressa');

    var visite = readVisiteForJob_(ss, duplicated.job_id);
    assertEquals_(1, visite.length, 'il duplicato deve avere solo la sua visita 1, nessuna visita pregressa copiata');
  });
}

function testDuplicaJobThrowsWhenJobNotInArchivio() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());

    var failed = false;
    try {
      duplicaJob_('JOB-INESISTENTE');
    } catch (err) {
      failed = err.message.indexOf('non trovato in Archivio') !== -1;
    }
    assertTrue_(failed, 'duplicaJob_ deve rifiutare un job_id non presente in Archivio');
  });
}

function testDuplicaJobApiActionWrapsDuplicaJob() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var original = addJob({ title: 'Via azione API duplicaJob', size_class: 'S' }).data;
    updateJob({ job_id: original.job_id, invoiced: true });
    archiveJob_(original.job_id);

    var result = routeAction_({ action: 'duplicaJob', job_id: original.job_id });
    assertTrue_(result.success, 'l\'azione duplicaJob deve riuscire, stessa regola di duplicaJob_');
    assertTrue_(result.data.job.job_id !== original.job_id, 'l\'azione API deve restituire un job_id nuovo');
  });
}

function testAmbassadorOption() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    updateOptionList({ kind: 'ambassadors', operation: 'add', value: 'Referente Cliente' });
    var created = addJob({
      title: 'Progetto con referente',
      client: 'Cliente prova',
      ambassador: 'Referente Cliente'
    }).data;
    assertEquals_('Referente Cliente', created.job.ambassador, 'ambasciatore in creazione');
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
  var jobs = [{
    job_id: 'JOB-TEST-1',
    status: 'backlog',
    arrival_ts: nowIso_(),
    visit_number: 1
  }];
  var visite = [{
    job_id: 'JOB-TEST-1',
    numero_visita: 1,
    apertura_ts: nowIso_()
  }];
  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_('low', state.dataQuality.level, 'qualita dati insufficiente');
  assertEquals_('unknown', state.systemStatus.code, 'stato non stimabile');
  assertEquals_(null, state.capacityMetrics.effective_load, 'carico non stimabile');
  assertEquals_(null, state.timeMetrics.average_service_days, 'tempo medio non stimabile');
  assertEquals_(null, buildSystemState_([], [], SIGMAFLOW.DEFAULT_CONFIG, now).reworkMetrics.initiatives_with_rework, 'rientri non stimabili senza iniziative');
}

// M4 (DESIGN_dashboard.md, §4.2): stabilityMetrics (Cap. 15) esposta in
// systemState solo quando ci sono abbastanza campioni di tempo completati
// (stessa soglia >=5 di enoughCompleted) - stesso schema di 5 visite
// completate di testSystemStateWorkload.
function testBuildSystemStateExposesStabilityMetrics() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 2 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [];
  var visite = [];
  for (var i = 0; i < 5; i++) {
    jobs.push({ job_id: 'JOB-STAB-' + i, status: 'done', arrival_ts: arrival, visit_number: 1 });
    visite.push({ job_id: 'JOB-STAB-' + i, numero_visita: 1, apertura_ts: arrival, start_ts: arrival, consegna_ts: nowIso_() });
  }

  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertTrue_(Boolean(state.stabilityMetrics), 'stabilityMetrics valorizzata con abbastanza campioni');
  assertTrue_(state.stabilityMetrics.margin !== null, 'margin calcolato');
  assertTrue_(['stable', 'stressed', 'critical', 'unstable'].indexOf(state.stabilityMetrics.system_state) !== -1, 'system_state e\' uno dei codici noti');
}

// M5 (DESIGN_dashboard.md, §4.2): T_cliente/T_ente/T_interno - somma di
// un campo gia' accumulato per visita (accumulateWaitTime_, Kanban.gs)
// nella finestra osservata, mai finora esposto.
function testBuildSystemStateSumsWaitTimeByType() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 2 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [{ job_id: 'JOB-WAIT-BREAKDOWN', status: 'backlog', arrival_ts: arrival, visit_number: 1 }];
  var visite = [{
    job_id: 'JOB-WAIT-BREAKDOWN',
    numero_visita: 1,
    apertura_ts: arrival,
    t_cliente_d: 3,
    t_ente_d: 5,
    t_interno_d: 1
  }];

  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_(3, state.waitTimeMetrics.client_days, 'attesa cliente sommata dalla visita');
  assertEquals_(5, state.waitTimeMetrics.authority_days, 'attesa enti sommata dalla visita');
  assertEquals_(1, state.waitTimeMetrics.internal_days, 'attesa interna sommata dalla visita');
  assertEquals_(9, state.waitTimeMetrics.total_days, 'totale = somma dei tre tipi');
}

// M6 (DESIGN_dashboard.md, §4.2): B_lat(t) - consegne recenti la cui
// visita non e' mai rientrata e il cui caso non e' formalmente chiuso
// contano come esposizione futura; un caso gia' chiuso o gia' rientrato
// non deve comparire.
function testBuildSystemStateCountsLatentBacklogFromRecentUnclosedDeliveries() {
  var now = new Date();
  var jobs = [
    { job_id: 'JOB-LATENT-OPEN', status: 'done', arrival_ts: nowIso_(), visit_number: 1, incarico_chiuso_ts: '' },
    { job_id: 'JOB-LATENT-CLOSED', status: 'done', arrival_ts: nowIso_(), visit_number: 1, incarico_chiuso_ts: nowIso_() },
    { job_id: 'JOB-LATENT-REENTERED', status: 'backlog', arrival_ts: nowIso_(), visit_number: 2, incarico_chiuso_ts: '' }
  ];
  var visite = [
    { job_id: 'JOB-LATENT-OPEN', numero_visita: 1, apertura_ts: nowIso_(), consegna_ts: nowIso_(), rientro_ts: '' },
    { job_id: 'JOB-LATENT-CLOSED', numero_visita: 1, apertura_ts: nowIso_(), consegna_ts: nowIso_(), rientro_ts: '' },
    { job_id: 'JOB-LATENT-REENTERED', numero_visita: 1, apertura_ts: nowIso_(), consegna_ts: nowIso_(), rientro_ts: nowIso_() },
    { job_id: 'JOB-LATENT-REENTERED', numero_visita: 2, apertura_ts: nowIso_() }
  ];

  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_(1, state.latentBacklogMetrics.count, 'solo la consegna non chiusa e mai rientrata conta come esposizione futura');
}

// M7 (DESIGN_dashboard.md, §4.2), fix del 2026-08-20 (segnalato da
// Marco: 0 campioni su dati reali con 8-9 rientri veri, perche' un
// rientro a SigmaFlow quasi mai passa da consegna_ts - vedi la nota
// "estensione deliberata" su delayProfile_, Model.gs): un rientro e'
// qualunque visita con rientro_ts valorizzato, D_i e' il tempo di
// attesa reale accumulato (t_cliente_d+t_ente_d+t_interno_d), non
// rientro_ts - consegna_ts. Alpha e kernel restano null sotto la
// soglia minima di campioni (5 rientri osservati), coerente con
// enoughCompleted altrove.
function testDelayProfileNullBelowMinimumSamples() {
  var visite = [
    { job_id: 'JOB-1', numero_visita: 2, rientro_ts: '2026-01-05T09:00:00+02:00', t_cliente_d: 4 },
    { job_id: 'JOB-2', numero_visita: 1, start_ts: '2026-01-01T09:00:00+02:00', consegna_ts: '2026-01-01T09:00:00+02:00' }
  ];

  var profile = delayProfile_(visite);

  assertEquals_(1, profile.sample_size, 'un solo rientro osservato');
  assertEquals_(null, profile.alpha, 'alpha non stimabile sotto la soglia minima');
  assertEquals_(null, profile.kernel, 'kernel non stimabile sotto la soglia minima');
}

// Riproduce lo scenario reale segnalato da Marco: rientri che chiudono
// una visita SENZA mai passare da consegna_ts (le colonne di attesa
// stanno prima di "DA INVIARE/FATTURARE") - 5 rientri, tutti con 3
// giorni di attesa reale accumulata, tutti entro la prima settimana
// (bin 0).
function testDelayProfileComputesAlphaAndKernelFromRealReentries() {
  var visite = [];
  for (var i = 0; i < 5; i++) {
    visite.push({
      job_id: 'JOB-DELAY-' + i,
      numero_visita: 2,
      rientro_ts: '2026-01-03T09:00:00+02:00',
      rientro_da: 'wait_client',
      t_cliente_d: 3,
      t_ente_d: 0,
      t_interno_d: 0
    });
  }

  var profile = delayProfile_(visite);

  assertEquals_(5, profile.sample_size, '5 rientri osservati');
  assertEquals_(1, profile.alpha, 'alpha = 5 rientri / 5 visite chiuse (tutte rientrate)');
  assertEquals_(1, profile.kernel[0], 'tutti i rientri nel primo bin (0-6 giorni di attesa)');
  assertEquals_(0, profile.kernel[1], 'nessun rientro nel secondo bin');
  assertEquals_(1, profile.kernel.reduce(function(sum, share) { return sum + share; }, 0), 'il kernel somma a 1');
}

// Una visita consegnata (mai rientrata) non produce un campione D_i, ma
// conta comunque come "visita chiusa" al denominatore di alpha - stessa
// nozione di chiusura di visitServiceTimeDays_ (consegnata O rientrata).
function testDelayProfileAlphaCountsAllClosedVisitsNotOnlyReentered() {
  var visite = [];
  for (var i = 0; i < 5; i++) {
    visite.push({ job_id: 'JOB-REENTER-' + i, numero_visita: 2, rientro_ts: '2026-01-03T09:00:00+02:00', t_cliente_d: 2 });
  }
  for (var j = 0; j < 5; j++) {
    visite.push({ job_id: 'JOB-DELIVERED-' + j, numero_visita: 1, start_ts: '2026-01-01T09:00:00+02:00', consegna_ts: '2026-01-02T09:00:00+02:00' });
  }

  var profile = delayProfile_(visite);

  assertEquals_(5, profile.sample_size, 'solo le visite rientrate producono un campione D_i');
  assertEquals_(0.5, profile.alpha, 'alpha = 5 rientri / 10 visite chiuse in totale (rientrate + consegnate)');
}

function testBuildSystemStateExposesDelayProfileInSystemState() {
  var now = new Date();
  var jobs = [{ job_id: 'JOB-PROFILE', status: 'backlog', arrival_ts: nowIso_(), visit_number: 2 }];
  var visite = [];
  for (var i = 0; i < 5; i++) {
    visite.push({ job_id: 'JOB-PROFILE-' + i, numero_visita: 2, rientro_ts: '2026-01-08T09:00:00+02:00', t_ente_d: 8 });
  }

  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertTrue_(Boolean(state.delayProfileMetrics), 'delayProfileMetrics presente in systemState');
  assertEquals_(5, state.delayProfileMetrics.sample_size, 'campione letto da tutta la storia, non solo dalla finestra osservata');
  assertEquals_(1, state.delayProfileMetrics.kernel[1], 'rientro dopo 8 giorni di attesa cade nel secondo bin (7-13 giorni)');
}

function testBuildSystemStateStabilityMetricsNullWhenInsufficientData() {
  var now = new Date();
  var jobs = [{ job_id: 'JOB-TEST-1', status: 'backlog', arrival_ts: nowIso_(), visit_number: 1 }];
  var visite = [{ job_id: 'JOB-TEST-1', numero_visita: 1, apertura_ts: nowIso_() }];
  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_(null, state.stabilityMetrics, 'stabilityMetrics non stimabile senza abbastanza campioni');
}

// N6 (DESIGN_archiviazione.md, §8/§9): le metriche storiche su una
// finestra temporale devono includere anche l'Archivio (unione diretta,
// nessun filtro) — "punti aggiunti"/"punti completati" ne fanno parte
// (arrival_ts/done_ts nel periodo osservato), a differenza di "punti
// aperti" (sotto, mai l'archivio).
function testBuildSystemStateIncludesArchivedJobsInHistoricPoints() {
  var now = new Date();
  var activeJobs = [{ job_id: 'ACTIVE-1', status: 'backlog', arrival_ts: nowIso_(), size_points: 5, size_class: 'M' }];
  var archivedJobs = [{ job_id: 'ARCHIVED-1', status: 'done', arrival_ts: nowIso_(), done_ts: nowIso_(), size_points: 8, size_class: 'M' }];
  var state = buildSystemState_(activeJobs, [], SIGMAFLOW.DEFAULT_CONFIG, now, archivedJobs, []);
  assertEquals_(13, state.pointsMetrics.added_points, 'punti aggiunti devono includere anche i casi archiviati');
  assertEquals_(8, state.pointsMetrics.completed_points, 'punti completati devono includere anche i casi archiviati');
}

// §8: "Lavoro presente"/"punti aperti" restano SOLO sui job attivi, mai
// sull'archivio — anche nel caso limite (non atteso in pratica, ma non
// impedito dallo schema) in cui lo status conservato di un job archiviato
// mappi ancora su una colonna non-'done'.
function testBuildSystemStateOpenPointsNeverIncludeArchivedJobs() {
  var now = new Date();
  var activeJobs = [{ job_id: 'ACTIVE-1', status: 'backlog', arrival_ts: nowIso_(), size_points: 5, size_class: 'M' }];
  var archivedJobs = [{ job_id: 'ARCHIVED-1', status: 'backlog', arrival_ts: nowIso_(), size_points: 100, size_class: 'XL' }];
  var state = buildSystemState_(activeJobs, [], SIGMAFLOW.DEFAULT_CONFIG, now, archivedJobs, []);
  assertEquals_(5, state.pointsMetrics.open_points, 'punti aperti devono restare solo sui job attivi, mai sull\'archivio');
  assertEquals_(1, state.pointsMetrics.open_cards, 'conteggio card aperte deve restare solo sui job attivi');
  assertEquals_(1, state.workloadMetrics.ready, 'lavoro presente (pronto) deve restare solo sui job attivi');
}

// "Andamento del carico" (monthBuckets_, via pointsMetrics.timeline) - il
// pannello esplicitamente nominato in §9 come da estendere all'archivio.
function testBuildSystemStateTimelineIncludesArchivedJobs() {
  var now = new Date();
  var archivedJobs = [{ job_id: 'ARCHIVED-1', status: 'done', arrival_ts: nowIso_(), done_ts: nowIso_(), size_points: 8, size_class: 'M' }];
  var state = buildSystemState_([], [], SIGMAFLOW.DEFAULT_CONFIG, now, archivedJobs, []);
  var currentMonthKey = Utilities.formatDate(now, SIGMAFLOW.TZ, 'yyyy-MM');
  var bucket = state.pointsMetrics.timeline.filter(function(b) { return b.key === currentMonthKey; })[0];
  assertTrue_(Boolean(bucket), 'il mese corrente deve comparire nella timeline');
  assertEquals_(8, bucket.entered_points, 'Andamento del carico deve contare i punti entrati dei casi archiviati');
  assertEquals_(8, bucket.completed_points, 'Andamento del carico deve contare i punti completati dei casi archiviati');
}

// "Punti per colonna" (quadro di dettaglio) - jobs_archivio conserva lo
// status che il caso aveva al momento dell'archiviazione (§8), quindi
// compare nella colonna 'done' senza logica speciale.
function testBuildSystemStatePointsByColumnIncludesArchivedJobs() {
  var now = new Date();
  var archivedJobs = [{ job_id: 'ARCHIVED-1', status: 'done', arrival_ts: nowIso_(), done_ts: nowIso_(), size_points: 8, size_class: 'M' }];
  var state = buildSystemState_([], [], SIGMAFLOW.DEFAULT_CONFIG, now, archivedJobs, []);
  var doneColumn = state.pointsMetrics.by_column.filter(function(c) { return c.key === 'done'; })[0];
  assertTrue_(Boolean(doneColumn), 'la colonna "done" deve comparire in "Punti per colonna" grazie al caso archiviato');
  assertEquals_(8, doneColumn.points, 'i punti del caso archiviato devono comparire in "Punti per colonna"');
}

// Flusso/Rientri/Tempi/Capacita' (§8, Parte 1) sono calcolati da 'visite',
// non da 'jobs' - verificano che visiteArchivio venga unita correttamente.
function testBuildSystemStateFlowMetricsIncludeArchivedVisite() {
  var now = new Date();
  var visiteArchivio = [{
    job_id: 'ARCHIVED-1',
    numero_visita: 1,
    apertura_ts: nowIso_(),
    start_ts: nowIso_(),
    consegna_ts: nowIso_()
  }];
  var state = buildSystemState_([], [], SIGMAFLOW.DEFAULT_CONFIG, now, [], visiteArchivio);
  assertEquals_(1, state.flowMetrics.new_initiatives_observed, 'una visita in visite_archivio deve contare come iniziativa osservata nel Flusso');
}

// Verifica end-to-end (non solo unitaria su buildSystemState_): un caso
// realmente archiviato via archiveJob_ deve comparire nelle metriche
// storiche restituite da getMetrics(), senza comparire tra le card aperte.
function testGetMetricsIncludesArchivedCaseInHistoricPoints() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var created = addJob({ title: 'Caso da archiviare per metriche', size_class: 'L' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'done' });
    updateJob({ job_id: created.job_id, invoiced: true });
    var points = SIGMAFLOW.SIZE_POINTS.L;
    archiveJob_(created.job_id);

    var metrics = getMetrics();
    assertTrue_(metrics.success, 'getMetrics deve riuscire con casi in Archivio');
    var pm = metrics.data.systemState.pointsMetrics;
    assertTrue_(pm.added_points >= points, 'i punti aggiunti devono contare anche il caso ormai archiviato');
    assertTrue_(pm.completed_points >= points, 'i punti completati devono contare anche il caso ormai archiviato');
    assertEquals_(0, pm.open_cards, 'il caso archiviato non deve comparire tra le card aperte');
  });
}

// §8/§9: il Cestino non e' MAI letto da nessuna metrica - un job cestinato
// non deve spostare nemmeno di un punto le metriche storiche, esattamente
// come se non fosse mai esistito (a differenza dell'Archivio, sopra).
function testGetMetricsNeverReadsCestino() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    setupSigmaFlow();
    ss = SpreadsheetApp.openById(ss.getId());
    var before = getMetrics().data.systemState.pointsMetrics;

    var created = addJob({ title: 'Da cestinare per il test metriche', size_class: 'L' }).data;
    cestinaJob_(created.job_id);

    var after = getMetrics().data.systemState.pointsMetrics;
    assertEquals_(before.open_points, after.open_points, 'un job cestinato non deve mai comparire nei punti aperti');
    assertEquals_(before.added_points, after.added_points, 'un job cestinato non deve mai comparire nei punti aggiunti storici');
    assertEquals_(before.completed_points, after.completed_points, 'un job cestinato non deve mai comparire nei punti completati storici');
  });
}

// Fase L4: prova diretta che getMetrics legge il tempo di servizio da
// 'visite' e non piu' dal campo service_time_d su 'jobs' — il job ha un
// valore "decoy" chiaramente diverso su jobs, il tempo vero (10 giorni)
// e' solo su visite (start_ts/consegna_ts).
// M9 (DESIGN_dashboard.md, §4.2): E[S0]/E[S1] (Cap. 6) - tempo medio di
// servizio separato per prima visita (numero_visita=1) e visite di
// rework (numero_visita>1), mai calcolato prima di M9 (corretto un
// errore della ricognizione M3, che lo classificava per sbaglio come
// "gia' calcolato" insieme a E[K]).
function testCalculateMetricsComputesE_S0AndE_S1SeparatelyByReworkStatus() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 20 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [{ job_id: 'JOB-S0S1', status: 'done', arrival_ts: arrival, visit_number: 2 }];
  var visite = [
    { job_id: 'JOB-S0S1', numero_visita: 1, apertura_ts: arrival, start_ts: arrival, consegna_ts: Utilities.formatDate(new Date(now.getTime() - 15 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX") },
    { job_id: 'JOB-S0S1', numero_visita: 2, apertura_ts: nowIso_(), start_ts: Utilities.formatDate(new Date(now.getTime() - 10 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"), consegna_ts: nowIso_() }
  ];

  var metrics = calculateMetrics_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

  assertEquals_(5, metrics.E_S0, 'E_S0 = tempo di servizio della visita 1 (5 giorni)');
  assertEquals_(10, metrics.E_S1, 'E_S1 = tempo di servizio della visita di rework (10 giorni)');
}

function testCalculateMetricsE_S0E_S1NullWhenNoSamples() {
  var metrics = calculateMetrics_([], [], SIGMAFLOW.DEFAULT_CONFIG, new Date());

  assertEquals_(null, metrics.E_S0, 'E_S0 non stimabile senza campioni');
  assertEquals_(null, metrics.E_S1, 'E_S1 non stimabile senza campioni');
}

function testGetMetricsUsesVisiteNotJobFields() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = appendCompletedJob_(ss, {
      title: 'Decoy su jobs',
      size_class: 'M',
      service_time_d: 999,
      lead_time_d: 15,
      wait_time_d: 999,
      visit_number: 1
    });

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
    var row = findRowById_(sheet, 'job_id', jobId);
    var headers = getHeaderMap_(sheet);
    var now = new Date();
    var start = Utilities.formatDate(new Date(now.getTime() - 10 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    var consegna = Utilities.formatDate(now, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    sheet.getRange(row, headers.start_ts).setValue(start);
    sheet.getRange(row, headers.consegna_ts).setValue(consegna);

    var metrics = getMetrics();
    assertTrue_(metrics.success, 'getMetrics dovrebbe riuscire');
    assertEquals_(10, metrics.data.E_S, 'E_S deve riflettere i 10 giorni di visite, non i 999 decoy su jobs');
  });
}

// Fase L4: workloadMetrics/pointsMetrics restano su 'jobs', invariati —
// devono funzionare correttamente anche con 'visite' completamente
// vuota (nessuna riga), a differenza delle metriche di governo.
function testWorkloadAndPointsStayOnJobsEvenWithEmptyVisite() {
  var now = new Date();
  var arrival = Utilities.formatDate(new Date(now.getTime() - 2 * 864e5), SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var jobs = [
    { job_id: 'A', status: 'backlog', arrival_ts: arrival, visit_number: 1, size_points: 5 },
    { job_id: 'B', status: 'wip', arrival_ts: arrival, visit_number: 1, size_points: 8 },
    { job_id: 'C', status: 'done', arrival_ts: arrival, done_ts: nowIso_(), visit_number: 1, size_points: 3, invoiced: false }
  ];
  var config = Object.assign({}, SIGMAFLOW.DEFAULT_CONFIG, {
    columns_json: JSON.stringify(SIGMAFLOW.DEFAULT_COLUMNS)
  });

  var state = buildSystemState_(jobs, [], config, now);

  assertEquals_(1, state.workloadMetrics.ready, 'ready calcolato da jobs anche senza visite');
  assertEquals_(1, state.workloadMetrics.in_progress, 'in_progress calcolato da jobs anche senza visite');
  assertEquals_(3, state.pointsMetrics.completed_points, 'punti completati (C, size_points 3) calcolati da jobs anche senza visite');
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
    status: 'done',
    arrival_ts: arrival,
    done_ts: nowIso_(),
    visit_number: 1
  }];
  // consegna_ts presente ma senza start_ts: il tempo di servizio non e'
  // calcolabile (visitServiceTimeDays_ ritorna 0), la visita deve comunque
  // contare come "completata" ai fini del flusso, non del campione tempi.
  var visite = [{
    job_id: 'JOB-DONE-NO-TIME',
    numero_visita: 1,
    apertura_ts: arrival,
    consegna_ts: nowIso_()
  }];

  var state = buildSystemState_(jobs, visite, SIGMAFLOW.DEFAULT_CONFIG, now);

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
      status: 'done',
      arrival_ts: arrival,
      done_ts: nowIso_(),
      service_time_d: 2,
      visit_number: i === 0 ? 2 : 1,
      invoiced: false
    });
  }
  jobs.push({ job_id: 'READY', status: 'backlog', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'PREP', status: 'todo', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'WIP', status: 'wip', arrival_ts: arrival, visit_number: 1 });
  jobs.push({ job_id: 'WAIT', status: 'wait_client', arrival_ts: arrival, visit_number: 1 });

  // Le 5 visite "chiuse" corrispondenti ai job JOB-DONE-0..4: start_ts =
  // stesso istante di arrival_ts (2 giorni fa) e consegna_ts = adesso,
  // cosi' visitServiceTimeDays_ torna 2 come il vecchio service_time_d.
  var visite = [];
  for (var v = 0; v < 5; v++) {
    visite.push({
      job_id: 'JOB-DONE-' + v,
      numero_visita: v === 0 ? 2 : 1,
      apertura_ts: arrival,
      start_ts: arrival,
      consegna_ts: nowIso_()
    });
  }

  var config = Object.assign({}, SIGMAFLOW.DEFAULT_CONFIG, {
    columns_json: JSON.stringify(SIGMAFLOW.DEFAULT_COLUMNS),
    observation_window_days: 30,
    team_size: 4
  });
  var state = buildSystemState_(jobs, visite, config, now);

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

// M2 (DESIGN_dashboard.md, §3, opzione 2 — decisione di Marco 2026-08-19):
// riproduce esattamente lo scenario trovato in collaudo: un caso in
// un'attesa, un evento 'move' inserito a mano in Cronologia verso
// backlog (un vero rientro) - deve ricalcolare job.status e aprire la
// visita mancante, esattamente come farebbe il drag-and-drop reale
// (moveJob), non solo registrare l'evento nel log.
// M2, fix del 2026-08-20 (segnalato da Marco: la Cronologia era lenta -
// causa reale: ogni chiamata api() prende un lock globale di script, e
// il fix del ritardo sulla board aveva aggiunto un giro in piu' di
// lock, un loadBoard(true) dopo ogni salvataggio). addActivityEvent/
// updateActivityEvent/deleteActivityEvent devono restituire il job gia'
// aggiornato (status + campi di rientro), stesso contratto di risposta
// di moveJob - cosi' il client non deve piu' rifare un'intera chiamata
// getBoard() per riflettere la card aggiornata.
function testAddActivityEventReturnsUpdatedJobInResponse() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Risposta con job aggiornato', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    var result = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'backlog' });

    assertTrue_(Boolean(result.data.job), 'la risposta deve includere il job aggiornato');
    assertEquals_('backlog', result.data.job.status, 'il job nella risposta riflette gia\' il nuovo status');
    assertEquals_(2, result.data.job.visit_number, 'il job nella risposta riflette gia\' il numero di visita aggiornato');
  });
}

function testUpdateActivityEventReturnsUpdatedJobInResponse() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Update risposta con job', size_class: 'M' }).data;
    var added = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'wip' });

    var result = updateActivityEvent({ job_id: created.job_id, event_id: added.data.event.id, note: 'nota aggiornata' });

    assertTrue_(Boolean(result.data.job), 'la risposta deve includere il job aggiornato');
    assertEquals_('wip', result.data.job.status, 'il job nella risposta riflette lo status corrente');
  });
}

function testDeleteActivityEventReturnsUpdatedJobInResponse() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Delete risposta con job', size_class: 'M' });
    var e1 = addActivityEvent({ job_id: jobId, type: 'move', ts: testTsMinutesAgo_(60), to: 'wip' });
    addActivityEvent({ job_id: jobId, type: 'note', ts: testTsMinutesAgo_(30), note: 'nota' });

    var result = deleteActivityEvent({ job_id: jobId, event_id: e1.data.event.id });

    assertTrue_(Boolean(result.data.job), 'la risposta deve includere il job aggiornato anche dopo una cancellazione');
    assertEquals_(jobId, result.data.job.job_id, 'il job restituito e\' quello giusto');
  });
}

function testAddActivityEventManualReentryUpdatesStatusAndOpensVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro registrato a mano', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    // ts non nel passato (testTsMinutesAgo_(0)): deve ordinarsi DOPO il
    // move a wait_client appena fatto da moveJob (anch'esso a "adesso"),
    // altrimenti computeFromForCandidate_ lo collocherebbe prima nella
    // sequenza e produrrebbe un falso COLONNA_DOPPIA (creazione->backlog
    // seguito da questo candidato->backlog).
    var rientroTs = testTsMinutesAgo_(0);
    var result = addActivityEvent({ job_id: created.job_id, type: 'move', ts: rientroTs, to: 'backlog' });

    assertTrue_(result.data.ok === true, 'l\'evento di rientro manuale dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_('backlog', job.status, 'la correzione manuale deve spostare davvero la card, non solo il diario');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(2, visite.length, 'il rientro manuale deve aprire una nuova visita, come il drag-and-drop reale');
    var closed = visite.filter(function(v) { return Number(v.numero_visita) === 1; })[0];
    var opened = visite.filter(function(v) { return Number(v.numero_visita) === 2; })[0];
    assertEquals_(rientroTs, closed.rientro_ts, 'la visita 1 risulta chiusa alla data dell\'evento corretto');
    assertEquals_('wait_client', closed.rientro_da, 'rientro_da = colonna di provenienza');
    assertEquals_('wait_client', opened.rework_cause, 'rework_cause della visita 2 = rientro_da della precedente');
    assertTrue_(Boolean(opened.incarico_ts), 'la visita 2 ha incarico_ts (destinazione backlog)');
  });
}

// Stessa regola gia' applicata al drag-and-drop reale (moveJob): un
// rientro diretto da un'attesa/completato a WIP resta vietato anche
// quando arriva da una correzione manuale in Cronologia, non solo dalla
// board — altrimenti la Cronologia potrebbe registrare uno stato che
// l'interfaccia normale non permetterebbe mai di raggiungere.
function testAddActivityEventManualReentryDirectToWipBlocked() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro diretto a WIP vietato', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    var result = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'wip', force: true });

    assertTrue_(result.data.ok === false, 'rientro diretto a WIP: ok false');
    assertTrue_(result.data.hardErrors.indexOf('RIENTRO_DIRETTO_WIP_NON_CONSENTITO') !== -1, 'hardErrors contiene RIENTRO_DIRETTO_WIP_NON_CONSENTITO');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(1, visite.length, 'nessuna visita aperta per un evento rifiutato');
  });
}

// Un secondo salvataggio dello stesso evento di rientro (es. solo per
// correggere la nota, senza cambiare data/colonne) non deve duplicare la
// visita gia' aperta la prima volta.
function testUpdateActivityEventReentrySameEventDoesNotDuplicateVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro corretto due volte', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    var rientroTs = testTsMinutesAgo_(0);
    var added = addActivityEvent({ job_id: created.job_id, type: 'move', ts: rientroTs, to: 'backlog' });
    assertEquals_(2, readVisiteForJob_(ss, created.job_id).length, 'precondizione: la prima registrazione ha gia\' aperto la visita 2');

    var updated = updateActivityEvent({ job_id: created.job_id, event_id: added.data.event.id, note: 'correzione della sola nota' });

    assertTrue_(updated.data.ok === true, 'la modifica della nota dovrebbe riuscire');
    assertEquals_(2, readVisiteForJob_(ss, created.job_id).length, 'nessuna visita duplicata risalvando lo stesso rientro');
  });
}

// M2, fix del 2026-08-20 (segnalato da Marco in collaudo): un evento
// 'move' manuale che NON rappresenta un rientro (qui: backlog -> wip,
// provenienza non stand_by/done) deve comunque spostare davvero la card
// - il fix iniziale del 19/08 aggiornava job.status solo per il pattern
// di rientro, lasciando fermo qualunque altro move manuale.
function testAddActivityEventPlainManualMoveUpdatesStatus() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Move manuale semplice', size_class: 'M' }).data;

    var result = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'wip' });

    assertTrue_(result.data.ok === true, 'il move manuale semplice dovrebbe riuscire');
    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_('wip', job.status, 'la card deve spostarsi davvero, non solo il diario');
  });
}

// Riproduce esattamente lo scenario del collaudo di Marco (2026-08-20):
// un rientro manuale (wait_client -> backlog) seguito da un secondo move
// manuale "in avanti" (backlog -> wip) - la card deve finire in WIP, non
// restare ferma su backlog dopo il solo rientro.
function testAddActivityEventManualMoveAfterReentryContinuesUpdatingStatus() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Rientro poi move in avanti', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });

    var reentry = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'backlog' });
    assertTrue_(reentry.data.ok === true, 'il rientro manuale dovrebbe riuscire');

    var forward = addActivityEvent({ job_id: created.job_id, type: 'move', ts: testTsMinutesAgo_(0), to: 'wip' });
    assertTrue_(forward.data.ok === true, 'il move successivo dovrebbe riuscire');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_('wip', job.status, 'la card deve seguire l\'ultimo move registrato, non restare ferma sul rientro');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(2, visite.length, 'il rientro apre comunque la visita 2 (unico split), il move successivo non ne apre una terza');
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

function testAddActivityEventAutoAllineaCampoStrutturato() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Allineamento automatico', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var ts = testTsMinutesAgo_(60);

    var result = addActivityEvent({ job_id: jobId, type: 'move', ts: ts, to: wipCol.id });

    assertTrue_(result.data.ok === true, 'move verso wip dovrebbe riuscire senza alcuna conferma dell\'utente');
    var visit = readVisiteForJob_(ss, jobId)[0];
    assertEquals_(ts, visit.start_ts, 'start_ts della visita allineato automaticamente al valore suggerito dall\'evento');
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

// N1 (DESIGN_archiviazione.md, §8b): un evento 'correction' su un campo
// nella whitelist (SIGMAFLOW.CORRECTABLE_FIELDS) con una data valida deve
// riuscire e scrivere il nuovo valore direttamente su jobs, tramite lo
// stesso percorso di allineamento gia' usato dai warning dei 'move'
// (applyStructuralAlignment_).
function testAddActivityEventCorrectionArrivalTsValida() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Correzione arrival_ts valida', size_class: 'M' });
    var nuovoValore = testTsMinutesAgo_(200);

    var result = addActivityEvent({
      job_id: jobId,
      type: 'correction',
      ts: testTsMinutesAgo_(10),
      field: 'arrival_ts',
      new: nuovoValore,
      reason: 'data reale diversa da quella registrata'
    });

    assertTrue_(result.data.ok === true, 'correzione arrival_ts valida dovrebbe riuscire');
    assertEquals_('arrival_ts', result.data.event.field, 'field salvato nell\'evento');
    assertEquals_(nuovoValore, result.data.event.new, 'new salvato nell\'evento');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === jobId; })[0];
    assertEquals_(nuovoValore, job.arrival_ts, 'arrival_ts allineato al nuovo valore corretto');
  });
}

// Stesso percorso, sul secondo campo aggiunto alla whitelist in questa
// sotto-fase: incarico_chiuso_ts (§8b), non ancora valorizzato sul job
// di test — verifica che 'old' venga registrato come stringa vuota, non
// undefined (job[candidate.field] non ancora presente sulla riga).
function testAddActivityEventCorrectionIncaricoChiusoTsValida() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Correzione incarico_chiuso_ts valida', size_class: 'M' });
    var nuovoValore = testTsMinutesAgo_(5);

    var result = addActivityEvent({
      job_id: jobId,
      type: 'correction',
      ts: testTsMinutesAgo_(1),
      field: 'incarico_chiuso_ts',
      new: nuovoValore,
      reason: 'la spunta Chiuso e\' stata premuta in ritardo'
    });

    assertTrue_(result.data.ok === true, 'correzione incarico_chiuso_ts valida dovrebbe riuscire');
    assertEquals_('', result.data.event.old, 'old registrato vuoto: il campo non era mai stato valorizzato');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === jobId; })[0];
    assertEquals_(nuovoValore, job.incarico_chiuso_ts, 'incarico_chiuso_ts allineato al nuovo valore corretto');
  });
}

// Un campo fuori dalla whitelist (qui: 'title', una colonna reale di
// jobs ma non un campo per cui esiste un percorso di correzione pensato)
// deve essere rifiutato con CAMPO_NON_CORREGGIBILE, senza scrivere nulla.
function testAddActivityEventCorrectionCampoNonCorreggibile() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Campo non correggibile', size_class: 'M' });

    var result = addActivityEvent({
      job_id: jobId,
      type: 'correction',
      ts: testTsMinutesAgo_(10),
      field: 'title',
      new: testTsMinutesAgo_(5),
      reason: 'tentativo su campo non whitelisted'
    });

    assertTrue_(result.data.ok === false, 'campo non correggibile: ok false');
    assertTrue_(result.data.hardErrors.indexOf('CAMPO_NON_CORREGGIBILE') !== -1, 'hardErrors contiene CAMPO_NON_CORREGGIBILE');

    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(1, log.length, 'nessuna scrittura extra: solo l\'evento di creazione');
  });
}

// Un valore 'new' che non e' una data ISO8601 valida deve essere
// rifiutato con DATA_NON_VALIDA, anche su un campo whitelisted.
function testAddActivityEventCorrectionDataNonValida() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Data non valida', size_class: 'M' });

    var result = addActivityEvent({
      job_id: jobId,
      type: 'correction',
      ts: testTsMinutesAgo_(10),
      field: 'arrival_ts',
      new: 'non-e-una-data',
      reason: 'valore malformato'
    });

    assertTrue_(result.data.ok === false, 'data non valida: ok false');
    assertTrue_(result.data.hardErrors.indexOf('DATA_NON_VALIDA') !== -1, 'hardErrors contiene DATA_NON_VALIDA');

    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === jobId; })[0];
    assertTrue_(Boolean(job.arrival_ts), 'arrival_ts non deve essere svuotato da una correzione rifiutata');
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

function testUpdateActivityEventCorreggeEventoAutoDiCreazione() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Correzione evento di creazione', size_class: 'M' }).data;
    var log = getActivityLog({ job_id: created.job_id }).data.log;
    var creationEvent = log[0];
    assertEquals_('auto', creationEvent.source, 'evento di creazione e\' auto');
    assertEquals_(null, creationEvent.from, 'evento di creazione ha from null');

    var correctedTs = testTsMinutesAgo_(120);
    var result = updateActivityEvent({ job_id: created.job_id, event_id: creationEvent.id, ts: correctedTs, to: creationEvent.to });

    assertTrue_(result.data.ok === true, 'la correzione della data sull\'evento di creazione (auto) deve riuscire');
    var job = readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS)).filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(correctedTs, job.arrival_ts, 'arrival_ts si allinea alla data corretta dell\'evento di creazione');
  });
}

function testUpdateActivityEventCorreggeEventoAutoDiSpostamento() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Correzione spostamento auto', size_class: 'M' });
    moveJob({ job_id: jobId, status: 'todo' });
    var log = getActivityLog({ job_id: jobId }).data.log;
    var autoMoveEvent = log.filter(function(e) { return e.source === 'auto' && e.to === 'todo'; })[0];

    var correctedTs = testTsMinutesAgo_(45);
    var result = updateActivityEvent({ job_id: jobId, event_id: autoMoveEvent.id, ts: correctedTs, to: autoMoveEvent.to, note: 'orario corretto' });

    assertTrue_(result.data.ok === true, 'la correzione di un evento auto generato da moveJob deve riuscire');
    var updatedLog = getActivityLog({ job_id: jobId }).data.log;
    var updated = updatedLog.filter(function(e) { return e.id === autoMoveEvent.id; })[0];
    assertEquals_(correctedTs, updated.ts, 'la data dell\'evento auto e\' stata corretta');
    assertEquals_('manual', updated.source, 'un evento corretto da un utente diventa manual: segnala che non e\' piu\' un dato puramente di sistema');
  });
}

function testDeleteActivityEventManual() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Delete evento manual', size_class: 'M' });
    var columns = readColumns_();
    var todoCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    // M2: colonna neutrale, non stand_by/done — vedi nota in
    // testDeleteActivityEventRealignsOpenVisit: un rientro diretto da
    // un'attesa a WIP e' ora vietato anche via Cronologia manuale, non e'
    // l'oggetto di questo test.
    var neutralCol = columns.filter(function(c) { return c.role === 'neutral'; })[0];
    var t1 = testTsMinutesAgo_(90);
    var t2 = testTsMinutesAgo_(60);
    var t3 = testTsMinutesAgo_(30);
    addActivityEvent({ job_id: jobId, type: 'move', ts: t1, to: todoCol.id, align_fields: { start_ts: t1 } });
    var e2 = addActivityEvent({ job_id: jobId, type: 'move', ts: t2, to: neutralCol.id });
    var e3 = addActivityEvent({ job_id: jobId, type: 'move', ts: t3, to: todoCol.id, force: true, align_fields: { start_ts: t3 } });

    var del = deleteActivityEvent({ job_id: jobId, event_id: e2.data.event.id });

    assertTrue_(del.success, 'delete dovrebbe riuscire');
    var log = getActivityLog({ job_id: jobId }).data.log;
    assertEquals_(3, log.length, 'evento di creazione + due move rimasti dopo la cancellazione');
    var remaining3 = log.filter(function(e) { return e.id === e3.data.event.id; })[0];
    assertEquals_(todoCol.id, remaining3.from, 'from dell\'evento successivo ricalcolato dopo la cancellazione');

    var visit = readVisiteForJob_(ss, jobId)[0];
    assertEquals_(t3, visit.start_ts, 'start_ts della visita riallineato in automatico all\'ultimo move rimasto dopo la cancellazione, senza intervento dell\'utente');
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

// Bug segnalato da Marco durante il collaudo L3: due eventi move con lo
// STESSO timestamp esatto (facile dall'input datetime-local, precisione
// al minuto) finivano entrambi per calcolare lo stesso 'from', invece di
// incatenarsi tra loro (es. "WIP -> WIP" o "TO DO -> TO DO" in
// Cronologia invece della sequenza reale). Vedi commento su
// recalculateMoveFrom_/computeFromForCandidate_ in ActivityLog.gs.
function testGetActivityLogFromResolvesTiedTimestamps() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var jobId = testAddJobWithPastArrival_({ title: 'Timestamp identici', size_class: 'M' });
    var columns = readColumns_();
    var wipCol = columns.filter(function(c) { return c.role === 'wip'; })[0];
    var prepCol = columns.filter(function(c) { return c.role === 'prep'; })[0];
    var tiedTs = testTsMinutesAgo_(60);

    var first = addActivityEvent({ job_id: jobId, type: 'move', ts: tiedTs, to: wipCol.id });
    assertTrue_(first.data.ok === true, 'primo move dovrebbe riuscire');
    var second = addActivityEvent({ job_id: jobId, type: 'move', ts: tiedTs, to: prepCol.id });
    assertTrue_(second.data.ok === true, 'secondo move con timestamp identico dovrebbe riuscire senza richiedere force');

    var log = getActivityLog({ job_id: jobId }).data.log;
    var wipEvent = log.filter(function(e) { return e.to === wipCol.id; })[0];
    var prepEvent = log.filter(function(e) { return e.to === prepCol.id; })[0];

    // testAddJobWithPastArrival_ corregge solo il campo arrival_ts del job,
    // non il ts dell'evento di creazione nel log (resta "adesso"): rispetto
    // ai due eventi di test (60 min fa), l'evento di creazione e' quindi
    // cronologicamente SUCCESSIVO, non precedente — wipEvent.from e' null.
    assertEquals_(null, wipEvent.from, 'il primo dei due eventi a parita\' di timestamp non ha alcun move precedente in questo fixture: from null');
    assertEquals_(wipCol.id, prepEvent.from, 'il secondo evento a parita\' di timestamp deve incatenarsi al primo (from = wip), non ripetere lo stesso from (null)');
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

// --- Indizio data dal job_id per il backfill (segnalato da Marco sulla
// migrazione PROD reale: molte card storiche non hanno mai avuto
// arrival_ts valorizzato, la migrazione ricadeva sulla data del giorno
// facendo sembrare "creato oggi" un caso vecchio di mesi) ---

function testExtractDateFromJobIdParsesValidFormat() {
  assertEquals_('2026-07-07T09:00:00+02:00', extractDateFromJobId_('JOB-20260707-7L8R'), 'data e ora 9:00 estratte dal job_id');
}

function testExtractDateFromJobIdReturnsNullForInvalidFormat() {
  assertEquals_(null, extractDateFromJobId_('CASE-20260707-5AF4'), 'prefisso diverso da JOB-: null');
  assertEquals_(null, extractDateFromJobId_('JOB-ABCDEFGH-XXXX'), 'non numerico: null');
  assertEquals_(null, extractDateFromJobId_(''), 'vuoto: null');
  assertEquals_(null, extractDateFromJobId_(undefined), 'undefined: null, nessun crash');
}

function testExtractDateFromJobIdReturnsNullForInvalidCalendarDate() {
  assertEquals_(null, extractDateFromJobId_('JOB-20260231-XXXX'), 'il 31 febbraio non esiste: null, non fabbrica una data sbagliata');
}

function testMigrateToActivityLogUsesJobIdDateWhenArrivalTsMissing() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Card senza arrival_ts, con job_id datato' }).data;

    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    // Simula lo stato osservato su PROD: arrival_ts vuoto, nessun log —
    // ma il job_id (generato da addJob poco sopra) porta comunque la
    // data vera di oggi, sufficiente per verificare che venga usata al
    // posto della data di migrazione "nuda".
    job.arrival_ts = '';
    job.activity_log_json = '[]';
    writeJobToRow_(sheet, row, headers, job);

    var result = migrateToActivityLog({ env: 'test' });
    assertTrue_(result.success, 'migrazione dovrebbe riuscire');

    var expectedTs = extractDateFromJobId_(created.job_id);
    var log = getActivityLog({ job_id: created.job_id }).data.log;
    assertEquals_(expectedTs, log[0].ts, 'l\'evento di creazione ricostruito usa la data ricavata dal job_id, non la data della migrazione');

    var jobAfter = readTable_(sheet).filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(expectedTs, jobAfter.arrival_ts, 'arrival_ts si allinea alla data ricavata dal job_id');
  });
}

function testMigrateToActivityLogBackfillEventoCreazione() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Card senza log (come da seed)', size_class: 'M' }).data;

    // Simula una card seedata prima dell'introduzione dell'evento di
    // creazione automatico: log vuoto, arrival_ts pero' gia' presente.
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    var pastArrival = testTsMinutesAgo_(180);
    job.arrival_ts = pastArrival;
    job.activity_log_json = '[]';
    writeJobToRow_(sheet, row, headers, job);

    var result = migrateToActivityLog({ env: 'test' });

    assertTrue_(result.success, 'migrazione dovrebbe riuscire');
    assertEquals_(1, result.data.creation_events_backfilled, 'un evento di creazione ricostruito');

    var log = getActivityLog({ job_id: created.job_id }).data.log;
    assertEquals_(1, log.length, 'la card ha ora un evento in cronologia');
    assertEquals_(null, log[0].from, 'l\'evento ricostruito e\' riconoscibile come evento di creazione (from null)');
    assertEquals_(pastArrival, log[0].ts, 'la data dell\'evento ricostruito riprende arrival_ts');
    assertEquals_('backlog', log[0].to, 'la card era (ed e\' rimasta) in backlog: l\'evento ricostruito punta li\'');

    var visitAfter = readVisiteForJob_(ss, created.job_id)[0];
    assertEquals_(pastArrival, visitAfter.incarico_ts, 'incarico_ts della visita si allinea da solo all\'evento ricostruito, non solo il log');

    var secondPass = migrateToActivityLog({ env: 'test' });
    assertEquals_(0, secondPass.data.creation_events_backfilled, 'un secondo lancio della migrazione non duplica l\'evento gia\' presente');
  });
}

function testMigrateToActivityLogBackfillNonContraddiceSpostamentiReali() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Card con log parziale gia\' presente', size_class: 'M' }).data;

    // Simula una card seedata SENZA evento di creazione ma con almeno un
    // move reale gia' registrato (come capitava prima del backfill): il
    // log non e' vuoto, ma non contiene comunque un evento con from null.
    var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var row = findRowById_(sheet, 'job_id', created.job_id);
    var headers = getHeaderMap_(sheet);
    var job = readJobFromRow_(sheet, row, headers);
    job.status = 'wip';
    job.arrival_ts = testTsMinutesAgo_(300);
    job.activity_log_json = JSON.stringify([{
      id: 'evento-reale-preesistente',
      ts: testTsMinutesAgo_(60),
      type: 'move',
      source: 'auto',
      to: 'wip',
      from: 'backlog',
      note: ''
    }]);
    writeJobToRow_(sheet, row, headers, job);

    var result = migrateToActivityLog({ env: 'test' });
    assertTrue_(result.success, 'migrazione dovrebbe riuscire');
    assertEquals_(1, result.data.creation_events_backfilled, 'un evento di creazione ricostruito');

    var log = getActivityLog({ job_id: created.job_id }).data.log;
    assertEquals_(2, log.length, 'evento ricostruito + evento reale preesistente');
    var creationEvent = log.filter(function(e) { return e.from === null; })[0];
    assertEquals_('backlog', creationEvent.to,
      'l\'evento ricostruito deve puntare a dove la card si trovava PRIMA del primo move reale (backlog), non allo status attuale (wip) — altrimenti il log direbbe "creata in wip" seguito da uno spostamento "da backlog", contraddittorio');
  });
}

// --- Fase L5: materializzazione storica delle visite dal log ---

// Caso "Card B" del documento bugfix: un evento wip -> wip (stessa
// colonna, nessuna vera attesa nel mezzo) non deve spostare start_ts
// dal primo ingresso — criterio di accettazione esplicito del documento.
function testComputeVisiteFromLogWipToWipKeepsFirstStartTs() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var job = {
      job_id: 'JOB-CARD-B',
      activity_log_json: JSON.stringify([
        { id: '1', ts: '2026-06-25T09:00:00+02:00', type: 'move', source: 'auto', to: 'wip', from: null },
        { id: '2', ts: '2026-08-13T09:00:00+02:00', type: 'move', source: 'manual', to: 'wip', from: 'wip' }
      ])
    };

    var result = computeVisiteFromLog_(job);

    assertEquals_(1, result.visite.length, 'wip->wip non deve aprire una nuova visita');
    assertEquals_('2026-06-25T09:00:00+02:00', result.visite[0].start_ts, 'start_ts deve restare il PRIMO ingresso in wip, non l\'ultimo (bug Card B)');
  });
}

// Rientro legittimo da attesa: deve aprire una nuova visita e aggiornare
// correttamente i gate — criterio di accettazione esplicito del documento
// bugfix ("comportamento invariato per il caso legittimo").
function testComputeVisiteFromLogStandByReentryOpensNewVisit() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var job = {
      job_id: 'JOB-REENTRY',
      activity_log_json: JSON.stringify([
        { id: '1', ts: '2026-01-01T09:00:00+02:00', type: 'move', to: 'backlog', from: null },
        { id: '2', ts: '2026-01-02T09:00:00+02:00', type: 'move', to: 'wip', from: 'backlog' },
        { id: '3', ts: '2026-01-05T09:00:00+02:00', type: 'move', to: 'wait_client', from: 'wip' },
        { id: '4', ts: '2026-01-10T09:00:00+02:00', type: 'move', to: 'backlog', from: 'wait_client' },
        { id: '5', ts: '2026-01-11T09:00:00+02:00', type: 'move', to: 'wip', from: 'backlog' }
      ])
    };

    var result = computeVisiteFromLog_(job);

    assertEquals_(2, result.visite.length, 'il rientro da attesa deve aprire una nuova visita');
    assertEquals_('2026-01-02T09:00:00+02:00', result.visite[0].start_ts, 'start_ts visita 1');
    assertEquals_('wait_client', result.visite[0].rientro_da, 'rientro_da visita 1');
    assertEquals_('2026-01-11T09:00:00+02:00', result.visite[1].start_ts, 'start_ts visita 2 = nuovo ingresso in wip dopo il rientro');
    assertEquals_('wait_client', result.visite[1].rework_cause, 'rework_cause visita 2 = rientro_da della precedente');
  });
}

// Un rientro diretto da attesa a WIP non dovrebbe esistere nello storico
// (il guardia in moveJob lo impedisce dal vivo), ma se compare (dato
// precedente al guardia, o corretto manualmente aggirandolo) va
// segnalato, non corretto automaticamente — stesso principio del
// documento bugfix ("report, non correzione cieca").
function testComputeVisiteFromLogFlagsIllegalDirectReentryToWip() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var job = {
      job_id: 'JOB-ILLEGAL',
      activity_log_json: JSON.stringify([
        { id: '1', ts: '2026-01-01T09:00:00+02:00', type: 'move', to: 'wip', from: null },
        { id: '2', ts: '2026-01-02T09:00:00+02:00', type: 'move', to: 'wait_client', from: 'wip' },
        { id: '3', ts: '2026-01-03T09:00:00+02:00', type: 'move', to: 'wip', from: 'wait_client' }
      ])
    };

    var result = computeVisiteFromLog_(job);

    assertEquals_(1, result.warnings.length, 'un rientro diretto illegale nello storico deve produrre un warning');
    assertEquals_('RIENTRO_DIRETTO_A_WIP', result.warnings[0].code, 'codice warning corretto');
    assertEquals_(1, result.visite.length, 'nessuna nuova visita aperta (wip non e\' backlog/prep)');
  });
}

// Migrazione end-to-end: sovrascrive le righe 'visite' gia' scritte da
// L2/L3 (bootstrap/live) con la ricostruzione autorevole, e riallinea i
// campi derivati su jobs.
function testMigrateVisiteFromHistoryEndToEnd() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss);
    var created = addJob({ title: 'Storia da migrare', size_class: 'M' }).data;
    moveJob({ job_id: created.job_id, status: 'wip' });
    moveJob({ job_id: created.job_id, status: 'wait_client' });
    moveJob({ job_id: created.job_id, status: 'backlog' });

    var beforeCount = readVisiteForJob_(ss, created.job_id).length;
    assertTrue_(beforeCount > 0, 'precondizione: qualche riga visite gia\' presente da L2 (bootstrap/live)');

    var summary = migrateVisiteFromHistory_(ss);
    assertEquals_(1, summary.jobs_processed, 'un job processato');
    assertEquals_(0, summary.coherence_warnings.length, 'nessun warning per uno storico regolare');

    var visite = readVisiteForJob_(ss, created.job_id);
    assertEquals_(2, visite.length, 'due visite ricostruite (rientro da attesa)');

    var boardJob = getBoard().data.jobs.filter(function(j) { return j.job_id === created.job_id; })[0];
    assertEquals_(2, Number(boardJob.visit_number), 'visit_number ricalcolato da visite dopo la migrazione');
    assertTrue_(coerceBoolean_(boardJob.is_rework), 'is_rework ricalcolato da visite dopo la migrazione');
  });
}

// --- Migrazione PROD (AUDIT_MIGRAZIONE_PROD.md v2): orchestratrice ---

// Simula lo schema osservato REALMENTE su PROD (AUDIT_MIGRAZIONE_PROD.md
// sez. 2): JOB_HEADERS senza activity_log_json/incarico_ts/prep_ts/
// incarico_chiuso_ts, nessun foglio 'visite', columns_json con la
// colonna 'prep' (todo) ancora a ruolo 'wip' (sez. 2.1).
function setupOldProdShapedSheet_(ss) {
  var oldJobHeaders = [
    'job_id', 'case_id', 'visit_number', 'title', 'client', 'ambassador',
    'status', 'assignee', 'tag', 'size_class', 'size_points',
    'priority_class', 'priority_class_manual', 'impact', 'manageability',
    'priority_score', 'description', 'due_date', 'arrival_ts', 'start_ts',
    'done_ts', 'invoiced', 'service_time_d', 'lead_time_d', 'wait_time_d',
    'is_rework', 'rework_cause', 'notes', 'card_color', 'checklist_json',
    'correction_log_json'
  ];

  var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS) || ss.insertSheet(SIGMAFLOW.SHEETS.JOBS);
  jobsSheet.clear();
  jobsSheet.appendRow(oldJobHeaders);
  jobsSheet.appendRow(['JOB-OLD-1', 'CASE-OLD-1', 1, 'Caso storico 1', 'Cliente storico', '', 'wip', 'Marco', 'VIA', 'M', 8, 'p1_plan', false, 2, 2, 2, '', '', '2026-01-01T09:00:00+02:00', '2026-01-05T09:00:00+02:00', '', false, '', '', '', false, '', '', '', '[]', '[]']);
  jobsSheet.appendRow(['JOB-OLD-2', 'CASE-OLD-2', 1, 'Caso storico 2', 'Cliente storico 2', '', 'done', 'Giovanni', 'acque', 'S', 5, 'p4_assess', false, 1, 1, 1, '', '', '2026-01-10T09:00:00+02:00', '2026-01-12T09:00:00+02:00', '2026-01-20T09:00:00+02:00', true, 8, 10, 2, false, '', '', '', '[]', '[]']);
  jobsSheet.setFrozenRows(1);

  // CASE_HEADERS non esiste piu' nel codice (foglio 'cases' dismesso):
  // qui e' un valore storico inline, solo per simulare lo schema PROD
  // di prima della dismissione — la migrazione deve rimuoverlo (vedi
  // removeCasesSheet_, verificato sotto in
  // testEseguiMigrazioneCompletaEndToEndOnOldSchemaData).
  var oldCaseHeaders = ['case_id', 'title', 'client', 'total_visits', 'is_open', 'created_ts', 'closed_ts'];
  var casesSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CASES) || ss.insertSheet(SIGMAFLOW.SHEETS.CASES);
  casesSheet.clear();
  casesSheet.appendRow(oldCaseHeaders);
  casesSheet.appendRow(['CASE-OLD-1', 'Caso storico 1', 'Cliente storico', 1, true, '2026-01-01T09:00:00+02:00', '']);
  casesSheet.appendRow(['CASE-OLD-2', 'Caso storico 2', 'Cliente storico 2', 1, false, '2026-01-10T09:00:00+02:00', '2026-01-20T09:00:00+02:00']);
  casesSheet.setFrozenRows(1);

  var existingVisite = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
  if (existingVisite) {
    ss.deleteSheet(existingVisite);
  }

  var configSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG) || ss.insertSheet(SIGMAFLOW.SHEETS.CONFIG);
  configSheet.clear();
  configSheet.appendRow(CONFIG_HEADERS);
  var oldColumns = SIGMAFLOW.DEFAULT_COLUMNS.map(function(column) {
    var copy = Object.assign({}, column);
    if (copy.id === 'todo') {
      copy.role = 'wip'; // stato pre-Fase-K, come osservato su PROD
    }
    copy.hidden = false;
    return copy;
  });
  configSheet.appendRow(['columns_json', JSON.stringify(oldColumns), 'Configurazione colonne board']);
  configSheet.appendRow(['team_size', 3, '']);
  configSheet.setFrozenRows(1);
}

function testEseguiMigrazioneCompletaRejectsWrongConfirmName() {
  withTestSpreadsheet_(function(ss) {
    setupOldProdShapedSheet_(ss);

    var failed = false;
    try {
      eseguiMigrazioneCompleta_(ss, { confermaNome: 'nome sbagliato' });
    } catch (err) {
      failed = err.message.indexOf('confermaNome') !== -1;
    }
    assertTrue_(failed, 'confermaNome errato deve far fallire la funzione');

    var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    var headers = jobsSheet.getRange(1, 1, 1, jobsSheet.getLastColumn()).getValues()[0];
    assertTrue_(headers.indexOf('activity_log_json') === -1, 'nessuna modifica deve essere avvenuta: schema ancora quello vecchio');
  });
}

function testFixPrepColumnRoleCorrectsGenericMismatch() {
  withTestSpreadsheet_(function(ss) {
    setupOldProdShapedSheet_(ss);

    var result = fixPrepColumnRole_(ss);

    assertTrue_(result.corrected, 'deve correggere il ruolo della colonna prep');
    assertEquals_('todo', result.column_id, 'la colonna corretta e\' todo (quella con ruolo prep in DEFAULT_COLUMNS)');
    assertEquals_('wip', result.from_role, 'il ruolo precedente era wip');

    var configSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
    var columnsJson = readTable_(configSheet).filter(function(row) { return row.key === 'columns_json'; })[0].value;
    var columns = JSON.parse(columnsJson);
    var todoColumn = columns.filter(function(c) { return c.id === 'todo'; })[0];
    assertEquals_('prep', todoColumn.role, 'il valore scritto sul foglio ha il ruolo corretto');
    assertEquals_('TO DO', todoColumn.label, 'label invariata');
    assertEquals_(3, todoColumn.order, 'order invariato');
  });
}

function testFixPrepColumnRoleNoOpWhenAlreadyCorrect() {
  withTestSpreadsheet_(function(ss) {
    resetTestDatabase_(ss); // schema/config gia' corrente, columns_json gia' corretta
    var result = fixPrepColumnRole_(ss);
    assertTrue_(!result.corrected, 'nessuna correzione se il ruolo e\' gia\' giusto');
  });
}

function testEseguiMigrazioneCompletaEndToEndOnOldSchemaData() {
  withTestSpreadsheet_(function(ss) {
    setupOldProdShapedSheet_(ss);

    var summary = eseguiMigrazioneCompleta_(ss, { confermaNome: ss.getName() });

    assertEquals_(2, summary.step1_backfill_activity_log.cards_processed, 'step1: entrambe le card processate');
    assertEquals_(2, summary.step1_backfill_activity_log.creation_events_backfilled, 'step1: evento di creazione ricostruito per entrambe (nessun log preesistente)');
    assertEquals_(0, summary.step1_backfill_activity_log.errors.length, 'step1: nessun errore');

    assertTrue_(summary.step2_columns_json.corrected, 'step2: ruolo prep corretto');
    assertEquals_('todo', summary.step2_columns_json.column_id, 'step2: colonna todo');

    // N1: 'ss' qui e' il riferimento preso da withTestSpreadsheet_
    // PRIMA di eseguiMigrazioneCompleta_/setupSigmaFlow — con le
    // cancellazioni/creazioni di fogli che N1 aggiunge, e' rimasto
    // agganciato a una struttura non piu' valida (stessa causa gia'
    // corretta dentro eseguiMigrazioneCompleta_ stessa, qui e' un
    // secondo riferimento indipendente, del test). Riapertura esplicita
    // prima di riusarlo per le verifiche post-migrazione.
    ss = SpreadsheetApp.openById(ss.getId());
    var jobsSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS);
    assertHeaders_(jobsSheet, JOB_HEADERS, 'jobs deve avere lo schema corrente dopo step3');
    var visiteSheet = ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE);
    assertTrue_(Boolean(visiteSheet), 'foglio visite creato da step3');
    assertHeaders_(visiteSheet, VISITE_HEADERS, 'visite deve avere lo schema corrente');
    assertTrue_(!ss.getSheetByName(SIGMAFLOW.SHEETS.CASES), 'foglio cases (schema pre-dismissione) rimosso da step3');

    assertEquals_(2, summary.step4_migrazione_visite.jobs_processed, 'step4: entrambi i job hanno ora un log da cui ricostruire');
    assertTrue_(summary.step4_migrazione_visite.visite_written > 0, 'step4: righe visite scritte');
    assertEquals_(0, summary.step4_migrazione_visite.coherence_warnings.length, 'nessun warning di incoerenza sui dati sintetici puliti');

    var jobs = readTable_(jobsSheet);
    var job1 = jobs.filter(function(j) { return j.job_id === 'JOB-OLD-1'; })[0];
    assertTrue_(Boolean(job1.activity_log_json) && job1.activity_log_json !== '[]', 'job1 ha ora un activity_log_json popolato');
    assertEquals_('Caso storico 1', job1.title, 'i dati esistenti (title) restano intatti e allineati, non shiftati');

    var visite1 = readVisiteForJob_(ss, 'JOB-OLD-1');
    assertEquals_(1, visite1.length, 'una visita ricostruita per JOB-OLD-1 (mai rientrato)');
    assertEquals_('2026-01-01T09:00:00+02:00', visite1[0].apertura_ts, 'apertura_ts della visita = arrival_ts storico');
  });
}

// N-B1 (docs/DESIGN_backup.md): test su backupProd_/pruneOldBackups_/
// eseguiBackupGiornalieroProd. SIGMAFLOW.DEFAULT_SPREADSHEET_ID qui non
// e' MAI il vero foglio PROD - nell'harness Node, SpreadsheetApp.openById
// crea un oggetto MockSpreadsheet puramente in memoria, senza nessuna
// chiamata di rete (vedi gas-harness.js). resetProdMock_ ricostruisce
// ogni volta un punto di partenza pulito (nome corretto, jobs/config
// vuoti, cartella di backup svuotata) - senza questo, i test
// inquinerebbero lo stesso oggetto condiviso da un'esecuzione all'altra,
// stesso principio gia' corretto per jobs_archivio/jobs_cestino in N6.
function resetProdMock_() {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  ss.name = 'SigmaFlow Database';
  ss.sheets = {};
  ensureSheet_(ss, SIGMAFLOW.SHEETS.JOBS, JOB_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CONFIG, CONFIG_HEADERS);
  seedDefaultConfig_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));
  ensureBackupFolder_(ss).fileIds.clear();
  return ss;
}

function testBackupRetentionDaysFallsBackToDefaultWhenConfigMissing() {
  var ss = resetProdMock_();
  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG), CONFIG_HEADERS);
  assertEquals_(14, backupRetentionDays_(ss), 'senza config, deve ricadere sul default in DEFAULT_CONFIG');
}

// writeConfigValue_ (Utils.gs) legge/scrive in modo ambientale
// (getSpreadsheet_()) - qui non riusabile senza reintrodurre proprio la
// risoluzione ambientale che questo programma vuole evitare (§4 del
// design), quindi si scrive direttamente sul foglio config del mock PROD
// gia' in mano, stesso meccanismo di writeConfigValue_ applicato a un ss
// esplicito.
function testBackupRetentionDaysReadsConfiguredValue() {
  var ss = resetProdMock_();
  var sheet = ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG);
  var headers = getHeaderMap_(sheet);
  var rows = readTable_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === 'backup_retention_giorni') {
      sheet.getRange(i + 2, headers.value).setValue('7');
      break;
    }
  }
  assertEquals_(7, backupRetentionDays_(ss), 'deve leggere il valore configurato su PROD, non il default');
}

function testBackupProdRejectsWrongSpreadsheetName() {
  var ss = resetProdMock_();
  ss.name = 'Nome sbagliato';
  var failed = false;
  try {
    backupProd_();
  } catch (err) {
    failed = err.message.indexOf('controllo di sicurezza fallito') !== -1;
  }
  assertTrue_(failed, 'backupProd_ deve rifiutarsi di procedere se il nome del foglio PROD non corrisponde');
}

function testBackupProdCreatesFullCopyInDedicatedFolder() {
  var ss = resetProdMock_();
  ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS).appendRow(jobToRow_({ job_id: 'JOB-PROD-1', title: 'Caso reale' }));

  var result = backupProd_();
  assertTrue_(Boolean(result.backup_id), 'backupProd_ deve restituire l\'id del nuovo file');

  var copy = SpreadsheetApp.openById(result.backup_id);
  var copiedJobs = readTable_(copy.getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  assertEquals_(1, copiedJobs.length, 'la copia deve contenere gli stessi dati del foglio jobs di PROD');
  assertEquals_('Caso reale', copiedJobs[0].title, 'i dati copiati devono corrispondere a quelli reali');

  var folder = ensureBackupFolder_(ss);
  var found = false;
  var files = folder.getFiles();
  while (files.hasNext()) {
    if (files.next().getId() === result.backup_id) { found = true; }
  }
  assertTrue_(found, 'il file di backup deve trovarsi nella cartella dedicata, non nella radice');
}

// Su richiesta esplicita di Marco: la cartella di backup vive dentro la
// STESSA cartella Drive del foglio PROD, non un id fisso da tenere
// sincronizzato a mano. Simulato spostando il file mock del foglio PROD
// in una cartella "reparto Amministrazione" di prova e verificando che
// la cartella di backup compaia li' dentro, non nella radice di Drive
// (dove il mock lo mette di default al primo openById).
function testBackupFolderLivesInSameFolderAsProdSpreadsheet() {
  var ss = resetProdMock_();
  var prodFile = DriveApp.getFileById(ss.getId());
  var department = DriveApp.getRootFolder().createFolder('Reparto Amministrazione (prova)');
  DriveApp.getRootFolder().removeFile(prodFile);
  department.addFile(prodFile);

  var folder = ensureBackupFolder_(ss);

  var found = false;
  var subfolders = department.getFoldersByName('SigmaFlow — Backup PROD');
  while (subfolders.hasNext()) {
    if (subfolders.next().getId() === folder.getId()) { found = true; }
  }
  assertTrue_(found, 'la cartella di backup deve essere una sottocartella diretta della cartella che contiene il foglio PROD');

  var inRoot = false;
  var rootSubfolders = DriveApp.getRootFolder().getFoldersByName('SigmaFlow — Backup PROD');
  while (rootSubfolders.hasNext()) {
    if (rootSubfolders.next().getId() === folder.getId()) { inRoot = true; }
  }
  assertTrue_(!inRoot, 'la cartella di backup non deve finire nella radice quando PROD vive altrove');
}

function testBackupProdNeverModifiesSourceSheet() {
  var ss = resetProdMock_();
  ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS).appendRow(jobToRow_({ job_id: 'JOB-PROD-2', title: 'Non deve sparire' }));

  backupProd_();

  var jobsAfter = readTable_(SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID).getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  assertEquals_(1, jobsAfter.length, 'il foglio PROD sorgente deve restare invariato dopo un backup');
  assertEquals_('Non deve sparire', jobsAfter[0].title, 'nessuna modifica ai dati sorgente');
}

function testPruneOldBackupsDeletesOnlyFilesOlderThanRetention() {
  var ss = resetProdMock_();
  var recent = backupProd_();
  var old = backupProd_();

  var oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 20);
  DriveApp.getFileById(old.backup_id).created = oldDate;

  var result = pruneOldBackups_(14, ss);
  assertEquals_(1, result.deleted_count, 'solo il file piu\' vecchio della soglia deve essere eliminato');
  assertTrue_(result.deleted_names.indexOf(old.backup_name) !== -1, 'il nome del file vecchio deve comparire tra gli eliminati');

  assertTrue_(DriveApp.getFileById(old.backup_id).isTrashed(), 'il file vecchio deve risultare cestinato');
  assertTrue_(!DriveApp.getFileById(recent.backup_id).isTrashed(), 'il file recente non deve essere toccato');
}

function testEseguiBackupGiornalieroProdReturnsBackupAndPruneResult() {
  resetProdMock_();
  var result = eseguiBackupGiornalieroProd();
  assertTrue_(Boolean(result.backup.backup_id), 'deve restituire il risultato del backup');
  assertTrue_(Boolean(result.prune), 'deve restituire anche il risultato della pulizia retention');
  assertEquals_(0, result.prune.deleted_count, 'un backup appena creato non deve eliminare nulla');
}

// §3 del design: "un fallimento nella pulizia retention non deve
// invalidare un backup appena creato con successo" - simulato rompendo
// temporaneamente ensureBackupFolder_ solo per la fase di pulizia (dopo
// che backupProd_ l'ha gia' usata con successo per creare il file).
function testEseguiBackupGiornalieroProdKeepsBackupWhenPruneFails() {
  resetProdMock_();
  var originalEnsureBackupFolder = ensureBackupFolder_;
  var callCount = 0;
  ensureBackupFolder_ = function(ss) {
    callCount++;
    if (callCount > 1) {
      throw new Error('Cartella non raggiungibile (simulato)');
    }
    return originalEnsureBackupFolder(ss);
  };

  try {
    var result = eseguiBackupGiornalieroProd();
    assertTrue_(Boolean(result.backup.backup_id), 'il backup deve restare valido anche se la pulizia fallisce');
    assertEquals_(null, result.prune, 'prune deve essere null quando la pulizia fallisce');
    assertTrue_(Boolean(result.prune_error), 'l\'errore di pulizia deve essere riportato, non inghiottito');
  } finally {
    ensureBackupFolder_ = originalEnsureBackupFolder;
  }
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
  ensureSheet_(ss, SIGMAFLOW.SHEETS.VISITE, VISITE_HEADERS);
  ensureSheet_(ss, SIGMAFLOW.SHEETS.CONFIG, CONFIG_HEADERS);
  removeCasesSheet_(ss);

  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS), JOB_HEADERS);
  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE), VISITE_HEADERS);
  clearDataRows_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG), CONFIG_HEADERS);
  seedDefaultConfig_(ss.getSheetByName(SIGMAFLOW.SHEETS.CONFIG));

  // N6 (DESIGN_archiviazione.md, §8/§9): getMetrics() ora legge anche
  // jobs_archivio/visite_archivio (union diretta, nessun filtro) - senza
  // svuotarli qui, i residui lasciati da test precedenti nello stesso
  // spreadsheet condiviso della suite (setupSigmaFlow()/archiveJob_ non
  // erano mai stati puliti tra un test e l'altro, essendo fuori scope
  // prima di N6) inquinerebbero silenziosamente le metriche di QUALUNQUE
  // test successivo, non solo quelli che parlano esplicitamente di
  // archivio. jobs_cestino/visite_cestino ripuliti per lo stesso principio
  // di igiene, anche se nessuna metrica li legge mai.
  [
    [SIGMAFLOW.SHEETS.JOBS_ARCHIVIO, JOB_ARCHIVIO_HEADERS],
    [SIGMAFLOW.SHEETS.JOBS_CESTINO, JOB_CESTINO_HEADERS],
    [SIGMAFLOW.SHEETS.VISITE_ARCHIVIO, VISITE_HEADERS],
    [SIGMAFLOW.SHEETS.VISITE_CESTINO, VISITE_HEADERS]
  ].forEach(function(entry) {
    var sheet = ss.getSheetByName(entry[0]);
    if (sheet) { clearDataRows_(sheet, entry[1]); }
  });
}

function readVisiteForJob_(ss, jobId) {
  return readTable_(ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE)).filter(function(visit) {
    return visit.job_id === jobId;
  });
}

// clearDataRows_ spostata in Utils.gs (N4, DESIGN_archiviazione.md §6b):
// serve anche a svuotaCestino_ (Kanban.gs), codice di produzione che non
// deve dipendere da Tests.gs.

function appendCompletedJob_(ss, data) {
  var now = nowIso_();
  var arrival = new Date();
  arrival.setDate(arrival.getDate() - Number(data.lead_time_d || 1));
  var start = new Date();
  start.setDate(start.getDate() - Number(data.service_time_d || 1));
  var arrivalIso = Utilities.formatDate(arrival, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var startIso = Utilities.formatDate(start, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

  var jobId = generateId_('J');

  // Usa jobToRow_ (mappa per nome di intestazione, come il codice di
  // produzione) invece di un array posizionale: dopo L5 parte 2/2
  // JOB_HEADERS non contiene piu' visit_number/start_ts/done_ts/
  // service_time_d/lead_time_d/wait_time_d/is_rework/rework_cause (ora
  // solo su 'visite', scritte sotto).
  ss.getSheetByName(SIGMAFLOW.SHEETS.JOBS).appendRow(jobToRow_({
    job_id: jobId,
    title: data.title,
    client: data.client || 'Cliente test',
    ambassador: data.ambassador || '',
    status: 'done',
    assignee: 'tester@sigmapiu.it',
    tag: 'test',
    size_class: data.size_class || 'M',
    size_points: SIGMAFLOW.SIZE_POINTS[data.size_class || 'M'],
    priority_class: data.priority_class || 'p1_plan',
    priority_class_manual: false,
    impact: data.impact || 2,
    manageability: data.manageability || 2,
    priority_score: data.priority_score || 2,
    description: data.description || '',
    due_date: data.due_date || '',
    arrival_ts: arrivalIso,
    invoiced: Boolean(data.invoiced),
    card_color: '',
    activity_log_json: '[]',
    incarico_chiuso_ts: ''
  }));

  // Fase L4: le metriche leggono da 'visite', non piu' dai campi
  // derivati su 'jobs' — start_ts/consegna_ts qui producono lo stesso
  // service_time_d passato in data, via visitServiceTimeDays_.
  ss.getSheetByName(SIGMAFLOW.SHEETS.VISITE).appendRow([
    jobId,
    data.visit_number || 1,
    arrivalIso,
    '',
    '',
    startIso,
    now,
    '',
    '',
    0,
    0,
    0,
    data.rework_cause || ''
  ]);

  return jobId;
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
