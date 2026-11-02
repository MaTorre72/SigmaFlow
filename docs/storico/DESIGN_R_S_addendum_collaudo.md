# Addendum di collaudo — Fase R/S

> **Cos'è questo documento.** Prosegue la stessa numerazione di
> `DESIGN_R_S.md` (il documento di progetto originale, scritto prima
> dello sviluppo — resta quello nel repo, non viene toccato: questo
> addendum si aggiunge come file a parte, non lo sostituisce). Non è
> una nuova fase: **R5** e **S2/S3** correggono voci già numerate in
> quel documento; **R6** è l'unica voce nuova, aggiunta in chiusura di
> collaudo. Nessuna "Fase S-bis" o "Area 7" — stessa fase R/S.
>
> **Struttura di questo file (rivista il 2026-08-28, terza revisione).**
> Marco: con più giri di correzioni sovrapposti, mescolare vecchio e
> nuovo rischiava di far leggere del lavoro nuovo come se fosse già
> fatto, o di farlo saltare del tutto. Da qui in poi il documento è
> diviso in tre blocchi, sempre in quest'ordine:
>
> 1. **Principi editoriali obbligatori** — regole permanenti, valgono
>    per ogni pannello, non solo per le voci numerate.
> 2. **Stato di avanzamento** — una tabella, una riga per voce, per
>    sapere a colpo d'occhio cosa è verificato, cosa è stato inviato a
>    Code ma non ancora confermato, cosa è nuovo e non ancora inviato.
> 3. **Parte 1 (specifiche già inviate a Code)** e **Parte 2 (specifiche
>    nuove, non ancora inviate)** — due sezioni separate da un titolo
>    ben visibile. La Parte 1 è il contenuto del giro precedente
>    (R7-R9.13 più le correzioni R5/R6.6/S2-S3), riportato per intero
>    così il documento resta autosufficiente — non serve andare a
>    cercare in prompt precedenti. La Parte 2 è tutto ciò che è emerso
>    in questo turno e non è ancora stato mandato a Code: il nome
>    "Lavoro accettato" al posto di "Lavoro impegnato", S6, R9.14
>    (ridefinito una seconda volta — ora richiede nuovo codice, non solo
>    etichette), R9.15, R9.16 (assi separati stock/flussi).
>
> Il prompt di esecuzione per la Parte 1 (già inviato) resta
> `PROMPT_correzioni_dashboard_seconda_ondata.md` — quel file viene
> aggiornato in parallelo con la stessa separazione vecchio/nuovo.

---

## Principi editoriali obbligatori (valgono per ogni pannello, ora e nei giri futuri)

Marco (2026-08-28), dopo due giri di verifica in cui singoli criteri
erano tutti soddisfatti eppure la dashboard restava poco chiara nel suo
insieme (esempio reale: "Punti impegnati/aggiunti/completati" in Vista
Rapida contro "Punti entrati, completati e ancora aperti" nel grafico
"Andamento del carico" — parole diverse per fatti che sembravano lo
stesso, mai confrontate finché non le si guarda una accanto all'altra —
vedi R9.14 in Parte 2 per come è stato risolto). **Questi principi non
sostituiscono R9 — lo governano.** Vanno applicati a ogni pannello
esistente e a ogni pannello nuovo, non solo alle voci già numerate.

1. **Un fatto, un nome, ovunque appaia.** Se due numeri rappresentano
   lo stesso evento o oggetto (es. un lavoro che entra nel sistema),
   devono usare la stessa parola in ogni punto della pagina — card di
   sintesi, tabelle, grafici, legende. Non è un'eccezione stilistica:
   è lo stesso errore che R6.1 doveva già chiudere col glossario — se
   riappare altrove, è una regressione, non una scelta.
2. **Un fatto mostrato in più punti nasce da un solo calcolo — non da
   nomi diversi, non da una nota.** Prima si verifica nel codice se due
   etichette che sembrano descrivere la stessa cosa condividono davvero
   lo stesso calcolo. Se il fatto è destinato a essere lo stesso
   (stessa popolazione, stessa definizione, solo vista a granularità
   diverse — una fotografia di oggi, un andamento nel tempo) ma oggi il
   calcolo diverge, la correzione è allineare il calcolo scrivendo il
   codice necessario, **non rietichettare la differenza con un nome più
   cauto e una nota esplicativa** — quella è una scorciatoia per evitare
   di scrivere codice, ed è vietata (vedi R9.14 in Parte 2: la prima
   risoluzione proposta faceva esattamente questo errore, respinta da
   Marco). Solo se i due fatti sono **genuinamente diversi per scelta**
   (popolazioni o definizioni diverse, non un difetto da correggere) si
   sceglie quale dei due merita la posizione in evidenza (Livello 1,
   tipicamente la fotografia dello stato attuale) e si retrocede
   l'altro a dettaglio di supporto (Livello 2/3), etichettato per
   quello che è davvero. Mai assumere quale dei due casi sia senza
   controllare il codice.
3. **Un allineamento di calcolo si dichiara chiuso solo con un numero
   verificato sui dati reali, non per costruzione del codice.** Quando
   il principio 2 porta a riscrivere un calcolo perché due pannelli
   devono coincidere, il punto si considera chiuso solo dopo aver
   controllato che, per il periodo corrente, i due numeri coincidano
   davvero sui dati di TEST — non basta che il codice sia logicamente
   corretto in teoria.
4. **Disambiguare "ora" tempo da "ora" adesso.** In italiano "ora" è
   ambiguo tra "in questo momento" e "unità di tempo" — rischioso in
   un cruscotto che parla anche di giorni/settimane/ore. Il marcatore
   di istantanea diventa "attuale" ovunque nella dashboard.
5. **Istantanea e periodo, separati anche visivamente.** Ogni numero
   dichiara se è una fotografia di adesso o un totale su una finestra
   di tempo — non lasciarlo intuire dal contesto o dal solo nome.
