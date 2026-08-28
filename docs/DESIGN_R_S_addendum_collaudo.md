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
>
> **Aggiornamento 2026-08-28 — secondo giro.** R1-R6 e S1-S4 sono
> chiusi: verificati, pushati su TEST, nessuna PR aperta né merge su
> `main` (confermato da Code). Il collaudo di R5/R6/S2-S4 su dati reali
> ha trovato altro lavoro — non nuovi problemi isolati, ma la stessa
> fase che continua. Stessa regola di numerazione: **R7/R8/S5/R9 sono
> voci nuove**, le correzioni a **R5/R6.6/S2-S3** restano sotto quei
> numeri. **R9** raccoglie per intero l'audit UX (`AUDIT_UX_
> dashboard.md`) — Marco (2026-08-28): non va rimandato, chiude tutto
> quello che si può chiudere in questo giro, organizzato in passi
> sequenziali (R9.1-R9.13) ma commissionato tutto insieme, non a
> pezzi in giri diversi. Il prompt per questo giro è
> `PROMPT_correzioni_dashboard_seconda_ondata.md`.

---

## R7 (nuovo) — schema degli stadi di lavoro (nomenclatura unificata)

**Perché.** Marco (2026-08-28): la dashboard serve tre pubblici diversi
(commerciali in fase di preventivo, amministrazione per la
fatturazione, team tecnico per il polso della situazione e i colli di
bottiglia) — le definizioni di "aperto"/"presente"/"attivo" vanno
tarate su questo scopo, non sulla teoria delle code presa alla lettera
("WIP" in senso stretto, solo "mani sopra", non aiuta da solo la
governance: il segnale utile sta nella distinzione lavorazione/attesa,
non in un numero unico che le fonde).

**La scala degli stadi** — unica fonte di verità, mappata 1:1 sul
`role` di `columns_json` (già esistente, nessun campo nuovo):

| # | Stadio | `role` | Significato |
|---|---|---|---|
| 0 | Preventivo | `neutral` | non ancora un incarico acquisito |
| 1 | Backlog | `backlog` | incarico acquisito, non iniziato |
| 2 | Preparazione | `prep` | in preparazione |
| 3 | Lavorazione | `wip` | "mani sopra" — WIP in senso stretto |
| 4 | Attesa | `stand_by` | aperto ma fermo (cliente/enti/interno) |
| 5 | Da fatturare | `done`, `invoiced=false` | tecnicamente concluso, non ancora chiuso |
| 6 | Chiuso | `done`, `invoiced=true` | fuori da ogni conteggio corrente |

**I raggruppamenti canonici** (un nome, uno scopo, mai sovrapposti):

- **Pipeline commerciale** = stadio 0 soltanto. Solo per i commerciali
  — non entra mai in nessun totale di lavoro tecnico.
- **Lavoro impegnato** = stadi 1-4. Carico complessivo per la
  governance generale (quanto lavoro pesa sull'organizzazione ora).
- **Lavoro in corso** = stadi 2-4 (Preparazione+Lavorazione+Attesa) —
  **sempre scomposto** nelle tre componenti, mai un unico numero: è
  qui che si legge il collo di bottiglia (quanto è davvero in
  lavorazione contro quanto è fermo in attesa, per causa).
- **Da fatturare** = stadio 5 soltanto. Solo per l'amministrazione.
- **Chiuso** = stadio 6. Mai in nessun report corrente, solo storico.

Il **WIP in senso stretto** (teoria delle code, Cap. 12 dispensa FSC)
resta lo stadio 3 da solo, riservato al confronto teorico
throughput/tempo-di-ciclo-vs-WIP nel pannello avanzato — non va usato
come sinonimo di "Lavoro in corso" nel resto della dashboard.

Le metriche di teoria delle code (lambda/mu/rho/capacità) **non sono
uno stadio**: sono un tasso su un periodo (la finestra di
osservazione), non una fotografia dello stato attuale — etichettarle
sempre come "flusso" per non confondersi con gli stadi sopra ("stato").

**Cosa cambia rispetto a oggi:**

- "Aperti (ora)" (`points.open_cards`, oggi: tutto tranne `done`,
  quindi mescola Pipeline commerciale con Lavoro impegnato) —
  **eliminato come numero unico**, sostituito da "Pipeline
  commerciale" (stadio 0, mostrato solo dove serve ai commerciali) e
  "Lavoro impegnato" (stadi 1-4).
- "Lavoro presente e capacità" (`currentWorkload_`, oggi: stadi 1-5,
  mescola Lavoro impegnato con Da fatturare) — spaccato in "Lavoro
  impegnato" (per il team tecnico) e "Da fatturare" (per
  l'amministrazione), mai sommati nella stessa card.
- WIP settimanale di S4 (oggi chiamato "active" = stadi 2-4) —
  rinominato "Lavoro in corso", sempre scomposto nel grafico
  (lavorazione/attesa) — stessa struttura di dati, solo il nome e
  l'obbligo di non aggregarlo mai senza la scomposizione.
- "Dove si blocca il lavoro"/"Fermi ora" — restano sullo stadio 4, uno
  storico (periodo) e uno snapshot (adesso) — vedi R5 sotto per la
  correzione sulla finestra.

**Criteri di accettazione:**
- [ ] `columnsFromConfig_`/frontend espongono una funzione unica di
      classificazione stadio (0-6), riusata ovunque serve una di
      queste popolazioni — non ricalcolata in punti diversi con
      filtri leggermente diversi.
- [ ] "Aperti (ora)" non esiste più come singolo numero che include
      sia stadio 0 sia stadi 1-4.
- [ ] "Lavoro presente e capacità" è spaccato in "Lavoro impegnato" e
      "Da fatturare", mai sommati.
- [ ] Ogni volta che "Lavoro in corso" (stadi 2-4) compare, è sempre
      accompagnato dalla scomposizione lavorazione/attesa nello stesso
      pannello — mai un numero isolato.
- [ ] Nessuna etichetta usa "WIP" per indicare stadi 2-4 insieme — solo
      per lo stadio 3 da solo, nel pannello avanzato.

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

### R5, correzione aggiuntiva (2026-08-28) — da finestra a storico dei lavori in corso

I campioni della tabella "Dove si blocca il lavoro" (le quattro righe
sopra) vengono oggi da `observed` — le stesse visite aperte negli
ultimi 90 giorni usate per lambda/mu/rho (`Model.gs`, commento alle
righe 212-213: *"gia' concluse dentro la finestra ('observed')"*).
Marco (2026-08-28): non va bene, per lo scopo di questa tabella (colli
di bottiglia) serve tutto lo storico disponibile dei lavori "in corso"
(R7, stadi 2-4), non una finestra di 90 giorni — un'attesa lunga
conclusa 4 mesi fa è un segnale di governo reale, non va persa perché
fuori dalla finestra "flusso".

```js
// R5, correzione aggiuntiva: i campioni per waitStats_ vengono da
// TUTTE le visite (allVisite), non da 'observed' (finestra 90gg) - lo
// scopo qui e' il collo di bottiglia storico, non un tasso nella
// finestra di osservazione (quello resta lambda/mu/rho, invariati).
var waitSamplesByField = { t_cliente_d: [], t_ente_d: [], t_interno_d: [] };
allVisite.forEach(function(visit) {  // era: observed.forEach(...)
  Object.keys(waitSamplesByField).forEach(function(field) {
    var value = Number(visit[field] || 0);
    if (value > 0) { waitSamplesByField[field].push(value); }
  });
});
```

Nota di pannello da aggiornare di conseguenza (`dashboard.html`,
"Dove si blocca il lavoro"): *"Totali e medie su tutte le attese già
concluse nello storico disponibile, per tipo di blocco"* — togliere il
riferimento a "periodo osservato", non è più vero dopo questa
correzione.

**Criteri di accettazione (aggiuntivi)**:
- [ ] I campioni di `waitStats_` per questa tabella vengono da tutto
      lo storico (`allVisite`), non dalla finestra di osservazione.
- [ ] La nota di pannello non menziona più una finestra temporale per
      questa tabella specifica.
- [ ] lambda/mu/rho/capacità (che restano su `observed`, finestra
      90gg) non vengono toccati da questa correzione — sono un
      concetto diverso (flusso, non storico dei blocchi).

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

### R6.6, completamento (2026-08-28) — "Lavori completati" legge la pipeline sbagliata

Verificato che questa parte di R6.6 è già implementata (`client.html`
righe 2109/2133/2134) e che il campo `completed_passages` esiste già
in `buildSystemState_`. **Ma non basta**: "Lavori completati (periodo)"
è agganciato a `points.completed_cards` (`pointsStatistics_`, job-level
via `job.done_ts`), mentre "Passaggi completati (periodo)" è agganciato
a `flow.completed_passages` (`calculateMetrics_`, visita-level via
`consegna_ts`, con `visitServiceTimeDays_ > 0` richiesto) — due
pipeline diverse, non garantite coincidere.

**Verificato sui dati reali** (90 giorni, oggi): `points.completed_cards`
= **12** (`job.done_ts` = `consegna_ts` della visita con `numero_visita`
più alto per quel job — nessun filtro sulla durata del servizio);
`flow.completed_passages` = **5** (stesso conteggio ma richiede
`visitServiceTimeDays_ > 0`). Dei 12 job contati da `points
.completed_cards`, **7 hanno `start_ts` vuoto** — quindi tempo di
servizio calcolato a 0 non perché il lavoro sia durato zero giorni, ma
perché quella visita non ha mai registrato `start_ts` (dato storico
incompleto, non un lavoro "istantaneo"). Nell'audit del 2026-08-28
questi due numeri apparivano entrambi uguali a 12 — verosimilmente
perché lo screenshot precedeva questa parte di R6.6 sul TEST live: da
riverificare sul cruscotto live dopo il fix sotto, i due numeri **non
devono più coincidere per costruzione**, salvo coincidenza reale sui
dati del momento.

**Correzione**: "Lavori completati (periodo)" deve leggere
`flow.completed_initiatives` (già calcolato in `buildSystemState_`,
stessa popolazione — job distinti — sullo stesso insieme di visite
filtrato con `visitServiceTimeDays_ > 0` di `flow.completed_passages`),
non `points.completed_cards`.

```js
// client.html, righe 2109 e 2133 (entrambe le occorrenze):
// era: valueOrDash(points.completed_cards)
// ora:
valueOrDash(flow.completed_initiatives)
```

`points.completed_cards`/`pointsStatistics_` restano usati per i punti
("Punti completati") — solo il conteggio "lavori" cambia sorgente.

**Criteri di accettazione (aggiuntivi)**:
- [ ] "Lavori completati (periodo)" (entrambe le occorrenze, tabella
      "Flusso e carico" e blocco "Capacità e bilancio") legge
      `flow.completed_initiatives`, non `points.completed_cards`.
- [ ] Sui dati reali di oggi, dopo la correzione, "Lavori completati"
      e "Passaggi completati" mostrano rispettivamente 5 e 5 (stesso
      insieme filtrato, coincidenza attesa su questo dataset — non un
      segno che il fix non serva: la garanzia è strutturale, non sul
      valore specifico di oggi).
- [ ] Nota di data quality (facoltativa, non bloccante): segnalare da
      qualche parte (log, `PROGRAMMA_STATO.md`) i job con `start_ts`
      vuoto su visite già consegnate — dato storico incompleto, non un
      bug di calcolo.

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

### S2/S3, correzione aggiuntiva (2026-08-28) — throughput sulla pipeline sbagliata

Il testo originale di questa sezione diceva "throughput e tempo di
ciclo restano come sono — già corretti". **Non era vero**, non era
stato verificato sui dati reali all'epoca. `flowWeeklyBuckets_` calcola
`throughput_punti_settimana` da `job.incarico_chiuso_ts` — il campo
scritto **solo** quando si spunta "Chiuso" in amministrazione
(`invoiced`), non quando il lavoro viene tecnicamente consegnato.
**Verificato sui 54 job reali: uno solo ha mai avuto
`incarico_chiuso_ts` valorizzato, in tutta la storia.** Il throughput
è quindi vicino a zero quasi sempre, non perché manchino consegne, ma
perché è agganciato all'evento amministrativo sbagliato.

```js
// flowWeeklyBuckets_, era:
if (job.incarico_chiuso_ts) {
  var dk = Utilities.formatDate(new Date(job.incarico_chiuso_ts), SIGMAFLOW.TZ, "yyyy-'W'ww");
  if (byKey[dk]) { byKey[dk].completed_points += jobPoints_(job); }
}
// ora: throughput dal completamento TECNICO (consegna_ts, come flow.completed_passages/
// flow.completed_initiatives, R6.6), non dalla chiusura amministrativa.
// Bucketing per settimana sulle VISITE chiuse (consegna_ts), non sui job:
visite.concat(visiteArchivio || []).forEach(function(visit) {
  if (!visit.consegna_ts) { return; }
  var job = jobsById[visit.job_id];
  if (!job) { return; }
  var dk = Utilities.formatDate(new Date(visit.consegna_ts), SIGMAFLOW.TZ, "yyyy-'W'ww");
  if (byKey[dk]) { byKey[dk].completed_points += jobPoints_(job); }
});
```

(`jobsById` va passato/costruito in `flowWeeklyBuckets_` se non già
disponibile — stesso pattern già usato altrove nel file.)

**Verifica di coerenza obbligatoria dopo il fix**: ricostruito con
`activity_log_json` reale di tutti i 54 job (nessuno escluso, log
completo ovunque) e i campioni di tempo di ciclo dalle visite reali,
**18 settimane su 26 hanno un campione valido di tempo di ciclo, e la
banda di WIP (`bandWidth=20`, `minSamples=3`) ne produce 4 valide** —
sopra la soglia minima di 3 richiesta dal frontend per disegnare
"Throughput vs WIP"/"Tempo di ciclo vs WIP". Quindi, secondo questa
verifica indipendente, **i dati per mostrare qualcosa ci sono già,
anche prima del fix del throughput** — se dopo aver applicato il fix i
due grafici scatter restano vuoti sul TEST live, il problema non è più
scarsità di dati: va tracciato direttamente sull'esecuzione reale
(loggare `wipBands.length` e il contenuto di `flowWeeklyBuckets` in
quel momento), perché a quel punto è una discrepanza tra
l'implementazione reale e questa verifica, non un limite dei dati.

**Criteri di accettazione (aggiuntivi)**:
- [ ] `throughput_punti_settimana` calcolato da `consegna_ts` (visite),
      non da `incarico_chiuso_ts` (job).
- [ ] Sui dati reali di oggi, dopo il fix, almeno alcune settimane
      mostrano throughput > 0 (oggi: quasi sempre 0).
- [ ] Se "Throughput vs WIP"/"Tempo di ciclo vs WIP" restano vuoti dopo
      il fix, `wipBands.length` viene loggato/riportato esplicitamente
      per capire perché — non richiuso senza questa verifica.

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

1. **Classificazione delle colonne — già esiste, non va creata.**
   Verificato sui dati reali (2026-08-28): `config.columns_json`
   contiene già, per ogni colonna, un campo `role` — `backlog`
   (INCARICHI), `prep` (TO DO), `wip` (WIP), `stand_by` (le tre
   colonne di attesa: REV INTERNA, ATTESA CLIENTE, ATTESA ENTI),
   `done` (DA INVIARE/DA FATTURARE), `neutral` (PREVENTIVI/notes — non
   ancora un incarico accettato). Per S4: `backlog` = non ancora
   iniziato; `prep`/`wip`/`stand_by` = `active` (il lavoro è aperto
   anche se fermo in attesa); `done` = completato; `neutral` = fuori
   dal calcolo del WIP (non è ancora lavoro accettato — coerente con
   come va trattato altrove, vedi audit UX §3a). Nessuna nuova
   classificazione da scrivere in `Constants.gs`: leggere `role` da
   `columns_json`.

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

## S5 (nuovo) — finestra del grafico WIP/tempo di ciclo in config

`weeksCount = 26` è oggi un valore fisso, passato come letterale in tre
punti (`activeWipWeeklyFromLog_`, `flowWeeklyBuckets_`, la chiamata in
`buildSystemState_`). Marco (2026-08-28): spostarlo in config, stesso
principio già in uso per `observation_window_days`.

```js
// Constants.gs, DEFAULT_CONFIG:
wip_trend_weeks: 26,
// Model.gs, buildSystemState_: leggere da config invece del letterale
var wipTrendWeeks = Number(config.wip_trend_weeks || 26);
var activeWipWeekly = activeWipWeeklyFromLog_(jobs, archivedJobs, columnMap, now, wipTrendWeeks);
var flowWeeklyBuckets = flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, wipTrendWeeks, activeWipWeekly.weekly);
```

**Criteri di accettazione**:
- [ ] Nuova chiave `wip_trend_weeks` in config, default 26 (nessun
      cambio di comportamento finché non viene modificata a mano).
- [ ] I tre punti che oggi usano il letterale `26` leggono da config.

---

## R8 (nuovo) — pulizia editoriale: didascalie e percorso della card

Due correzioni indipendenti, entrambe d'accordo con Marco (2026-08-28):

**R8.1 — via i riferimenti ai capitoli della dispensa dalle
didascalie.** Oggi diverse etichette/note di pannello citano "Cap.
3-9", "Cap. 11-15", "Cap. 12" ecc. (`dashboard.html`). Vanno tolti dal
testo rivolto all'utente — restano solo nei commenti del codice, dove
servono a chi sviluppa. Linguaggio delle didascalie: chiaro, semplice,
comprensibile senza conoscere la dispensa.

```
Esempio: "Margine di stabilita' <span class='panel-chapter'>Cap. 15</span>"
       -> "Margine di stabilita'"  (span/classe panel-chapter rimossi)
