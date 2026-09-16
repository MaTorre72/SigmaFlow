// Esegue l'intera suite Tests.gs via l'harness Node e stampa un riepilogo.
// Wrapper pensato per essere invocato come singolo comando pre-autorizzato
// (vedi .claude/settings.local.json) durante l'esecuzione autonoma del
// runbook, invece di comporre ogni volta uno script inline diverso.
//
// Uso: node apps-script/test-harness/run-tests.js
// Exit code 0 se tutti i test passano, 1 altrimenti (utile per script che
// devono fermarsi su un fallimento, es. push-and-verify.sh).
const path = require('path');
const { createHarness } = require(path.join(__dirname, 'gas-harness.js'));
const { verifyV3Ui } = require(path.join(__dirname, 'verify-v3-ui.js'));

const h = createHarness();
h.scriptProperties['SIGMAFLOW_TEST_SPREADSHEET_ID'] = 'test-ss';
const result = h.context.runAllTests();

console.log(`Test passati: ${result.passed}/${result.passed + result.failed}`);

if (result.failed > 0) {
  console.log(`Test falliti: ${result.failed}`);
  result.results
    .filter(function (r) { return !r.passed; })
    .forEach(function (r) { console.log(`  FALLITO: ${r.name} - ${r.error}`); });
  process.exit(1);
}

try {
  const uiChecks = verifyV3Ui();
  console.log(`Verifiche UI V3 passate: ${uiChecks.length}/${uiChecks.length}`);
} catch (error) {
  console.log(`Verifiche UI V3 fallite: ${error.message}`);
  process.exit(1);
}

process.exit(0);
