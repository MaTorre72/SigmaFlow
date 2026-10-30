// Esegue il renderer reale con contratto backend, zero e copertura assente.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function verifyFlowCard() {
  const client = fs.readFileSync(path.join(__dirname, '../src/client.html'), 'utf8');
  const extract = (start, end) => client.slice(client.indexOf(start), client.indexOf(end, client.indexOf(start)));
  const root = { innerHTML: '' };
  const columns = [{id: 'working', role: 'wip', label: 'Laboratorio & verifica'}, {id: 'sent', role: 'done', label: 'Invii <finali>'}];
  const context = { document: { getElementById: () => root }, state: { columnMeta: columns } };
  vm.createContext(context);
  const renderer = extract('  function dashboardV5RenderFlowDetail_', '  // Fase 4a:');
  vm.runInContext(extract('  function dashboardV3Text_', '  function dashboardV7LocalDate_') +
    extract('  function escapeHtml(', '  function showError(') + renderer, context);
  const recent = { window_weeks: 3, jobs_per_week: 2, points_per_week: 13.5,
    first_work: { episodes_per_week: 1.25, points_per_week: 7.9 },
    resumed_work: { episodes_per_week: 0.75, points_per_week: 5.6 } };
  const detail = { wip_current: 4, wip_target_min: 3, wip_target_max: 5,
    slowing_threshold_points_per_week: 5.53, reference_points_per_week: 13.83,
    reference_window_count: 17, slow_ratio: 0.375 };
  context.dashboardV5RenderFlowDetail_(recent, detail, '3–5 lavori', { visits_per_week: 0.38, points_per_week: 2.63 });
  assert(root.innerHTML.includes('<caption>Media sulle ultime 3 settimane ISO complete</caption>'));
  const rows = [...root.innerHTML.matchAll(/<tr(?: title="[^"]*")?><th scope="row">([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  assert.equal(rows.length, 4);
  assert(rows[0].includes('Flusso attivo osservato') && rows[0].includes('13,5') && rows[0].includes('Soglia di rallentamento: 5,53 punti/settimana'));
  assert(rows[1].includes('Prima lavorazione') && rows[1].includes('1,25') && rows[1].includes('7,9'));
  assert(rows[2].includes('Rientri') && rows[2].includes('0,75') && rows[2].includes('5,6'));
  assert(rows[3].includes('Ritmo di consegna') && rows[3].includes('0,38') && rows[3].includes('2,63') && !rows[3].includes('Soglia'));
  assert(root.innerHTML.includes('title="valori arrotondati"'));
  assert(root.innerHTML.includes('colonna Laboratorio &amp; verifica, verso un’attesa o verso Invii &lt;finali&gt;'));
  assert(root.innerHTML.includes('mediana di 17 finestre valide'));
  assert(root.innerHTML.includes('il 37,5% del riferimento'));
  assert(root.innerHTML.includes('scende sotto 5,53 punti/settimana'));
  const changed = context.dashboardV5FlowExplanations_({...detail, reference_window_count: 23, slow_ratio: 0.27, slowing_threshold_points_per_week: 8.19},
    [{role:'wip',label:'Elaborazione'}, {role:'done',label:'Uscita'}]);
  assert(changed.includes('colonna Elaborazione, verso un’attesa o verso Uscita'));
  assert(changed.includes('23 finestre valide') && changed.includes('27%') && changed.includes('8,19 punti/settimana'));
  assert(!changed.includes('17 finestre') && !changed.includes('5,53') && !changed.includes('Laboratorio'));
  assert.equal(context.dashboardV5FlowExplanations_({}, []), '');
  assert(!context.dashboardV5FlowExplanations_(detail, [...columns, {role:'wip',label:'Seconda'}]).includes('Ogni volta'));
  assert(!/Math\.|\bNumber\(|\.reduce\(|\.toFixed\(|\/\s*(?:weeks|recent\.)/.test(renderer));
  context.dashboardV5RenderFlowDetail_({window_weeks: 3, jobs_per_week: 0, points_per_week: 0,
    first_work: {episodes_per_week: 0, points_per_week: 0}, resumed_work: {episodes_per_week: 0, points_per_week: 0}}, detail, '3–5 lavori', {visits_per_week: 0, points_per_week: 0});
  assert.equal((root.innerHTML.match(/<td>0/g) || []).length, 8);
  context.dashboardV5RenderFlowDetail_({window_weeks: 3}, detail, '3–5 lavori');
  assert.equal((root.innerHTML.match(/<td>Dati insufficienti/g) || []).length, 8);
  return ['card: quattro righe e soglia associata', 'card: finestra backend e formato italiano',
    'card: zero distinto da copertura assente', 'card: nessun calcolo e tooltip arrotondamento',
    'card: spiegazioni da colonne rinominate e valori backend, senza costanti'];
}
module.exports = { verifyFlowCard };
