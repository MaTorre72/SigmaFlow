# DESIGN_faseV2_nuova_dashboard.md

## Fase V2 — Rifondazione delle metriche e delle serie dati per la nuova dashboard

### Stato del documento

Documento di design destinato a Codex.

La Fase V2 prepara il backend e il contratto dati della nuova dashboard SigmaFlow.

La dashboard attuale **non è il modello da preservare**. È da considerare transitoria e, una volta validata la nuova dashboard, dovrà essere:

- abbandonata come dashboard operativa principale;
- oppure relegata a una sezione secondaria di diagnostica, approfondimento, analisi avanzata o taratura.

È possibile e auspicabile riutilizzare funzioni, strutture dati, componenti, grafici o parti di codice già esistenti, purché siano coerenti con le nuove definizioni e non vincolino il nuovo design alla semantica della dashboard legacy.

---

# 0. Obiettivo della fase

La Fase V2 **non ha come obiettivo il rifacimento grafico della dashboard**.

La V2 deve costruire il nuovo livello semantico e dati che alimenterà la nuova interfaccia nella successiva Fase V3.

La fase deve definire in modo univoco:

- quali eventi della cronologia sono significativi;
- come normalizzare la cronologia senza modificare i dati originali;
- quale lavoro appartiene alla pipeline commerciale;
- quale lavoro è acquisito ma ancora da assorbire;
- quale lavoro è effettivamente in corso;
- come trattare le attese;
- come trattare le riprese dopo un'attesa;
- come distinguere il completamento tecnico dalla fase amministrativa;
- come calcolare capacità osservata, capacità dedicata al nuovo lavoro e settimane già impegnate;
- quali serie temporali produrre;
- come predisporre CFD operativo e confronto storico;
- quali metriche, classificazioni e messaggi restituire alla futura UI.

Principio vincolante:

> **Il backend attribuisce significato ai dati; il frontend li presenta.**

Il frontend non deve ricostruire metriche di business, interpretare eventi, applicare formule, classificare indicatori o duplicare soglie.

---

# 1. Strategia rispetto al codice e alla dashboard esistenti

## 1.1 La dashboard legacy è transitoria

La dashboard attuale può restare disponibile durante V2 e V3 per:

- confronto;
- collaudo;
- diagnostica;
- taratura;
- verifica di regressione.

Non deve però condizionare l'architettura della nuova dashboard.

Una volta validata la nuova interfaccia:

- la nuova dashboard diventa la vista operativa principale;
- la vecchia dashboard non deve rimanere come doppione operativo;
- le parti ancora utili possono essere spostate in una sezione secondaria, ad esempio **Diagnostica**, **Analisi avanzata** o **Taratura**;
- le metriche e i pannelli non più utili possono essere rimossi.

## 1.2 Riuso del codice esistente

È consentito riutilizzare:

- funzioni backend già presenti;
- logiche di scansione degli eventi;
- strutture dati;
- componenti grafici;
- componenti HTML/CSS;
- parti di rendering;
- configurazioni;
- serie storiche già calcolate.

Il riuso deve però avvenire solo quando la semantica del dato coincide con quella definita in questo documento.

Non riutilizzare un campo soltanto perché è disponibile se misura una popolazione diversa.

## 1.3 Non modificare in-place l'area appena stabilizzata

La nuova normalizzazione della cronologia deve essere implementata come funzione aggiuntiva e isolata.

Vincolo:

> **Non modificare `computeVisiteFromLog_` o altre funzioni stabilizzate per introdurre la nuova normalizzazione della dashboard.**

La V2 deve costruire un percorso parallelo per le nuove metriche.

Una futura unificazione potrà essere valutata solo dopo validazione e test di regressione.

---

# 2. Architettura logica

La pipeline della nuova dashboard deve essere:

```text
jobs + visite + activity_log_json + config
                ↓
normalizzazione logica dedicata alla dashboard
                ↓
ricostruzione di eventi, visite e stati
                ↓
serie incrementali
                ↓
serie cumulative
                ↓
stock correnti e storici
                ↓
metriche semantiche
                ↓
classificazioni e messaggi
                ↓
dashboardState
                ↓
frontend
```

