# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 07:34

Fase corrente: E
Titolo: moveJob — eventi automatici
Stato: COMPLETATA

Criteri di accettazione:
[x] Dopo moveJob, il log della card contiene un evento auto — verificato con harness (log grezzo sul foglio)
[x] L'evento ha source: 'auto', from e to corretti — verificato con harness
[x] Il job is_rework: true produce evento con is_rework: true — verificato con harness
[x] La scrittura e' atomica con la scrittura del job — entrambe avvengono in sequenza sincrona nella stessa chiamata a moveJob, nessuno stato intermedio osservabile dall'esterno (single-thread Apps Script)
[x] Nessuna regressione sui test backend esistenti legati a moveJob — verificato riportando testMoveJobLifecycle, testStandByCannotReturnDirectlyToWip, testAutomaticReworkFromStandBy nell'harness (clasp run non disponibile per i 18 test reali)

Prossima fase: F

Note operative permanenti (invariate, valide fino a F/J):
- Gate umani reali del programma: SOLO Fase F e Fase J (Fase H e' AUTO).
- Nessuna richiesta di conferma a Marco fino a Fase F o Fase J, o fino a
  un BLOCCATA irrisolvibile.
- Una fase per trigger (~ogni 2 ore via CronCreate, job 2ff909ff).
- clasp run resta bloccato. Verifica reale tramite harness Node in
  ...\scratchpad\gas-harness.js — test-fase-c.js, test-fase-d.js,
  test-fase-e.js nella stessa cartella coprono gli scenari verificati
  finora, riusabili per Fase G (portarli dentro Tests.gs come test GAS).

Nota importante per il prossimo trigger (Fase F):
Fase F (migrateToActivityLog) e' 🔴 UMANO per definizione del programma
stesso: i suoi criteri di accettazione richiedono l'esecuzione REALE su
TEST e la verifica di 2-3 card campione da parte di Marco nel foglio
Google reale — cosa che l'harness locale non puo' sostituire (simula un
foglio mock, non i dati veri di TEST). Il prossimo trigger deve quindi:
scrivere la funzione migrateToActivityLog() secondo la specifica, fare
clasp push, MA NON eseguirla (ne' su TEST ne' altrove) e NON considerarla
completata — aggiornare subito lo stato a IN_ATTESA_GATE_UMANO e
fermarsi, lasciando l'esecuzione vera e la verifica a Marco dall'editor
GAS, come richiesto esplicitamente dal gate.

Nota tecnica emersa in Fase E (da rivedere eventualmente in Fase G, non
un difetto bloccante): getActivityLog (Fase C) ricalcola sempre "from"
tramite computeFrom_ guardando solo i "move" gia' presenti nel log. Per
il primissimo movimento di una card non esiste un evento precedente nel
log, quindi computeFrom_ restituisce null anche se moveJob aveva scritto
un "from" corretto (es. 'backlog') al momento della scrittura. E' un
comportamento coerente con la specifica di computeFrom_ cosi' com'e'
scritta, ma vale la pena discuterne con Marco in Fase G: se preferisce
che il primissimo evento move mantenga il from originale invece di None.

Push su Web App fatto (versione HEAD/dev). Commit e push del branch
codex/activity-log-backend fatti.
