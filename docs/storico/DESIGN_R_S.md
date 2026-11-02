# DESIGN — Fase R e Fase S (governo delle metriche dashboard)

> Continua P1...Q (tutte chiuse, live su PROD, `origin/main` commit
> `8ea5399`). Riferimenti: `VERIFICA_metriche_dashboard_2026-08-26.md`
> (i difetti trovati confrontando codice e dati reali con la dispensa
> FSC), `CRITERI_governo_metriche_2026-08-26.md` (separazione
> errori/decisioni, con le risposte operative di Marco), 
> `SPUNTI_bibliografia_gestione_team_2026-08-27.md` (conferme e
> strumenti dalla letteratura Kanban/Agile),
> `PROGRAMMA_SVILUPPO_SigmaFlow_2026-08-27.md` (le sei aree, qui
> tradotte in due fasi eseguibili).
>
> **Fase R** = Area 1 (errori puri) + Area 2 (riorganizzazione delle
> metriche di governo, decisioni già prese da Marco). **Fase S** =
> Area 3 (strumenti diagnostici). R e S non hanno dipendenze reciproche
> né dal backfill storico in corso — si eseguono nella stessa
> sessione/branch. **In chiusura**, insieme a R e S, entrano anche
> Area 6 (igiene documentale) e Area 5 (idee da valutare, non ancora
> decise) — ma solo come documentazione, non come sviluppo: Area 5 non
> comporta nessuna riga di codice in questo giro (nessuno strumento è
> stato deciso, solo raccolto).
>
> **Fase T** (Area 4, calibrazione vera e propria) **resta fuori da
> questo documento**: dipende dal completamento del backfill storico
> (lavoro di Marco, non pianificabile da qui) ed è già descritta a
> sufficienza in `PROGRAMMA_SVILUPPO_SigmaFlow_2026-08-27.md` §2 Area 4
> e in `SPUNTI_bibliografia_gestione_team_2026-08-27.md` §5 (le cinque
> domande del Coaching Kata come struttura del rituale). Non c'è altro
> da progettare per T finché il backfill non è pronto — quando lo sarà,
> si scriverà un documento a parte.

---

## 1. Scope

**Fase R** tocca `Model.gs` (funzioni `initiativeGroups_`,
`buildSystemState_`, nuove funzioni di supporto), `client.html`
(rendering dei pannelli "Flusso e carico", "Rientri e rework", "Dove
si blocca il lavoro", "Quadro avanzato").

**Fase S** tocca `Model.gs` (`delayProfile_` esteso, una nuova funzione
per il grafico WIP/tempo di ciclo, un helper di percentile condiviso),
`client.html` (nuovo pannello diagnostico) e `dashboard.html` (nuovo
contenitore per il grafico).

**In chiusura**: `docs/dashboard-metrics.md` (Area 6) e una nota
sintetica su `PROGRAMMA_STATO.md` per le idee dell'Area 5 (Area 6 e
Area 5, vedi §4).

Nessuna delle due fasi tocca lo schema dati (`jobs`/`visite` restano
invariate — tutti i campi necessari esistono già, verificato sui dati
reali: `rework_cause` è popolato su tutti i 22 rientri storici
osservati, `status_since_ts` su ogni job).

---

## 2. Diagnosi (riferimento: `VERIFICA_metriche_dashboard_2026-08-26.md`)

### 2.1 — R1: `initiativeGroups_` conta rientri di tutta la storia, non della finestra

Codice attuale (`Model.gs`, funzione `initiativeGroups_`, usata da
`buildSystemState_` per `reworkShare`/`conditionalReentries`/
`averagePassages`/`totalPassageRate`/`effectiveLoad`/`systemStatus`/
`stabilityMetrics`):

```js
function initiativeGroups_(visite) {
  return visite.reduce(function(groups, visit) {
    var key = visit.job_id;
    if (!groups[key]) {
      groups[key] = { id: key, reentries: 0 };
    }
    groups[key].reentries = Math.max(groups[key].reentries, Math.max(0, Number(visit.numero_visita || 1) - 1));
    return groups;
  }, {});
}
```

Riceve solo le visite con `apertura_ts` nella finestra (`observed`),
ma calcola `reentries` come `numero_visita − 1` della visita osservata
— cioè quante volte il caso è rientrato *in tutta la sua storia* fino
a quel punto, non quante volte è rientrato *durante la finestra*.
Esempio reale (`JOB-20260707-ZNWU`, finestra 90 giorni): solo le
visite 5 e 6 aprono nella finestra (2 rientri veri), ma il codice
calcola `reentries = 6−1 = 5`.