6. **Didascalie scritte per chi non conosce la teoria delle code.**
   Zero termini tecnici non spiegati nella prima riga di testo visibile
   di un pannello principale (lambda, rho, Cv² restano nel Quadro
   avanzato, dove chi lo apre sa cosa aspettarsi).
7. **Un grafico, un'unità, dichiarata sugli assi** — mai lasciata solo
   al titolo o alla didascalia.
8. **Prima di dichiarare chiuso un giro, una lettura finale pannello
   per pannello — non solo la lista puntuale.** Lo abbiamo già visto:
   ogni singolo criterio R9.x soddisfatto, eppure "Lavori completati" e
   "Passaggi completati" identici (12 e 12) sono passati inosservati
   perché nessun punto della lista diceva esattamente quello. Prima del
   push, un passaggio esplicito dall'alto in basso, leggendo la
   dashboard come la leggerebbe un commerciale o un amministrativo che
   non ha mai visto il codice — non solo spuntare le caselle. Se emerge
   qualcosa di nuovo, si aggiunge con un numero (stesso giro se ancora
   aperto, altrimenti il prossimo libero) — non si chiude comunque.

---

## Stato di avanzamento (aggiornato 2026-08-28)

Legenda: **Verificato** = confermato con evidenza concreta (diff, numeri
di riga, commit, o test) — non solo "sembra a posto dallo screenshot".
**Da confermare** = inviato a Code, plausibilmente fatto (visibile negli
screenshot più recenti), ma senza conferma esplicita via codice/diff.
**Nuovo** = specificato in questo turno, non ancora inviato a Code.

| Voce | Cosa | Stato | Nota |
|---|---|---|---|
| R1-R6, S1-S4 (collaudo originale) | — | Verificato | Confermato da Code: pushato su TEST, nessuna PR aperta |
| R7 | Schema stadi 0-6, nomenclatura unificata | Da confermare | Struttura visibile su TEST dagli screenshot, non confermata riga per riga |
| R7, correzione aggiuntiva | "Lavorazione" non "Lavoro in corso" per lo stadio 3 isolato | Da confermare | Inviato a Code in questo giro, nessuna conferma ricevuta |
| R5, correzione aggiuntiva | Storico invece di finestra 90gg | Da confermare | Nota di pannello coerente vista su TEST |
| R6.6, completamento | `flow.completed_initiatives` | **Verificato** | Diff confermato da Code (client.html:2131/2156, commit 7f165eb), testato su dati demo (valori diversi: 8/9/5) |
| S2/S3, correzione aggiuntiva | Throughput da `consegna_ts` | Da confermare | — |
| S4 | WIP da log | Verificato (giro precedente) | Non toccato in questo giro |
| S5 | `wip_trend_weeks` in config | Da confermare | — |
| R8 | Pulizia editoriale (Cap. X, percorso card) | Da confermare | Nessun riferimento "Cap." visto negli screenshot recenti — buon segno, non confermato via diff |
| R9.1 | Virgola decimale | Da confermare | "Fermi ora" mostra la virgola negli screenshot recenti |
| R9.2 | Unità non ripetuta in tabella | Da confermare | Non verificabile dagli screenshot avuti finora |
| R9.3 | Tacche numeriche sui grafici diagnostici | **Verificato** | Tacche presenti; bug di sovrapposizione trovato e corretto da Code |
| R9.4 | Etichette asse X non troncate | Da confermare | — |
| R9.5 | Gauge solo 0-100% | Da confermare | Vista Rapida mostra un solo gauge (Rilavorazione) negli screenshot recenti |
| R9.6 | Un fatto, un numero, un posto | Da confermare | Duplicazione interna "Rilavorazione" non più visibile negli screenshot; verifica completa non fatta |
| R9.7 | Soglie esplicite | Da confermare | Cv² e soglia BUONA visibili nei pannelli dettaglio negli screenshot |
| R9.8 | Gerarchia visiva subtotali | Da confermare | Indentazione ed etichette singole visibili negli screenshot |
| R9.9 | Scenari non attivi, stile distinto | Da confermare | Non verificabile dagli screenshot avuti finora |
| R9.10 | Righe vuote compattate | Da confermare | M/M/1 e M/G/1 mostrano una riga sola negli screenshot recenti |
| R9.11 | "card" → "lavori" in Distribuzione | Da confermare | Non verificabile dagli screenshot avuti finora |
| R9.12 | Correzioni testuali | Da confermare | Nota arrotondamento e rename "Tutte le attese" visibili negli screenshot |
| R9.13 | Enfasi valori fuori scala | Da confermare | rho/rho effettivo in evidenza cromatica negli screenshot |
| NaN sul grafico "Tempo di ciclo vs Lavoro in corso" | Bug trovato durante la verifica | Corretto (con riserva) | Code non ha trovato la causa nel codice attuale — ipotesi cache; aggiunta comunque una difesa strutturale. Ricontrollare se riappare |
| Sovrapposizione testo/tacche asse Y | Bug trovato durante la verifica | **Verificato** | Confermato corretto da Code e dagli screenshot |
| "Lavoro accettato" (rename da "Lavoro impegnato") | Terminologia | Nuovo | Deciso con Marco in questo turno — vedi Parte 2 |
| S6 | Media mobile + fit teorico | Nuovo | Specificato in questo turno — vedi Parte 2 |
| R9.14 | "Lavoro accettato": stesso calcolo in card e grafico | Nuovo (ridefinito una seconda volta) | Le prime due versioni (nomi distinti; poi rietichetta+nota) sono superate — Marco ha respinto la seconda come scorciatoia. Ora: nuova funzione di ricostruzione dal log, stesso calcolo sopra e sotto — vedi Parte 2 |
| R9.15 | "(ora)" → "(attuale)" | Nuovo | Vedi Parte 2 |
| R9.16 | Assi separati stock/flussi in "Andamento del carico" | Nuovo | Dipende da R9.14 — vedi Parte 2 |

