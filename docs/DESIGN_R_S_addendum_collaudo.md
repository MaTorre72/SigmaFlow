# Addendum di collaudo — Fase R/S

> **Cos'è questo documento.** Prosegue la stessa numerazione di
> `DESIGN_R_S.md` (il documento di progetto originale, scritto prima
> dello sviluppo — resta quello nel repo, non viene toccato: questo
> addendum si aggiunge come file a parte, non lo sostituisce). Non è
> una nuova fase: **R5** e **S2/S3** correggono voci già numerate in
> quel documento; **R6** è l'unica voce nuova, aggiunta in chiusura di
> collaudo. Nessuna "Fase S-bis" o "Area 7" — stessa fase R/S.
>
> Il prompt di esecuzione è `PROMPT_correzioni_collaudo_R_S.md` per
> R5/R6/S2-S3 (da eseguire subito). **S4** (in coda, prompt separato
> `PROMPT_S4_wip_attivo_log.md`) è lavoro vero, non un rimando: va
> fatto dopo che R5/R6/S2-S3 sono chiusi, non è sospeso a data da
> destinarsi.

---

## R5 (corretto in collaudo) — riepilogo mancante nella tabella delle attese

Tabella "Dove si blocca il lavoro" (quattro righe: cliente / enti /
interno / totale; cinque colonne: Totale giorni, Occorrenze, Media
giorni, Min, Max). **Non è un problema di dati mancanti** — le tre
righe per tipo sono già popolate correttamente. La quarta riga
("Totale") valorizza solo "Totale (giorni)" (somma dei tre totali) —
le altre quattro colonne restano vuote in quella riga.

```js
// Riga di riepilogo (quarta riga) - aggrega le tre righe per tipo,
// non solo la colonna "Totale (giorni)" gia' presente.
var allOccurrences = wait_client.occurrences + wait_authority.occurrences + wait_internal.occurrences;
var allTotalDays = wait_client.total_days + wait_authority.total_days + wait_internal.total_days;
var summaryRow = {
  total_days: allTotalDays,                                   // gia' presente
  occurrences: allOccurrences,                                 // manca
  average_days: allOccurrences ? round_(allTotalDays / allOccurrences) : null,  // manca
  min_days: Math.min(wait_client.min_days, wait_authority.min_days, wait_internal.min_days), // manca
  max_days: Math.max(wait_client.max_days, wait_authority.max_days, wait_internal.max_days)  // manca
};
```

Attenzione: la media della riga di riepilogo è `totale giorni / totale
occorrenze` su tutte le attese insieme — **non** la media aritmetica
delle tre medie di riga (peserebbe ogni tipo allo stesso modo
indipendentemente da quante occorrenze porta). Se un tipo non ha
occorrenze nella finestra, escluderlo da `Math.min`/`Math.max`
(altrimenti `0`/`undefined` falserebbero il risultato).

Conferma da chiedere a Marco, non correggere alla cieca: se sul
cruscotto reale le righe "Attesa enti"/"Decisione interna" appaiono
vuote in contesti diversi dalla finestra osservata, verificare prima
se è mancanza di dati.

**Criteri di accettazione**:
- [ ] La quarta riga mostra occorrenze totali, media pesata, minimo e
      massimo su tutte le attese — non solo il totale giorni.
- [ ] Test unitario con fixture a tre tipi noti, verifica che la media
      non sia la media delle tre medie.

---

## R6 (nuovo) — terminologia e carico da rilavorazione

Sette osservazioni di Marco sul cruscotto reale hanno mostrato un
problema più ampio: termini usati in modo disinvolto per lo stesso
oggetto (iniziativa/lavoro/pratica/job/card; visita; rientro/rework), e
la stessa idea di "carico da rilavorazione" calcolata tre volte in tre
pannelli diversi, con nomi simili ma popolazioni diverse (per
lavoro/per passaggio, sulla finestra/su tutto lo storico), mostrata in
un caso isolata senza il resto del quadro per darle contesto.
**Principio, esplicito: chiarire, non eliminare.** Ogni metrica
esistente porta un'informazione legittima — il problema era la
chiarezza delle etichette e l'isolamento del numero di carico, non il
numero di metriche.

