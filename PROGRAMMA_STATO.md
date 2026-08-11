# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-11 21:40

Fase corrente: C
Titolo: addActivityEvent + getActivityLog
Stato: COMPLETATA

Criteri di accettazione:
[x] addActivityEvent con params validi restituisce ok: true — verificato con harness
[x] addActivityEvent con ts nel futuro restituisce hardErrors — verificato con harness
[x] addActivityEvent con sequenceWarnings e force:false restituisce requiresForce:true senza scrivere — verificato con harness
[x] addActivityEvent con force:true scrive l'evento nel foglio — verificato con harness
[x] getActivityLog restituisce il log ordinato per ts — verificato con harness

Prossima fase: D

Note operative permanenti (valide per tutte le fasi successive fino a F/J):
- Gate umani reali del programma: SOLO Fase F e Fase J (Fase H e' AUTO,
  nonostante un riferimento diverso in una richiesta precedente di Marco:
  seguo il programma scritto, che e' la fonte di verita').
- Nessuna ulteriore richiesta di conferma a Marco fino a Fase F o Fase J,
  o fino a un BLOCCATA irrisolvibile.
- Una fase per trigger, non incatenate nello stesso turno: ogni fase si
  ferma e committa, il trigger successivo (CronCreate, ogni ~2 ore)
  esegue la fase seguente.
- clasp run resta bloccato (manca associazione a progetto GCP standard).
  Verifica reale delle fasi che richiedono comportamento Apps Script
  tramite harness Node in
  C:\Users\Marco\AppData\Local\Temp\claude\...\scratchpad\gas-harness.js
  (mock di SpreadsheetApp/PropertiesService/Utilities/LockService, carica
  i file .gs reali via vm e li esegue). Non sostituisce runAllTestsAndLog
  nel vero ambiente GAS — quella verifica resta necessaria prima del
  deploy in Fase J, gate umano.

Note specifiche Fase C:
Bug reale trovato e corretto grazie all'harness: i confronti tra
timestamp usavano l'operatore stringa (<, >) invece di date reali —
falliva con timestamp di formato diverso (offset +02:00 vs Z). Aggiunta
compareTs_ in Utils.gs, usata ora in tutti i confronti timestamp
dell'activity log (ActivityLog.gs e Kanban.gs).

Push su Web App fatto (versione HEAD/dev). Commit e push del branch
codex/activity-log-backend fatti.