---

# Parte 1 — Specifiche già inviate a Code (giro precedente)

Contenuto del prompt `PROMPT_correzioni_dashboard_seconda_ondata.md`
inviato a Code prima di questo turno, riportato qui per intero — stato
reale per ogni voce nella tabella sopra, non qui (per non doverlo
aggiornare in due posti). **La terminologia "Lavoro impegnato" in
questa parte è già sostituita con "Lavoro accettato"** (decisione presa
in Parte 2, applicata qui per evitare che il documento contenga due
nomi diversi per lo stesso stadio — vedi Parte 2 per il perché).

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
- **Lavoro accettato** = stadi 1-4. Carico complessivo per la
  governance generale (quanto lavoro pesa sull'organizzazione ora).
- **Lavoro in corso** = stadi 2-4 (Preparazione+Lavorazione+Attesa) —
  **sempre scomposto** nelle tre componenti, mai un unico numero: è
  qui che si legge il collo di bottiglia (quanto è davvero in
  lavorazione contro quanto è fermo in attesa, per causa).
- **Da fatturare** = stadio 5 soltanto. Solo per l'amministrazione.
- **Chiuso** = stadio 6. Mai in nessun report corrente, solo storico.

**Correzione (2026-08-28, dopo verifica su TEST)**: la prima versione di
questo paragrafo diceva che il confronto throughput/tempo-di-ciclo nel
pannello avanzato (Cap. 12 dispensa FSC) dovesse usare il WIP in senso
stretto — lo stadio 3 isolato ("mani sopra"). **Era in contraddizione
con quello che S4 calcola davvero**: `activeWipWeeklyFromLog_`
(ricostruzione dal log, già implementata e verificata sui dati reali)
misura da sempre gli stadi 2-4 insieme (Preparazione+Lavorazione+Attesa,
`role` `active`), non lo stadio 3 da solo — ed è coerente con quanto
deciso in R7 sullo scopo della dashboard (governance, non purezza
fiscale): un WIP isolato alla sola "lavorazione" non aiuta a vedere il
collo di bottiglia, che è proprio la parte in attesa. **Nessuna
correzione di calcolo**: i due grafici diagnostici ("Throughput vs
Lavoro in corso", "Tempo di ciclo vs Lavoro in corso") restano su
"Lavoro in corso" (stadi 2-4), stesso termine usato nel resto della
dashboard — non esiste, e non serve costruire, una metrica WIP separata
per il solo stadio 3. Se in futuro servisse davvero il WIP in senso
stretto per un confronto teorico puntuale, è lavoro nuovo da valutare
allora, non un'estensione di questo giro.

Le metriche di teoria delle code (lambda/mu/rho/capacità) **non sono
uno stadio**: sono un tasso su un periodo (la finestra di
osservazione), non una fotografia dello stato attuale — etichettarle
sempre come "flusso" per non confondersi con gli stadi sopra ("stato").

**Cosa cambia rispetto a oggi:**

- "Aperti (ora)" (`points.open_cards`, oggi: tutto tranne `done`,
  quindi mescola Pipeline commerciale con Lavoro accettato) —
  **eliminato come numero unico**, sostituito da "Pipeline
  commerciale" (stadio 0, mostrato solo dove serve ai commerciali) e
  "Lavoro accettato" (stadi 1-4).
- "Lavoro presente e capacità" (`currentWorkload_`, oggi: stadi 1-5,
  mescola Lavoro accettato con Da fatturare) — spaccato in "Lavoro
  accettato" (per il team tecnico) e "Da fatturare" (per
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
- [ ] "Lavoro presente e capacità" è spaccato in "Lavoro accettato" e
      "Da fatturare", mai sommati.
- [ ] Ogni volta che "Lavoro in corso" (stadi 2-4) compare come numero
      di governance (pannello "Lavoro accettato e capacità"), è sempre
      accompagnato dalla scomposizione lavorazione/attesa nello stesso
      pannello — mai un numero isolato. Eccezione dichiarata: i due
      grafici diagnostici del pannello avanzato ("Throughput vs Lavoro
      in corso", "Tempo di ciclo vs Lavoro in corso") mostrano "Lavoro
      in corso" come singolo numero per punto/settimana sull'asse X —
      è lo scopo stesso di quel grafico (una serie storica), non una
      violazione della regola.
- [ ] Nessuna etichetta rivolta all'utente usa "WIP" per indicare una
      metrica isolata sul solo stadio 3 — quella metrica non esiste nel
      sistema. "Lavoro in corso" (stadi 2-4) è il solo termine usato,
      ovunque compaia, diagnostica inclusa.
- [ ] Nel pannello "Lavoro accettato e capacità", la riga che oggi
      mostra il solo stadio 3 (Lavorazione, "mani sopra") si chiama
      "Lavorazione", non "Lavoro in corso" — quel nome resta riservato
      all'aggregato stadi 2-4, per non ricreare la stessa ambiguità che
      R7 doveva risolvere.

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
incompleto, non un lavoro "istantaneo").

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

**Verificato — chiuso (2026-08-28)**: Code ha confermato con diff
(`client.html:2131` e `:2156`, commit `7f165eb`) che entrambe le
occorrenze leggono `flow.completed_initiatives`. Testato anche su dati
demo, dove i due numeri risultano diversi (8/9/5) — la garanzia è
strutturale, non una coincidenza sul dataset del momento.

**Criteri di accettazione (aggiuntivi)** — tutti soddisfatti:
- [x] "Lavori completati (periodo)" (entrambe le occorrenze) legge
      `flow.completed_initiatives`, non `points.completed_cards`.
- [x] Verificato che i due numeri non coincidono per costruzione
      (testato su dati demo).
- [ ] Nota di data quality (facoltativa, non bloccante): segnalare i
      job con `start_ts` vuoto su visite già consegnate — non
      confermato se fatta.

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

**Raggruppamento per fascia di WIP** (`wipBands_`, **sostituita da
`wipMovingAverage_` in S6, Parte 2** — riportata qui solo come
riferimento storico di cosa esisteva prima):

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

`flowWeeklyBuckets_` calcola `throughput_punti_settimana` da
`job.incarico_chiuso_ts` — il campo scritto **solo** quando si spunta
"Chiuso" in amministrazione (`invoiced`), non quando il lavoro viene
tecnicamente consegnato. **Verificato sui 54 job reali: uno solo ha mai
avuto `incarico_chiuso_ts` valorizzato, in tutta la storia.** Il
throughput è quindi vicino a zero quasi sempre, non perché manchino
consegne, ma perché è agganciato all'evento amministrativo sbagliato.

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

**Verifica di coerenza fatta a tavolino**: ricostruito con
`activity_log_json` reale di tutti i 54 job (nessuno escluso, log
completo ovunque) e i campioni di tempo di ciclo dalle visite reali,
**18 settimane su 26 hanno un campione valido di tempo di ciclo, e la
banda di WIP (`bandWidth=20`, `minSamples=3`) ne produce 4 valide** —
sopra la soglia minima di 3 richiesta dal frontend. Quindi i dati per
mostrare qualcosa c'erano già, anche prima del fix del throughput.

**Criteri di accettazione (aggiuntivi)**:
- [ ] `throughput_punti_settimana` calcolato da `consegna_ts` (visite),
      non da `incarico_chiuso_ts` (job).
- [ ] Sui dati reali di oggi, dopo il fix, almeno alcune settimane
      mostrano throughput > 0 (oggi: quasi sempre 0).

---

## S4 (nuovo, in coda dopo R5/R6/S2-S3) — WIP attivo ricostruito dal log

`flowWeeklyBuckets_` (S2/S3) stima il WIP come "entrato meno
completato, cumulato" — include il tempo passato in backlog, non solo
il lavoro davvero in lavorazione. **Non resta una nota a margine: è
lavoro da fare**, sostituendo la stima con il WIP vero ricostruito
dallo storico dei passaggi di colonna.

**Come funziona**:

1. **Classificazione delle colonne — già esiste, non va creata.**
   `config.columns_json` contiene già, per ogni colonna, un campo
   `role` — `backlog` (INCARICHI), `prep` (TO DO), `wip` (WIP),
   `stand_by` (le tre colonne di attesa: REV INTERNA, ATTESA CLIENTE,
   ATTESA ENTI), `done` (DA INVIARE/DA FATTURARE), `neutral`
   (PREVENTIVI/notes — non ancora un incarico accettato). Per S4:
   `backlog` = non ancora iniziato; `prep`/`wip`/`stand_by` = `active`
   (il lavoro è aperto anche se fermo in attesa); `done` = completato;
   `neutral` = fuori dal calcolo del WIP.

2. **Ricostruzione per job**: da `activity_log_json`, per ogni job, la
   sequenza degli intervalli `{colonna, dal_ts, al_ts}` che coprono
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
   posto del calcolo cumulato precedente.

**Criteri di accettazione**:
- [ ] `wip_medio` in `flowWeeklyBuckets_` calcolato da
      `activeWipWeeklyFromLog_`, non più dal cumulato entrato-meno-
      completato.
- [ ] Per la settimana corrente, `wip_medio` ricostruito coincide (a
      meno di arrotondamento) con il totale punti del pannello
      per-colonna live, colonne non-backlog e non-completate.
- [ ] Test unitario su `activeWipWeeklyFromLog_` con una timeline nota.

---

## S5 (nuovo) — finestra del grafico WIP/tempo di ciclo in config

`weeksCount = 26` è oggi un valore fisso, passato come letterale in tre
punti (`activeWipWeeklyFromLog_`, `flowWeeklyBuckets_`, la chiamata in
`buildSystemState_`). Spostarlo in config, stesso principio già in uso
per `observation_window_days`.

```js
// Constants.gs, DEFAULT_CONFIG:
wip_trend_weeks: 26,
// Model.gs, buildSystemState_: leggere da config invece del letterale
var wipTrendWeeks = Number(config.wip_trend_weeks || 26);
var activeWipWeekly = activeWipWeeklyFromLog_(jobs, archivedJobs, columnMap, now, wipTrendWeeks);
var flowWeeklyBuckets = flowWeeklyBuckets_(jobs, archivedJobs, visite, visiteArchivio, now, wipTrendWeeks, activeWipWeekly.weekly);
```

**Criteri di accettazione**:
- [ ] Nuova chiave `wip_trend_weeks` in config, default 26.
- [ ] I tre punti che oggi usano il letterale `26` leggono da config.

---

## R8 (nuovo) — pulizia editoriale: didascalie e percorso della card

**R8.1 — via i riferimenti ai capitoli della dispensa dalle
didascalie.** Oggi diverse etichette/note di pannello citano "Cap.
3-9", "Cap. 11-15", "Cap. 12" ecc. (`dashboard.html`). Vanno tolti dal
testo rivolto all'utente — restano solo nei commenti del codice.

```
Esempio: "Margine di stabilita' <span class='panel-chapter'>Cap. 15</span>"
       -> "Margine di stabilita'"  (span/classe panel-chapter rimossi)
```

**R8.2 — "Percorso della card" in giorni, non giorni e ore.** Nel
modale della card, tab Informazioni: oggi mostra "52g 9h", "236g 23h"
ecc. Troncare a soli giorni, al massimo una cifra decimale.

```
Esempio: "WIP: 52g 9h" -> "WIP: 52,4g" (o "WIP: 52g")
```

**Criteri di accettazione**:
- [ ] Nessuna didascalia/nota rivolta all'utente cita un numero di
      capitolo della dispensa.
- [ ] "Percorso della card" mostra le durate solo in giorni.

---

## R9 (nuovo) — revisione trasversale di leggibilità e formattazione

Da `AUDIT_UX_dashboard.md` (analisi di 7 screenshot, 2026-08-28) —
tredici passi, R9.1-R9.13. (R9.14 e R9.15 sono in Parte 2: trovati dopo
questo invio, e R9.14 è stato ridefinito rispetto alla prima versione.)

### R9.1 — Formattazione numerica coerente

`client.html`, funzione `renderCurrentlyBlocked_` (riga 2361): unico
punto della pagina che scrive un numero concatenandolo direttamente
(`item.elapsed_days + ' g'`) invece di passare da `metricValue` (che
converte il punto in virgola) — per questo "Fermi ora" mostra "119.81
g" invece di "119,81 g".

```js
// era: item.elapsed_days + ' g'
metricValue(item.elapsed_days, ' g')
```

Regola generale: **nessun numero va scritto in pagina per
concatenazione diretta** — sempre attraverso `metricValue`/
`perWeekValue`/`nullablePercent`/`estimableValue`.

### R9.2 — Unità di misura non ripetuta per tabella

Tabella "Flusso e carico": l'unità è già nell'intestazione di colonna
("Lavori/settimana") — `perWeekValue` non deve ripeterla nel valore di
cella per quelle colonne specifiche.

### R9.3 — Assi dei grafici sempre con tacche numeriche

`drawWipScatter_` (grafici "Throughput vs WIP" e "Tempo di ciclo vs
WIP"): aggiungere tacche numeriche su entrambi gli assi, come già fanno
`drawPointsTimeline`/`drawWaitTimeTrend_`.

### R9.4 — Etichette asse X mai troncate

`drawPointsTimeline`/`drawWaitTimeTrend_`: l'ultima etichetta mese esce
troncata ("08/202"). Aumentare il padding destro o misurare la
larghezza del testo prima di posizionarlo.

### R9.5 — Gauge solo per grandezze davvero 0-100%

`gauge-rework` resta un gauge (0-100% reale). `gauge-load`/
`gauge-capacity` (possono superare 100% o essere negativi) sostituiti
da un numero grande + indicatore di direzione/colore.

### R9.6 — Un fatto, un numero, un posto

Lo stesso fatto (il carico supera la capacità disponibile) compariva
come 6 numeri diversi in 5 pannelli. Riorganizzazione in tre livelli:
Livello 1 (Vista Rapida, un solo numero di sovraccarico con link "vedi
il dettaglio"), Livello 2 (Dettaglio operativo, ogni numero una volta
sola), Livello 3 (Diagnostica avanzata, collassata).

### R9.7 — Etichette categoriche senza soglia esplicita

"Affidabilità della lettura: BUONA" → mostrare la soglia col numero.
"Variabilità dei tempi: MEDIA" → collegare il Cv² allo stesso pannello.

### R9.8 — Gerarchia visiva per i subtotali

"Lavoro accettato (attuale)" (pannello "Lavoro accettato e capacità",
R7): le tre righe attesa cliente/enti/interno sono componenti di
"Lavoro in attesa (totale)" — indentate/raggruppate sotto quella riga.
"Rilavorazioni per causa": tre valori etichettati singolarmente.

### R9.9 — Sezioni non ancora attive, stile distinto

`renderScenarios`: le tre card "Predisposto" — classe CSS dedicata per
distinguerle a colpo d'occhio da dati reali.

### R9.10 — Righe vuote compattate

Quadro avanzato, "Coda M/M/1"/"Coda M/G/1": una riga sola invece di 8
righe vuote ripetute quando tutti i campi sono null.

### R9.11 — Glossario R6, ultima occorrenza di "card"

`renderBreakdown` (pannello Distribuzione): "card" → "lavori". Non
toccare "card" nella board vera — lì è il nome dell'oggetto UI.

### R9.12 — Correzioni testuali puntuali

Refuso "anzichè" → "anziché"; nota su percentuali che sommano a 101%
per arrotondamento; riga "Totale" → "Tutte le attese" nella tabella
attese; nota "misure diverse" resa esplicita; nota sul primo valore
"Carico mensile".

### R9.13 — Gerarchia tipografica per i valori fuori scala

Quadro avanzato: "Utilizzo (rho)"/"Utilizzo effettivo (rho effettivo)"
oltre scala — enfasi visiva (colore/peso).

**Criteri di accettazione (R9.1-R9.13, generali)**:
- [ ] Nessun numero della dashboard usa il punto come separatore
      decimale.
- [ ] Ogni grafico a canvas ha tacche numeriche su entrambi gli assi,
      nessuna etichetta troncata.
- [ ] Nessun gauge mostra un valore fuori dal proprio intervallo
      dichiarato.
- [ ] "card" non compare più in nessuna etichetta di metrica/dato
      aggregato.

---

## Fuori scope (vale per R5, R6, S2/S3 — non per S4, che li sostituisce)

- Nessun altro punto di Fase R/S (R1-R4, S1) — già implementati.
- Nessun campo nuovo su `jobs`/`visite`.
- Nessuna metrica viene rimossa dalla vista — principio esplicito (R6).
- Nessun rename di variabili/funzioni interne al codice.

---

# Parte 2 — Specifiche nuove di questo turno (non ancora inviate a Code)

Tutto ciò che segue è emerso **dopo** l'invio del prompt della Parte 1
— durante o dopo la verifica su TEST. Niente di questo è ancora stato
comunicato a Code in un prompt eseguibile: lo sarà nell'aggiornamento
di `PROMPT_correzioni_dashboard_seconda_ondata.md`, in una sezione
altrettanto separata.

## Nota terminologica — "Lavoro accettato" al posto di "Lavoro impegnato"

Marco (2026-08-28): "impegnato" non è chiaro, non spiega di cosa si
tratta. Deciso insieme: **"Lavoro accettato"** — segna esattamente il
confine che R7 vuole indicare (dopo il preventivo, stadio 0 non ancora
accettato; prima della fattura) e non riusa nessuna parola già
impiegata altrove nella dashboard con un significato diverso (a
differenza di alternative come "Lavoro in carico", scartata perché
condivide la radice con "carico", già usato per il tasso settimanale
nel pannello Rilavorazione — avrebbe ricreato lo stesso tipo di
ambiguità che si stava risolvendo).

**Applicato per esteso in tutta la Parte 1 di questo documento** (non
solo annotato qui), così Code non deve incrociare due sezioni per
sapere quale nome usare. Il pannello che R7 chiamava "Lavoro impegnato
e capacità" diventa **"Lavoro accettato e capacità"**; la riga/card
"Lavoro impegnato (ora)" diventa **"Lavoro accettato (attuale)"** (il
cambio "(ora)"→"(attuale)" è R9.15, sotto).

**Criteri di accettazione**:
- [ ] Nessuna etichetta rivolta all'utente usa più "impegnato"/
      "impegnati" per questo concetto — sostituito da "accettato"/
      "accettati" ovunque (Vista Rapida, pannello "Lavoro accettato e
      capacità", tabella "Flusso e carico", note).
- [ ] Nomi di variabili/funzioni interne non toccati (stesso principio
      di R6.1 — il glossario vale per le etichette, non per il codice).

## S6 (nuovo) — media mobile e curva teorica sui due grafici diagnostici

**Perché.** Verificato su TEST (2026-08-28): le fasce a larghezza fissa
di `wipBands_` (20 punti per fascia) producono una linea poco pulita
quando i campioni non sono distribuiti uniformemente lungo l'asse
WIP — le fasce a basso WIP hanno molte settimane dentro (media
stabile), quelle ad alto WIP ne hanno appena 3 (il minimo, media
ballerina). Marco (2026-08-28): sostituire con una media mobile
ordinata per WIP crescente, e aggiungere una curva teorica tratteggiata
per far vedere la forma del "ginocchio" — con un accorgimento
importante deciso insieme: **la curva teorica va fittata sui dati
grezzi settimanali, non sui punti già smussati dalla media mobile**.
Fittare su dati già smussati sembra più pulito ma smorza il rumore due
volte, e restituisce una curva che sembra più precisa di quanto i dati
reali giustifichino — lo stesso tipo di falsa sicurezza già stanato
altrove in questo collaudo (rho al 1025%, i due "12" identici per
coincidenza).

**Tre livelli sullo stesso grafico, ognuno con lo status che gli
spetta:**

1. **Punti chiari** (invariato): le singole settimane di
   `flowWeeklyBuckets`, dato grezzo, nessuna linea.
2. **Linea continua (media mobile)**: sostituisce le fasce a larghezza
   fissa di `wipBands_`. Ordinare tutte le settimane con
   `ct_medio_giorni !== null` per `wip_medio` crescente, poi calcolare
   una media mobile con finestra a **numero fisso di campioni** (non a
   larghezza fissa in punti) — indicativamente 5-7 settimane,
   configurabile. È il trend empirico, nessuna forma imposta.
3. **Linea tratteggiata (fit teorico)**, solo sopra una soglia minima
   di campioni (vedi sotto): una curva a 2 parametri fittata sui
   **punti grezzi settimanali** (non sulla media mobile) — forma
   asintotica per il tempo di ciclo (cresce senza limite quando il WIP
   si avvicina alla capacità del sistema), forma a saturazione per il
   throughput (cresce poi si appiattisce). Colore più tenue/tratteggio,
   per segnalare visivamente che è un'indicazione teorica, non una
   misura.

```js
// S6: media mobile ordinata per WIP crescente, finestra a numero
// fisso di campioni (non a larghezza fissa in punti come le vecchie
// fasce) - si adatta meglio a distribuzioni non uniformi del WIP.
function wipMovingAverage_(weeklyBuckets, windowSize) {
  var valid = weeklyBuckets.filter(function(b) { return b.ct_medio_giorni !== null; })
    .sort(function(a, b) { return a.wip_medio - b.wip_medio; });
  var result = [];
  for (var i = 0; i + windowSize <= valid.length; i++) {
    var window = valid.slice(i, i + windowSize);
    var avg = function(f) { return round_(window.reduce(function(s, w) { return s + f(w); }, 0) / windowSize); };
    result.push({
      wip_medio: avg(function(w) { return w.wip_medio; }),
      throughput_medio: avg(function(w) { return w.throughput_punti_settimana; }),
      ct_medio: avg(function(w) { return w.ct_medio_giorni; }),
      n_campioni: windowSize
    });
  }
  return result;
}
```

**Soglia minima per la curva tratteggiata**: non tarata su quanti
campioni abbiamo oggi (sarebbe lo stesso trucco già trovato altrove —
una soglia scelta per far entrare i dati attuali invece che per un
criterio a monte). Criterio: una curva a 2 parametri ha bisogno di
almeno 4-5 volte tanti punti quanti parametri per non essere
degenere — soglia minima **10 settimane con campione di tempo di ciclo
valido**. Sotto soglia: solo punti chiari e media mobile, niente
tratteggiata — stesso principio di "Dato non ancora sufficiente" già
in uso per `wipBands_`.

**Nota di pannello obbligatoria, sotto entrambi i grafici**: *"La linea
tratteggiata mostra la forma attesa dalla teoria delle code, calcolata
su N settimane — con questo storico il valore preciso del 'ginocchio'
non è ancora affidabile, solo l'andamento generale."* — `N` è il numero
di settimane realmente usate per il fit, non una costante nel testo.

`wipBands_` viene sostituita da `wipMovingAverage_` in
`buildSystemState_` e nel client — non lasciata morta accanto alla
nuova, stesso principio già applicato a S2/S3 con `wipCycleTimeScatter_`.

**Criteri di accettazione**:
- [ ] `wipMovingAverage_` sostituisce `wipBands_`, finestra a numero
      fisso di campioni (non a larghezza fissa in punti).
- [ ] Curva tratteggiata fittata sui punti grezzi settimanali, non
      sulla media mobile — verificabile leggendo la funzione di fit.
- [ ] Sotto i 10 campioni validi, nessuna curva tratteggiata — solo
      punti e media mobile.
- [ ] Nota di pannello presente sotto entrambi i grafici, col numero
      reale di settimane usate per il fit.
- [ ] `wipBands_` rimossa dal codice, non lasciata inutilizzata accanto
      alla nuova funzione.

## R9.14 (ridefinito una seconda volta, 2026-08-28) — stesso dato, stesso nome, sopra e sotto: niente scorciatoie

**Le due versioni precedenti sono entrambe superate.** La prima
proponeva di distinguere i due numeri con nomi diversi. La seconda
proponeva di tenere solo "Lavoro accettato" in evidenza e rietichettare
la linea del grafico come una stima storica diversa, con una nota a
spiegare la differenza. **Marco (2026-08-28) ha respinto la seconda
esplicitamente**: non è accettabile evitare di scrivere codice nuovo
lasciando in piedi due calcoli diversi con una nota che ne giustifica
lo scarto — se un fatto compare sopra (Vista Rapida) e sotto (il
grafico), deve essere **lo stesso dato, con la stessa definizione**, non
due dati confrontabili solo a parole. **Obbligo esplicito: vietato
cercare scorciatoie per evitare di scrivere nuovo codice.**

**La causa reale**: la linea "Punti aperti" nel grafico "Andamento del
carico" viene da `flowWeeklyBuckets_`, che la calcola come
approssimazione cumulata (`running += entered_points -
completed_points`, settimana dopo settimana) — non da una vera
ricostruzione storica delle colonne. "Lavoro accettato (attuale)"
(Vista Rapida) è invece una fotografia vera dello stato delle colonne
adesso. Non tornano perché **non sono la stessa cosa calcolata in due
modi**: sono due cose diverse. La correzione non è rietichettarle — è
far sì che il grafico calcoli davvero la stessa cosa della card, con lo
stesso metodo.

**Correzione**: S4 ha già costruito, e verificato sui dati reali,
`activeWipWeeklyFromLog_` — una ricostruzione vera dal log
(`activity_log_json`) di quanti punti erano in colonne attive, settimana
per settimana. Va **generalizzata**, non duplicata, per accettare
l'insieme di `role` da includere invece di averlo fisso a `prep`/`wip`/
`stand_by`:

```js
// era (S4): activeWipWeeklyFromLog_(jobs, archivedJobs, weeksCount)
// - filtro fisso sul role 'active' (prep/wip/stand_by), stadi 2-4
// ora: stessa ricostruzione per-job degli intervalli {colonna, dal_ts,
// al_ts} dal log, gia' scritta e verificata per S4 - generalizzata sul
// filtro invece di riscritta da zero:
function stockWeeklyFromLog_(jobs, archivedJobs, weeksCount, includeRoles) {
  // ... stessa logica di ricostruzione degli intervalli di S4 ...
  // era: role === 'prep' || role === 'wip' || role === 'stand_by'
  // ora: includeRoles.indexOf(role) !== -1
}

// Due chiamate sullo stesso motore, due popolazioni dichiarate esplicitamente:
var lavoroInCorsoWeekly = stockWeeklyFromLog_(jobs, archivedJobs, weeksCount, ['prep', 'wip', 'stand_by']);
// stadi 2-4 - "Lavoro in corso", usa S4/S6, grafici diagnostici (invariato)
var lavoroAccettatoWeekly = stockWeeklyFromLog_(jobs, archivedJobs, weeksCount, ['backlog', 'prep', 'wip', 'stand_by']);
// stadi 1-4 - "Lavoro accettato", nuovo uso per "Andamento del carico"
```

`flowWeeklyBuckets_` perde il calcolo cumulato approssimato per la
linea storica di "Andamento del carico" — quella riga confrontava
un'approssimazione con una fotografia vera, ecco perché non tornavano.
Il grafico legge `lavoroAccettatoWeekly`; l'etichetta della linea
diventa **"Lavoro accettato"** — stesso nome esatto della card in
Vista Rapida, non un sinonimo, non una variante "storica".

**Verifica di coerenza obbligatoria** (stesso principio già richiesto
per S4): per la settimana corrente, il valore ricostruito da
`lavoroAccettatoWeekly` deve coincidere, a meno di arrotondamento, con
il numero mostrato dalla card "Lavoro accettato (attuale)" — stessa
fotografia, stesso numero. Se non coincide dopo l'implementazione, non
è un problema di etichetta da correggere con una nota: è un bug nella
ricostruzione, e va risolto prima di considerare chiuso questo punto,
non aggirato.

**"Aggiunti"/"Completati"**: invariato rispetto alla versione
precedente — verificare se il calcolo di card e legenda coincide
(probabile) e, se sì, un solo nome in entrambi i posti.

**Criteri di accettazione**:
- [ ] `activeWipWeeklyFromLog_` generalizzata in `stockWeeklyFromLog_`
      (o nome equivalente), parametrizzata sui `role` da includere —
      **non duplicata in una funzione copiata**, stessa ricostruzione
      per-job riusata per entrambe le popolazioni.
- [ ] Il grafico "Andamento del carico" mostra "Lavoro accettato"
      (stadi 1-4, ricostruito dal log) al posto di "Punti aperti"
      (cumulato approssimato) — etichetta identica, non un sinonimo.
- [ ] Per la settimana corrente, il valore mostrato dal grafico
      coincide, a meno di arrotondamento, con la card "Lavoro accettato
      (attuale)" di Vista Rapida — verificato sui dati reali di TEST,
      non solo per costruzione del codice.
- [ ] Nessuna nota di pannello spiega una differenza tra i due numeri —
      non ce n'è più bisogno: sono lo stesso calcolo.
- [ ] "Aggiunti"/"Completati": verificato se il calcolo di card e
      legenda coincide; se sì, un solo nome in entrambi i posti.

## R9.15 (nuovo, 2026-08-28) — disambiguare "ora" tempo da "ora" adesso

Il marcatore di istantanea "(ora)" (es. "Lavoro accettato (ora)", "Da
fatturare (ora)") è ambiguo in italiano tra "in questo momento" e
"unità di tempo" — rischioso in una dashboard che parla anche di
giorni/ore/settimane altrove. Sostituire con "(attuale)" ovunque nella
dashboard indichi una fotografia dello stato presente (non un totale su
un periodo). Il titolo di pannello "Fermi ora" fa eccezione se
"(attuale)" suona innaturale in quella posizione — in quel caso
riformulare l'intero titolo (es. "Fermi in questo momento") invece di
lasciare "ora" isolato.

**Criteri di accettazione**:
- [ ] Nessuna etichetta usa "(ora)" come marcatore di istantanea —
      sostituito da "(attuale)" o da una riformulazione esplicita dove
      "(attuale)" non si inserisce bene nel titolo.
- [ ] La distinzione fotografia-adesso/totale-periodo resta leggibile
      ovunque comparisse prima "(ora)".

## R9.16 (nuovo, 2026-08-28) — assi verticali separati per stock e flussi in "Andamento del carico"

Trovato da Marco: il grafico "Andamento del carico" mette sullo stesso
asse verticale una grandezza-stock (un livello, la fotografia di quanti
punti erano presenti in un dato istante — "Lavoro accettato", la stessa
serie di R9.14) e grandezze-flusso (tassi per periodo — "Aggiunti" e
"Completati", quanti punti sono entrati o usciti in quel mese). Sono
due tipi di grandezza diversi per natura, con ordini di grandezza
tipicamente diversi: lo stock tende a un numero più alto e più stabile
nel tempo, i flussi mensili più piccoli e più variabili. Sullo stesso
asse, con la stessa scala, lo stock schiaccia visivamente i flussi — le
loro variazioni reali, anche se significative, appaiono come una linea
quasi piatta vicino allo zero.

**Correzione**: due assi verticali indipendenti sullo stesso grafico.
- **Asse sinistro**: lo stock, "Lavoro accettato" (livello, punti
  presenti in un dato istante — la serie ricostruita da R9.14).
- **Asse destro**: i flussi, "Aggiunti" e "Completati" (punti per
  periodo, stessa aggregazione mensile già usata dal grafico).
- Le finestre (range) dei due assi si scelgono **in base alla
  variabilità reale di ciascuna serie sui dati di TEST**, in modo
  indipendente l'una dall'altra — mai forzate per far combaciare
  visivamente le linee tra loro: un asse scelto per creare una
  coincidenza visiva che i dati non hanno è fuorviante quanto uno stock
  e un flusso schiacciati sulla stessa scala, il difetto opposto dello
  stesso errore.
- Ogni asse dichiara la propria unità (principio 7 — vale anche con due
  assi, uno per tipo di grandezza, non solo con uno).
- **Legenda**: ogni voce indica chiaramente a quale asse appartiene —
  es. colore della voce coordinato col colore delle tacche dell'asse
  corrispondente, oppure testo esplicito ("Lavoro accettato — asse
  sinistro", "Aggiunti — asse destro"). Chi legge non deve indovinare
  quale linea usa quale asse.
- **Didascalia sotto il grafico**: una riga in linguaggio semplice che
  spiega la differenza tra le due grandezze per chi non conosce la
  distinzione stock/flusso — non i termini tecnici "stock"/"flusso"
  (quelli restano nei commenti del codice), qualcosa come: "'Lavoro
  accettato' è quanti punti c'erano in carico in quel momento;
  'Aggiunti' e 'Completati' sono quanti punti sono entrati o usciti in
  quel mese" (principio 6).

**Criteri di accettazione**:
- [ ] Il grafico "Andamento del carico" ha due assi verticali
      indipendenti — uno per lo stock ("Lavoro accettato"), uno per i
      flussi ("Aggiunti"/"Completati").
- [ ] Le finestre dei due assi sono scelte sulla variabilità reale di
      ciascuna serie sui dati di TEST, non aggiustate per far combaciare
      visivamente le linee.
- [ ] Ogni asse dichiara la propria unità.
- [ ] La legenda indica chiaramente quale linea usa quale asse.
- [ ] Una didascalia sotto il grafico spiega, in linguaggio semplice, la
      differenza tra "Lavoro accettato" (fotografia di un istante) e
      "Aggiunti"/"Completati" (conteggio per periodo).
- [ ] Verifica manuale su TEST: con i due assi indipendenti, la
      variazione reale dei flussi resta visibile — nessuna delle tre
      linee appare schiacciata contro lo zero o contro il massimo.

**Dipendenza**: va fatto dopo R9.14 (usa la stessa serie "Lavoro
accettato" ricostruita lì) — non prima, altrimenti si separano gli assi
per una linea che verrà comunque riscritta subito dopo.

**Criteri di accettazione generali per tutta la Parte 2**:
- [ ] Prima del push, eseguita la lettura finale pannello-per-pannello
      del principio 8 — esito riportato in `PROGRAMMA_STATO.md`, non
      solo "fatto".
