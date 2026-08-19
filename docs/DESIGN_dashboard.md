# SigmaFlow — Dashboard (design)

> Prosegue la numerazione a lettere già in uso nel progetto (Fasi A-K
> "Activity Log", Fasi L1-L5 "modello caso/visita", entrambe chiuse) —
> **M** è la fase successiva, come già previsto nel piano originale di
> Marco: "Fase M — Dashboard: inventario di quanto esiste + eventuali
> nuove viste. Resta per ultima, dopo l'archiviazione". I programmi
> N1-N6 (archiviazione) e N-B1-N-B3 (backup PROD) — nati da esigenze
> diverse, non dalla stessa sequenza — sono nel frattempo stati chiusi
> e uniti a `main` (PR #8, 19/08).
>
> Nel frattempo sono emersi due difetti che toccano proprio le funzioni
> che questa fase estenderà (`readTable_`/`readArchivedList_` in
> Kanban.gs/Utils.gs, `ActivityLog.gs`). Non hanno senso come fasi a
> sé — sono **prerequisiti di M**, non lavoro parallelo: costruire nuove
> viste/metriche sopra dati o funzioni ancora difettose vorrebbe dire
> ereditare lo stesso difetto nella dashboard nuova. Numerati quindi
> **M1**/**M2**, prima della ricognizione vera e propria (**M3**).

---

## 1. Cosa include questa fase, in ordine

| Sotto-fase | Contenuto | Perché in questa posizione |
|---|---|---|
| **M1** | Fix bug: Dashboard/Archivio/Cestino falliscono su PROD reale (`readTable_` non gestisce `sheet === null`) | Prerequisito — stesse funzioni che M3+ toccherà di nuovo; perimetro piccolo, nessuna decisione di design |
| **M2** | Cronologia: chiudere il buco "correzione manuale non aggiorna lo stato derivato" | Prerequisito — integrità dei dati che le nuove viste/metriche di M4+ leggerebbero altrimenti in modo silenziosamente sbagliato |
| **M3** | Ricognizione: inventario di quanto esiste in dashboard oggi, confronto con la dispensa FSC, decisione sullo scope delle ottimizzazioni frontend residue → produce le sotto-fasi M4..Mn | Non specificabile prima di sapere cosa c'è davvero |
| **M4..Mn** | Da definire in base a M3 | — |

Punti esplicitamente **fuori** da questa fase, parcheggiati (§5).

---

## 2. M1 — Fix bug null su PROD (Archivio/Cestino/Dashboard)

Riferimento: nota già scritta sul branch `docs/nota-bug-archivio-prod-null`
(non ancora unito a `main`).

### Causa (già confermata nel codice, non solo ipotizzata)
`readTable_` (Utils.gs) chiama `sheet.getDataRange()` senza controllare
se `sheet` è `null`. `readArchivedList_` (Kanban.gs, dietro
`getArchivio`/`getCestino`) e `loadJobsWithVisitSummaryFrom_` (dietro
`loadArchivedJobsWithVisitSummary_`, l'estensione N6 di `getMetrics`)
passano `ss.getSheetByName(...)` direttamente a `readTable_` senza
verificarlo prima. Su PROD questi fogli non esistono ancora (nessuna
sessione ha mai eseguito l'allineamento schema lì — azione riservata a
Marco, mai eseguita). Mai emerso nell'harness Node né su TEST perché lì
`setupSigmaFlow()` è sempre già stato eseguito prima.

### Contenuto
- `readTable_` ricade su `[]` quando `sheet` è `null` (un solo punto,
  beneficia ogni chiamante presente e futuro). Verificare se basta da
  solo o se serve anche un controllo esplicito nei due chiamanti
  (`readArchivedList_`, `loadJobsWithVisitSummaryFrom_`) per un
  messaggio più chiaro lato utente invece di una lista vuota silenziosa.
- Test dedicato: `getArchivio`/`getCestino`/`getMetrics` su uno
  spreadsheet **senza** i fogli archivio/cestino non devono lanciare,
  devono comportarsi come "archivio vuoto".
- Merge del branch `docs/nota-bug-archivio-prod-null` insieme al fix
  (o branch nuovo dedicato), push su TEST verificato.

**Nota separata, non necessaria per chiudere M1**: se/quando eseguire
l'allineamento schema su PROD (`allineaSchemaSuProd()` o equivalente)
per creare davvero i quattro fogli lì e rendere l'archiviazione
utilizzabile su dati reali — decisione di Marco, quando vorrà, gate
umano a parte perché tocca PROD. M1 rende PROD **stabile** anche senza
questo passo (niente più errore, solo viste vuote); questo passo è ciò
che le rende **utili**.

### Criteri di accettazione
- [x] `getArchivio()`/`getCestino()`/`getMetrics()` non lanciano mai se
      i fogli archivio/cestino non esistono sullo spreadsheet aperto —
      restituiscono liste/metriche vuote, non un errore
- [x] Test dedicato aggiunto e verde nell'harness Node, nessuna
      regressione sulla suite esistente (131 test)
- [x] Push su TEST verificato (`clasp pull` isolato + diff, 0 differenze)

Nessun gate umano su M1 stessa (nessuna scrittura su PROD, nessuna
decisione di design aperta).

---

## 3. M2 — Cronologia: chiudere il buco "correzione manuale non aggiorna lo stato derivato"

Riferimento: `PROGRAMMA_STATO.md`, sezione "Buco trovato da Marco il
2026-08-19, non affrontato".

### Il problema, riletto
`checkStructuralAlignment_`/`applyStructuralAlignment_`/`alignOpenVisitFields_`
(ActivityLog.gs) allineano solo i campi di data sulla visita già
aperta — mai `job.status` (la card non cambia colonna) e mai la
creazione di una nuova riga `visite` per un vero rientro (che vive solo
in `moveJob()`/`updateVisiteForMove_`, il percorso reale del
drag-and-drop). Un rientro registrato a mano in Cronologia resta quindi
visibile solo in `activity_log_json` — sparisce da tutte le metriche
che leggono `visite` (rientri, tempi, capacità).

### Decisione da prendere prima di scrivere codice
Due opzioni, non è ovvio quale sia quella giusta — **da confermare con
Marco come primo passo di M2**, non da assumere:

1. **Cronologia resta "solo racconto della storia"**: nessuna modifica
   di stato, si documenta chiaramente in UI che una correzione manuale
   in Cronologia non sposta la card né genera una visita — e si valuta
   se serve un avviso esplicito nel form quando l'evento inserito
   somiglierebbe a un rientro reale.
2. **Un evento 'move' inserito a mano che rappresenta un rientro reale
   deve ricalcolare `status` e creare la visita mancante** — non
   banale: bisogna rispettare le stesse regole di validazione già
   esistenti per il drag-and-drop reale (divieto di rientro diretto in
   `wip`), quindi non ogni `move` manuale qualifica.

**Decisione presa da Marco (2026-08-19): opzione 2.**

### Contenuto
- Presentare a Marco le due opzioni con le implicazioni pratiche di
  ciascuna, raccogliere la decisione.
- Implementazione della decisione presa (documentazione UI se opzione
  1; guardia di validazione + creazione visita se opzione 2), con test
  dedicati che riproducono lo scenario reale trovato il 19/08.
- Verifica end-to-end (stessa tecnica server locale + `routeAction_`
  già usata in N4/N5/N6), push su TEST verificato.

### Criteri di accettazione
- [x] Decisione tra le due opzioni presa esplicitamente da Marco,
      registrata in `PROGRAMMA_STATO.md`
- [x] Comportamento scelto verificato con un test che riproduce lo
      scenario esatto trovato il 19/08 (correzione manuale di un
      evento 'move' che rappresenta un rientro)
- [x] Nessuna regressione sulla suite esistente
- [x] Push su TEST verificato

**Gate 🔴 Umano**: dopo la presentazione delle due opzioni, prima di
scrivere codice — è una decisione di design, non un dettaglio
implementativo. **Confermato** (opzione 2), vedi sopra.

---

## 4. M3 — Ricognizione (unica sotto-fase specificabile ora oltre a M1/M2)

Contenuto:
- Inventario di ogni vista/indicatore oggi in `dashboard.html`/
  `Model.gs` (`systemState`: `dataQuality`, `flowMetrics`,
  `reworkMetrics`, `workloadMetrics`, `timeMetrics`, `capacityMetrics`,
  `scenarioReadiness`) — cosa è mostrato, cosa è calcolato ma mai
  renderizzato (stessa verifica già fatta in N6 per i campi legacy di
  `calculateMetrics_`).
- Confronto puntuale con la dispensa FSC: quali metriche del Cap. 11-15
  (già elencate come "calcolabili su richiesta" in
  `DESIGN_modello_caso_visita.md` §10) mancano ancora in UI, quali sono
  presenti ma disallineate nella forma.
- Decisione esplicita sulle ottimizzazioni frontend residue
  (rendering completo del DOM ad ogni `renderBoard()`, lettura
  integrale dei fogli `getDataRange().getValues()` ad ogni chiamata):
  valutare in questa ricognizione se vanno incluse in M4+ (la
  dashboard è dove il ricaricamento pesante si sente di più) o restano
  un programma a parte — non deciso a priori, deciso con i dati della
  ricognizione in mano.
- Uscita attesa: le sotto-fasi M4..Mn di questo stesso documento,
  aggiunte in fondo dopo la ricognizione — non un documento separato,
  per restare un unico riferimento per l'intera Fase M.

**Gate 🔴 Umano**: conferma del piano M4..Mn prima di iniziare M4 —
stesso principio già usato per N1/N3/N-B2/N-B3, un programma nuovo si
conferma prima di costruirci sopra.

---

## 5. Punti parcheggiati, fuori da questa fase

- **Ricostruzione date PROD**: nessuna azione richiesta oggi. Riaprire
  solo su richiesta esplicita di Marco, quando serve un modo per
  importare i risultati in blocco.
- **Nota diagnostica scaling archiviazione** (50 vs 200 righe, lineare
  vs a soglia): promemoria, non un lavoro. Riportarlo qui se in futuro
  serve dimensionare una soglia di archiviazione basata su un
  beneficio misurato, non solo "meno righe" in astratto.

---

## 6. Gate umani — riepilogo

| Dopo | Cosa | Perché |
|---|---|---|
| M1 (push) | Fusione del fix in `main` | Prassi ordinaria (mai push diretto su `main`), non un gate di design |
| M2.1 | Decisione tra le due opzioni Cronologia | Decisione di design, non un dettaglio implementativo |
| M3 | Conferma del piano M4..Mn prima di iniziare M4 | Un programma nuovo si conferma prima di costruirci sopra |
| (a parte, non di questa fase) | Allineamento schema su PROD | Qualunque scrittura su PROD, sempre riservata a Marco |
