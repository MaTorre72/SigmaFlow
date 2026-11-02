// La spunta e le date mantengono i campi esistenti; cambia soltanto il nome visibile.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function verifyInvoicedVocabulary() {
  const src = path.join(__dirname, '../src');
  const read = file => fs.readFileSync(path.join(src, file), 'utf8');
  const board = read('board.html'), client = read('client.html');
  const label = board.match(/<label class="checkbox-line">\s*<input id="modal-invoiced"[^>]*>([\s\S]*?)<\/label>/);
  assert(label && label[1].trim() === 'Fatturato');
  assert(!/Concluso|Chiuso/.test(label[1]));
  assert(board.includes('value="incarico_chiuso_ts">Data fatturazione incarico'));
  assert(client.includes("incarico_chiuso_ts: 'Fatturazione incarico (incarico_chiuso_ts)'"));
  assert(client.includes('Consegne non ancora fatturate'));
  assert(read('archivio.html').includes('<th>Fatturazione incarico</th>'));
  const visible = ['board.html', 'dashboard.html', 'archivio.html', 'client.html'].map(read)
    .join('\n').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/Incarichi conclusi/i.test(visible));
  // Il ruolo done indica la consegna; la spunta indica la fatturazione.
  assert(board.includes('<option value="done">Consegnato</option>'));
  assert(client.includes("done: 'Consegnato'"));
  assert(client.includes('Consegnato, non ancora fatturato'));
  assert(read('Model.gs').includes('Lavori consegnati ma non ancora fatturati'));
  return ['fatturato: spunta e date con identificatori invariati', 'fatturato: nessuna vecchia etichetta delle conclusioni'];
}
module.exports = { verifyInvoicedVocabulary };