### 2.2 — R2: riga "Aggiunte (periodo)" mescola due popolazioni

`client.html`, dentro `renderMetrics`:

```js
document.getElementById('flow-added-cards').textContent = valueOrDash(points.added_cards);
document.getElementById('flow-added-points').textContent = metricValue(points.added_points, ' pt');
document.getElementById('flow-added-rate').textContent = perWeekValue(flow.new_initiatives_per_day, '/settimana');
document.getElementById('flow-added-points-rate').textContent = pointsPerWeekFromWindowTotal_(points.added_points, flow.window_days);
```

`points.added_cards`/`added_points` (da `pointsStatistics_`, Model.gs)
sono filtrati su `arrival_ts` nella finestra — casi davvero nuovi.
`flow.new_initiatives_per_day` è invece `newRate` di
`buildSystemState_` — casi *toccati* nella finestra (nuovi o
rientrati). Stessa riga, due popolazioni: sui dati reali, 27 card
aggiunte ma un tasso mostrato di 2,64/settimana invece del 2,1/settimana
coerente con 27 card sulla finestra.

### 2.3 — R3: simbolo `p1`/`r` riusato per una grandezza diversa

`Model.gs`, funzione `reworkMetrics_` (usata solo dal Quadro avanzato,
`client.html` funzione `renderAdvancedMetrics`):

```js
var reworked = completed.filter(function(visit) {
  return Number(visit.numero_visita || 1) > 1;
});
var p1 = completed.length ? reworked.length / completed.length : 0;
var r = reworked.length ? reworked.reduce(function(sum, visit) {
  return sum + Math.max(0, Number(visit.numero_visita || 1) - 1);
}, 0) / reworked.length : 0;
```

Qui `p1`/`r` sono calcolati **per visita** (quota di visite completate
che sono rilavorazione), mentre la dispensa (Cap. 6) li definisce
esplicitamente **per caso** ("frazione di iniziative consegnate che
vengono riaperte"). Il pannello principale "Rientri e rework" usa
invece `reworkShare` di `buildSystemState_`, che *è* per caso — ma
porta lo stesso nome. Sui dati reali: 83% (Quadro avanzato) contro 24%
(pannello principale) per quello che sembra lo stesso concetto.

---

## 3. Approccio

### 3.1 — R1: contare i rientri osservati nella finestra, non la posizione nella storia

```js
function initiativeGroups_(visite) {
  return visite.reduce(function(groups, visit) {
    var key = visit.job_id;
    if (!groups[key]) {
      groups[key] = { id: key, reentries: 0 };
    }
    if (Number(visit.numero_visita || 1) > 1) {
      groups[key].reentries++;
    }
    return groups;
  }, {});
}
```

Non serve altro: `initiativeGroups_` è già chiamata solo su insiemi
filtrati per finestra (`observed`/`completed`), quindi contare "quante
righe con `numero_visita > 1` sono presenti nell'insieme che ho in
mano" è già "quanti rientri sono avvenuti nella finestra" — non serve
sapere a che punto della storia del caso siamo arrivati. Nessun altro
punto della funzione cambia; nessun chiamante da aggiornare (la firma
resta identica).

**Verifica attesa dopo il fix** (stessi dati usati per la diagnosi):
`JOB-20260707-ZNWU` deve contribuire `reentries = 2` (non 5) alla
finestra di 90 giorni; `conditionalReentries` scende da 1,75 a circa
1,25; `effectiveLoad` scende dall'814% al 747% circa (i numeri esatti
dipenderanno dai dati al momento dell'esecuzione, non sono un target
da forzare).

### 3.2 — R2: la riga "Aggiunte" usa un'unica popolazione (arrivo)

La scelta è la popolazione che la label promette: "Aggiunte" significa
`arrival_ts` nella finestra, la stessa di `points.added_cards`/
`added_points`. Il tasso deve derivare dallo stesso totale, non da
`flow.new_initiatives_per_day`. `pointsPerWeekFromWindowTotal_` esiste
già (`client.html`) e fa esattamente "totale su finestra → tasso
settimanale", ma ha il suffisso ' pt/settimana' fissato nel codice —
va generalizzata per accettare il suffisso come parametro:

```js
// PRIMA
function pointsPerWeekFromWindowTotal_(total, windowDays) {
  if (total === null || total === undefined || !windowDays) {
    return 'Dato non ancora stimabile';
  }
  return metricValue(Math.round(Number(total) / windowDays * 7 * 100) / 100, ' pt/settimana');
}

// DOPO
function perWeekFromWindowTotal_(total, windowDays, suffix) {
  if (total === null || total === undefined || !windowDays) {
    return 'Dato non ancora stimabile';
  }
  return metricValue(Math.round(Number(total) / windowDays * 7 * 100) / 100, suffix);
}
```

