# SigmaFlow — Derivazione unificata di `visite` dal log (Fase Q)

> Nome riservato dentro `DESIGN_lock_ambiente.md` (§2.5/§5) il
> 2026-08-26, per la scelta di *quale* visita aggiornare quando si
> corregge un evento storico della Cronologia —
> `applyManualMoveEffects_`/`ensureOpenVisit_`/`alignOpenVisitFields_`
> scrivono sempre sulla visita **attualmente aperta**, mai su quella
> storicamente pertinente all'evento corretto. Marco l'aveva rimessa sul
> tavolo con forza dopo uno screenshot di una card duplicata in due
> colonne, chiedendo se fosse "una logica di gate/scrittura/timestamp
> sbagliata" da affrontare "a livello di logica alta invece che con
> patch scomposte". La risposta, verificata leggendo il codice, è sì —
> ed è lo stesso giorno in cui, con un secondo caso concreto
> (`status_since_ts` fermo a 103 giorni fa su una card toccata 14 giorni
> fa, verificato sui dati reali del foglio "SigmaFlow Database"), Marco
> ha chiesto esplicitamente di non rimandare più: **"basta con le patch
> puntuali, voglio una soluzione definitiva"** — tutto ciò che riguarda
> tempi, timestamp, colonne, spostamenti, stati, posizione deve essere
> sempre coerente con la Cronologia, senza eccezioni, e se una card
> viene toccata deve essere aggiornata. Questo documento smette quindi
> di essere "solo il nome riservato" e diventa il design vero e proprio,
> scritto e eseguito oggi.

---

## 1. Il problema, in una frase

`visite` (apertura/chiusura di ogni ciclo di lavorazione, tempi di
attesa cliente/ente/interno, campi gate incarico/prep/start/consegna)
è oggi mantenuta con **patch incrementali** sparse in più punti
(`updateVisiteForMove_` per lo spostamento live, `applyManualMoveEffects_`
per le correzioni manuali in Cronologia, `alignOpenVisitFields_` per i
campi gate) — ognuna delle quali, per decidere *quale riga di visita*
toccare, usa `ensureOpenVisit_`/`findOpenVisitRow_`: **qualunque riga
abbia oggi `rientro_ts` vuoto**, indipendentemente da quando l'evento
che si sta applicando è realmente accaduto. Per uno spostamento live
questo è sempre corretto (un evento che accade ora è per definizione il
più recente). Per una correzione di un evento **storico** (una data
vecchia dimenticata, un rientro corretto mesi dopo) è sbagliato per
costruzione: scrive l'effetto sulla visita sbagliata, quella aperta
oggi, non quella che era aperta quando l'evento è realmente accaduto.

