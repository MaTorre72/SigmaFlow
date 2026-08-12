# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 04:29

Fase corrente: D
Titolo: updateActivityEvent + deleteActivityEvent
Stato: COMPLETATA

Criteri di accettazione:
[x] updateActivityEvent su evento manual aggiorna correttamente — verificato con harness
[x] updateActivityEvent su evento auto restituisce errore (EVENTO_AUTO_NON_MODIFICABILE) — verificato con harness
[x] deleteActivityEvent su evento manual rimuove e ricalcola from dell'evento successivo — verificato con harness
[x] deleteActivityEvent su evento auto restituisce errore (EVENTO_AUTO_NON_ELIMINABILE) — verificato con harness
[x] Router aggiornato con updateActivityEvent e deleteActivityEvent

Prossima fase: E

Note operative permanenti (invariate, valide fino a F/J):
- Gate umani reali del programma: SOLO Fase F e Fase J (Fase H e' AUTO).
- Nessuna richiesta di conferma a Marco fino a Fase F o Fase J, o fino a
  un BLOCCATA irrisolvibile.
- Una fase per trigger (~ogni 2 ore via CronCreate, job 2ff909ff),
  non incatenate nello stesso turno.
- clasp run resta bloccato. Verifica reale tramite harness Node in
  ...\scratchpad\gas-harness.js — vedi test-fase-c.js e test-fase-d.js
  nella stessa cartella per gli scenari gia' coperti, riusabili come base
  per le fasi successive (in particolare Fase G, che dovra' portare
  questi scenari dentro Tests.gs come test GAS veri).

Note specifiche Fase D:
"campi modificabili" della specifica interpretato come: tutti i campi
gestiti da buildActivityEventCandidate_ (ts, type, to, reason, note,
field, old, new) tranne id e source, che restano quelli dell'evento
originale. updateActivityEvent riusa buildActivityEventCandidate_
partendo da Object.assign({}, existing, params).

"checkStructuralAlignment_ sul log risultante" (D2, punto 5) della
specifica e' ambiguo: la funzione richiede un singolo evento candidato,
non un log intero. Interpretato come: eseguire il controllo sull'ultimo
evento 'move' rimasto dopo la cancellazione (quello piu' rilevante per la
coerenza di start_ts/done_ts), restituendo [] se non ci sono piu' eventi
move. Deviazione documentata, da rivedere in Fase G se i test la
smentiscono.

Nella Fase D non esiste ancora un modo reale di generare eventi
source:'auto' (arriva con moveJob in Fase E) — nei test verificati con
harness un evento auto e' stato iniettato direttamente nel foglio mock
per simulare lo scenario.

Push su Web App fatto (versione HEAD/dev). Commit e push del branch
codex/activity-log-backend fatti.