Aggiornare l'unico chiamante esistente:
`pointsPerWeekFromWindowTotal_(points.added_points, flow.window_days)`
→ `perWeekFromWindowTotal_(points.added_points, flow.window_days, ' pt/settimana')`.
Poi cambiare la riga "Aggiunte":

```js
document.getElementById('flow-added-rate').textContent = perWeekFromWindowTotal_(points.added_cards, flow.window_days, '/settimana');
```

`flow.new_initiatives_per_day` resta calcolato lato server (serve
internamente a `buildSystemState_` per `rawRho`/`effectiveLoad`, dopo
il fix R1 è un numero corretto — "iniziative toccate nella finestra",
non più "iniziative aggiunte") — non va rimosso dal payload, solo non
più usato per questa riga. Se si vuole renderlo comunque visibile per
trasparenza, la posizione naturale è il Quadro avanzato (facoltativo,
non richiesto da questo programma).

### 3.3 — R3: etichette esplicite, nessuna ambiguità con la dispensa

Non è necessario cambiare la formula di `reworkMetrics_` (misura
comunque qualcosa di legittimo, solo diverso da quanto suggerisce il
nome) — basta smettere di usare i simboli della dispensa per indicare
una grandezza diversa. In `client.html`, `renderAdvancedMetrics`:

```js
// PRIMA
'Quota di visite di rework (p1)': nullablePercent(rework.p1, true),
'Rientri medi quando c\'e\' rework (r)': estimableValue(rework.r),

// DOPO
'Quota di visite di rework (per visita, non per iniziativa)': nullablePercent(rework.p1, true),
'Rientri medi per visita di rework (per visita, non per iniziativa)': estimableValue(rework.r),
```

Rinominare anche `E_K`/`lambda_effective`/`rho_effective` di quello
stesso blocco con lo stesso avviso "(per visita)" nella label, dato
che ne ereditano la base di calcolo — sono coerenti tra loro (tutti
per-visita), il problema è solo che condividono il nome con l'altra
lettura (per-caso) usata nel pannello principale. Nessun cambiamento
lato server per questo punto.

### 3.4 — R4: rework scomposto per causa

Nuova funzione (`Model.gs`, vicino a `initiativeGroups_`):

```js
// R4 (CRITERI_governo_metriche_2026-08-26.md §6): scompone i rientri
// osservati nella finestra per causa (rework_cause sulla visita che
// e' rientrata) - distingue quota controllabile (cliente + interno,
// leva: gating) da quota non controllabile (enti, nessuna leva
// diretta). Opera sullo stesso insieme filtrato per finestra di
// initiativeGroups_ (coerenza tra le due letture).
function reworkByCause_(visite) {
  var counts = { wait_client: 0, wait_authority: 0, wait_internal: 0 };
  visite.forEach(function(visit) {
    if (Number(visit.numero_visita || 1) > 1 && counts.hasOwnProperty(visit.rework_cause)) {
      counts[visit.rework_cause]++;
    }
  });
  var total = counts.wait_client + counts.wait_authority + counts.wait_internal;
  var controllable = counts.wait_client + counts.wait_internal;
  return {
    total: total,
    client: counts.wait_client,
    authority: counts.wait_authority,
    internal: counts.wait_internal,
    controllable_share: total ? round_(controllable / total) : null,
    external_share: total ? round_(counts.wait_authority / total) : null
  };
}
```

In `buildSystemState_`, subito dopo il calcolo di `reworked`, chiamare
`reworkByCause_(observed)` e aggiungere il risultato a
`reworkMetrics` nel return finale:

```js
reworkMetrics: {
  initiatives_with_rework: reworkShare === null ? null : round_(reworkShare),
  average_reentries_when_reworked: conditionalReentries === null ? null : round_(conditionalReentries),
  average_passages_per_initiative: averagePassages === null ? null : round_(averagePassages),
  total_passages_per_day: totalPassageRate === null ? null : round_(totalPassageRate),
  additional_passages_from_rework: reworkPassageRate === null ? null : round_(reworkPassageRate),
  by_cause: reworkByCause_(observed)
},
```

`client.html`, aggiungere righe a `system-rework-metrics` (nessun
cambiamento HTML necessario — `renderDl` costruisce le righe da un
oggetto):