Il codice lo sa già e lo dice nei propri commenti (`applyManualMoveEffects_`,
`alignOpenVisitFields_`): "identificarla con precisione... è compito
della migrazione storica autorevole di L5, non di questo allineamento
live". La migrazione storica (L5) esiste già — `migrateVisiteFromHistory_`
(ActivityLog.gs) — e fa esattamente questo, correttamente: ricostruisce
**l'intera sequenza di visite di un job dal suo log intero**, usando
solo il campo `to` di ogni evento (mai `from`, mai lo stato "attualmente
aperto"), in ordine cronologico. È già la soluzione — è stata scritta
per la migrazione una tantum, non è mai stata usata per gli
aggiornamenti quotidiani.

## 2. La soluzione — un solo meccanismo, sempre

**Non esistono più due modi di aggiornare `visite`** (uno "live" per lo
spostamento reale, uno "a patch" per le correzioni storiche). Ne esiste
uno solo, usato in ogni caso in cui il log di un job cambia:

1. Il log del job (con l'evento nuovo/modificato/cancellato già
   applicato) è già disponibile in memoria — nessuna lettura in più.
2. `computeVisiteFromLog_(jobId, moveLog)` (ActivityLog.gs, già scritta
   e già collaudata per la migrazione — vedi §3 per il piccolo
   adattamento di firma) ricostruisce **da zero** l'intera sequenza di
   visite del job, sempre dagli stessi eventi `to`, mai da "quale riga è
   aperta adesso".
3. Le righe esistenti di quel job in `visite` vengono sostituite per
   intero con quelle appena calcolate — non patchate, **sostituite**
   (`deleteVisiteRowsForJob_`, già scritta e già usata da
   archiviazione/cestino/ripristino, + `appendVisitRow_`).

Questo elimina per costruzione la classe intera di bug: non c'è più
nessuna decisione di "quale visita toccare" da sbagliare, perché non si
tocca mai una visita — si ricalcola sempre l'intero elenco dal log, che
è l'unica fonte di verità. Vale per uno spostamento live, per una
correzione di un evento di ieri, per una correzione di un evento di sei
mesi fa: stesso codice, stesso risultato garantito coerente con la
Cronologia.

## 3. Cosa cambia nel codice

- **`computeVisiteFromLog_`** (ActivityLog.gs): cambia firma da
  `(job)` a `(jobId, moveLog)` — riceve il log già filtrato sui soli
  eventi `move` invece di ri-leggerlo da `job.activity_log_json` (che al
  momento della chiamata, in `addActivityEvent`/`updateActivityEvent`,
  non è ancora stato riscritto con la versione aggiornata). Nessun
  cambiamento alla logica interna, solo alla sorgente del log.
- **Nuova funzione, `syncVisiteFromLog_(job, moveLog)`** (Kanban.gs):
  incapsula i tre passi di §2 (calcola, cancella le righe esistenti del
  job, riscrive quelle nuove). Ritorna l'ultima visita (quella attiva)
  con lo stesso contratto già usato da `applyVisitSummaryFields_` per
  la risposta al client (`visit_number`/`is_rework`/`rework_cause`/
  `start_ts`/`done_ts`) — nessun cambiamento lato client necessario.
- **`moveJob`**: `updateVisiteForMove_` (il percorso "live", patch
  incrementale) viene sostituita dalla chiamata a `syncVisiteFromLog_`
  con il log già aggiornato (evento appena aggiunto, ordinato). Stesso
  risultato per uno spostamento live per costruzione (l'evento nuovo è
  sempre il più recente) — questo non è un fix di un bug nel percorso
  live (nessuno trovato lì), è l'unificazione dei due meccanismi in
  uno solo, per non avere più due implementazioni indipendenti dello
  stesso concetto che nel tempo possono divergere (è già successo, vedi
  `DESIGN_lock_ambiente.md` §2.5 e §2.7).
- **`addActivityEvent`/`updateActivityEvent`**: `applyManualMoveEffects_`
  (tutta la parte relativa a `visite`) viene sostituita dalla stessa
  chiamata a `syncVisiteFromLog_`, con il log completo (`remaining`,
  già ordinato) — non più solo gli effetti del candidato appena
  toccato. `job.status`/`status_since_ts`/`incarico_chiuso_ts`
  continuano a essere ricalcolati come oggi (`recomputeCurrentStatus_`/
  `recomputeIncaricoChiusoTs_`, P5 — invariate).
- **`deleteActivityEvent`**: oggi non chiama mai
  `applyManualMoveEffects_` (commento esplicito nel codice: rischio di
  duplicare visite su cancellazioni non correlate, vedi Bug 2 storico).
  Con la ricostruzione completa questo rischio non esiste più — la
  sostituzione totale delle righe del job è per natura idempotente
  (non "aggiunge un effetto", ricalcola tutto da capo) — quindi anche
  `deleteActivityEvent` chiama `syncVisiteFromLog_` con il log rimasto
  dopo la cancellazione. Coerenza completa: cancellare un evento
  aggiorna `visite` esattamente come aggiungerlo o correggerlo,
  nessuna eccezione residua.
- **Ritirate (rimosse, non lasciate come codice morto)**:
  `alignOpenVisitFields_` (i campi gate sono già corretti, per-visita,
  dentro `computeVisiteFromLog_`), `ensureOpenVisit_`
  (nessun chiamante rimasto), `reentryAlreadyApplied_` (l'idempotenza
  serviva a `applyManualMoveEffects_` per non duplicare una visita già
  applicata — con la ricostruzione completa non serve più: ricalcolare
  due volte lo stesso log dà sempre lo stesso risultato), tutta la
  vecchia `applyManualMoveEffects_` e `updateVisiteForMove_`.
  `findOpenVisitRow_` **resta** — usata in lettura da
  `attachOpenVisitSummary_` per sapere qual è la visita attiva da
  restituire al client, un uso corretto (leggere qual è la visita
  aperta oggi è sempre una domanda ben posta; il bug era scriverci
  sopra per un evento che non le apparteneva storicamente).

## 4. La migrazione dei dati esistenti

Non serve scrivere una nuova migrazione: **`migrateVisiteFromHistorySuProd()`
esiste già** (ActivityLog.gs), fa esattamente questo — ricostruisce
`visite` da zero per ogni job dal proprio log, con lo stesso principio
di questo documento (già ci si basa: `computeVisiteFromLog_` è la
funzione che entrambe usano). Verosimilmente eseguita una volta durante
la migrazione storica originale (L5) e mai più da allora — qualunque
deriva accumulata dalle patch incrementali da quel momento in poi non è
mai stata corretta. Ha già un controllo di sicurezza incorporato
(verifica il nome del foglio prima di scrivere).

Rieseguirla ora, dopo il fix di §3, corregge tutte le righe di `visite`
esistenti in un colpo solo — nessuna nuova funzione di migrazione da
scrivere, nessun'attesa aggiuntiva: è sicura per costruzione (stessa
funzione della migrazione originale, già collaudata) e va eseguita
prima su TEST per un controllo dell'esito, poi su PROD nella stessa
sessione di lavoro.

