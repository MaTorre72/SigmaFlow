// Verifiche statiche mirate al contratto della dashboard V3. Non sostituiscono
// il collaudo nel browser: impediscono che il frontend torni a calcolare le
// metriche di business o a leggere il contratto legacy per la home.
const fs = require('fs');
const path = require('path');

function verifyV3Ui() {
  const src = path.join(__dirname, '..', 'src');
  const client = fs.readFileSync(path.join(src, 'client.html'), 'utf8');
  const markup = fs.readFileSync(path.join(src, 'dashboard.html'), 'utf8');
  const style = fs.readFileSync(path.join(src, 'style.html'), 'utf8');
  const backend = fs.readFileSync(path.join(src, 'DashboardV2.gs'), 'utf8');
  const constants = fs.readFileSync(path.join(src, 'Constants.gs'), 'utf8');
  const schema = fs.readFileSync(path.join(src, 'Schema.gs'), 'utf8');
  const applicationSources = [client, markup, backend, constants, schema].join('\n');
  const obsoleteFlowTokens = [
    'ACCELERATED', 'flow_accelerated_ratio', 'historical_observed_capacity',
    'expected_current_throughput', 'dashboardV3HistoricalCapacity_',
    'wip_warning_jobs', 'future_work_warning_weeks', 'history_comparison_granularity'
  ];
  const clientScript = client.replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
  // Il controllo statico comprende anche la sintassi dell'intero client:
  // il canvas non viene eseguito dall'harness Apps Script.
  new Function(clientScript);
  const renderer = client.slice(
    client.indexOf('function renderDashboardV3_'),
    client.indexOf('function drawDashboardV3Flow_')
  );
  const checks = [
    ['mapping dal contratto V2/V3', client.includes('renderDashboardV3_(metrics.dashboardState)')],
    ['stato del flusso limitato alle cinque etichette approvate', ['Sottoalimentato', 'Regolare', 'Rallentato', 'Carico elevato', 'Dati insufficienti'].every(label => client.includes(label))],
    ['classificazione e parametri obsoleti assenti dai sorgenti applicativi', obsoleteFlowTokens.every(token => !applicationSources.includes(token))],
    ['dettaglio usa solo riferimenti configurati', renderer.includes('detail.reference_points_per_week') && renderer.includes('detail.reference_completions_per_week') && renderer.includes('detail.slowing_threshold_points_per_week')],
    ['WIP letto dal backend', renderer.includes('current.wip_jobs') && renderer.includes('current.wip_points')],
    ['lavoro futuro letto dal backend', renderer.includes('future.future_work_jobs') && renderer.includes('future.future_work_points')],
    ['settimane lette dal backend', renderer.includes('future.committed_weeks')],
    ['rientri aggregati sulla finestra letti dal backend', renderer.includes('rework.rework_wip_entries') && renderer.includes('rework.rework_window_weeks') && renderer.includes('rework.rework_share')],
    ['tempi P50 e P80 letti dal backend', renderer.includes('timing.lead_time_median_days') && renderer.includes('timing.lead_time_p80_days') && markup.includes('Tempo tipico alla consegna') && markup.includes('8 pratiche su 10 entro')],
    ['precisione home coerente per settimane e giorni',
      renderer.includes('dashboardV3FormatHomeEstimate_(future.committed_weeks, 1)') &&
      renderer.includes("dashboardV3FormatHomeEstimate_(timing.lead_time_median_days, 0, ' giorni')") &&
      renderer.includes("dashboardV3FormatHomeEstimate_(timing.lead_time_p80_days, 0, ' giorni')") &&
      !/dashboardV3Text_\(future\.committed_weeks|dashboardV3Text_\(timing\.lead_time_(?:median|p80)_days/.test(renderer)],
    ['metodo tempi assente dalla home', !markup.includes('nearest_rank') && !markup.includes('first_operational_entry_to_next_done')],
    ['dettaglio tempi disaggregato per taglia', client.includes("['taglia', 'Taglia'], ['mediana_giorni', 'Tempo tipico (giorni)'], ['p80_giorni', '8 pratiche su 10 entro (giorni)'], ['numero_casi', 'Casi']")],
    ['metodo tempi confinato alla diagnostica', renderer.includes('timingDiagnostic.interval_method') && renderer.includes('Stima teorica')],
    ['valori null spiegati', renderer.includes('Ritmo di assorbimento del nuovo lavoro non ancora stimabile.')],
    ['grafico alimentato dalle boundary backend', client.includes('row.boundaries[unit]')],
    ['WIP CFD separato con rework rosso sotto e nuovo blu sopra',
      client.includes("'wip_rework_boundary', 'wip_new_boundary'") &&
      client.indexOf("drawBand(keys[1], keys[2], '#c94b4b')") < client.indexOf("drawBand(keys[2], keys[3], '#4f86b5')") &&
      markup.indexOf('v3-legend-wip-rework') < markup.indexOf('v3-legend-wip-new') &&
      style.includes('.v3-legend-wip-rework::before { background: #c94b4b; }')],
    ['periodi CFD e risoluzioni completi',
      ['8 settimane', '3 mesi', '6 mesi', '12 mesi', 'Anno corrente', 'Mese', 'Trimestre', 'Anno', 'Da/A', 'Giorno', 'Settimana'].every(label => markup.includes(label)) &&
      client.includes('dashboardV5CfdRows_') && client.includes('history.daily') && client.includes('history.monthly') &&
      client.includes("period === 'custom'") && markup.includes('id="v3-cfd-from"') && markup.includes('id="v3-cfd-to"')],
    ['zoom pan reset e sottointervallo non mutano i bucket',
      markup.includes('id="v3-cfd-zoom-in"') && markup.includes('id="v3-cfd-pan-left"') &&
      markup.includes('id="v3-cfd-reset"') && markup.includes('id="v3-cfd-select-range"') &&
      client.includes('dashboardV5ZoomChart_') && client.includes('dashboardV5PanChart_') &&
      client.includes('rows.slice(start, end)') && !/\.boundaries\s*=|\.cumulative\s*=/.test(client.slice(client.indexOf('function dashboardV5WindowedRows_'), client.indexOf('function drawDashboardV3Flow_')))],
    ['tooltip CFD legge stock e cumulative backend',
      client.includes("selected['wip_new_' + unit]") && client.includes("selected['wip_rework_' + unit]") &&
      client.includes("selected['waiting_stock_' + unit]") && client.includes("['cum_new_work_' + unit]") &&
      client.includes('Ingressi cumulativi') && client.includes('Completamenti cumulativi')],
    ['lettura verticale completa con crosshair tooltip e selezione accessibile',
      client.includes("ctx.setLineDash([4, 3])") && client.includes('tooltipLines') &&
      client.includes('dashboardV3ChartSelectedIndex') && markup.includes('id="v3-flow-selection"') &&
      markup.includes('tabindex="0"')],
    ['serie movimenti sincronizzata sul CFD',
      client.includes("key: 'new_work_jobs'") && client.includes("key: 'rework_wip_episodes'") &&
      client.includes("key: 'completed_visits'") && markup.includes('Nuovi ingressi') &&
      markup.includes('Rientri') && markup.includes('Consegne')],
    ['mobile limita lo scorrimento orizzontale al canvas',
      style.includes('.v3-chart-wrap { max-width: 100%; overflow-x: auto; }') &&
      !style.includes('.v3-flow-chart-panel { overflow-x: auto; }') &&
      style.includes('overflow-wrap: anywhere')],
    ['nome CFD assente dalla home operativa',
      !/\bCFD\b/.test(markup.slice(0, markup.indexOf('<details class="legacy-dashboard">')))],
    ['nessuna somma backlog + preparazione nel renderer', !/backlog[^\n;]*\+[^\n;]*prep|prep[^\n;]*\+[^\n;]*backlog/i.test(renderer)],
    ['nessuna soglia o classificazione nel renderer', !/recentValue\s*[<>]|wip_jobs\s*[<>]|comparison_lower/i.test(renderer)],
    ['home caricata dal percorso backend rapido', client.includes("callApi('getDashboardMetrics')")],
    ['aggiornamento lungo segnalato in modo centrale', markup.includes('id="v3-loading-state"') && markup.includes('Il calcolo può richiedere alcuni secondi.') && client.includes('setDashboardV3Loading_(true)') && client.includes('setDashboardV3Loading_(false)')],
    ['dashboard legacy caricata solo su apertura', client.includes("legacy.addEventListener('toggle'") && client.includes("callApi('getMetrics')")],
    ['vista precedente secondaria', markup.includes('<details class="legacy-dashboard">') && markup.includes('Vista precedente — confronto')],
    ['riferimento configurato e prova recente separati', renderer.includes('detail.reference_points_per_week') && renderer.includes('recent.window_start') && renderer.includes('recent.weeks_with_completions')],
    ['terminologia rientri senza etichette ripresa', markup.includes('Rientri nel lavoro') && !/Episodi di ripresa|Lavori ripresi|Ripresa numero|Data della ripresa/i.test(markup + client)],
    ['drill-down rientri con identificazione umana e provenienza', client.includes("['cliente', 'Cliente'], ['incarico', 'Incarico'], ['numero_rientro', 'Rientro n.'], ['stato_provenienza', 'Stato di provenienza'], ['data_uscita_precedente', 'Data uscita precedente'], ['data_ripresa', 'Data rientro']")],
    ['export completamenti riconciliabile', client.includes('recent_completions') && client.includes("['numero_visita', 'Numero visita']") && client.includes("['consegna_ts', 'Consegna']")],
    ['nessuna taratura automatica esposta', !markup.includes('Taratura suggerita dai dati') && !client.includes('included_in_baseline')],
    ['riepilogo diagnostico attivo', renderer.includes('diagnostic.last_cfd_bucket') && markup.includes('v3-diagnostics-detail') && !markup.includes('Controlli diagnostici non ancora attivi')],
    ['ordine mobile preservato dal markup', markup.indexOf('v3-flow-status') < markup.indexOf('v3-wip-jobs') && markup.indexOf('v3-wip-jobs') < markup.indexOf('v3-future-jobs') && markup.indexOf('v3-future-jobs') < markup.indexOf('v3-committed-weeks') && markup.indexOf('v3-committed-weeks') < markup.indexOf('v3-waiting-jobs') && markup.indexOf('v3-waiting-jobs') < markup.indexOf('v3-flow-chart')]
  ];
  const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
  if (failures.length) {
    throw new Error('Verifiche UI V3 fallite: ' + failures.join(', '));
  }
  return checks.map(([name]) => name);
}

if (require.main === module) {
  const checks = verifyV3Ui();
  console.log(`Verifiche UI V3 passate: ${checks.length}/${checks.length}`);
}

module.exports = { verifyV3Ui };