```js
var byCause = rework.by_cause || {};
renderDl('system-rework-metrics', {
  'Iniziative con almeno un rientro': nullablePercent(rework.initiatives_with_rework, true),
  'Rientri medi quando il lavoro rientra': estimableValue(rework.average_reentries_when_reworked),
  'Visite medie per iniziativa': metricValue(rework.average_passages_per_initiative),
  'Visite totali alla settimana': perWeekValue(rework.total_passages_per_day, ' visite/settimana') + estimatedPointsSuffix_(rework.total_passages_per_day, avgPoints),
  'Carico aggiuntivo dei rientri (alla settimana)': perWeekValue(rework.additional_passages_from_rework, ' visite/settimana') + estimatedPointsSuffix_(rework.additional_passages_from_rework, avgPoints),
  'Rientri per causa — cliente / enti / interno': byCause.total ? (byCause.client + ' / ' + byCause.authority + ' / ' + byCause.internal) : 'Dato non ancora stimabile',
  'Quota controllabile (cliente + interno, leva: gating)': byCause.total ? nullablePercent(byCause.controllable_share, true) : 'Dato non ancora stimabile',
  'Quota da enti (non controllabile direttamente)': byCause.total ? nullablePercent(byCause.external_share, true) : 'Dato non ancora stimabile'
});
```

### 3.5 — R5: attesa divisa in trend mensile e stato attuale

**Trend mensile.** Nuova funzione (`Model.gs`, stesso stile di
`monthBuckets_`), attribuisce l'attesa accumulata di ogni visita
*chiusa* al mese in cui si è chiusa (stesso principio di attribuzione
già usato da `monthBuckets_` per i punti):

```js
// R5: trend dell'attesa a grana mensile - ogni visita chiusa (con
// consegna_ts o rientro_ts) attribuisce la sua attesa cumulata
// (t_cliente_d/t_ente_d/t_interno_d) al mese in cui si e' chiusa.
// A differenza del pannello "stato attuale" (sotto), qui NON entra
// l'attesa in corso: e' un trend su eventi conclusi, per vedere se
// una leva di controllo sta funzionando nel tempo (mesi, non giorni).
function waitTimeMonthBuckets_(visite, now, count) {
  var first = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  var buckets = [];
  var byKey = {};
  for (var i = 0; i < count; i++) {
    var date = new Date(first.getFullYear(), first.getMonth() + i, 1);
    var key = Utilities.formatDate(date, SIGMAFLOW.TZ, 'yyyy-MM');
    var bucket = { key: key, label: Utilities.formatDate(date, SIGMAFLOW.TZ, 'MM/yyyy'), client_days: 0, authority_days: 0, internal_days: 0 };
    buckets.push(bucket);
    byKey[key] = bucket;
  }
  visite.forEach(function(visit) {
    var closeTs = visit.consegna_ts || visit.rientro_ts;
    if (!closeTs) { return; }
    var key = Utilities.formatDate(new Date(closeTs), SIGMAFLOW.TZ, 'yyyy-MM');
    if (!byKey[key]) { return; }
    byKey[key].client_days += Number(visit.t_cliente_d || 0);
    byKey[key].authority_days += Number(visit.t_ente_d || 0);
    byKey[key].internal_days += Number(visit.t_interno_d || 0);
  });
  return buckets.map(function(b) {
    return { key: b.key, label: b.label, client_days: round_(b.client_days), authority_days: round_(b.authority_days), internal_days: round_(b.internal_days) };
  });
}
```

Chiamata da `buildSystemState_` su `allVisite` (non solo `observed` —
qui la finestra è "ultimi 6 mesi", non `windowDays`), esposta come
nuovo campo `waitTimeTrend` nel risultato. Suggerito 6 mesi, stesso
`count` già usato da `monthBuckets_` per coerenza visiva col pannello
"Carico mensile".

**Stato attuale.** Non è più un numero dentro `waitTimeMetrics`, è un
elenco. Nuova funzione:

```js
// R5: elenco dei job attualmente fermi in una colonna di attesa,
// ordinato per giorni trascorsi decrescenti - lo "stato attuale" che
// serve per sollecitare, distinto dal trend mensile sopra (che copre
// solo attese gia' concluse).
function currentlyBlocked_(jobs, columnMap, now) {
  var result = [];
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)];
    var field = column ? SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS[column.id] : null;
    if (!field || !job.status_since_ts) { return; }
    var elapsed = Number(diffDays(job.status_since_ts, now) || 0);
    if (elapsed <= 0) { return; }
    result.push({ job_id: job.job_id, title: job.title, client: job.client, wait_type: field, elapsed_days: round_(elapsed) });
  });
  return result.sort(function(a, b) { return b.elapsed_days - a.elapsed_days; });
}
```