È preferibile introdurre un nuovo oggetto dedicato, per esempio:

```text
dashboardState
```

La nuova UI non deve dipendere direttamente dalla struttura storica di `systemState`.

---

# 3. Normalizzazione non distruttiva della cronologia

## 3.1 Funzione dedicata

Introdurre una nuova funzione, ad esempio:

```text
normalizeActivityLogForDashboard_()
```

Il nome effettivo può essere adattato alle convenzioni del repository.

La funzione deve lavorare sui dati originali senza modificarli.

## 3.2 Passaggi consecutivi verso la stessa colonna

Sequenze come:

```text
WIP → WIP
```

o:

```text
WIP → WIP → WIP
```

devono essere interpretate come una permanenza continua nello stesso stato.

Non devono generare:

- nuove visite;
- nuovi ingressi in lavorazione;
- nuovi completamenti;
- nuovi tempi di permanenza;
- nuovi eventi produttivi.

Il timestamp valido di ingresso nello stato resta quello del primo evento.

Gli eventi originali devono restare nella cronologia, perché possono essere stati utilizzati impropriamente come annotazioni manuali.

## 3.3 Passaggi con colonne intermedie saltate

Percorsi abbreviati devono essere tollerati.

Esempio:

```text
backlog → wip
```

deve essere considerato un ingresso valido in lavorazione.

Il sistema può riconoscere che `prep` è stato logicamente saltato, ma non deve inventare:

- timestamp;
- durata;
- permanenza fittizia.

Principio:

> Il sistema può ricostruire il significato logico di un percorso, ma non deve creare informazioni temporali non registrate.

## 3.4 Output minimo

La normalizzazione deve poter produrre almeno:

- sequenza logica degli stati;
- eventi significativi;
- duplicati compressi;
- eventuali stati saltati;
- anomalie rilevate;
- riferimenti agli eventi originali.

La stessa funzione normalizzata deve essere riutilizzata da tutte le nuove metriche.

---

# 4. Perimetro operativo delle colonne

Ai fini della nuova dashboard utilizzare i seguenti significati.

| `role` | Significato operativo |
|---|---|
| `neutral` | preventivi e opportunità commerciali non ancora acquisite |
| `backlog` | incarichi professionali accettati ma non ancora pronti o avviati |
| `prep` | lavori pronti o in preparazione immediata all'avvio |
| `wip` | lavori effettivamente in corso |
| `stand_by` | lavori temporaneamente sospesi o in attesa |
| `done` | fase successiva alla conclusione tecnica, prevalentemente amministrativa |

La chiusura definitiva dell'incarico resta distinta dalla colonna.

---

# 5. Vocabolario degli stati visualizzati

Quando serve una classificazione sintetica usare, se appropriato:

- **Basso**
- **Regolare**
- **Elevato**
- **Molto elevato**

Le etichette possono essere comuni.

Le soglie devono essere specifiche per ogni indicatore.

Non riutilizzare automaticamente le soglie legacy `0,70 / 0,85 / 1,00` per:

- WIP;
- quota di lavoro ripreso;
- backlog;
- settimane impegnate;
- altri indicatori con unità differenti.

Le soglie devono essere:

- configurabili;
- calcolate dal backend;
- oppure esplicitamente definite in configurazione.

Il frontend riceve già:

```text
status
message
```

o campi equivalenti.

---

# 6. Indicatore dedicato ai lavori in corso

Il WIP ufficiale della nuova dashboard comprende esclusivamente:

```text
role = wip
```

Non include:

- `backlog`;
- `prep`;
- `stand_by`;
- `done`.

Produrre almeno:

```text
wip_jobs
wip_points
wip_status
wip_message
```

Numero di job e punti devono essere entrambi disponibili.

Il numero di job rappresenta soprattutto il numero di fronti contemporaneamente aperti.

I punti rappresentano la massa stimata di lavoro.

---

# 7. Serie storica del WIP

La nuova serie storica WIP deve utilizzare esclusivamente la permanenza in:

```text
role = wip
```

Non usare per le nuove metriche la vecchia aggregazione:

```text
prep + wip + stand_by
```

