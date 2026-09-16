// Verifica read-only su snapshot esportato da TEST: nessuna API Google o write.
// Uso: node apps-script/test-harness/verify-v2-snapshot.js <snapshot.json>
const fs = require('fs');
const assert = require('assert');
const { createHarness } = require('./gas-harness.js');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const h = createHarness();
const c = h.context;
const config = Object.assign({}, c.SIGMAFLOW.DEFAULT_CONFIG, input.config);
const now = new Date(input.read_at);
const jobs = input.jobs.concat(input.archivedJobs);
const state = c.buildDashboardStateV2_(input.jobs, input.visits, config, now, input.archivedJobs, input.archivedVisits);
const columns = Object.fromEntries(JSON.parse(config.columns_json).map(col => [col.id, col.role]));

// Oracolo indipendente: ultimo to grezzo valido all'istante, senza usare
// normalizzazione, logical_states, from, cumulative o formule boundary.
function rawStocks(at, subset = jobs) {
  const result = {};
  for (const role of ['future_work', 'wip', 'waiting']) {
    result[role + '_stock_jobs'] = 0;
    result[role + '_stock_points'] = 0;
  }
  for (const job of subset) {
    const moves = JSON.parse(job.activity_log_json || '[]')
      .filter(e => e.type === 'move' && columns[e.to] && c.dashboardV2Instant_(e.ts).getTime() <= at)
      .sort((a, b) => c.dashboardV2Instant_(a.ts) - c.dashboardV2Instant_(b.ts));
    if (!moves.length) continue;
    const role = columns[moves[moves.length - 1].to];
    const stock = role === 'wip' ? 'wip' : role === 'stand_by' ? 'waiting' : ['backlog', 'prep'].includes(role) ? 'future_work' : null;
    if (stock) {
      result[stock + '_stock_jobs']++;
      result[stock + '_stock_points'] += c.jobPoints_(job);
    }
  }
  return result;
}
let exactIdentities = 0;
for (const row of state.cfd.weekly) {
  const expected = rawStocks(Date.parse(row.sampled_at));
  for (const [key, value] of Object.entries(expected)) assert.strictEqual(row[key], value, key);
  for (const unit of ['jobs', 'points']) {
    const b = row.boundaries[unit];
    for (const [role, high, low] of [['waiting', 'waiting_boundary', 'completed_boundary'], ['wip', 'wip_boundary', 'waiting_boundary'], ['future_work', 'future_work_boundary', 'wip_boundary']]) {
      assert.strictEqual(b[high] - b[low], expected[role + '_stock_' + unit], 'identita esatta ' + role);
      exactIdentities++;
    }
  }
}
const altered = jobs.map(job => ({ ...job, activity_log_json: JSON.stringify(JSON.parse(job.activity_log_json).map(e => ({ ...e, from: 'deliberately_wrong' }))) }));
const alteredState = c.buildDashboardStateV2_(altered.slice(0, input.jobs.length), input.visits, config, now, altered.slice(input.jobs.length), input.archivedVisits);
for (const field of ['flow', 'cfd', 'wipEpisodes', 'capacity', 'history']) {
  assert.strictEqual(JSON.stringify(state[field]), JSON.stringify(alteredState[field]), 'invarianza from: ' + field);
}
let annualChecks = 0;
let fullHistoryChecks = 0;
for (const row of state.history.weekly.concat(state.history.monthly)) {
  const expected = rawStocks(Date.parse(row.sampled_at));
  for (const unit of ['jobs', 'points']) {
    const b = row.boundaries[unit];
    for (const [role, high, low] of [['waiting', 'waiting_boundary', 'completed_boundary'], ['wip', 'wip_boundary', 'waiting_boundary'], ['future_work', 'future_work_boundary', 'wip_boundary']]) {
      assert.strictEqual(row[role + '_stock_' + unit], expected[role + '_stock_' + unit]);
      assert.strictEqual(b[high] - b[low], expected[role + '_stock_' + unit]);
      fullHistoryChecks++;
    }
  }
}
// Oracolo episodi/capacita': scansiona i to grezzi, senza usare gli eventi V2.
const rawEpisodes = [];
let rawReturns = 0;
for (const job of jobs) {
  let role = null, number = 0;
  const moves = JSON.parse(job.activity_log_json || '[]').filter(e => e.type === 'move' && columns[e.to] && c.dashboardV2Instant_(e.ts) <= now)
    .sort((a,b) => c.dashboardV2Instant_(a.ts) - c.dashboardV2Instant_(b.ts));
  for (const move of moves) {
    const next = columns[move.to], at = c.dashboardV2Instant_(move.ts).getTime();
    if (next === 'wip' && role !== 'wip') rawEpisodes.push({job_id:job.job_id, number:++number, at, points:c.jobPoints_(job)});
    if (role === 'stand_by' && ['backlog','prep','wip'].includes(next) && !(job.incarico_chiuso_ts && c.dashboardV2Instant_(job.incarico_chiuso_ts).getTime() <= at)) rawReturns++;
    role = next;
  }
}
assert.strictEqual(state.wipEpisodes.total_wip_episodes, rawEpisodes.length);
assert.strictEqual(state.wipEpisodes.first_wip_episodes, rawEpisodes.filter(e => e.number === 1).length);
assert.strictEqual(c.dashboardV2FlowTotals_(state.flow.events).returns_after_wait_events, rawReturns);
const windowWeeks = Number(config.capacity_window_weeks), minSamples = Number(config.min_samples_capacity);
let capacityWindowsChecked = 0;
for (let i = 0; i < state.capacity.new_work.weekly.length; i++) {
  const bucket = state.capacity.new_work.weekly[i], end = Date.parse(bucket.period_end);
  const starts = rawEpisodes.filter(e => e.number === 1 && e.at > end-windowWeeks*7*86400000 && e.at <= end);
  const expected = i+1 >= windowWeeks && starts.length >= minSamples ? starts.reduce((sum,e) => sum+e.points,0)/windowWeeks : null;
  assert.strictEqual(bucket.new_work_capacity_points_per_week, expected, 'media mobile assorbimento');
  capacityWindowsChecked++;
}
const byId = Object.fromEntries(jobs.map(j => [j.job_id,j]));
const eligibleVisits = input.visits.concat(input.archivedVisits).filter(v => v.consegna_ts && byId[v.job_id] && c.dashboardV2Instant_(v.consegna_ts) > now-windowWeeks*7*86400000 && c.dashboardV2Instant_(v.consegna_ts) <= now);
const expectedOutput = eligibleVisits.length >= minSamples ? Math.round(eligibleVisits.reduce((sum,v) => sum+c.jobPoints_(byId[v.job_id]),0)/windowWeeks*100)/100 : null;
assert.strictEqual(state.capacity.observed.rolling_capacity_points_per_week, expectedOutput);
let observedWindowsChecked = 0;
for (const bucket of state.capacity.new_work.weekly) {
  const end = new Date(bucket.period_end), since = new Date(end-windowWeeks*7*86400000);
  const matches = input.visits.concat(input.archivedVisits).filter(v=>v.consegna_ts && byId[v.job_id] && c.dashboardV2Instant_(v.consegna_ts)>since && c.dashboardV2Instant_(v.consegna_ts)<=end);
  const actual = c.dashboardV2CapacityMetric_(input.visits.concat(input.archivedVisits),byId,since,end,windowWeeks,minSamples);
  const enough = matches.length >= minSamples;
  assert.strictEqual(actual.sample_size,matches.length);
  assert.strictEqual(actual.rolling_capacity_points_per_week,enough ? Math.round(matches.reduce((sum,v)=>sum+c.jobPoints_(byId[v.job_id]),0)/windowWeeks*100)/100 : null);
  observedWindowsChecked++;
}
const denominator = state.capacity.new_work.new_work_capacity_points_per_week;
assert.strictEqual(state.futureWork.committed_weeks, denominator > 0 ? Math.round(state.futureWork.future_work_points/denominator*100)/100 : null);
const duplicates = values => values.filter((v,i) => values.indexOf(v) !== i);
const sourceQuality = {duplicate_job_ids:duplicates(jobs.map(j=>j.job_id)), duplicate_visit_keys:duplicates(input.visits.concat(input.archivedVisits).map(v=>v.job_id+'|'+v.numero_visita)),
  visits_without_job:input.visits.concat(input.archivedVisits).filter(v=>!byId[v.job_id]).length,
  jobs_without_positive_size:jobs.filter(j=>!(Number(j.size_points)>0)).length};