Esposta come nuovo campo `currentlyBlocked` in `buildSystemState_`
(non dentro `waitTimeMetrics` — è una lista, non delle statistiche
aggregate). `waitTimeMetrics` perde il calcolo "in corso" che oggi
mescola le due cose (il blocco `jobs.forEach` dentro il calcolo di
`waitSamplesByField`, che oggi aggiunge l'elapsed di ogni job bloccato
ai campioni "chiusi") — resta solo la parte da `observed` (chiuse
nella finestra):

```js
// PRIMA (waitSamplesByField mescolava chiuse-in-finestra e in-corso-senza-tetto)
var waitSamplesByField = { t_cliente_d: [], t_ente_d: [], t_interno_d: [] };
observed.forEach(function(visit) { /* ... */ });
jobs.forEach(function(job) { /* aggiunge l'elapsed dei job bloccati ora, senza limite di finestra */ });

// DOPO — solo la parte da 'observed' resta qui; il "adesso" si legge da currentlyBlocked_
var waitSamplesByField = { t_cliente_d: [], t_ente_d: [], t_interno_d: [] };
observed.forEach(function(visit) {
  Object.keys(waitSamplesByField).forEach(function(field) {
    var value = Number(visit[field] || 0);
    if (value > 0) { waitSamplesByField[field].push(value); }
  });
});
```

`client.html`: il pannello "Dove si blocca il lavoro" mostra ora tre
cose invece di una tabella con "in corso" mescolato dentro — la
tabella esistente (totali/occorrenze/media/min/max) resta ma descrive
solo attese **chiuse nella finestra**; sotto, una lista "Fermi ora"
(nuova, `renderCurrentlyBlocked_(system.currentlyBlocked || [])`,
righe per job ordinate per `elapsed_days` decrescente, raggruppate per
`wait_type` o con una colonna tipo); il trend mensile
(`system.waitTimeTrend`) va in un grafico a linee/barre simile a
"Carico mensile", una serie per tipo di attesa. `dashboard.html` va
esteso con un contenitore per la lista "Fermi ora" e uno per il
grafico di trend (markup minimo, stesso stile delle altre `dl`/tabelle
esistenti — non serve reinventare la grafica).

### 3.6 — S1: percentile esplicito nel Profilo di rientro

Helper generico (`Model.gs`, riusabile anche da S3):

```js
// S1/S3: percentile per rango (nearest-rank) su un campione ordinato
// crescente - sufficiente per l'uso qui (soglie indicative, non un
// requisito statistico stringente); p in [0,1].
function percentile_(sortedAscendingValues, p) {
  if (!sortedAscendingValues.length) { return null; }
  var index = Math.min(sortedAscendingValues.length - 1, Math.ceil(p * sortedAscendingValues.length) - 1);
  return sortedAscendingValues[Math.max(0, index)];
}
```

In `delayProfile_`, dopo il calcolo di `delays` (già presente, prima
del controllo `MIN_SAMPLES`):

```js
var sortedDelays = delays.slice().sort(function(a, b) { return a - b; });
// ... dentro l'oggetto restituito quando delays.length >= MIN_SAMPLES:
p80_days: round_(percentile_(sortedDelays, 0.80)),
```

`client.html`, `renderDelayProfile`, aggiungere una riga:
`'80° percentile del tempo prima del rientro': estimableValue(profile.p80_days, ' giorni')`.
Questo è il numero che servirà quando si arriverà a tarare la finestra
`H` (Area 4/Fase T, fuori da questo documento — vedi intro) — non
richiede altro sviluppo, la distribuzione è già calcolata su tutto lo
storico disponibile (`allVisite`, non filtrato sulla finestra).

### 3.7 — S2: grafico WIP vs tempo di ciclo

Nuova funzione (`Model.gs`):

