# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 19:50

Fase corrente: K
Titolo: Ruolo `prep` per TO DO — gate incarico/prep/lavorazione

Stato: SBLOCCATA, in avvio. Entrambe le condizioni bloccanti risolte da
Marco:

1. Fase J considerata COMPLETATA ai fini del gate dell'addendum, dopo
   verifica di rischio richiesta esplicitamente da Marco. Scoperta
   rilevante emersa dalla verifica: la Web App PROD reale usata dal team
   (`docs/google-workspace-setup.md`, deployment pinnato
   `AKfycbxKZMfSDbFMI7.../exec?env=prod`) e' ferma alla versione
   "timestamps-fix", precedente a tutto il lavoro sull'Activity Log —
   diversa dalla URL `/dev` usata per l'intero smoke test, che segue
   sempre l'ultimo codice pushato. Quindi il merge di oggi NON e' mai
   arrivato agli utenti reali di PROD: nessun rischio di disallineamento
   tra codice nuovo e dati non migrati, perche' il codice nuovo su PROD
   semplicemente non gira ancora. Il "deploy vero" (pubblicare una nuova
   versione sul deployment pinnato PROD + migrazione dati) resta un passo
   a se', non ancora programmato, da trattare come cutover reale quando
   Marco decide — non una formalita' della Fase J.
2. CLAUDE.md recuperato da `codex/activity-log-recon`, stesso
   procedimento usato per `PROGRAMMA_ACTIVITY_LOG.md`.

## Fase J (storico, chiuso)
Nota storica: CLAUDE.md, richiesto in lettura dall'istruzione di avvio,
non esisteva nel branch corrente (codex/activity-log-frontend) ne' in
main prima del recupero sopra — esisteva solo su
codex/activity-log-recon, come accadeva per PROGRAMMA_ACTIVITY_LOG.md
prima del recupero manuale del 2026-08-12.

