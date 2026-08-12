# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 08:55

INCIDENTE RISOLTO (2026-08-12 ~08:50): Marco ha segnalato di non trovare
ActivityLog.gs nell'editor Apps Script. Diagnosi iniziale sbagliata da
parte mia (avevo detto "e' solo cache dell'editor, ricarica" — non era
vero). Verifica con clasp pull in una cartella pulita: il codice delle
Fasi B-F NON era davvero sul server, nonostante ogni "clasp push" di
questa sessione avesse riportato successo ("Pushed 13 files") per tutta
la notte. Causa esatta non accertata con certezza (nessun errore
visibile nell'output di clasp durante la notte; possibile problema
transitorio di token/quota lato Google non segnalato da clasp). Un push
di prova con un commento marcatore ha confermato che ORA il meccanismo
funziona di nuovo: il marcatore e' comparso in un pull immediato. Fatta
poi una verifica completa (non a campione): diff file per file tra tutti
i sorgenti locali e una copia fresca scaricata dal server — risultato
identico su tutti i 12 file. Il codice delle Fasi B-F e' quindi
realmente live ora.

Nessuna azione correttiva sul codice necessaria (era gia' tutto corretto
localmente e verificato via harness) — il problema era solo di
sincronizzazione col server, ora risolto e verificato. Da questo punto
in poi, ogni push viene seguito da una verifica con clasp pull invece di
fidarsi del solo messaggio di successo.

Fase corrente: F
Titolo: migrateToActivityLog
Stato: IN_ATTESA_GATE_UMANO

Criteri di accettazione:
[x] clasp push riuscito
[ ] Funzione eseguita su TEST: errors: [] — DA FARE DA MARCO
[ ] Su 2 card campione in TEST: correction_log_json migrato senza duplicati — DA VERIFICARE DA MARCO
[ ] Su 2 card campione in TEST: description ha checklist appesa, testo originale intatto — DA VERIFICARE DA MARCO
[ ] checklist_json e correction_log_json invariati nel foglio — DA VERIFICARE DA MARCO

Prossima fase: G (solo dopo "procedi con fase G" esplicito di Marco)

COSA DEVE FARE MARCO PER SBLOCCARE QUESTO GATE:
1. Aprire l'editor Apps Script del progetto SigmaFlow.
2. Selezionare la funzione migrateActivityLogOnTest (in ActivityLog.gs)
   dal menu a tendina in alto ed eseguirla — forza da sola lo spreadsheet
   di TEST, non serve passare parametri. In alternativa, dalla Web App in
   ambiente TEST si puo' chiamare l'azione migrateToActivityLog via
   api() (rifiuta automaticamente se l'ambiente non e' TEST).
3. Guardare il riepilogo restituito (cards_processed, corrections_migrated,
   checklist_items_migrated, cards_skipped, errors) — anche loggato con
   console.log/Logger, visibile nei log di esecuzione.
4. Aprire 2-3 card campione nel foglio jobs di TEST che avessero dati in
   correction_log_json e/o checklist_json, e verificare a occhio:
   - activity_log_json ha eventi 'correction' coerenti coi dati originali
   - description ha il testo originale intatto in testa, con il blocco
     "--- Checklist migrata ---" appeso in fondo
   - checklist_json e correction_log_json sono rimasti identici a prima
5. Se tutto e' in ordine, scrivere "procedi con fase G" per sbloccare la
   sessione. Se qualcosa non torna, descrivere cosa non va: mi fermo e
   correggo prima di richiedere una nuova esecuzione.

Note operative permanenti (invariate):
- Gate umani reali del programma: SOLO Fase F (questo) e Fase J.
- Nessuna richiesta di conferma per altri motivi fino alla risposta di
  Marco su questo gate.
- clasp run resta bloccato — verifica di LOGICA (non di dati reali) fatta
  con l'harness Node in ...\scratchpad\gas-harness.js, ora comprensivo
  anche di Tests.gs e Logger tra i file mockati (serviva per
  withTestSpreadsheet_, usata da migrateActivityLogOnTest).

Note specifiche Fase F:
Bug reale trovato e corretto con l'harness: la migrazione della checklist
non era idempotente — un secondo lancio avrebbe riappeso il blocco
"Checklist migrata" duplicandolo in description. Aggiunta una guardia sul
marcatore gia' presente nel testo (la spec richiedeva esplicitamente la
deduplicazione solo per le correzioni, non per la checklist, ma la
stessa cautela e' sembrata necessaria e coerente con lo spirito "mai
sovrascrivere/duplicare" della fase).

migrateActivityLogOnTest() forza lo spreadsheet TEST con
withTestSpreadsheet_ invece di fidarsi della Script Property corrente —
scelta deliberata dopo l'incidente di questa notte in cui la property
condivisa risultava puntata al posto sbagliato: qui l'errore e'
strutturalmente impossibile, non solo evitato per disciplina.

Push su Web App fatto (versione HEAD/dev). Commit e push del branch
codex/activity-log-backend fatti. NESSUNA esecuzione reale su TEST fatta
da questa sessione: e' compito di Marco, come da gate.