### R6.1 — Glossario

Da usare ovunque nelle etichette rivolte all'utente (`client.html`,
`dashboard.html`) — non nei nomi di variabili/funzioni interne, che
restano invariati:

| Prima (uso disinvolto) | Dopo |
|---|---|
| iniziativa, job, card, pratica, caso | **lavoro** |
| visita | **passaggio** |
| rientro, rework | **rilavorazione** |

("Passaggio" invece di "visita": Sigma+ fa consulenza ambientale, dove
"visita" indica anche sopralluoghi fisici reali — usarlo per il
concetto astratto di coda crea confusione con quelli.)

### R6.2 — Capacità: verifica prima, poi etichette esplicite

"Capacità disponibile stimata" (`effectiveCapacity = teamSize /
stats.mean`, `buildSystemState_`) è un totale di squadra; "Tasso di
servizio (mu)" (`calculateMetrics_`) è per persona — nessuno dei due
mostra `team_size`. Con `team_size = 3` (confermato da Marco) e `mu =
0,14`, ci si aspetterebbe `0,14 × 3 = 0,42` — il cruscotto mostra
`0,49`. **Non torna.**

**Verifica da fare prima di tutto, sui dati reali** — non un fix a
scatola chiusa: confrontare `calculateMetrics_(...).mu × config.
team_size` con `buildSystemState_(...).systemState.flowMetrics.
estimated_capacity_per_day`. Se non coincidono, cercare dove
`completed`/`completedSamples` sono divergute tra le due funzioni — il
commento del 2026-08-20 in `Model.gs` (righe 42-53) documenta un fix
precedente esattamente su questo allineamento, probabilmente rotto di
nuovo da una modifica di Fase R. Riportare l'esito (coincide, o non
coincide e perché) — anche "nessuna azione necessaria" è un esito
valido, ma va registrato.

Etichette, indipendenti dall'esito:

```
"Capacita' disponibile stimata" -> "Capacita' disponibile stimata (team, {team_size} persone)"
"Tasso di servizio (mu)" -> "Tasso di servizio per persona (mu)"
```

### R6.3 — Il carico, nel suo contesto — non più isolato

Pannello "Rientri e rework" → rinominato **"Rilavorazione"**. La
sezione carico mostra sempre le due componenti fianco a fianco più il
totale — mai la rilavorazione da sola:

```js
renderDl('system-load-metrics', {
  'Carico da lavoro nuovo (a settimana)': perWeekValue(flow.new_work_per_day, ' passaggi/settimana'),
  'Carico da rilavorazione (a settimana)': perWeekValue(rework.additional_passages_from_rework, ' passaggi/settimana'),
  'Carico totale (a settimana)': perWeekValue(rework.total_passages_per_day, ' passaggi/settimana'),
  'Quota di capacita\' occupata dal carico totale': nullablePercent(capacity.effective_load, true)
});
```

`flow.new_work_per_day` è un nuovo alias di `newRate` (già calcolato,
solo non ancora esposto con questo nome) — nessun nuovo calcolo, solo
un campo in più nel `return` esistente di `buildSystemState_`. Gli
altri tre valori esistono già.

Resto delle etichette del pannello "Rilavorazione":

```
"Iniziative con almeno un rientro" -> "Lavori che hanno richiesto una rilavorazione"
"Rientri medi quando il lavoro rientra" -> "Rilavorazioni medie quando capitano"
"Visite medie per iniziativa" -> "Passaggi medi per lavoro"
"Visite totali alla settimana" -> "Passaggi totali alla settimana"
"Rientri per causa - cliente / enti / interno" -> "Rilavorazioni per causa - cliente / enti / interno"
"Quota da enti (non controllabile direttamente)" -> "Quota di rilavorazioni da enti (non controllabile direttamente)"
```