```js
// S2 (strumento diagnostico per la futura Fase T, Cap. 12 della
// dispensa — "cercare il ginocchio" nella curva WIP/tempo di ciclo):
// per ogni visita con un tempo di ciclo calcolabile, conta quante
// ALTRE visite erano "attive" (WIP) nel momento esatto in cui questa
// e' partita (start_ts). Attiva = start_ts <= t < fine (consegna_ts o
// rientro_ts, quella che viene prima; nessuna fine = ancora aperta
// ora). E' un'approssimazione di L_WIP(t) al momento dell'avvio di
// ogni visita, non una serie storica esatta giorno per giorno -
// sufficiente per uno scatter diagnostico, non per un conteggio di
// audit.
function visitActiveInterval_(visit) {
  if (!visit.start_ts) { return null; }
  var start = new Date(visit.start_ts);
  var end = null;
  if (visit.consegna_ts) { end = new Date(visit.consegna_ts); }
  if (visit.rientro_ts) {
    var rientro = new Date(visit.rientro_ts);
    if (!end || rientro < end) { end = rientro; }
  }
  return { start: start, end: end };
}

function wipCycleTimeScatter_(visite) {
  var intervals = visite.map(visitActiveInterval_).filter(Boolean);
  var points = [];
  visite.forEach(function(visit) {
    var cycleDays = visitServiceTimeDays_(visit);
    if (cycleDays <= 0 || !visit.start_ts) { return; }
    var t = new Date(visit.start_ts);
    var wip = intervals.filter(function(iv) {
      return iv.start <= t && (iv.end === null || iv.end > t);
    }).length;
    points.push({ wip_at_start: wip, cycle_time_days: round_(cycleDays) });
  });
  return points;
}
```

Chiamata da `buildSystemState_` su `allVisite` (storico intero, non
filtrato sulla finestra — stesso principio di `delayProfile_`, una
stima diagnostica beneficia di più campioni), esposta come nuovo campo
`wipCycleTimeScatter` — un array, potenzialmente vuoto o piccolo
finché il backfill non è completo (atteso, non un errore).

`client.html`: nuovo pannello diagnostico, collassato di default
(stesso pattern del "Quadro avanzato" — `<details>`), un grafico a
dispersione (canvas, stesso stile di `drawDelayHistogram_`/
`drawPointsTimeline`): asse X = `wip_at_start`, asse Y =
`cycle_time_days`, un punto per elemento dell'array. Se l'array è
vuoto o troppo piccolo (< 10 punti, soglia indicativa), mostrare "Dato
non ancora stimabile" invece del grafico vuoto (stesso pattern già
usato per `delay-profile-chart-empty`). `dashboard.html`: nuovo
`<canvas>` dentro il riquadro "Quadro avanzato" esistente o in un
riquadro diagnostico dedicato — a discrezione di chi implementa, non è
un dettaglio che cambia la sostanza.

### 3.8 — S3: fasce a percentile sulla lista "Fermi ora"

Estensione di R5 (lista `currentlyBlocked_`), non un nuovo componente:
quando lo storico avrà abbastanza campioni di tempo di ciclo concluso
(soglia indicativa: 20+ campioni), calcolare i percentili 50°/85°/95°
(riusando `percentile_` di S1) sui tempi di ciclo storici e passarli
al client insieme alla lista, per colorare ogni riga (verde/giallo/
rosso) in base a dove cade il suo `elapsed_days` rispetto alle fasce —
stesso principio dell'aging chart della letteratura Kanban (§1 di
`SPUNTI_bibliografia_gestione_team_2026-08-27.md`). Se i campioni non
bastano ancora, la lista resta senza colore (comportamento attuale di
R5) — nessuna regressione, solo un arricchimento quando i dati lo
permettono. Non richiede nuovo codice oltre a un piccolo calcolo di
soglia e il passaggio di 3 numeri in più al client.

---

## 4. Chiusura — Area 6 e Area 5

### 4.1 — Area 6: igiene documentale

`docs/dashboard-metrics.md` è fermo a prima della Fase M e non
descrive metà delle metriche oggi in produzione. Aggiornarlo per
riflettere tutto quanto esiste in `systemState` **dopo** i punti R1-S3
sopra (incluse le voci nuove: `reworkMetrics.by_cause`,
`waitTimeTrend`, `currentlyBlocked`, `delayProfileMetrics.p80_days`,
`wipCycleTimeScatter`) — stesso formato già in uso nel file (una voce
per metrica, formula, provenienza, pannello dashboard che la mostra).

`DEV_stato_progetti.md` (Claude Project, non nel repo) resta fuori da
questo lavoro — verrà aggiornato separatamente, non è raggiungibile da
una sessione Code sul repository.

### 4.2 — Area 5: idee da valutare, non implementate in questo giro

Area 5 (`SPUNTI_bibliografia_gestione_team_2026-08-27.md`) non produce
codice in Fase R/S: WSJF/Cost of Delay, Team Health Monitor e il
rituale Coaching Kata sono strumenti raccolti per valutazione futura,
non decisioni prese. L'unica azione di chiusura è **documentale**: in
coda alla voce di `PROGRAMMA_STATO.md` che chiude questa fase,
aggiungere un paragrafo breve — tre righe, una per idea, con un
riferimento a `SPUNTI_bibliografia_gestione_team_2026-08-27.md` per il
dettaglio — così chi rilegge lo stato del progetto in futuro trova
anche queste tracce, senza che vengano scambiate per lavoro fatto o
pianificato.

