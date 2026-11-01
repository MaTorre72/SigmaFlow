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
  assert(client.includes(' completamenti/settimana'), 'Diagnostica conservata');
  assert(markup.includes('Punti completati (ultimi 30 giorni)'), 'Vista legacy conservata');
  return ['vocabolario: testi principali senza sinonimi esclusi', 'vocabolario: diagnostica e legacy conservati'];
}
module.exports = { verifyDashboardVocabulary };