Verifica di chiusura Fase J:
- Codice live su TEST confrontato file per file con i sorgenti locali
  (clasp pull in cartella isolata + diff) — tutti i file coincidono,
  incluse le due correzioni frontend rimaste non committate da Fase I
  (form annidato non valido in board.html, refresh campi "Correggi
  timestamp" in client.html): ora committate (7e0e2f9).
- Smoke test 12 punti della specifica frontend: 12/12 confermati, l'ultimo
  (punto 12, drag-and-drop) verificato a mano da Marco direttamente.
- Merge eseguito 2026-08-12: `codex/activity-log-frontend` -> `main`
  (commit 8cb5c3d, merge --no-ff), dopo conferma esplicita di Marco che
  ha scavalcato consapevolmente la regola "mai in autonomia" del
  programma per questo solo passaggio. Contiene gia' tutto il lavoro di
  `codex/activity-log-backend` (ne era discendente) e i contenuti di
  `codex/activity-log-recon` (gia' copiati). Non sono stati fusi
  separatamente backend/recon (ridondante) ne' timestamps-fix (gia' in
  main). Suite test harness rilanciata sul codice unito: 35/35 passati
  prima del push.
- Migrazione PROD: NON eseguita e NON eseguibile con il codice attuale.
  `migrateToActivityLog()` (ActivityLog.gs:166) rifiuta esplicitamente
  qualunque ambiente diverso da TEST; non esiste una variante PROD (solo
  `migrateActivityLogOnTest()`, che forza sempre TEST). Il blocco e'
  intenzionale, non un dimenticanza. Per procedere serve prima scrivere
  una funzione dedicata tipo `migrateActivityLogOnProd()` sul modello di
  quella per TEST — decisione rimandata a quando Marco vorra' riprendere
  il tema, non presa di riflesso in questa sessione.

## Fase I (storico)
Stato: SMOKE TEST ESEGUITO IN AUTONOMIA (via Claude in Chrome, autorizzato da Marco) — 11/12 punti confermati su TEST, poi punto 12 confermato a mano da Marco

Criteri di accettazione:
[x] Inserimento evento move valido -> appare nel log con badge MANUALE — verificato live su TEST
[x] Data futura -> blocco inline immediato — implementato (verifica statica, non ripetuta live)
[x] Warning sequenza -> dialog HTML custom con descrizione chiara -> conferma -> evento salvato — verificato live su TEST (Fase H/I precedente)
[x] Warning allineamento -> dialog con valori corretti -> scelta utente rispettata — verificato live su TEST (dialog "Allinea i campi strutturati", start_ts aggiornato)
[x] Modifica evento manuale -> valori precompilati correttamente — verificato live su TEST (Fase I precedente)
[x] Eliminazione evento manuale -> scompare dal log — verificato live su TEST: creato evento di test, cancellato con dialog di conferma, verificato "Nessun evento registrato" anche dopo reload completo della pagina (persistenza server confermata)
[x] Evento auto -> nessuna icona modifica/cancellazione — verificato via revisione codice: client.html righe 940-963, guardia `if (!isAuto)` attorno alla creazione di editButton/deleteButton; bloccato anche lato server (deleteActivityEvent lancia EVENTO_AUTO_NON_ELIMINABILE per source==='auto')
[~] Trascinare una card (moveJob) -> evento AUTO compare in Cronologia — NON verificabile live: il drag-and-drop nativo HTML5 della board non si simula in modo affidabile con lo strumento di automazione browser disponibile (limite gia' noto, analogo al problema con i <select> nativi). Copertura alternativa: il test harness Node (35/35 test, incluso test dedicato su moveJob che verifica creazione evento auto con timestamp corretto) verifica la logica server; il rendering del badge AUTO e l'assenza di icone sono verificati via codice.

Nota su un falso allarme: durante il primo giro di test la cancellazione
sembrava non avere effetto (evento ancora visibile in lista subito dopo
la conferma). Ripetendo il test da zero (nuovo evento creato ad hoc,
cancellato, verificato con screenshot immediati e poi con reload
completo) la cancellazione ha funzionato correttamente end-to-end. Non e'
stata trovata alcuna causa applicativa: sospetto una lettura prematura
dello screenshot rispetto al refresh asincrono della lista nel primo
tentativo, non un bug di codice. Nessuna modifica al codice è stata
necessaria.

Prossima fase: J (deploy e chiusura — gate umano)

Per sbloccare la Fase J serve la conferma esplicita di Marco, in
particolare sul punto 12 (drag reale mai osservato da un umano in questa
sessione) e in generale sull'intero smoke test qui riassunto. Se Marco
conferma (anche solo verificando il punto 12 a mano, che richiede 10
secondi), scrivere "procedi con fase J" per sbloccare il gate finale.

Note operative permanenti (invariate):
- Gate umani reali del programma: Fase F (gia' superata) e Fase J (prossima).
- Routine cloud attiva su codex/activity-log-backend (trig_01WrQXQAv2a2Rw8DfhmwGRNG)
  — NON vede questo aggiornamento (vive su codex/activity-log-frontend).
  Da riconfigurare se si vuole che la routine prosegua in autonomia oltre
  questo punto; al momento il lavoro procede su richiesta diretta di Marco.
- Push sempre verificato con clasp pull + diff.

Note specifiche Fase I:
- Deviazione da specifica: layout desktop a tab invece di colonne
  affiancate — decisione presa in Fase H, confermata funzionante da
  Marco dopo il fix del bug di navigazione, non toccata qui.
- "old" per le correzioni via form e' sempre letto da state.activeJob[field]
  al momento dell'invio (sia in creazione sia in modifica) — la spec non
  specifica esplicitamente il comportamento in modifica; interpretazione
  scelta per semplicita' e coerenza.
- Dopo un salvataggio con align_fields, i campi aggiornati vengono
  applicati anche otticamente a state.activeJob lato client (la risposta
  di addActivityEvent/updateActivityEvent non include l'intero job
  aggiornato, solo l'evento) — cosi' riaprendo il form o il tab
  Informazioni i valori restano coerenti senza un reload completo.

## TEMA APERTO — revisione del modello dati (non ancora avviata)

Durante lo smoke test e' emersa una discussione approfondita con Marco,
non ancora chiusa in una decisione operativa. Riassunto per non perderla
in una sessione futura:

1. Bug di sostanza confermato: il pannello "Correggi timestamp" (tab
   Informazioni) chiama ancora `correctJobTimestamps` (Kanban.gs:550),
   che scrive SOLO su `correction_log_json` — un log separato, invisibile
   in Cronologia. Le correzioni fatte da li' non appaiono mai
   nell'Activity Log. Va deprecato in favore dell'evento "Correzione"
   gia' implementato in Fase I.
2. Scoperta sulla configurazione reale delle colonne: TO DO ha oggi ruolo
   `wip`, identico a WIP (Constants.gs:24) — quindi `start_ts` scatta gia'
   al primo ingresso in TO DO, non quando il lavoro arriva davvero in WIP.
3. Direzione concordata con Marco: l'Activity Log (il "diario") deve
   diventare l'UNICA fonte di verita'. I campi strutturati
   (arrival_ts/start_ts/done_ts e i nuovi gate) diventano una cache
   calcolata automaticamente da una funzione unica che rilegge il log
   dopo ogni sua modifica — non piu' scritti/allineati manualmente,
   elimina la scelta opzionale "Aggiorna/Mantieni" del dialog di
   allineamento.
4. Gate da coprire (cap. 11.4.1 della dispensa fsc.pdf): richiesta
   (creazione), pronto a partire (primo ingresso ruolo backlog —
   corrisponde a "Incarichi/Lavoro pronto" in produzione), inizio
   lavorazione (primo ingresso ruolo wip), consegna (ultimo ingresso
   ruolo done), riapertura, attese. Proposta: oltre ai gate "di
   business", calcolare anche una mappa granulare per-colonna (tempo
   cumulato per ogni colonna attraversata, es. TO DO separato da WIP,
   ogni tipo di attesa — cliente/enti/interna — separato) derivata dal
   log, senza dover moltiplicare i ruoli colonna.
5. Domanda ancora aperta per Marco: TO DO e WIP restano fusi sotto lo
   stesso gate "inizio lavorazione" (comportamento attuale) o si vuole un
   gate ufficiale separato per l'ingresso in WIP vero? (La granularita'
   per-colonna del punto 4 risponde comunque a livello di dettaglio,
   indipendentemente da questa scelta.)
6. Obbligo esplicito di Marco, prioritario su tutto: MAI perdere dati.
   Piano di sicurezza concordato: nessuna colonna schema eliminata;
   `correction_log_json` esistente va migrato come eventi `correction`
   dentro `activity_log_json` (non scartato); per job con storia
   incompleta i gate nuovi possono restare mancanti/imprecisi ma nessun
   dato grezzo va sovrascritto per "inventarli"; qualunque ricalcolo va
   verificato su TEST con backup prima di essere anche solo proposto per
   PROD, che resta comunque sempre una decisione/azione di Marco.

Prossimo passo, quando Marco decide di riprendere il tema: rispondere al
punto 5, poi Claude Code scrive un design tecnico dettagliato (nuove
colonne di schema, elenco funzioni da riscrivere, piano di migrazione)
come revisione formale del programma — da trattare come nuova fase
dedicata, non come modifica libera dentro fasi gia' chiuse.