for (const view of state.history.annual_cfd) {
  if (!view.offset) continue;
  for (const row of view.points) {
    const expected = rawStocks(Date.parse(row.sampled_at));
    for (const unit of ['jobs', 'points']) {
      const b = row.rebased_boundaries[unit];
      for (const key of Object.keys(b)) assert.strictEqual(row.original_boundaries[unit][key] - b[key], view.offset[unit]);
      for (const [role, high, low] of [['waiting', 'waiting_boundary', 'completed_boundary'], ['wip', 'wip_boundary', 'waiting_boundary'], ['future_work', 'future_work_boundary', 'wip_boundary']]) {
        assert.strictEqual(b[high] - b[low], expected[role + '_stock_' + unit]);
        annualChecks++;
      }
    }
  }
  assert.strictEqual(view.points[0].rebased_boundaries.jobs.completed_boundary, 0);
  assert.strictEqual(view.points[0].rebased_boundaries.points.completed_boundary, 0);
}
for (const key of ['new_work_jobs', 'new_work_points', 'completed_visits', 'completed_points']) {
  const total = c.dashboardV2FlowTotals_(state.flow.events)[key];
  assert.strictEqual(state.history.monthly.reduce((sum, row) => sum + row[key], 0), total, 'riconciliazione mensile ' + key);
  assert.strictEqual(state.history.weekly.reduce((sum, row) => sum + row[key], 0), total, 'riconciliazione settimanale ' + key);
}
const sampleJob = jobs.find(job => job.job_id === 'JOB-20260707-0YXL');
const sample = sampleJob ? ['2026-04-06T12:00:00+02:00', '2026-04-08T12:00:00+02:00', '2026-04-10T12:00:00+02:00', '2026-04-28T18:00:00+02:00', '2026-04-30T12:00:00+02:00'].map(at => {
  const normalized = c.normalizeActivityLogForDashboard_(sampleJob, c.dashboardV2ColumnMap_(config), now);
  const actual = c.dashboardV2Stocks_([normalized], { [sampleJob.job_id]: sampleJob }, Date.parse(at), Date.parse(at), Date.parse(at));
  const expected = rawStocks(Date.parse(at), [sampleJob]);
  for (const [key, value] of Object.entries(expected)) assert.strictEqual(actual[key], value, 'campione attesa ' + key);
  return { at, ...expected };
}) : [];
console.log(JSON.stringify({ source: input.source, spreadsheet_id: input.spreadsheet_id,
  read_at: input.read_at, jobs: jobs.length, visits: input.visits.length + input.archivedVisits.length,
  weeks: state.cfd.weekly.length, exact_identities_verified: exactIdentities,
  independent_stock_checks: state.cfd.weekly.length * 6, from_invariance: true,
  currentWork: state.currentWork, currentStocks: state.cfd.current,
  validation: state.cfd.validation, last_bucket: state.cfd.weekly.slice(-1),
  sample_job: sampleJob && sampleJob.job_id, sample,
  anomalies: state.dataQuality.anomalies.length,
  final_checks: { full_history_stock_identities: fullHistoryChecks, capacity_windows_checked: capacityWindowsChecked, observed_windows_checked: observedWindowsChecked,
    source_quality: sourceQuality, raw_episodes:rawEpisodes.length, returns_after_wait:rawReturns,
    first_episodes:rawEpisodes.filter(e=>e.number===1).length,
    capacity_observed: state.capacity.observed, capacity_new_work: denominator,
    committed_weeks:state.futureWork.committed_weeks },
  history: { start: state.history.history_start, available_years: state.history.available_years,
    fully_observed_calendar_years: state.history.fully_observed_calendar_years,
    comparable_years: state.history.comparable_years, quality: state.history.comparison_quality,
    months: state.history.monthly.length, weeks: state.history.weekly.length,
    annual_stock_identities: annualChecks,
    views: state.history.annual_cfd.map(view => ({year: view.calendar_year, quality: view.quality, offset: view.offset, anchor: view.points[0]})) }
}, null, 2));
