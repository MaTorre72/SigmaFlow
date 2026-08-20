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

### 4.1 Risultato della ricognizione (2026-08-19)

**Inventario `systemState` (`Model.gs`/`dashboard.html`)** — tutto
quanto oggi calcolato in `buildSystemState_` **è** renderizzato in UI,
nessun campo morto lì (a differenza dei campi legacy top-level di
`calculateMetrics_` — `MM1`/`MG1`/`lambda`/`rework`/`stability`/
`distributions` — mai passati a `systemState`, quindi mai
renderizzati, già osservato in N6 e riconfermato qui): `dataQuality`,
`flowMetrics`, `reworkMetrics`, `timeMetrics`, `workloadMetrics`,
`capacityMetrics`, `pointsMetrics`, `scenarioReadiness` hanno tutti un
pannello dedicato in `dashboard.html`.

**Confronto con `DESIGN_modello_caso_visita.md` §10 (Cap. 11-15,
metriche di governo)**:

| Metrica §10 | Stato |
|---|---|
| $L_{WIP}(t)$ | ✅ `workloadMetrics` |
| $c(t)$ | ✅ `flowMetrics.completed_per_day` |
| $p_1$, $r$ (rientri) | ✅ `reworkMetrics` |
| $T_{cliente}$, $T_{ente}$, $T_{interno}$ | ❌ accumulati su ogni `visite.t_*_d` ma **mai sommati/esposti** — nessuna funzione in `Model.gs` li legge, nessun pannello li mostra. "Dove si blocca il lavoro" resta oggi non rispondibile dalla dashboard |
| $B_{lat}(t)$ (esposizione futura a rientri) | ❌ non calcolato — nessuna funzione conta le consegne recenti con `incarico_chiuso_ts` nullo |
| $\alpha$, kernel $k[m]$ (Cap. 13, profilo del ritardo) | ❌ non implementato — nessuna stima del "quanto e quando rientra il lavoro" |
| Margine di stabilità (Cap. 15) | 🟡 **già calcolato** (`stabilityMetrics_`, `calculateMetrics_` riga `stability`) ma **mai collegato a `systemState`** — un caso a metà tra "manca" e "solo da esporre", diverso dagli altri due sopra (quelli richiedono nuovo calcolo, questo solo un collegamento) |

Quadro di dettaglio "su richiesta" (§10, Cap. 3-9): $\lambda$, $\mu$,
$\rho$, $C_v^2$/Pollaczek-Khinchine, $\mathbb{E}[S_0]$/
$\mathbb{E}[S_1]$/$\mathbb{E}[K]$ **sono già calcolati** in
`calculateMetrics_`/`reworkMetrics_`/`queueMG1_` — semplicemente non
esposti in nessun pannello (nessun "quadro avanzato" esiste ancora in
UI). Restano davvero assenti anche dal calcolo (non solo dalla UI):
scomposizione di $W_q$ in attesa-incarico/preparazione, conteggio dei
rientri per causa (`rework_cause` è già in `visite`, ma nessuna
funzione lo aggrega), matrice linearizzata $A$ e autovalori (Cap.
14-15 — il documento la classifica esplicitamente come calcolo più
oneroso, "su richiesta").

**Ottimizzazioni frontend residue** (`renderBoard()`,
`getDataRange().getValues()`): confermate presenti, invariate da
quanto già descritto in §3 del programma — `renderBoard()`
(`client.html`) fa sempre `root.innerHTML = ''` seguito da una
ricostruzione completa del DOM ad ogni chiamata, qualunque sia la
dimensione della modifica. Nessuna misura di quanto pesino in pratica
su TEST/PROD raccolta in questa ricognizione (nessun accesso al
deployment reale in questa sessione) — decisione sotto in base a
questo limite, non a un dato misurato.

### 4.2 Sotto-fasi proposte M4..Mn

