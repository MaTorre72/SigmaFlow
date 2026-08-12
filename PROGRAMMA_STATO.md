# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 10:06

Fase corrente: G
Titolo: Suite test completa
Stato: COMPLETATA

Criteri di accettazione:
[x] runAllTestsAndLog -> passed: 35, failed: 0 — verificato eseguendo il vero runAllTests() di Tests.gs attraverso l'harness Node (clasp run bloccato, vedi note storiche)
[x] Nessun test precedente in regressione — tutti e 18 i test originali passano ancora
[x] Tutti i 17 nuovi test documentati con nome descrittivo in italiano nei commenti/nomi funzione
[x] clasp push riuscito — verificato anche con clasp pull + diff completo, non solo messaggio di successo
[x] Output di runAllTestsAndLog loggato in PROGRAMMA_STATO.md (sotto)

Output completo (harness, 2026-08-12 10:05):
{
  "success": true,
  "passed": 35,
  "failed": 0
}
Elenco dei 35 test, tutti passed:true — i 18 storici (testSetupSchema,
testAddJob, testMoveJobLifecycle, testMarkRework,
testAutomaticReworkFromStandBy, testStandByCannotReturnDirectlyToWip,
testPriorityHelpers, testPriorityUpdate, testCardColor,
testAmbassadorAndChecklist, testEditableOptions,
testDynamicColumnsAndOptions, testMetrics,
testSystemStateInsufficientData, testDataQualityThresholds,
testSystemStateSeparatesFlowFromTimeSamples, testSystemStateWorkload,
testMissingRequiredParam) + i 17 nuovi (testAddActivityEventMoveValido,
testAddActivityEventTsFuturo, testAddActivityEventColonnaNonTrovata,
testAddActivityEventReasonObbligatoria,
testAddActivityEventSequenceWarningsSenzaForce,
testAddActivityEventSequenceWarningsConForce,
testAddActivityEventStructuralWarningsSenzaAlign,
testAddActivityEventStructuralWarningsConAlign,
testAddActivityEventNotaValida, testUpdateActivityEventManual,
testUpdateActivityEventBloccoAuto, testDeleteActivityEventManual,
testDeleteActivityEventBloccoAuto, testGetActivityLogOrdinato,
testGetActivityLogFromRicalcolato, testMoveJobScriveEventoAuto,
testMigrateToActivityLogChecklist).

Prossima fase: H

Nota di trasparenza: questa verifica ha eseguito il vero runAllTests()
di Tests.gs (non una riscrittura parallela) dentro l'harness Node che
mocka Apps Script — NON e' una esecuzione reale in Google Apps Script
(clasp run resta bloccato, manca l'associazione a un progetto GCP
standard). E' lo stesso metodo gia' usato e validato nelle Fasi B-F,
confermato affidabile dal confronto con l'esecuzione reale di Marco
alle 07:38 (18/18). Se vuoi una conferma definitiva anche per questi 35,
puoi eseguire tu runAllTestsAndLog dall'editor quando ti e' comodo — non
e' bloccante per procedere, la Fase G ha gate 🟢 AUTO.

Note operative permanenti (invariate):
- Gate umani reali del programma: SOLO Fase F (gia' superata) e Fase J.
- Nessuna richiesta di conferma per altri motivi.
- Routine cloud attiva ogni 2 ore su codex/activity-log-backend
  (trig_01WrQXQAv2a2Rw8DfhmwGRNG), senza credenziali clasp — marca le
  fasi come CODICE_PRONTO_CLOUD finche' una sessione locale non fa il
  vero clasp push + verifica + promozione a COMPLETATA.
- Push sempre verificato con clasp pull + diff, mai fidandosi del solo
  messaggio di successo (vedi incidente risolto in data odierna).
