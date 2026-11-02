# SigmaFlow — Performance backend (design)

> Prosegue la numerazione a lettere del progetto — **O**, la fase
> successiva a M (Dashboard, completa e unita a `main`). Nasce da una
> segnalazione diretta di Marco (2026-08-25): board ancora lenta su due
> operazioni precise — spostamento card e lettura/modifica/aggiornamento
> della Cronologia — **dopo** il fix del 2026-08-20 (`perf(cronologia):
> elimina il giro di lock extra dopo un salvataggio`, che aveva già
> risolto un ritardo di 7-10s dovuto a un giro di lock globale extra,
> non al costo delle singole letture/scritture). Questo documento
> guarda al livello sotto: quello che resta lento anche dopo quel fix.
> Analisi statica del codice (Kanban.gs), verificata di nuovo contro
> `main` aggiornato al 2026-08-25 — nessuna modifica ancora fatta. Si
> appoggia sui numeri già raccolti nella sessione diagnostica del
> 2026-08-17 (`PROGRAMMA_STATO.md`, "peso reale di activity_log_json su
> TEST": ~40-50 volte più lento leggere una riga `jobs` con
> `activity_log_json` incluso rispetto a escluderlo, su soli 50 job) —
> qui applicata a due percorsi di codice specifici, non solo al
> caricamento board già noto.

---

## 1. Cosa si tocca, e cosa no

- **Solo backend** (Kanban.gs/Utils.gs): riduzione di letture/scritture
  Sheets ridondanti o non necessarie sulle stesse operazioni. Nessuna
  modifica al modello dati, allo schema, o al comportamento visibile
  (stessi output di `moveJob`/`addActivityEvent`/`updateActivityEvent`/
  `deleteActivityEvent`, stessi test che devono continuare a passare).
- **Non tocca** il problema già noto e distinto del carico iniziale
  board/dashboard (`getBoard()`/`getMetrics()` che leggono
  `activity_log_json` per ogni card via `readTable_` — vedi "Prossimi
  passi noti" in `PROGRAMMA_STATO.md`). Imparentato (stessa causa di
  fondo, il peso di quel campo), ma è un percorso di codice diverso con
  un compromesso diverso (il campo *serve* per intero quando si apre la
  Cronologia di una card, quindi lì l'ottimizzazione è "non leggerlo
  quando non serve", non "leggerlo più in fretta") — fuori scope qui,
  riconsiderabile in un programma separato se Marco lo vuole.
- **Non tocca** rendering DOM lato client (`renderBoard()` ricostruisce
  tutte le colonne a ogni render) — altro problema noto, altro layer,
  fuori scope di questo documento.

## 2. Cosa è stato trovato

### 2.1 Spostamento card (`moveJob`, Kanban.gs)

**A — `activity_log_json` letto e scritto due volte per la stessa
mossa.** `readJobFromRow_` legge l'intera riga job (25 colonne, incluso
`activity_log_json`); `writeJobToRow_` la riscrive **intera**, campo
pesante compreso, con lo stesso valore non ancora aggiornato; subito
dopo il codice rilegge la stessa cella (`sheet.getRange(row,
headers.activity_log_json).getValue()`) e la riscrive di nuovo con il
valore vero, aggiornato. Per ogni mossa: 2 letture + 2 scritture dello
stesso campo, una delle due scritture del tutto superflua.

**B — scansione completa di `visite` a ogni mossa (compreso il
self-move).** `findOpenVisitRow_`, chiamata da `ensureOpenVisit_`
dentro `updateVisiteForMove_`, legge con un solo `getRange` **tutte le
righe e tutte le colonne** del foglio `visite` e scorre a mano cercando
la riga con quel `job_id` e `rientro_ts` vuoto. Costo proporzionale al
numero *totale* di visite di tutto il sistema, non al job spostato —
cresce nel tempo, senza limite (l'archiviazione sposta solo le visite
di casi chiusi da 30+ giorni, non quelle attive). Probabile causa
principale del rallentamento percepito, perché a differenza del punto A
il costo non è fisso ma sale con l'uso reale del sistema.

**C — `readColumns_()` chiamato due volte nella stessa `moveJob`** (una
volta dentro `validateColumnId_`, una volta esplicita) — una lettura
del foglio `config` evitabile, ma il foglio è piccolo: impatto minore
rispetto ad A/B.