Per ogni bucket temporale produrre almeno:

```text
avg_wip_jobs
avg_wip_points
```

La granularità iniziale può essere settimanale.

---

# 8. Lavoro futuro già acquisito

## 8.1 Definizione

Il lavoro già venduto ma non ancora assorbito dalla produzione è:

```text
backlog + prep
```

Non comprende:

- `wip`;
- `stand_by`;
- `done`;
- `neutral`.

Produrre:

```text
future_work_jobs
future_work_points

backlog_jobs
backlog_points

prep_jobs
prep_points
```

Usare `prep_jobs` / `prep_points`.

**Non usare `ready_jobs` / `ready_points`**, perché nel codice esistente `workloadMetrics.ready` corrisponde già al ruolo `backlog` e l'uso del medesimo nome con un significato diverso creerebbe ambiguità.

## 8.2 Etichette future della UI

Indicativamente:

- `backlog` → **Incarichi acquisiti**
- `prep` → **Pronti da avviare**
- `future_work` → **Lavoro già acquisito da programmare**

Le etichette della UI non devono modificare la semantica backend.

---

# 9. Capacità osservata

## 9.1 Misura ufficiale

La capacità principale della nuova dashboard deve derivare dal lavoro realmente completato.

Non usare come capacità ufficiale:

```text
team_size / tempo medio di servizio
```

La vecchia capacità teorica può restare disponibile nella sezione diagnostica o di taratura.

## 9.2 Sorgente del completamento tecnico

Il completamento tecnico deve derivare da:

```text
visita.consegna_ts
```

Non deve derivare da:

```text
job.done_ts
```

e non deve essere ricavato da:

```text
pointsMetrics.completed_points
```

se questo campo continua a essere basato su `done_ts`.

Questa distinzione è vincolante.

## 9.3 Unità

Produrre almeno:

```text
completed_visits_week
completed_points_week
```

Un job può generare più visite/cicli tecnici.

La capacità produttiva deve quindi contare visite/cicli completati, non soltanto job distinti.

Se utile, restituire separatamente:

```text
completed_unique_jobs
```

## 9.4 Media mobile

Il throughput settimanale grezzo deve essere smussato tramite media mobile.

Produrre:

```text
rolling_capacity_points_per_week
rolling_capacity_visits_per_week
```

La finestra deve provenire da:

```text
capacity_window_weeks
```

Il valore della finestra non deve essere hardcoded.

---

# 10. Finestre temporali: significato distinto

Tre parametri devono restare concettualmente separati.

## 10.1 `observation_window_days`

Parametro legacy utilizzato dalle metriche esistenti.

La V2 non ne modifica il significato.

## 10.2 `wip_trend_weeks`

Profondità dello storico settimanale disponibile per serie, grafici e analisi.

## 10.3 `capacity_window_weeks`

Numero di settimane utilizzate per calcolare ogni valore della media mobile della capacità osservata.

Vincolo logico:

```text
wip_trend_weeks >= capacity_window_weeks
```

o, in alternativa, il backend deve verificare esplicitamente che lo storico disponibile sia sufficiente.

Questi tre parametri non sono intercambiabili.

---

# 11. Minimi di campione

I minimi campionari devono restare distinti per calcoli distinti.

Il nuovo:

```text
min_samples_capacity
```

riguarda esclusivamente la stima della nuova capacità osservata.

Non sostituisce automaticamente:

- minimo di rientri necessario al profilo di rilavorazione;
- minimo di completamenti delle metriche legacy;
- minimo di campioni per fit teorici;
- altri limiti già esistenti.

Ogni minimo deve avere un significato esplicito.

---

# 12. Capacità disponibile per assorbire nuovo lavoro

La capacità complessiva comprende anche lavoro ripreso, integrazioni e revisioni.

Per calcolare il carico futuro serve una misura distinta della capacità dedicata al **nuovo lavoro**.

Produrre:

```text
new_work_capacity_points_per_week
```

e, se utile:

```text
new_work_capacity_jobs_per_week
```

La misura deve derivare dal ritmo osservato con cui vengono assorbiti i primi cicli dei nuovi incarichi.

Il backend deve documentare quale evento identifica il primo ciclo.