| Sotto-fase | Contenuto | Perché in questa posizione |
|---|---|---|
| **M4** | Collegare `stability` (già calcolato) a `systemState` + nuovo pannello "Margine di stabilità" in dashboard | Zero nuovo calcolo, solo collegamento — il pezzo più economico del quadro Cap. 15 mancante |
| **M5** | Calcolare e mostrare $T_{cliente}$/$T_{ente}$/$T_{interno}$ (somma `t_*_d` su `visite` nella finestra osservata) — nuovo pannello "Dove si blocca il lavoro" | Dato già raccolto per ogni visita (§9 del modello caso/visita), solo mai sommato — nessuna decisione di design aperta, un aggregato in più su dati esistenti |
| **M6** | Calcolare e mostrare $B_{lat}(t)$ (consegne recenti con `incarico_chiuso_ts` nullo, esposizione futura a rientri) | Stessa categoria di M5 — dato già presente (`incarico_chiuso_ts` su `jobs`, `consegna_ts` su `visite`), solo mai aggregato in questo modo |
| **M7** | $\alpha$/kernel $k[m]$ (Cap. 13, profilo del ritardo — "quanto e quando rientra il lavoro") | Richiede una vera stima statistica, non una somma — **ha un gate 🔴 Umano proprio** (§4.3) prima di scrivere codice: la scelta del metodo di stima va presentata a Marco, non assunta, esattamente come M2 |
| **M8** | Ottimizzazioni frontend residue (`renderBoard()` DOM completo, letture `getDataRange()` integrali) | Incluso su decisione di Marco |
| **M9** | Pannello "quadro avanzato": espone le metriche di Cap. 3-9 già calcolate (`calculateMetrics_`) ma mai renderizzate ($\lambda$/$\mu$/$\rho$/$C_v^2$/Pollaczek-Khinchine/$E[S_0]$/$E[S_1]$/$E[K]$) | Incluso su decisione di Marco — zero nuovo calcolo, solo un pannello che li legge da `calculateMetrics_` invece che da `systemState` (oggi l'unico letto dal frontend) |

**Decisione di Marco (2026-08-19, gate 🔴 confermato)**: incluse tutte
e sei — M4, M5, M6 come proposto; **M7 incluso in Fase M nonostante la
raccomandazione contraria** (Marco ha scelto esplicitamente di non
rimandarlo); **M8** (ottimizzazioni frontend) **e M9** (nuovo, pannello
"quadro avanzato" per le metriche di Cap. 3-9 già calcolate ma non
esposte) **entrambi inclusi**. Nessuna sotto-fase lasciata fuori scope.

**M4-M9 — tutte DONE (2026-08-19)**, eseguite in sequenza subito dopo
la conferma del gate (nessun gate ulteriore tra una sotto-fase e la
successiva). Dettaglio verificabile in `PROGRAMMA_STATO.md`. Riepilogo:
- **M4**: `stabilityMetrics` collegata a `systemState`, nuovo pannello
  "Margine di stabilità".
- **M5**: `waitTimeMetrics` (T_cliente/T_ente/T_interno), nuovo
  pannello "Dove si blocca il lavoro".
- **M6**: `latentBacklogMetrics` (B_lat(t)), nuovo pannello
  "Esposizione futura a rientri".
- **M7**: `delayProfileMetrics` (α, kernel k[m] su bin di 7 giorni),
  nuovo pannello "Profilo di rientro". Nessuna correzione per censura a
  destra — limite noto, documentato nel codice (`delayProfile_`,
  Model.gs).
- **M8**: `loadBoard()` (`client.html`) salta `renderBoard()` sul
  polling periodico (45s) quando i dati letti dal server sono identici
  al giro precedente — verificato nel Browser pane con un server locale
  di riproduzione. Deliberatamente **fuori scope**: caching lato server
  delle letture `getDataRange().getValues()` — stessa classe di rischio
  dei due incidenti già documentati su questo progetto attorno a stato
  condiviso (`PROP_SCHEMA_VERSION`, `SIGMAFLOW_SPREADSHEET_ID`).
- **M9**: nuovo pannello "Quadro avanzato (teoria delle code)" —
  espone λ/μ/ρ/E[S]/Cv²/M-M-1/M-G-1/rework, già calcolati in
  `calculateMetrics_` ma mai letti dal frontend prima di M9. **Corretto
  un errore della ricognizione M3**: E[S0]/E[S1] (Cap. 6) erano stati
  classificati per sbaglio come "già calcolati" — in realtà mai
  implementati, aggiunti in questa stessa sotto-fase.

147/147 test nell'harness Node al termine di M4-M9 (134 dopo M2 + 13
nuovi attraverso M4-M9, nessuna regressione). Push su TEST verificato
ad ogni sotto-fase (`clasp pull` isolato + diff, sempre 16/16 file
identici).

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
| M3 (stesso gate) | Scope di M8 (ottimizzazioni frontend) e di un eventuale pannello "quadro avanzato" (Cap. 3-9) | Decisioni esplicite non assunte dalla ricognizione, vedi §4.2 |
| (a parte, non di questa fase) | Allineamento schema su PROD | Qualunque scrittura su PROD, sempre riservata a Marco |