**G — `visite` scritta fino a tre volte nella stessa `moveJob` quando la
mossa chiude una visita** (`updateVisiteForMove_`, stessa funzione di
B). Chiusura della vecchia riga (`writeVisitToRow_`), creazione della
nuova riga (`appendVisitRow_`), poi un'altra scrittura sulla stessa
riga nuova per valorizzare i campi gate (`incarico_ts`/`prep_ts`/
`start_ts`/`consegna_ts`). A differenza di B (costo di *lettura*),
qui il costo è in *scrittura* — ma i campi gate dipendono solo da
`targetColumn.role`, già noto **prima** di creare la nuova riga: si può
costruire l'oggetto visita già completo e fare un solo `appendVisitRow_`,
eliminando la terza scrittura (da 3 a 2 per mossa che chiude una
visita). Nessuna dipendenza trovata che imponga l'ordine attuale — è un
riordino, non una riscrittura della logica.

### 2.2 Cronologia (`addActivityEvent`/`updateActivityEvent`/
`deleteActivityEvent`, Kanban.gs)

**D — riscrittura della riga intera per una modifica di poche celle.**
Ognuna delle tre funzioni cambia di fatto solo `activity_log_json` (+
al più 1-2 campi di allineamento strutturale), ma `writeJobToRow_`
riscrive sempre tutte le 25 colonne. Più il log è pesante, più lenta è
ogni singola modifica o cancellazione di un evento, anche quando la
modifica è minima.

**E — stesso full-scan di `visite` del punto B**, quando una
correzione o un evento move genera un allineamento che tocca la visita
aperta (`applyStructuralAlignment_` → `alignOpenVisitFields_` →
`ensureOpenVisit_` → `findOpenVisitRow_`).

`getActivityLog` (sola lettura) **non ha problemi nuovi**: la sessione
M0-A2 (2026-08-17) aveva già verificato che usa `findRowById_`/
`readJobFromRow_` mirati a una singola riga, non una scansione
dell'intero foglio `jobs` — resta corretto così.

## 3. Approccio

Nessuna riprogettazione dello schema o del modello caso/visita: tutti i
fix restano dentro le funzioni esistenti, stesso contratto di
input/output verso client e test. Due famiglie distinte:

- **Scritture ridondanti (A, C, D)** — eliminare letture/scritture
  duplicate o più ampie del necessario sulla riga `jobs`. Rischio
  basso: non cambia *cosa* viene scritto, solo *quante volte* e *quanto*.
- **`visite` — lettura e scrittura nella stessa funzione (B, E, G)** —
  `findOpenVisitRow_` resta O(n) sul
  numero di visite (nessun indice) ma la lettura può limitarsi alle
  colonne che servono davvero al confronto. **Verificato in
  `Schema.gs`**: `job_id` (colonna 1) e `rientro_ts` (colonna 8) **non
  sono adiacenti** in `VISITE_HEADERS` — in mezzo ci sono
  `numero_visita`/`apertura_ts`/`incarico_ts`/`prep_ts`/`start_ts`/
  `consegna_ts`. `getRange` legge un blocco contiguo di colonne: due
  letture strette (una per colonna) dimezzerebbero il payload ma
  raddoppierebbero il numero di chiamate — su Apps Script il costo
  fisso per chiamata spesso pesa quanto i byte trasportati, quindi non
  è detto sia un guadagno netto. **Scelta consigliata per O2**: un solo
  `getRange` sulle colonne 1-8 (`job_id`..`rientro_ts`), scartando solo
  le ultime 5 (`rientro_da`/`t_cliente_d`/`t_ente_d`/`t_interno_d`/
  `rework_cause`) — una sola chiamata come oggi, payload ridotto di
  circa un terzo. Un vero indice (es. mappa job→riga aperta mantenuta a
  parte) risolverebbe la crescita O(n) alla radice ma tocca una
  struttura dati nuova da mantenere coerente ad ogni spostamento/
  creazione/archiviazione — proposto come fase separata, da valutare
  solo se la riduzione del payload non basta in uso reale.
  **G accorpato qui** (decisione di Marco, 2026-08-25): stessa funzione
  di B (`updateVisiteForMove_`), stesso rischio basso, stesso ciclo di
  test/push — separarlo avrebbe voluto dire riaprire lo stesso file una
  seconda volta senza nessun vantaggio. Restano comunque due criteri di
  accettazione distinti (§6), per tenere i due fix tracciabili anche
  dentro un'unica sotto-fase.