Utilizzare una finestra mobile coerente con:

```text
capacity_window_weeks
```

Se i dati non sono sufficienti:

```text
value = null
```

Non usare fallback arbitrari.

---

# 13. Settimane di lavoro già impegnate

Calcolare:

```text
committed_weeks =
    future_work_points
    /
    new_work_capacity_points_per_week
```

dove:

```text
future_work_points =
    backlog_points + prep_points
```

Non includere:

- WIP;
- attese;
- preventivi;
- capacità complessiva indiscriminata.

Il significato è:

> settimane equivalenti di normale capacità necessarie per assorbire il lavoro già acquisito ma non ancora entrato stabilmente in produzione.

Non rappresenta:

- data di consegna;
- promessa al cliente;
- durata del singolo incarico.

Restituire anche:

```text
committed_weeks
committed_weeks_quality
committed_weeks_sample_size
```

---

# 14. Quattro flussi operativi

La futura UI non deve usare termini astratti come “ingressi”, “rientri”, “avvii” e “completamenti”.

Usare le seguenti definizioni.

## 14.1 Nuovi incarichi acquisiti

Lavori che entrano per la prima volta nel perimetro produttivo dopo l'accettazione.

Evento normale:

```text
→ backlog
```

Se `backlog` viene saltato, usare la prima entrata equivalente in:

```text
prep
```

oppure:

```text
wip
```

Non usare automaticamente `arrival_ts` se rappresenta una fase commerciale precedente.

## 14.2 Lavori ripresi dopo un'attesa

Lavori che tornano verso il ciclo produttivo dopo:

```text
stand_by
```

Destinazioni ammesse:

```text
backlog
prep
wip
```

Le riaperture dopo chiusura definitiva sono escluse.

## 14.3 Lavori entrati in lavorazione

Ogni ingresso effettivo in:

```text
wip
```

che apre una nuova fase operativa.

Non limitarsi al primo ingresso assoluto del job.

## 14.4 Lavori completati tecnicamente

Ogni visita/ciclo tecnico che riceve:

```text
consegna_ts
```

Questo è il flusso da usare per il throughput produttivo.

---

# 15. Serie temporali incrementali

Per ogni bucket produrre almeno:

```text
period_start
period_end
calendar_year
month
iso_week
iso_week_year

new_work_jobs
new_work_points

resumed_work_visits
resumed_work_points

started_work_visits
started_work_points

completed_visits
completed_points
```

La nomenclatura finale può essere adattata, ma deve essere inequivocabile.

---

# 16. Serie cumulative dei flussi

Produrre dal backend:

```text
cum_new_work_jobs
cum_new_work_points

cum_resumed_work_visits
cum_resumed_work_points

cum_started_work_visits
cum_started_work_points

cum_completed_visits
cum_completed_points
```

Queste serie servono a leggere i flussi e ad alimentare analisi e grafici.

Non devono essere calcolate nel frontend.

---

# 17. Distinzione tra cumulative degli eventi e CFD operativo

Le serie cumulative descritte nel paragrafo precedente rappresentano eventi avvenuti nel sistema:

- nuovi incarichi acquisiti;
- lavori ripresi dopo un'attesa;
- ingressi in lavorazione;
- completamenti tecnici.

Queste serie devono essere conservate e rese disponibili, ma **non devono essere utilizzate da sole per ricostruire il WIP o gli altri stock**.

SigmaFlow non è infatti un processo strettamente lineare.

Un lavoro può seguire, per esempio, percorsi come:

```text
backlog → prep → wip → stand_by → prep → wip
```

oppure:

```text
wip → stand_by → wip
```

Un'uscita dal WIP non corrisponde quindi necessariamente a un completamento tecnico.

Di conseguenza non è corretto calcolare il WIP semplicemente come differenza fra ingressi cumulativi in lavorazione e completamenti cumulativi.

## 17.1 Principio di costruzione

Il CFD operativo deve essere costruito a partire dagli **stock effettivamente presenti nei diversi stati in ciascun momento**.

Il backend deve ricostruire, per ogni bucket temporale:

