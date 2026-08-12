# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 09:58

INCIDENTE 1 RISOLTO (2026-08-12 ~08:50): clasp push ha riportato successo
per tutta la notte senza che il codice delle Fasi B-F arrivasse davvero
sul server (causa probabile: token OAuth scaduto a meta' sessione,
"invalid_rapt", che si e' ripresentato anche dopo — vedi incidente 2).
Risolto verificando con clasp pull + diff completo file per file: ora
tutto corrisponde. Da qui in poi ogni push viene sempre seguito da una
verifica con pull, mai fidandosi del solo messaggio di successo.

INCIDENTE 2 RISOLTO (2026-08-12 ~09:40): Marco ha notato che la colonna
activity_log_json (AF) sul foglio TEST non aveva l'intestazione in AF1,
e nemmeno correction_log_json (AE1) ce l'aveva. Causa: SIGMAFLOW.SCHEMA_VERSION
non era mai stato incrementato quando questi campi sono stati aggiunti a
JOB_HEADERS (ne' stanotte per correction_log_json, ne' in Fase B per
activity_log_json), quindi ensureCurrentSchema_() non ha mai fatto
scattare il riallineamento automatico delle intestazioni sul foglio reale
(il meccanismo scatta solo su mismatch di versione). I dati erano comunque
scritti nella colonna fisica corretta (le scritture vanno per posizione,
non per nome intestazione) — solo le letture per nome intestazione
(getHeaderMap_) li avrebbero visti come vuoti. Nessun dato perso.

Fix: Marco ha scritto a mano le intestazioni mancanti su TEST (AE1, AF1)
E su PROD (AE1 — AF1 non necessaria, colonna ancora vuota li'). SOLO DOPO
aver confermato questo, ho incrementato SCHEMA_VERSION a '3' in
Constants.gs e pushato — a quel punto il riallineamento automatico (che
sarebbe scattato al primo caricamento della board su qualunque ambiente)
trova gia' tutto allineato e non tocca nulla (percorso sicuro, non
distruttivo). Fatto DELIBERATAMENTE in questo ordine (fix manuale prima,
bump versione dopo) perche' l'ordine inverso avrebbe fatto scattare
alignSheetHeaders_ con intestazioni ancora mancanti, che avrebbe
azzerato il contenuto delle colonne non riconosciute — rischio reale
segnalato e confermato su PROD prima di procedere.

Verificato via clasp pull che SCHEMA_VERSION: '3' e' realmente sul server.

Fase corrente: F
Titolo: migrateToActivityLog
Stato: IN_ATTESA_GATE_UMANO

Criteri di accettazione:
[x] clasp push riuscito
[x] Funzione eseguita su TEST: errors: [] — confermato da Marco (60 cards_processed, 2 corrections_migrated, 6 checklist_items_migrated, 0 skipped, errors: [])
[x] Su 2 card campione in TEST: correction_log_json migrato senza duplicati — confermato da Marco con esempio reale (due record, mapping 1:1 corretto, id nuovi, nessuna duplicazione)
[x] Su 2 card campione in TEST: description ha checklist appesa, testo originale intatto — confermato da Marco ("nel merito e' tutto corretto")
[x] checklist_json e correction_log_json invariati nel foglio — confermato da Marco

Prossima fase: G (solo dopo "procedi con fase G" esplicito di Marco)

Tutti i criteri della Fase F sono confermati TRUE da verifica umana reale
su TEST. Manca solo la parola esplicita di Marco per sbloccare il gate
e passare alla Fase G — resto fermo qui fino a quel momento.

Note operative permanenti (invariate):
- Gate umani reali del programma: SOLO Fase F (questo) e Fase J.
- Nessuna richiesta di conferma per altri motivi fino alla risposta di
  Marco su questo gate.
- clasp run resta bloccato — verifica di LOGICA (non di dati reali) fatta
  con l'harness Node, ora anche in apps-script/test-harness/gas-harness.js
  dentro il repo (serve alla routine cloud trig_01WrQXQAv2a2Rw8DfhmwGRNG,
  ogni 2 ore sul branch codex/activity-log-backend, senza credenziali
  clasp — marca le fasi come CODICE_PRONTO_CLOUD finche' una sessione
  locale non fa il vero clasp push + verifica + promozione a COMPLETATA).

Note specifiche Fase F (bug applicativo, non di sincronizzazione):
Bug reale trovato e corretto con l'harness: la migrazione della checklist
non era idempotente — un secondo lancio avrebbe riappeso il blocco
"Checklist migrata" duplicandolo in description. Aggiunta una guardia sul
marcatore gia' presente nel testo.

migrateActivityLogOnTest() forza lo spreadsheet TEST con
withTestSpreadsheet_ invece di fidarsi della Script Property corrente.

Push su Web App fatto e verificato con pull. Commit e push del branch
codex/activity-log-backend fatti. Esecuzione reale su TEST fatta da
Marco (non da questa sessione), come da gate.