### 4.3 — Area 5: verifica di compatibilità (predisporre il campo, senza decidere)

Su richiesta di Marco: non si implementa nulla dell'Area 5 ora, ma si
verifica che l'architettura attuale non ponga ostacoli a introdurla in
futuro — e si sistema quel poco che serve per non lasciare trappole.
Verifica fatta leggendo il codice reale (`Utils.gs`, `Kanban.gs`,
`client.html`, `Constants.gs`), non per ipotesi.

**WSJF / Cost of Delay.** Per calcolare
`WSJF = Cost of Delay / Durata stimata` servono due ingredienti più il
punteggio da sostituire:

- *Durata/sforzo stimato* — **già disponibile**: ogni job ha
  `size_points`, assegnato da `size_class` (XS/S/M/L/XL) tramite
  `SIGMAFLOW.SIZE_POINTS` (`Constants.gs`: 3/5/8/13/20). Nessun campo
  nuovo necessario per il denominatore.
- *Punteggio di priorità* — **isolato in un solo punto lato server**:
  `calcPriorityScore(impact, manageability)` (`Utils.gs`, formula
  `sqrt(impatto × gestibilità)`), chiamata da un solo chiamante
  (`computePriority_` in `Kanban.gs`). Una formula WSJF potrebbe in
  futuro sostituire il corpo di questa funzione senza toccare chi la
  chiama — l'architettura è già pronta per questo.
- *Costo del ritardo (numeratore)* — **manca, ed è giusto che manchi**:
  non esiste in nessun campo, perché è una stima economica specifica
  per una pratica Sigma+ che oggi non è stata definita. Non è un
  limite tecnico da colmare adesso — è la decisione di business che
  l'Area 5 lascia esplicitamente aperta (`SPUNTI_bibliografia...md`
  §3). Predisporre un campo per un numero che nessuno sa ancora
  stimare creerebbe un dato fittizio, contro il principio di
  semplicità del programma (§1.5 di
  `PROGRAMMA_SVILUPPO_SigmaFlow_2026-08-27.md`).
- **Rischio di accoppiamento trovato, da sistemare ora**:
  `client.html` (`updateLivePriorityBadge`, riga 981) **duplica** la
  stessa formula (`Math.sqrt(impact * manageability)`) per mostrare
  un'anteprima dal vivo nel modale di creazione/modifica card, prima
  del salvataggio. Oggi le due formule sono identiche, quindi non è un
  errore — ma se in futuro `calcPriorityScore` cambierà (per WSJF o
  altro), questa riga andrà cambiata *insieme*, altrimenti l'anteprima
  mostrerà un numero sbagliato finché non si salva. È esattamente il
  tipo di trappola silenziosa che vale la pena disinnescare adesso,
  quando costa un commento, invece che scoprirla il giorno in cui si
  deciderà davvero di cambiare la formula.

  Azione (minima, nessun cambio di logica): aggiungere un commento
  incrociato nei due punti.

  ```js
  // Utils.gs, sopra calcPriorityScore
  // ATTENZIONE: la stessa formula e' duplicata in client.html,
  // updateLivePriorityBadge() (anteprima dal vivo nel modale, prima
  // del salvataggio) - se questa formula cambia (es. per introdurre
  // WSJF/Cost of Delay, vedi Area 5), aggiornare anche li'.
  function calcPriorityScore(impact, manageability) { ... }
  ```

  ```js
  // client.html, dentro updateLivePriorityBadge, sopra il calcolo di score
  // ATTENZIONE: duplica la formula di calcPriorityScore() in Utils.gs
  // (server) solo per l'anteprima dal vivo, prima del salvataggio -
  // se la formula server cambia, allineare anche qui.
  var score = impact && manageability ? Math.round(Math.sqrt(impact * manageability) * 100) / 100 : 0;
  ```

**Team Health Monitor.** Nessuna dipendenza tecnica: è una sessione
facilitata trimestrale, usa le schede già presenti nel manuale
"Lavorare meglio insieme". Non c'è nulla da preparare nel codice —
verificato, non ipotizzato: non tocca `jobs`/`visite`/dashboard in
nessun modo, per definizione.

**Coaching Kata.** Stesso discorso — è un rituale conversazionale
(le cinque domande). Se in futuro si vorrà tenerne traccia nel tempo,
il posto naturale è lo stesso registro già in uso per lo stato del
progetto (`PROGRAMMA_STATO.md`, append-only, una voce per sessione) —
è già lo strumento giusto, non serve costruirne uno nuovo.