```text
future_work_stock =
    backlog + prep

wip_stock =
    role wip

waiting_stock =
    role stand_by
```

I valori devono essere disponibili sia:

- in numero di lavori;
- in punti.

La ricostruzione deve utilizzare la cronologia normalizzata definita nella presente V2.

## 17.2 Confini delle bande

La base del diagramma può essere costituita dalla cumulata dei completamenti tecnici:

```text
completed_boundary(t) =
    cumulative_technical_completions(t)
```

Le altre linee vengono costruite aggiungendo gli stock effettivi presenti nel sistema:

```text
waiting_boundary(t) =
    completed_boundary(t)
    + waiting_stock(t)
```

```text
wip_boundary(t) =
    waiting_boundary(t)
    + wip_stock(t)
```

```text
future_work_boundary(t) =
    wip_boundary(t)
    + future_work_stock(t)
```

L'ordine grafico definitivo delle bande potrà essere verificato in V3 in funzione della leggibilità.

Il requisito fondamentale è che **lo spessore di ogni banda corrisponda sempre allo stock reale che rappresenta**.

Pertanto:

```text
waiting_boundary - completed_boundary
= waiting_stock
```

```text
wip_boundary - waiting_boundary
= wip_stock
```

```text
future_work_boundary - wip_boundary
= future_work_stock
```

## 17.3 Conseguenze

La linea superiore del CFD non deve essere interpretata automaticamente come semplice cumulata dei nuovi incarichi acquisiti.

In presenza di:

- attese;
- riprese;
- ritorni in lavorazione;
- percorsi non lineari;

questa equivalenza non è garantita.

Il CFD operativo deve essere interpretato come:

> completamenti tecnici cumulativi più lavoro ancora presente nei diversi stati del sistema.

Le cumulative degli eventi restano disponibili separatamente per analizzare l'intensità dei diversi flussi.

## 17.4 Uscite e rientri dalle attese

Movimenti come:

```text
wip → stand_by
```

devono ridurre immediatamente:

```text
wip_stock
```

e aumentare:

```text
waiting_stock
```

senza richiedere un completamento tecnico.

Analogamente:

```text
stand_by → prep
```

deve ridurre lo stock in attesa e aumentare il lavoro futuro/pronto.

Un movimento:

```text
stand_by → wip
```

deve ridurre lo stock in attesa e aumentare il WIP.

Questi movimenti devono modificare lo spessore delle bande sulla base dello stato reale del job.

## 17.5 Coerenza con il ribasamento

Il ribasamento annuale resta esclusivamente grafico.

All'inizio del periodo viene determinato:

```text
offset =
    completed_boundary(t0)
```

Lo stesso offset viene sottratto a tutte le linee di confine.

In questo modo:

- i completamenti antecedenti al periodo vengono eliminati solo dalla scala grafica;
- il WIP già aperto resta visibile;
- il lavoro in attesa resta visibile;
- backlog e prep già esistenti restano visibili;
- lo spessore delle bande non cambia.

## 17.6 Test di coerenza obbligatori

Per ogni bucket temporale il backend deve verificare che:

```text
wip_stock
```

corrisponda al numero/punti dei job realmente nel ruolo `wip`;

```text
waiting_stock
```

corrisponda ai job realmente in `stand_by`;

```text
future_work_stock
```

corrisponda ai job realmente in `backlog + prep`.

Il CFD non deve essere considerato validato se le differenze fra le boundary non riproducono esattamente questi stock, salvo arrotondamenti o regole temporali esplicitamente documentate.

---

# 18. Interpretazione sintetica del flusso

Il backend può restituire una classificazione semplice:

- carico in aumento;
- sostanzialmente bilanciato;
- carico in riduzione.

Produrre:

```text
flow_status
flow_message
```

La tolleranza usata per definire “bilanciato” non deve derivare da un valore illustrativo hardcoded.

---

# 19. Riaperture dopo chiusura definitiva

## 19.1 Trattamento

Devono essere distinte dalle normali riprese dopo un'attesa.

Sono eventi eccezionali.

## 19.2 Spike tecnico obbligatorio prima dell'implementazione

Verificare se la cronologia consente di ricostruire in modo affidabile:

- chiusura precedente;
- timestamp della chiusura;
- successiva riapertura;
- persistenza storica dell'informazione dopo il ricalcolo di `incarico_chiuso_ts`.

Non assumere che il valore corrente di `incarico_chiuso_ts` sia sufficiente.

Se ricostruibile, produrre:

```text
post_closure_reopenings
```

Se non ricostruibile, documentare il limite e non bloccare la V2.

Priorità: diagnostica, non dashboard principale.

---

# 20. Sezione “Da verificare”

Predisporre una struttura:

```text
issues[]
```

Ogni elemento può contenere:

```text
type
severity
job_id
title
message
detected_at
```

Possibili categorie:

- permanenza eccessiva in WIP;
- lavoro in `prep` da troppo tempo;
- attesa esterna lunga;
- cronologia anomala;
- riapertura post-chiusura;
- record senza taglia;
- stato non aggiornato da molto tempo;
- job escluso da una ricostruzione.

Le anomalie ricalcolabili devono essere dinamiche.

Non creare flag persistenti salvo necessità esplicita.

Questa parte è utile ma **non bloccante** per la V2.

---

# 21. Divieto di calcoli di business nel frontend

Requisito vincolante.

Il frontend non deve:

- sommare `backlog + prep`;
- calcolare WIP;
- calcolare settimane impegnate;
- calcolare medie mobili;
- ricostruire i flussi;
- classificare eventi;
- riconoscere nuovo lavoro o lavoro ripreso;
- determinare completamenti tecnici;
- applicare soglie;
- calcolare cumulative;
- interpretare cronologie;
- applicare formule statistiche.

Il backend deve restituire dati già semanticamente completi.

Eccezione ammessa:

> trasformazioni puramente grafiche che non cambiano il significato dei dati, come applicare un offset comune già definito dal backend per il ribasamento grafico del CFD.

---

# 22. Contratto dati della nuova dashboard

Struttura indicativa:

```text
dashboardState
  currentWork
  capacity
  futureWork
  resumedWork
  waiting
  flow
  cfd
  history
  issues
  dataQuality
  diagnostics
```

Ogni campo deve avere significato unico.

Evitare nomi ambigui come:

```text
ready
completed
load
```

se non specificano chiaramente la popolazione.

Preferire:

```text
prep_jobs
completed_visits
future_work_points
```

---

# 23. CFD operativo e confronto storico

Le nuove serie devono supportare due viste distinte:

1. **CFD operativo**
2. **Confronto storico**

Il CFD operativo serve a capire:

> come sta evolvendo il flusso di lavoro?

Il confronto storico serve a capire:

> il comportamento attuale è normale rispetto a periodi equivalenti del passato?

Non fondere i due scopi nello stesso grafico.

---

# 24. Ribasamento annuale del CFD

## 24.1 Principio

Il ribasamento è esclusivamente grafico.

Non modifica:

- database;
- cumulative reali;
- stock;
- backlog;
- WIP;
- throughput;
- statistiche.

## 24.2 Offset comune

Per una vista che inizia in `t0`, utilizzare come offset comune:

> **il valore del confine dei completamenti tecnici all'inizio del periodo.**

Sottrarre lo stesso valore a tutte le linee di confine.

In questo modo, all'inizio del periodo:

```text
completed_boundary = 0
```

mentre:

```text
wip_boundary = WIP già aperto
```

e:

```text
future_work_boundary =
    WIP + backlog + prep già presenti
```

Il sistema non viene azzerato artificialmente.

---

# 25. Lavoro già aperto a inizio anno

Il cambio d'anno non rappresenta un azzeramento del sistema.

Il lavoro ereditato dall'anno precedente deve restare visibile.

La vista annuale modifica l'origine grafica, non il contenuto reale.

---

# 26. Confronto storico anno su anno

Predisporre una vista distinta dal CFD operativo.

Consentire confronti per:

- mese;
- settimana dell'anno.

Indicatori minimi:

- nuovi incarichi acquisiti;
- completamenti tecnici;
- lavoro futuro (`backlog + prep`);
- WIP;
- throughput.

Quando disponibile, mostrare sia:

- punti;
- conteggi.