### R6.4 — Quadro avanzato: stessa idea, unità diversa, dichiarata

Nessuna formula cambia. Etichette con popolazione/unità esplicite +
nota di pannello che rimanda al pannello principale invece di
lasciarlo indovinare:

```
"Visite osservate nel periodo (con rientri)" -> "Passaggi osservati nel periodo (comprese le rilavorazioni)"
"Tasso di arrivo (lambda)" -> "Tasso di arrivo dei passaggi (lambda)"
"Tempo medio di servizio (E[S])" -> "Tempo medio per passaggio (E[S])"
"Quota di visite di rework (per visita, non per iniziativa)" -> "Quota di passaggi di rilavorazione - per passaggio, non per lavoro (p1)"
"Rientri medi per visita di rework (per visita, non per iniziativa)" -> "Rilavorazioni medie per passaggio di rilavorazione (r)"
"Numero atteso di visite per iniziativa (E[K], per visita)" -> "Passaggi attesi per lavoro - calcolo per passaggio, vedi 'Passaggi medi per lavoro' nel pannello principale per lo stesso concetto sulla finestra corrente (E[K])"
"Tasso di arrivo effettivo (lambda_effective)" -> "Tasso di arrivo effettivo dei passaggi, comprese le rilavorazioni (lambda effettivo)"
"Utilizzo effettivo (rho_effective)" -> "Utilizzo effettivo della capacita', comprese le rilavorazioni (rho effettivo)"
```

Nuova nota di pannello, sotto il titolo "Quadro avanzato": *"Le stesse
idee del pannello 'Rilavorazione', ricalcolate per singolo passaggio
invece che per lavoro — un dettaglio tecnico più fine, non un numero
alternativo."* L'etichetta di `E[K]` va riscritta da zero (la versione
finora in uso era contraddittoria: "per iniziativa" e "per visita"
nella stessa frase), non solo corretta nella terminologia.

### R6.5 — Profilo di rientro → "Profilo della rilavorazione"

```
"Rientri osservati (campione)" -> "Rilavorazioni osservate (campione)"
"Rientri medi per consegna (alpha)" -> "Quota di passaggi che sono rilavorazione, su tutto lo storico disponibile (alpha)"
```

Nuova nota di pannello: *"Calcolato su tutto lo storico disponibile,
non sulla finestra di osservazione — alimenta anche l'istogramma
sotto. Stessa idea di 'Lavori che hanno richiesto una rilavorazione'
nel pannello principale, con popolazione e unità diverse (per
passaggio, storico intero anziché finestra)."*

### R6.6 — "Completate" e "Fermi ora"

`completedRate` conta lavori; la capacità è in passaggi — grandezze
non confrontabili oggi. Aggiungere accanto al valore esistente:

```js
'Lavori completati (periodo)': ..., // valore gia' esistente
'Passaggi completati (periodo)': ... // nuovo: passaggi (non lavori) chiusi nella finestra
```

"Fermi ora": limitare a 5 righe (già ordinate per giorni decrescenti),
colonna "Job" → "Lavoro".

