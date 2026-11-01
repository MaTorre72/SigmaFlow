// Controlla il testo della vista principale, escludendo identificatori e modelli separati.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function verifyDashboardVocabulary() {
  const src = path.join(__dirname, '../src');
  const client = fs.readFileSync(path.join(src, 'client.html'), 'utf8');
  const markup = fs.readFileSync(path.join(src, 'dashboard.html'), 'utf8');
  const mainMarkup = markup.slice(0, markup.indexOf('<details class="v3-diagnostics">'));
  const beginning = client.indexOf('  function dashboardV3Text_');
  const ending = client.indexOf('  function renderMetrics(');
  const diagnosticStart = client.indexOf('    var diagnostic =');
  const diagnosticEnd = client.indexOf('    drawDashboardV3Flow_(dashboard,');
  const mainClient = client.slice(beginning, diagnosticStart) + client.slice(diagnosticEnd, ending);
  const visibleMarkup = mainMarkup.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ' ');
  const literals = mainClient.split('\n').filter(line => !line.trim().startsWith('//'))
    .flatMap(line => [...line.matchAll(/(["'])(.*?)\1/g)].map(match => match[2].replace(/<[^>]*>/g, ' ')));
  const forbidden = /\b(?:completamento|completamenti|completato|completati|completata|completate|ripresa|riprese|pratiche)\b|Ritmo di consegna|WIP rework|WIP nuovo|Prime lavorazioni(?: in)? WIP|unità concluse/i;
  const failures = [visibleMarkup, ...literals].filter(text => forbidden.test(text));
  assert.deepEqual(failures, [], 'Termini non omogenei nei testi visibili principali');
  assert(mainMarkup.includes('Tasso di consegna') && mainMarkup.includes('>Consegnato<'));
  assert(mainMarkup.includes('>Rientri<') && mainMarkup.includes('>Prima lavorazione<'));
  assert(mainClient.includes('Consegne cumulative') && mainClient.includes('Consegna equivalente non ancora osservata'));
  assert(mainClient.includes(' consegne · qualità '));
  assert(client.includes(' consegne/settimana') && client.includes("'Tasso di consegna':"));
  assert(client.includes("title: 'Consegne recenti'"));
  assert(client.includes('Data consegna (done_ts)') && client.includes('da consegnato a WIP'));
  assert(markup.includes('Punti consegnati (ultimi 30 giorni)') && markup.includes('Consegnati - asse destro'));
  assert(client.includes('Lavori consegnati (periodo)') && client.includes('Passaggi consegnati (periodo)'));
  assert(client.includes('Tasso di consegna (pt/settimana)') && markup.includes('Tasso di consegna vs Lavoro in corso'));
  assert(markup.includes('>Rilavorazione<') && client.includes('Rilavorazioni medie quando capitano'));
  assert(client.includes('Tasso di arrivo (lambda)') && client.includes('Consegne non ancora chiuse'));
  assert(markup.includes('I passaggi totali alla settimana'));
  const model = fs.readFileSync(path.join(src, 'Model.gs'), 'utf8');
  assert(model.includes('Servono almeno 5 lavori consegnati per stimare tempi e capacita.'));
  assert(model.includes('servono piu lavori consegnati.'));
  // Il vecchio messaggio è corretto, ma non governa più lo Stato del flusso.
  const h = require('./gas-harness').createHarness().context;
  const config = h.dashboardV2TestConfig_({ capacity_window_weeks: 2, wip_trend_weeks: 6,
    min_samples_capacity: 1, wip_target_min_jobs: 0, wip_target_max_jobs: 10,
    flow_reference_points_per_week: 1000, flow_reference_completions_per_week: 10, flow_slow_ratio: 0.4,
    history_reliable_from: '2026-01-01' });
  const job = h.dashboardV2PathFixture_('VOCABULARY', ['backlog', 'wip', 'done'],
    ['2026-01-20T09:00', '2026-02-02T09:00', '2026-02-05T09:00'], 8);
  const dashboard = h.buildDashboardStateV2_([job], [{job_id:job.job_id,numero_visita:1,consegna_ts:'2026-02-05T09:00'}],
    config, new Date('2026-02-16T12:00:00+01:00'), [], []);
  const legacy = h.dashboardV3FlowState_(dashboard.currentWork, dashboard.capacity, config);
  assert.equal(legacy.system_flow_message, 'Il lavoro attivo è sufficiente, ma le consegne sono sotto il ritmo atteso.');
  assert.notEqual(dashboard.systemFlow.system_flow_message, legacy.system_flow_message);
  assert.equal(dashboard.flow.flow_message, dashboard.systemFlow.system_flow_message);
  return ['vocabolario: testi principali senza sinonimi esclusi', 'vocabolario: aggiunte approvate e termini protetti',
    'vocabolario: messaggio consegne legacy separato dallo Stato del flusso'];
}
module.exports = { verifyDashboardVocabulary };