Le definizioni devono essere identiche per tutti gli anni confrontati.

---

# 27. Metadati temporali e settimane ISO

Ogni bucket deve restituire almeno:

```text
period_start
period_end
calendar_year
month
iso_week
iso_week_year
```

Gestire correttamente:

- settimane ISO che iniziano a dicembre;
- settimane ISO che terminano a gennaio;
- settimana ISO 53.

Il frontend non deve reinterpretare autonomamente queste date.

---

# 28. Disponibilità dello storico

Il backend deve poter dichiarare:

```text
history_start
available_years
comparable_years
```

L'infrastruttura del confronto storico deve essere predisposta anche se lo storico disponibile non è ancora sufficiente per confronti robusti.

La UI futura dovrà poter mostrare uno stato come:

> dati storici ancora insufficienti

senza inventare confronti.

---

# 29. Anno corrente vs storico

La struttura deve permettere in futuro il confronto tra:

- anno corrente;
- media storica;
- mediana storica;
- eventuale fascia tipica.

Il metodo statistico definitivo non viene fissato in V2.

Obiettivi futuri:

- riconoscere stagionalità;
- evidenziare accelerazioni anomale;
- individuare crescita anticipata del backlog;
- osservare aumento del WIP;
- rilevare rallentamento del throughput;
- produrre segnali precoci di possibile congestione.

---

# 30. Monitoraggio sperimentale della congestione

Il modello ufficiale della dashboard resta il modello a **plateau**.

Non introdurre automaticamente un decadimento della capacità.

La diagnostica può continuare a confrontare:

```text
plateau model
```

con:

```text
congestion model
```

La presenza di una possibile campana o di un tratto discendente resta sperimentale.

Non deve modificare il modello operativo senza decisione esplicita futura.

---

# 31. Parametri di configurazione

Valutare almeno:

```text
capacity_window_weeks

wip_target_min_jobs
wip_target_max_jobs
wip_warning_jobs

future_work_warning_weeks

min_samples_capacity

history_comparison_granularity
```

I valori numerici eventualmente citati in documenti, test o esempi sono illustrativi.

Non hardcodarli salvo esplicita decisione.

---

# 32. Qualità delle nuove metriche

Per le metriche stimate restituire, ove applicabile:

```text
value
quality
sample_size
window
```

Se i dati non sono sufficienti:

```text
value = null
```

Non utilizzare fallback numerici arbitrari.

---

# 33. Priorità di implementazione

## Priorità 1 — indispensabile

1. nuova funzione di normalizzazione isolata;
2. perimetro operativo aggiornato;
3. WIP solo `wip`, in numero e punti;
4. lavoro futuro = `backlog + prep`;
5. completamento tecnico basato su `consegna_ts`;
6. capacità osservata con media mobile;
7. capacità per nuovo lavoro;
8. settimane impegnate;
9. corretta classificazione dei quattro flussi;
10. serie incrementali;
11. serie cumulative;
12. metadati temporali.

## Priorità 2 — importante

1. nuovo `dashboardState`;
2. dataset CFD;
3. predisposizione del ribasamento annuale;
4. classificazioni e messaggi backend;
5. qualità delle stime;
6. struttura per confronto storico.

## Priorità 3 — non bloccante

1. `issues[]`;
2. riaperture post-chiusura;
3. diagnostica sperimentale della congestione;
4. statistiche storiche avanzate.

---

# 34. Test minimi di accettazione

## 34.1 Evento duplicato

```text
WIP → WIP → WIP
```

deve produrre una sola permanenza continua.

## 34.2 Stato saltato

```text
backlog → wip
```

deve produrre un ingresso valido in lavorazione senza durata inventata in `prep`.

## 34.3 Nuovo incarico

Un passaggio dalla pipeline commerciale al backlog deve generare un solo evento di nuovo incarico acquisito.

## 34.4 Ripresa dopo attesa

```text
stand_by → prep → wip
```

deve generare:

- una ripresa dopo attesa;
- un successivo ingresso in lavorazione;

ma non un nuovo incarico acquisito.

## 34.5 WIP

Un job in `stand_by` non deve essere conteggiato nel WIP.