## 4. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Gate |
|---|---|---|
| **O1** | Punti A, C, D: elimina la doppia lettura/scrittura di `activity_log_json` in `moveJob`; deduplica `readColumns_()`; `writeJobToRow_` (o una variante mirata) scrive solo le celle cambiate invece della riga intera in `moveJob`/`addActivityEvent`/`updateActivityEvent`/`deleteActivityEvent`/`correctJobTimestamps`. Nessun cambio di comportamento osservabile — stessi test esistenti devono restare verdi, nessun test nuovo di comportamento (solo eventuale copertura sul numero di chiamate `getRange`/`setValue` se utile a non regredire). | — |
| **O2** | Punti B, E: `findOpenVisitRow_` legge solo le colonne 1-8 (`job_id`..`rientro_ts`) invece di tutte le colonne di `visite`. Punto G: `updateVisiteForMove_` costruisce la nuova visita già completa (campi gate inclusi) prima di `appendVisitRow_`, eliminando la terza scrittura quando una mossa chiude una visita. Nessun cambio di risultato — solo di quante volte e quanto si legge/scrive su `visite`. | — |
| **O3** | `findOpenVisitRow_` delega la ricerca del `job_id` a `TextFinder` (ricerca server-side sulla colonna `job_id`, `matchEntireCell(true)` per evitare falsi positivi tipo "JOB-1" dentro "JOB-10"), poi legge `rientro_ts` solo per le righe trovate (tipicamente 1-3, mai l'intera tabella) — non un indice a parte da mantenere coerente ad ogni scrittura su `visite` (scartato: un indice posizionale, es. job→numero di riga, diventerebbe silenziosamente sbagliato ad ogni `deleteRow` su `visite` — archiviazione/cestino/ripristino spostano righe di ALTRI job, non solo di quello toccato). Il costo smette di crescere col numero *totale* di visite di tutto il sistema, dipende solo da quante volte il job cercato compare nel log delle visite. | — |

O1 e O2 sono indipendenti tra loro (toccano percorsi di codice
diversi: riga `jobs` vs. foglio `visite`) — possono essere fatte in
qualunque ordine o nella stessa sessione, senza gate intermedio, come
per le sotto-fasi senza 🔴 negli altri programmi.

## 5. Fuori scope, per ora

- Carico iniziale board/dashboard (`getBoard()`/`getMetrics()`,
  `activity_log_json` letto per ogni card) — problema noto e distinto,
  vedi §1.
- Rendering DOM lato client (`renderBoard()`) — altro layer.
- Un vero indice posizionale per la visita aperta (job → riga) — scartato
  in O3 per fragilità sugli spostamenti riga di archiviazione/cestino,
  vedi §4.

## 6. Criteri di accettazione

- [ ] `moveJob`: `activity_log_json` letto una sola volta e scritto una
      sola volta per mossa reale (non self-move) (O1)
- [ ] `moveJob`: `readColumns_()` chiamato una sola volta per
      invocazione (O1)
- [ ] `addActivityEvent`/`updateActivityEvent`/`deleteActivityEvent`/
      `correctJobTimestamps`: nessuna scrittura di colonne di `jobs`
      che non sono effettivamente cambiate rispetto al valore letto
      (O1)
- [ ] Tutti i test esistenti nell'harness Node restano verdi, nessuna
      regressione di comportamento (risposta di `moveJob`/
      `addActivityEvent`/`updateActivityEvent`/`deleteActivityEvent`
      identica a prima) (O1, O2)
- [ ] `findOpenVisitRow_` legge solo le colonne 1-8 (`job_id`..
      `rientro_ts`), non l'intera riga di `visite`, per ogni riga
      scansionata (O2, punto B/E)
- [ ] Nessun cambio di risultato di `findOpenVisitRow_` su nessun caso
      di test esistente (stessa riga trovata, stesso comportamento su
      "nessuna visita aperta") (O2, punto B/E)
- [ ] `updateVisiteForMove_`: quando una mossa chiude una visita,
      `visite` è scritta due volte, non tre (chiusura vecchia riga +
      una sola scrittura sulla nuova, campi gate già inclusi) (O2,
      punto G)
- [ ] Nessun cambio di risultato su `visite` per nessun caso di test
      esistente (stessi valori scritti, stessa riga, stesso
      comportamento sugli accumulatori di attesa) (O2, punto G)
- [ ] `findOpenVisitRow_` non legge piu' l'intera colonna `job_id` di
      `visite` in JS: la ricerca passa da `TextFinder`, la lettura di
      `rientro_ts` avviene solo sulle righe trovate (O3)
- [ ] Nessun cambio di risultato di `findOpenVisitRow_` su nessun caso
      di test esistente, incluso il caso limite di piu' visite con lo
      stesso `job_id` (solo quella con `rientro_ts` vuoto viene
      restituita) (O3)