## 5. Cosa NON cambia

- Lo schema dati di `visite` — stesse colonne, nessuna colonna nuova.
- `jobs.status`/`status_since_ts`/`incarico_chiuso_ts` — restano gestiti
  come da P5 (`DESIGN_lock_ambiente.md` §2.5), invariati qui. La
  migrazione dei job esistenti su questi campi resta quella descritta
  in P7 (`DESIGN_lock_ambiente.md` §2.7) — campi diversi, foglio
  diverso (`jobs`, non `visite`), stessa giornata di lavoro ma
  interventi distinti nel codice.
- `getBoard()`/`getMetrics()`/`loadJobsWithVisitSummaryFrom_` — leggono
  `visite` come oggi (la visita più recente per numero), nessun
  cambiamento: il fix è in *come* le righe di `visite` vengono scritte,
  non in come vengono lette.
- Nessun cambiamento a `client.html` — stesso contratto di risposta
  (`visit_number`/`is_rework`/`rework_cause`/`start_ts`/`done_ts`),
  garantito da `syncVisiteFromLog_` che riusa `applyVisitSummaryFields_`.

## 6. Criteri di accettazione

Tutti verificati TRUE (2026-08-26, sessione 7) — dettaglio completo in
`PROGRAMMA_STATO.md`.

- [x] `computeVisiteFromLog_(jobId, moveLog)`: firma aggiornata, stesso
      comportamento (verificato dai test esistenti della migrazione)
- [x] `syncVisiteFromLog_(job, moveLog)`: nuova funzione, sostituisce
      sempre le righe del job invece di patcharle
- [x] `moveJob`, `addActivityEvent`, `updateActivityEvent`,
      `deleteActivityEvent`: tutte e quattro chiamano
      `syncVisiteFromLog_` con il log completo aggiornato — nessuna
      eccezione residua (`deleteActivityEvent`, che prima non toccava
      `visite` per niente, ora la ricalcola come le altre tre)
- [x] `alignOpenVisitFields_`, `ensureOpenVisit_`,
      `reentryAlreadyApplied_`, `updateVisiteForMove_`, la vecchia
      `applyManualMoveEffects_`: rimosse dal codice (commit `225bd03`),
      nessun riferimento residuo verificato con una ricerca nel codice
- [x] Test dedicato: un job con un rientro storico *corretto/aggiunto
      dopo* eventi più recenti (lo scenario che applicava l'effetto
      alla visita sbagliata) — `testAddActivityEventHistoricalReentryUpdatesHistoricallyCorrectVisit`,
      `visite` riflette la sequenza storicamente corretta, non quella
      "attualmente aperta"
- [x] Test dedicato: stesso scenario ma con una cancellazione —
      `testDeleteActivityEventHistoricalReentryRecalculatesVisite`,
      `visite` si ricalcola comunque (prima non succedeva affatto)
- [x] Nessuna regressione sui test esistenti dell'harness Node —
      177/177 (175 preesistenti + 2 nuovi)
- [x] `migrateVisiteFromHistoryOnTest()` eseguita su TEST da Marco
      (19:13, 2026-08-26): 52 job, 0 malformati, 57 visite scritte, 0
      warning di coerenza. Output confrontato a mano da Marco su un
      campione di job con più rientri (`JOB-DEMO-19` e altri due) contro
      la loro Cronologia reale — tutto coerente
- [x] `migrateVisiteFromHistorySuProd()` eseguita su PROD da Marco
      (19:20, 2026-08-26), nella stessa sessione di lavoro: 54 job, 0
      malformati, 76 visite scritte, 0 warning di coerenza
- [x] Collaudo finale: il confronto a campione su TEST (punto sopra) ha
      verificato direttamente apertura/rientro/rework_cause contro la
      Cronologia reale per più job — copre nella sostanza il pannello
      "Percorso della card"/i tempi di attesa dashboard, che leggono
      esattamente lo stesso dato. Verifica visiva del pannello stesso
      lasciata facoltativa a Marco, non bloccante per la chiusura.