## 34.6 Lavoro futuro

Un job già in WIP non deve essere conteggiato nel lavoro futuro.

## 34.7 Completamento tecnico

Una visita con `consegna_ts` deve risultare completata tecnicamente anche se il job non è ancora nello stato amministrativo finale.

## 34.8 Chiusura amministrativa

Un `done_ts` senza nuovo `consegna_ts` non deve generare un nuovo completamento tecnico.

## 34.9 Passaggio da WIP ad attesa

Un passaggio:

```text
wip → stand_by
```

deve, nello stesso momento o bucket temporale coerente:

- ridurre `wip_stock`;
- aumentare `waiting_stock`;
- non incrementare i completamenti tecnici in assenza di `consegna_ts`.

Il CFD deve quindi trasferire lo spessore dalla banda WIP alla banda Attesa senza modificare la cumulata dei completamenti.

## 34.10 Rientro diretto dall'attesa al WIP

Un passaggio:

```text
stand_by → wip
```

deve:

- ridurre `waiting_stock`;
- aumentare `wip_stock`;
- generare un nuovo ingresso in lavorazione secondo le regole dei flussi;
- non generare un nuovo incarico acquisito.

## 34.11 Rientro dall'attesa a `prep`

Un passaggio:

```text
stand_by → prep
```

deve:

- ridurre `waiting_stock`;
- aumentare `future_work_stock`;
- essere classificato come lavoro ripreso dopo un'attesa;
- non essere conteggiato nel WIP finché non avviene un successivo ingresso in `wip`.

## 34.12 Coerenza delle bande CFD

Per ogni bucket temporale deve risultare:

```text
waiting_boundary - completed_boundary
= waiting_stock
```

```text
wip_boundary - waiting_boundary
= wip_stock
```

```text
future_work_boundary - wip_boundary
= future_work_stock
```

La verifica deve essere eseguita sia in punti sia in conteggi, quando entrambe le unità sono disponibili.

## 34.13 Settimane impegnate

Devono dipendere da:

```text
backlog + prep
```

e dalla capacità dedicata al nuovo lavoro.

## 34.14 Frontend

Nessuna metrica di business deve essere ricostruita tramite formule client-side.

---

# 35. Validazione sui dati reali

Prima della Fase V3 verificare:

1. coerenza fra punti e conteggi;
2. WIP ricostruito esclusivamente da `wip`;
3. correttezza delle riprese;
4. correttezza dei completamenti tecnici;
5. comportamento della media mobile della capacità;
6. capacità per nuovo lavoro;
7. settimane impegnate;
8. coerenza delle serie cumulative;
9. coerenza matematica delle bande CFD;
10. corretto ribasamento annuale;
11. disponibilità effettiva dello storico comparabile.

---

# 36. Output atteso della V2

Al termine deve esistere un contratto dati stabile per la nuova dashboard.

La V3 dovrà potersi concentrare esclusivamente su:

- wireframe;
- gerarchia visiva;
- card;
- grafici;
- drill-down;
- responsive design;
- tooltip;
- messaggi operativi.

La V3 non deve più dover decidere il significato dei dati.

---

# 37. Destino della dashboard legacy

Durante V2 e V3 la dashboard legacy può restare disponibile per:

- confronto;
- collaudo;
- diagnostica;
- taratura.

Una volta validata la nuova dashboard:

- la nuova dashboard diventa la vista principale;
- la vecchia dashboard viene rimossa come vista operativa;
- eventuali pannelli utili vengono spostati in una sezione secondaria;
- il codice legacy può essere rimosso solo dopo verifica delle dipendenze residue.

La dashboard legacy è quindi una **fonte di componenti e logiche riutilizzabili**, non il modello funzionale da conservare.

---

# 38. Principio finale

La V2 deve produrre una separazione netta:

```text
dati grezzi
→ normalizzazione
→ eventi significativi
→ flussi
→ stock
→ metriche
→ messaggi
→ presentazione
```

La nuova dashboard deve essere costruita su questo contratto dati.

La dashboard esistente non deve essere riprodotta con una grafica diversa: deve essere sostituita da una nuova interfaccia costruita sulle nuove definizioni.