In sintesi: l'unico punto dove "predisporre il campo" significa
davvero toccare codice è il commento incrociato sul punteggio di
priorità — un cambiamento a rischio zero (nessuna riga di logica
cambia, solo un avviso per il futuro). Tutto il resto dell'Area 5 è
già compatibile così com'è, o non ha proprio bisogno di preparazione
tecnica.

---

## 5. Tabella di esecuzione

| Punto | Cosa | Area | Stato |
|---|---|---|---|
| R1 | `initiativeGroups_` — conteggio finestrato | 1 | Da fare |
| R2 | Riga "Aggiunte" — popolazione unica | 1 | Da fare |
| R3 | Etichette p1/r Quadro avanzato | 1 | Da fare |
| R4 | Rework per causa | 2 | Da fare |
| R5 | Attesa: trend mensile + stato attuale | 2 | Da fare |
| S1 | Percentile 80° nel Profilo di rientro | 3 | Da fare |
| S2 | Grafico WIP vs tempo di ciclo | 3 | Da fare |
| S3 | Fasce percentile su "Fermi ora" | 3 | Da fare |
| Chiusura | `docs/dashboard-metrics.md` aggiornato | 6 | Da fare |
| Chiusura | Nota Area 5 su `PROGRAMMA_STATO.md` | 5 | Da fare |
| Chiusura | Commento incrociato `calcPriorityScore`/badge client (prep. WSJF, §4.3) | 5 | Da fare |

Fase T (Area 4) non è in questa tabella: resta bloccata dal backfill e
fuori dallo scope di questo documento (vedi intro).

---

## 6. Fuori scope

- Migrazione dati o cambi di schema — nessuno richiesto.
- Qualunque implementazione di WSJF/Cost of Delay, Team Health Monitor
  o rituale Coaching Kata — Area 5 qui è solo documentata e verificata
  per compatibilità futura, non sviluppata (vedi §4.2-4.3). L'unico
  cambio di codice per l'Area 5 è il commento incrociato di §4.3 —
  nessuna formula, nessun campo nuovo.
- Fase T / Area 4 (calibrazione soglie e finestra) — bloccata dal
  completamento del backfill storico, non trattata in questo
  documento nemmeno a livello di metodo (già coperto altrove, vedi
  intro).
- Aggiornamento di `DEV_stato_progetti.md` (Claude Project) — fuori
  dalla portata di una sessione Code sul repository.

---

## 7. Criteri di accettazione

- [ ] R1: su un caso con rientri fuori finestra e solo l'ultimo dentro
      (es. `JOB-20260707-ZNWU` o equivalente sui dati al momento del
      test), `reentries` calcolato conta solo i rientri con `apertura_ts`
      nella finestra.
- [ ] R2: sulla riga "Aggiunte (periodo)", dividendo il conteggio card
      mostrato per le settimane della finestra si ottiene lo stesso
      tasso (a arrotondamento) di quello mostrato accanto.
- [ ] R3: nessuna label del Quadro avanzato usa `p1`/`r`/`E[K]` senza
      la precisazione "(per visita)".
- [ ] R4: `reworkMetrics.by_cause` presente e coerente (somma
      client+authority+internal = total), visibile in dashboard.
- [ ] R5: "Dove si blocca il lavoro" mostra tabella (solo chiuse in
      finestra), lista "Fermi ora" (ordinata per giorni), trend
      mensile — nessun numero che mescoli le tre cose.
- [ ] S1: `delayProfileMetrics.p80_days` presente quando
      `sample_size >= MIN_SAMPLES`, visibile in dashboard.
- [ ] S2: `wipCycleTimeScatter` presente (anche vuoto), grafico
      renderizzato o messaggio "dato non stimabile" coerente.
- [ ] S3: lista "Fermi ora" colorata per fasce quando i campioni
      bastano, invariata altrimenti.
- [ ] Chiusura: `docs/dashboard-metrics.md` aggiornato con tutte le
      metriche nuove; nota Area 5 aggiunta a `PROGRAMMA_STATO.md`.
- [ ] Chiusura: commento incrociato aggiunto sia su `calcPriorityScore`
      (Utils.gs) sia su `updateLivePriorityBadge` (client.html) —
      nessuna riga di formula modificata, `calcPriorityScore(i, m)`
      restituisce esattamente lo stesso valore di prima su qualunque
      input.
- [ ] Nessuna regressione: tutti i test esistenti dell'harness Node
      passano, più i nuovi test per ciascun punto sopra.