```

Cercare tutte le occorrenze di `panel-chapter`/"Cap." in
`dashboard.html` e riscrivere il testo circostante dove il riferimento
al capitolo era l'unica spiegazione (va sostituito con una frase in
linguaggio semplice, non solo cancellato).

**R8.2 — "Percorso della card" in giorni, non giorni e ore.** Nel
modale della card, tab Informazioni (`client.html`, funzione che
costruisce `modal-path-summary-bar`/`modal-path-summary-legend`): oggi
mostra "52g 9h", "236g 23h" ecc. — serve solo per un colpo d'occhio,
non per precisione al minuto. Troncare a soli giorni, al massimo una
cifra decimale.

```
Esempio: "WIP: 52g 9h" -> "WIP: 52,4g" (o "WIP: 52g", una sola cifra decimale al massimo)
```

**Criteri di accettazione**:
- [ ] Nessuna didascalia/nota rivolta all'utente cita un numero di
      capitolo della dispensa.
- [ ] "Percorso della card" mostra le durate solo in giorni (intero o
      1 decimale), non più in giorni e ore.

---

## R9 (nuovo) — revisione trasversale di leggibilità e formattazione

Da `AUDIT_UX_dashboard.md` (analisi di 7 screenshot, 2026-08-28).
Marco (2026-08-28): non va rimandata al giro successivo — entra in
questo giro, organizzata in passi sequenziali (R9.1...R9.13 sotto),
ma tutta commissionata ora. Tocca quasi ogni pannello — per questo è
spezzata in passi indipendenti, eseguibili in ordine ma senza
bloccarsi a vicenda (eccetto R9.6, che va per ultimo perché usa le
etichette/popolazioni già sistemate da R7/R9.1-R9.5).

### R9.1 — Formattazione numerica coerente

`client.html`, funzione `renderCurrentlyBlocked_` (riga 2361): unico
punto della pagina che scrive un numero concatenandolo direttamente
(`item.elapsed_days + ' g'`) invece di passare da `metricValue`
(che converte il punto in virgola, riga 2801-2806) — per questo
"Fermi ora" mostra "119.81 g" invece di "119,81 g". Correggere:

```js
// era: item.elapsed_days + ' g'
metricValue(item.elapsed_days, ' g')
```

Regola generale, da verificare su tutto `client.html`: **nessun
numero va scritto in pagina per concatenazione diretta** — sempre
attraverso `metricValue`/`perWeekValue`/`nullablePercent`/
`estimableValue`, mai `value + ' unità'` a mano.

Precisione decimale: verificare tutte le chiamate a `round_()` in
`Model.gs` e uniformare l'arrotondamento per famiglia di grandezza —
percentuali intere (0 cifre decimali), tassi/rapporti a 2 cifre fisse
(mai 1 in un punto e 2 in un altro per lo stesso tipo di numero, es.
"Rilavorazioni medie per passaggio (r): 1" contro "Rilavorazioni medie
quando capitano: 1,25").

### R9.2 — Unità di misura non ripetuta per tabella

Tabella "Flusso e carico" (`flow-added-rate`/`flow-completed-rate`
ecc.): l'unità è già nell'intestazione di colonna ("Lavori/settimana")
— `perWeekValue` non deve ripeterla nel valore di cella per queste
colonne specifiche (passare suffisso vuoto lì dove l'header la
dichiara già).

### R9.3 — Assi dei grafici sempre con tacche numeriche

`drawWipScatter_` (righe ~2432 in poi, grafici "Throughput vs WIP" e
"Tempo di ciclo vs WIP"): oggi disegna solo una scritta di direzione
("WIP medio (pt) ->") senza nessuna tacca numerica su nessuno dei due
assi — unico caso della pagina senza scala. `drawPointsTimeline`
(riga 2660) e `drawWaitTimeTrend_` (riga 2405) già disegnano le tacche
Y correttamente (`ctx.fillText(String(Math.round(max * (1 - g/4))),
...)`) — riusare lo stesso pattern in `drawWipScatter_` per entrambi
gli assi (X: WIP in punti: Y: throughput o tempo di ciclo). Tolta la
tacca numerica vera, togliere anche la freccia testuale "->" —
diventa ridondante.

### R9.4 — Etichette asse X mai troncate

`drawPointsTimeline` (riga 2672) e `drawWaitTimeTrend_` (riga 2416):
l'etichetta dell'ultimo mese esce troncata ("08/202" invece di
"08/2026") perché il testo è disegnato a ridosso del bordo destro del
canvas (`x - 18` dal punto dati, senza verificare lo spazio
disponibile). Aumentare il padding destro del canvas per lasciare
spazio all'etichetta più larga, o misurare la larghezza del testo
(`ctx.measureText`) prima di posizionarlo e spostarla se supera il
bordo.

### R9.5 — Gauge solo per grandezze davvero 0-100%

Tre gauge oggi (`renderGauge`, chiamata alle righe 2241-2243):
`gauge-rework` (quota di lavori rilavorati, genuinamente 0-100% —
resta un gauge) contro `gauge-load` (carico effettivo, oggi 662%: un
arco non può disegnare oltre 100%) e `gauge-capacity` (capacità
disponibile, oggi −562%: un valore negativo produce un arco
vuoto/grigio che comunica visivamente il contrario del numero).
**Correzione**: `gauge-load`/`gauge-capacity` sostituiti da un nuovo
componente — numero grande + indicatore di direzione/colore (non un
arco), stesso principio di leggibilità di un gauge ma senza la scala
0-100% che quei due valori possono superare o rendere negativa.
`gauge-rework` resta invariato.

### R9.6 — Un fatto, un numero, un posto (la voce più grande di questo giro)

Lo stesso fatto (il carico supera la capacità disponibile) compare
oggi come 6 numeri diversi in 5 pannelli diversi: "Carico effettivo"
662% (Vista rapida), "Margine rispetto alla saturazione" −562%
(Margine di stabilità), "Quota di capacità occupata dal carico totale"
662% di nuovo (Rilavorazione), "Margine disponibile" −562% di nuovo
(Lavoro presente e capacità/R7), "Margine residuo" −2,87
passaggi/settimana (stesso valore in unità diversa), "Utilizzo (rho)"
570% e "Utilizzo effettivo (rho effettivo)" 1025% (Quadro avanzato, due
varianti più fini per passaggio). All'interno dello stesso pannello
"Rilavorazione" ci sono **altre due ripetizioni identiche non ancora
notate altrove**: "Carico totale (a settimana)" e "Passaggi totali
alla settimana" mostrano lo stesso numero (3,36) a poche righe di
distanza; "Carico da rilavorazione (a settimana)" e "Carico
aggiuntivo dalla rilavorazione (alla settimana)" idem (0,77) — da
verificare se sono davvero lo stesso identico calcolo esposto due
volte (probabile) e, se sì, **mostrarlo una sola volta**, non
duplicarlo nello stesso pannello.

**Riorganizzazione in tre livelli** (proposta già nell'audit, §5):

- **Livello 1** ("Vista rapida", sempre visibile): un solo numero di
  stato (non tre segnali sovrapposti: badge "CRITICO", "INSTABILE",
  "−562%" diventano un solo stato con gli altri due come dettaglio a
  un click) e un solo numero di sovraccarico (non sei varianti — un
  numero, con un link "vedi il dettaglio").
- **Livello 2** ("Dettaglio operativo"): ogni numero compare **una
  sola volta** — se serve altrove, un rimando testuale ("vedi X"), mai
  una nuova etichetta con lo stesso numero.
- **Livello 3** ("Diagnostica avanzata", già collassata sotto
  `<details>`): Quadro avanzato, grafici WIP, Scenari futuri — resta
  come oggi, corretto tenerla collassata.

**Criteri di accettazione (R9.6)**:
- [ ] Nessun valore numerico compare identico (stesso numero, stesso
      significato) in più di un posto senza essere esplicitamente un
      rimando testuale.
- [ ] Le due ripetizioni interne al pannello "Rilavorazione" (carico
      totale/passaggi totali; carico da rilavorazione/carico
      aggiuntivo) sono verificate e, se coincidenti, ridotte a una sola
      comparsa.
- [ ] "Vista rapida" mostra un solo stato e un solo numero di
      sovraccarico, non le sei varianti attuali.

### R9.7 — Etichette categoriche senza soglia esplicita

"Affidabilità della lettura: BUONA" (`dataQuality_`) — mostrare la
soglia insieme al numero (es. "BUONA (5 campioni, soglia minima: N)"),
non solo l'etichetta finale. "Variabilità dei tempi: MEDIA" — collegare
il numero che la determina (Cv², oggi mostrato solo nel Quadro
avanzato) allo stesso pannello dove compare l'etichetta categorica.

### R9.8 — Gerarchia visiva per i subtotali

"Lavoro presente (ora)" (pannello workload, R7): le tre righe attesa
cliente/enti/interno sono componenti di "Lavoro in attesa (totale)" —
vanno indentate/raggruppate visivamente sotto quella riga, non
presentate come otto voci indipendenti sullo stesso piano (coerente
con R7: "Lavoro in corso" va sempre mostrato scomposto). "Rilavorazioni
per causa - cliente/enti/interno" (`byCause`, pannello Rilavorazione):
oggi tre numeri in fila senza etichetta propria — passare a tre valori
etichettati singolarmente ("Cliente: 5", "Enti: 2", "Interno: 3"), non
una terna posizionale che richiede ricordare l'ordine del titolo.

### R9.9 — Sezioni non ancora attive, stile distinto

`renderScenarios` (riga 2691-2702): le tre card "Predisposto" hanno
oggi lo stesso stile visivo (`.scenario-item`) delle card di dati
reali sopra — aggiungere una classe CSS dedicata (sfondo
tratteggiato/grigio, dicitura "non ancora attivo" ben visibile) per
distinguerle a colpo d'occhio da dati reali.

### R9.10 — Righe vuote compattate

Quadro avanzato, blocchi "Coda M/M/1" e "Coda M/G/1"
(`renderAdvancedMetrics`, righe 2286-2300): quando tutti i campi
(`Wq`/`W`/`Lq`/`L`) sono "Dato non ancora stimabile", mostrare una riga
sola col messaggio invece di 8 righe vuote ripetute.

### R9.11 — Glossario R6, ultima occorrenza di "card"

`renderBreakdown` (riga 2625, pannello Distribuzione): `' pt - ' +
valueOrDash(item.cards) + ' card'` → "lavori", coerente col glossario
R6 già applicato ovunque altro. **Attenzione**: non toccare le
occorrenze di "card"/" card" nella board vera (righe 449/579,
badge sulla colonna, es. "3 card") — lì "card" è il nome dell'oggetto
UI (una carta fisica sul tabellone Kanban), non una metrica del
glossario R6, resta fuori da questa correzione.

### R9.12 — Correzioni testuali puntuali

- Refuso: "Calcolato su tutto lo storico... anzichè finestra" →
  "anziché" (nota pannello "Profilo della rilavorazione").
- Istogramma del profilo di rilavorazione: le percentuali sommano a
  101% per arrotondamento — aggiungere una nota ("può non sommare
  esattamente a 100% per arrotondamento").
- Tabella "Dove si blocca il lavoro": la riga di riepilogo si chiama
  "Totale" nella stessa colonna intestata "Totale (giorni)" —
  rinominare la riga (es. "Tutte le attese").
- Nota "Lavoro nuovo e passaggi totali sono misure diverse..."
  (pannello "Flusso e carico"): indicare esplicitamente a quale riga
  della tabella si riferisce.
- "Carico mensile", prima riga (138 punti a 03/2026): spiegare in una
  nota se è un saldo iniziale pre-tracciamento o cos'altro.

### R9.13 — Gerarchia tipografica per i valori fuori scala

Quadro avanzato: "Utilizzo (rho): 570%" e "Utilizzo effettivo (rho
effettivo): 1025%" hanno oggi lo stesso peso tipografico di ogni altra
riga del blocco (es. "Tempo medio primo passaggio: 7,28 giorni") — dare
enfasi visiva (colore/peso) ai valori fuori scala (>100% o negativi),
stesso principio di R9.5 ma per il testo, non per i gauge.

**Criteri di accettazione (R9, generali — oltre a quelli specifici di
R9.6 sopra)**:
- [ ] Nessun numero della dashboard usa il punto come separatore
      decimale.
- [ ] Ogni grafico a canvas ha tacche numeriche su entrambi gli assi,
      nessuna etichetta troncata.
- [ ] Nessun gauge mostra un valore fuori dal proprio intervallo
      dichiarato (0-100% o 0-50% per `gauge-rework`).
- [ ] "card" non compare più in nessuna etichetta di metrica/dato
      aggregato (resta solo come nome dell'oggetto UI sulla board).

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

## Fuori scope, secondo giro (R7/R8/S5/R9 + correzioni a R5/R6.6/S2-S3)

- I singoli punti dell'audit UX (`AUDIT_UX_dashboard.md` §2, pattern
  A-F) **non sono più fuori scope** — Marco (2026-08-28): vanno chiusi
  in questo stesso giro, non rimandati. Sono tutti tradotti in R9.1-
  R9.13 sopra, con riferimenti di codice puntuali. Questa voce resta
  solo come nota storica di che cosa NON è stato rimandato, non come
  lavoro ancora aperto.
- Le osservazioni minori di `VERIFICA_metriche_dashboard_2026-08-26.md`
  §4 (campione sottile mascherato da "BUONA", soglie 70%/85% non
  derivate dai dati) — restano parcheggiate su Fase T (calibrazione
  vera e propria), bloccata dal backfill storico completo, dipendenza
  esterna reale non da questa sessione.
- `p1`/`r` a livello di visita nel Quadro avanzato (§2.2 dello stesso
  documento) — già affrontato in R6.4 come scelta esplicita (due grane
  diverse, stesso simbolo della dispensa riusato per quella più fine,
  dichiarato in etichetta e nota di pannello), non riaperto qui.