**Criteri di accettazione (R6)**:
- [ ] Nessuna etichetta rivolta all'utente contiene più "iniziativa",
      "job", "card", "pratica", "visita", "rientro" (ricerca testo su
      `client.html`/`dashboard.html`, zero risultati nelle stringhe
      rivolte all'utente).
- [ ] Il pannello "Rilavorazione" mostra sempre carico da lavoro nuovo
      e da rilavorazione fianco a fianco, mai isolato.
- [ ] "Capacità disponibile stimata"/"Capacità effettiva" mostrano il
      numero di persone usato.
- [ ] Verifica di R6.2 eseguita sui dati reali, esito registrato in
      `PROGRAMMA_STATO.md` (anche se "nessuna azione necessaria").
- [ ] "Completate (periodo)" mostra sia lavori sia passaggi.
- [ ] "Fermi ora" mostra al massimo 5 righe.

---

## S2/S3 (corretto in collaudo) — strumento WIP/tempo di ciclo

La prima versione implementata (uno scatter per-visita, WIP contato
come numero grezzo di visite concorrenti, oppure — in una revisione
successiva ma sempre prima del collaudo — un grafico con i punti
mensili collegati in ordine cronologico) **non è quella corretta**. Il
WIP va espresso in punti (non contando le visite/passaggi), per essere
confrontabile tra casi di taglia diversa; e i punti storici non vanno
mai collegati in ordine cronologico — il WIP reale oscilla senza un
ordine prevedibile, quindi una linea "mese dopo mese" produce uno
zig-zag senza significato, non una curva.

**Perché** (verificato con la letteratura di settore, non solo
un'intuizione): Little's Law (`tempo di ciclo = WIP / throughput`) è
un'identità sulle medie, sempre vera — ma il throughput non è un
parametro libero, è vincolato dall'alto dalla capacità reale del
sistema. Se il WIP cresce oltre quanto il sistema riesce ad assorbire,
il throughput osservato smette di crescere (satura) e tutto l'eccesso
si scarica sul tempo di ciclo — il "ginocchio". Confermato da tre
fonti indipendenti: Vacanti (*Actionable Agile Metrics*, "Conservation
of Flow"), Niño-Mora (1998, rendimenti decrescenti throughput/WIP),
Hopp & Spearman (*Factory Physics*, WIP critico `w0 = rb×T0`). Il
Diagramma di Flusso Cumulato (lo strumento standard citato nella
letteratura Kanban per la stessa lettura) è stato scartato
deliberatamente: richiede interpretazione geometrica invece di
restituire un valore diretto.

**Aggregazione a grana settimanale** (`flowWeeklyBuckets_`, stesso
principio di attribuzione/accumulo di `monthBuckets_`, applicato
settimana per settimana):

```js
// S2/S3: per ogni settimana delle ultime `weeksCount`, calcola tre
// numeri - WIP medio (punti aperti, running: entrati meno completati,
// cumulato - include il backlog, stessa semplificazione gia' in uso
// per open_points, non solo il lavoro in colonne attive: differenza
// nota, non uno strumento di audit), throughput osservato (punti
// completati quella settimana) e tempo di ciclo medio osservato
// (media di visitServiceTimeDays_ sulle visite chiuse quella
// settimana).
function flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, weeksCount) {
  var first = new Date(now.getTime() - weeksCount * 7 * 86400000);
  var buckets = [];
  var byKey = {};
  for (var i = 0; i < weeksCount; i++) {
    var date = new Date(first.getTime() + i * 7 * 86400000);
    var key = Utilities.formatDate(date, SIGMAFLOW.TZ, "yyyy-'W'ww");
    var bucket = { key: key, entered_points: 0, completed_points: 0, ct_samples: [] };
    buckets.push(bucket);
    byKey[key] = bucket;
  }
  jobs.concat(archivedJobs || []).forEach(function(job) {
    if (job.arrival_ts) {
      var ek = Utilities.formatDate(new Date(job.arrival_ts), SIGMAFLOW.TZ, "yyyy-'W'ww");
      if (byKey[ek]) { byKey[ek].entered_points += jobPoints_(job); }
    }
    if (job.incarico_chiuso_ts) {
      var dk = Utilities.formatDate(new Date(job.incarico_chiuso_ts), SIGMAFLOW.TZ, "yyyy-'W'ww");
      if (byKey[dk]) { byKey[dk].completed_points += jobPoints_(job); }
    }
  });
  visite.concat(visiteArchivio || []).forEach(function(visit) {
    var closeTs = visit.consegna_ts || visit.rientro_ts;
    if (!closeTs) { return; }
    var key = Utilities.formatDate(new Date(closeTs), SIGMAFLOW.TZ, "yyyy-'W'ww");
    if (!byKey[key]) { return; }
    var ct = visitServiceTimeDays_(visit);
    if (ct > 0) { byKey[key].ct_samples.push(ct); }
  });

  var running = 0;
  return buckets.map(function(b) {
    running += b.entered_points - b.completed_points;
    var ctAvg = b.ct_samples.length ? round_(b.ct_samples.reduce(function(s, v) { return s + v; }, 0) / b.ct_samples.length) : null;
    return {
      key: b.key,
      wip_medio: round_(Math.max(0, running)),
      throughput_punti_settimana: round_(b.completed_points),
      ct_medio_giorni: ctAvg,
      n_campioni_ct: b.ct_samples.length
    };
  });
}
```

**Raggruppamento per fascia di WIP** (`wipBands_`) — la tendenza va
letta qui, non sulle settimane singole:

```js
// S2/S3: raggruppa le settimane per fascia di WIP (bandWidth punti a
// fascia) e calcola le medie di fascia - la tendenza reale, in ordine
// di WIP crescente. Scarta le fasce con meno di minSamples settimane.
function wipBands_(weeklyBuckets, bandWidth, minSamples) {
  var byBand = {};
  weeklyBuckets.filter(function(b) { return b.ct_medio_giorni !== null; }).forEach(function(b) {
    var start = Math.floor(b.wip_medio / bandWidth) * bandWidth;
    if (!byBand[start]) { byBand[start] = []; }
    byBand[start].push(b);
  });
  return Object.keys(byBand).map(function(k) { return byBand[k]; })
    .filter(function(weeks) { return weeks.length >= minSamples; })
    .map(function(weeks) {
      var n = weeks.length;
      var sum = function(f) { return weeks.reduce(function(s, w) { return s + f(w); }, 0); };
      return {
        wip_medio: round_(sum(function(w) { return w.wip_medio; }) / n),
        throughput_medio: round_(sum(function(w) { return w.throughput_punti_settimana; }) / n),
        ct_medio: round_(sum(function(w) { return w.ct_medio_giorni; }) / n),
        n_settimane: n
      };
    })
    .sort(function(a, b) { return a.wip_medio - b.wip_medio; });
}
```

Chiamate da `buildSystemState_` (`weeksCount` = 26, `bandWidth` = 20
punti, `minSamples` = 3 — indicativi, rivedibili), esposte come
`flowWeeklyBuckets`/`wipBands`.

**Client**: due grafici a dispersione (non due linee), dentro un
`<details>` collassato come il Quadro avanzato — "Throughput vs WIP",
"Tempo di ciclo vs WIP", stesso asse X. Ogni settimana di
`flowWeeklyBuckets` è un punto chiaro senza linea; ogni fascia di
`wipBands` è un punto scuro più grande, collegato da una linea **in
ordine di WIP crescente, mai in ordine temporale**. Meno di 3 fasce
valide → "Dato non ancora sufficiente" al posto del grafico.
Riferimento visivo: `esempio_wip_ginocchio.html` condiviso con Marco
in collaudo (solo per la resa grafica, non per i numeri).

Se nella versione attuale esistono `wipCycleTimeScatter_`/
`visitActiveInterval_` (per-visita, WIP grezzo) — vanno **rimosse**,
non lasciate morte accanto alle nuove.

**Criteri di accettazione**:
- [ ] `flowWeeklyBuckets`/`wipBands` presenti (anche vuoti).
- [ ] Nel grafico, nessuna linea collega le settimane grezze in ordine
      cronologico — solo le medie di fascia, in ordine di WIP crescente.
- [ ] Con meno di 3 fasce valide, il grafico mostra "dato non ancora
      sufficiente".

---

## S4 (nuovo, in coda dopo R5/R6/S2-S3) — WIP attivo ricostruito dal log

`flowWeeklyBuckets_` (S2/S3) stima il WIP come "entrato meno
completato, cumulato" — include il tempo passato in backlog, non solo
il lavoro davvero in lavorazione (vedi la spiegazione data a Marco
2026-08-27: un lavoro fermo in coda, non ancora preso in carico, pesa
come uno in lavorazione attiva). **Non resta una nota a margine: è
lavoro da fare**, sostituendo la stima con il WIP vero ricostruito
dallo storico dei passaggi di colonna.

**Come funziona**:

1. **Classificazione delle colonne** (una tantum, in `Constants.gs` o
   dove sono già classificate le colonne di attesa cliente/enti/
   interno): ogni colonna del board etichettata come `backlog` (non
   ancora iniziato), `active` (lavorazione in corso — comprese le
   colonne di attesa: il lavoro è aperto anche se fermo lì), `done`
   (completato/archiviato).

2. **Ricostruzione per job**: da `activity_log_json`, per ogni job,
   la sequenza degli intervalli `{colonna, dal_ts, al_ts}` che coprono
   tutta la sua vita (da `arrival_ts` a `incarico_chiuso_ts`, o a oggi
   se ancora aperto) — stessa logica di base di `computeVisiteFromLog_`
   (già esistente), estesa per produrre la timeline completa per
   colonna, non solo le finestre di attesa.

3. **Nuova funzione** `activeWipWeeklyFromLog_(jobs, archivedJobs, weeksCount)`:
   per ogni settimana e per ogni job, quanti giorni di quella
   settimana il job era in una colonna `active` (non `backlog`, non
   `done`), pesati per `size_points`; somma su tutti i job, divisa per
   7 — la media settimanale di punti realmente in lavorazione,
   backlog escluso.

4. `flowWeeklyBuckets_`: il campo `wip_medio` usa questo valore al
   posto del calcolo cumulato attuale. Throughput e tempo di ciclo
   restano come sono — già corretti, non c'entrano con questo
   problema.

**Verifica**: per la settimana più recente, il valore ricostruito deve
coincidere (a meno di arrotondamento) con quanto mostra oggi il
pannello per-colonna live (somma punti nelle colonne non-backlog,
non-completate) — stessa fotografia, quindi stesso numero: è il test
di coerenza naturale.

**Da verificare con Code prima di dare per scontata la copertura**: se
`activity_log_json` registra ogni cambio di colonna con timestamp
preciso su tutte le 26 settimane di storico, la ricostruzione è
diretta. Se per i job più vecchi il log è incompleto, va gestito un
fallback esplicito e dichiarato (quei job restano fuori dal calcolo
della settimana interessata, non stimati alla cieca) — non una
scorciatoia silenziosa.

**Criteri di accettazione**:
- [ ] `wip_medio` in `flowWeeklyBuckets_` calcolato da
      `activeWipWeeklyFromLog_`, non più dal cumulato entrato-meno-
      completato.
- [ ] Per la settimana corrente, `wip_medio` ricostruito coincide (a
      meno di arrotondamento) con il totale punti del pannello
      per-colonna live, colonne non-backlog e non-completate.
- [ ] Copertura del log verificata sulle 26 settimane; eventuali job
      con log insufficiente esclusi esplicitamente, non stimati.
- [ ] Test unitario su `activeWipWeeklyFromLog_` con una timeline nota
      (un job che entra in backlog, passa ad attivo, torna in attesa,
      si chiude) — verifica i giorni attribuiti a ciascuna settimana.

---

## Fuori scope (vale per R5, R6, S2/S3 — non per S4, che li sostituisce)

- Nessun altro punto di Fase R/S (R1-R4, S1) — già implementati.
- Nessun campo nuovo su `jobs`/`visite` (S4 legge solo
  `activity_log_json`, già esistente — nessuna eccezione a questo
  vincolo).
- Nessuna metrica viene rimossa dalla vista — principio esplicito (R6).
- Nessuna formula cambia, eccetto l'eventuale correzione di capacità
  (R6.2), e solo dopo aver capito la causa reale.
- Nessun rename di variabili/funzioni interne al codice.
- S4 non tocca R5/R6/S2-S3, già in esecuzione — va fatto dopo, non in
  parallelo, per non disturbare quel giro.
