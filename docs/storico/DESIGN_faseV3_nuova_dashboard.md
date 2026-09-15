# DESIGN_faseV3_nuova_dashboard.md

## Fase V3 — Nuova dashboard operativa SigmaFlow

### Stato del documento

Documento di design operativo per Codex.

La Fase V2 è considerata chiusa sul backend TEST nel perimetro validato. La V3 ha lo scopo di costruire la nuova dashboard operativa utilizzando il contratto `dashboardState` V2, senza riprodurre la struttura della dashboard legacy.

La dashboard attuale resta temporaneamente disponibile per confronto, diagnostica e taratura, ma non costituisce il modello UX da conservare.

---

# 0. Obiettivo della V3

La nuova dashboard deve permettere di capire in pochi secondi:

1. **Come sta funzionando il sistema oggi?**
2. **Quanto lavoro è realmente in corso?**
3. **Quanto lavoro è già acquisito ma deve ancora essere assorbito?**
4. **Quanto il lavoro viene interrotto e ripreso?**
5. **Il sistema sta accumulando, lavorando regolarmente o rallentando?**

La dashboard deve privilegiare diagnosi e decisioni operative.

Non deve esporre in primo piano la complessità matematica del modello.

I dettagli tecnici devono essere disponibili solo tramite:

- tooltip;
- dettaglio espandibile;
- sezione diagnostica;
- sezione taratura/analisi avanzata.

---

# 1. Principi UX

## 1.1 Prima la diagnosi, poi i numeri

La dashboard principale deve mostrare anzitutto:

- stato;
- tendenza;
- eventuale criticità;
- messaggio operativo sintetico.

I numeri devono sostenere la diagnosi, non sostituirla.

## 1.2 Poche informazioni principali

La schermata iniziale non deve diventare un pannello analitico.

Massimo consigliato:

- 1 indicatore sintetico principale;
- 3–4 card operative;
- 1 grafico di flusso;
- 1 sezione secondaria per dettagli/segnalazioni.

## 1.3 Nessun calcolo di business nel frontend

Il frontend non deve:

- ricostruire WIP;
- sommare backlog + prep;
- calcolare settimane impegnate;
- calcolare medie mobili;
- stimare capacità;
- classificare il sistema;
- applicare soglie;
- interpretare eventi;
- ricostruire episodi WIP;
- calcolare CFD.

Il frontend visualizza dati e classificazioni restituiti dal backend.

## 1.4 Nessuna falsa precisione

Se un indicatore non è stimabile:

- non mostrare zero;
- non mostrare verde;
- non mostrare una stima di fallback non dichiarata.

Mostrare invece:

> Dato non ancora disponibile

oppure:

> Storico insufficiente per una stima affidabile

---

# 2. Architettura informativa della dashboard

La nuova dashboard deve essere organizzata in cinque livelli.

## Livello 1 — Stato del sistema

Indicatore sintetico principale:

> **Stato del flusso**

Deve riassumere il comportamento produttivo senza obbligare l'utente a interpretare tre o quattro indicatori separati.

## Livello 2 — Carico corrente

Card dedicate a:

- lavori in corso;
- lavoro già acquisito da programmare;
- settimane equivalenti già impegnate;
- lavori in attesa.

## Livello 3 — Dinamica del flusso

Grafico principale:

- CFD operativo basato sugli stock reali.

Eventuale grafico secondario:

- flussi/eventi nel tempo.

## Livello 4 — Riprese e frammentazione

Indicatore dedicato a:

- episodi WIP;
- riprese/rilavorazioni;
- quota di episodi successivi al primo.

## Livello 5 — Diagnostica

Area secondaria per:

- qualità dati;
- indicatori non disponibili;
- anomalie;
- taratura;
- capacità teoriche/storiche;
- eventuale confronto sperimentale della congestione.

---

# 3. Indicatore principale: “Stato del flusso”

## 3.1 Obiettivo

Lo “Stato del flusso” deve sintetizzare la diagnosi operativa del sistema.

Non deve mostrare direttamente in primo piano:

- capacità storica;
- throughput recente;
- ritmo atteso;
- WIP;
- numero di completamenti.

Queste grandezze alimentano la diagnosi e possono essere mostrate in piccolo o nel dettaglio.

## 3.2 Stati concettuali

La classificazione iniziale prevista è:

```text
UNDERFED
REGULAR
SLOWING
HIGH_LOAD
ACCELERATED
INSUFFICIENT_DATA
```

Etichette UI:

| Codice | Etichetta |
|---|---|
| `UNDERFED` | Sottoalimentato |
| `REGULAR` | Regolare |
| `SLOWING` | Rallentato |
| `HIGH_LOAD` | Carico elevato |
| `ACCELERATED` | Ritmo elevato |
| `INSUFFICIENT_DATA` | Dati insufficienti |

Le etichette UX devono restare in italiano, leggibili e comprensibili anche senza alcuna preparazione matematica, statistica o di teoria delle code.

## 3.3 Regola di precedenza: stati reciprocamente esclusivi

Le classificazioni devono essere **deterministiche e reciprocamente esclusive**.

Non è ammesso che la scelta dello stato dipenda implicitamente dall'ordine delle condizioni nel codice.

Applicare la seguente precedenza:

```text
1. HIGH_LOAD
   se il WIP è oltre la fascia utile superiore

2. UNDERFED
   se il WIP è sotto la fascia utile inferiore

3. INSUFFICIENT_DATA
   se il WIP è nella fascia ordinaria ma i dati recenti
   non consentono una diagnosi affidabile del ritmo

4. SLOWING
   se il WIP è nella fascia ordinaria e il ritmo recente
   è significativamente inferiore al riferimento atteso

5. ACCELERATED
   se il WIP è nella fascia ordinaria e il ritmo recente
   è significativamente superiore al riferimento atteso

6. REGULAR
   negli altri casi compatibili con il funzionamento ordinario
```

La precedenza è vincolante.

In particolare:

> `HIGH_LOAD` prevale su `SLOWING` quando entrambe le condizioni sarebbero vere.

Motivo: un WIP oltre la fascia utile rappresenta la condizione operativa primaria da segnalare.

La seconda informazione non deve essere persa: il messaggio può specificare, per esempio:

> Molti lavori sono contemporaneamente aperti e il ritmo recente è inferiore a quello atteso.

Analogamente, `UNDERFED` prevale sulla mancanza di dati recenti se il WIP è chiaramente sotto la fascia utile: il sistema può essere classificato come sottoalimentato anche senza completamenti recenti sufficienti.

## 3.4 Modello iniziale per la diagnosi

Per la V3 non è necessario stimare una curva continua e dettagliata:

```text
WIP → throughput atteso
```

La diagnosi iniziale deve utilizzare il modello ufficiale a plateau già scelto:

```text
WIP sotto la fascia utile
→ sistema sottoalimentato

WIP nella fascia utile
→ sistema sufficientemente alimentato
→ riferimento = capacità storica osservata in regime carico

WIP sopra la fascia utile
→ carico elevato
→ non assumere capacità superiore al plateau
```

Questa impostazione è preferibile perché:

- richiede meno dati;
- è coerente con la calibrazione già effettuata;
- non forza una relazione continua non ancora dimostrata;
- riduce il rischio che lo “Stato del flusso” resti inutilizzabile per scarsità di varietà storica dei livelli WIP.

Una futura calibrazione potrà affinare la relazione tra WIP e throughput senza cambiare la UX principale.

## 3.5 Confronto con il ritmo recente

Quando il WIP è nella fascia ordinaria, confrontare il throughput recente con il riferimento storico di regime.

Concettualmente:

```text
ritmo recente << riferimento
→ SLOWING

ritmo recente ≈ riferimento
→ REGULAR

ritmo recente >> riferimento
→ ACCELERATED
```

Le tolleranze non devono essere hardcoded arbitrariamente nel frontend.

Devono essere definite e restituite dal backend.

## 3.6 Interpretazioni minime

### Sottoalimentato

WIP insufficiente per esprimere la capacità storica.

Messaggio esempio:

> Il sistema ha poco lavoro attivo rispetto alla fascia abituale.

### Regolare

WIP e throughput recente sono coerenti con il comportamento storico atteso.

Messaggio esempio:

> Ritmo coerente con il carico attuale.

### Rallentato

WIP nella fascia ordinaria, ma throughput recente significativamente inferiore al riferimento atteso.

Messaggio esempio:

> Il lavoro attivo è sufficiente, ma i completamenti sono sotto il ritmo atteso.

### Carico elevato

WIP oltre la fascia utile.

Messaggio esempio:

> Molti lavori sono contemporaneamente aperti senza un aumento osservato della capacità.

Se contemporaneamente il throughput recente è sotto il riferimento, il messaggio può aggiungere:

> Anche il ritmo recente è inferiore a quello atteso.

Non usare termini come “congestionato” o “produttività ridotta” finché il decadimento non è dimostrato.

### Ritmo elevato

Throughput recente superiore al riferimento storico atteso.

Messaggio esempio:

> I completamenti recenti sono superiori al ritmo abituale.

Non interpretarlo automaticamente come miglioramento strutturale.

### Dati insufficienti

Il WIP è nella fascia ordinaria, ma i dati recenti non consentono un confronto affidabile.

Messaggio esempio:

> Dati recenti insufficienti per valutare il ritmo del sistema.

## 3.7 Dati di supporto

Nel dettaglio o in piccolo mostrare, quando disponibili:

```text
capacità storica osservata
throughput recente
WIP corrente
fascia WIP di riferimento
campioni recenti
qualità della stima
```

Non trasformare questi valori in sei card separate.

# 4. Nota tecnica: estensione backend necessaria per lo “Stato del flusso”

Il backend V2 attuale non espone ancora in forma completa:

- baseline storica ufficiale della capacità;
- classificazione completa dello stato del flusso;
- qualità del confronto tra ritmo recente e riferimento storico.

Per la V3 questa funzione deve essere sviluppata come **estensione backend coordinata con la UI**.

Non è necessario, in questa fase, costruire una funzione continua dettagliata del tipo:

```text
expected_current_throughput = f(WIP)
```

La prima implementazione deve essere più robusta e coerente con il modello a plateau.

Tenere distinti almeno:

```text
historical_observed_capacity
recent_completion_throughput
wip_current
wip_target_min
wip_target_max
```

e restituire:

```text
system_flow_status
system_flow_message
system_flow_quality
system_flow_detail
```

La baseline storica deve rappresentare la capacità osservata nei periodi sufficientemente caricati, non la media indiscriminata di tutta la storia.

Il throughput recente deve restare un dato distinto e non deve essere sostituito silenziosamente dalla baseline storica quando il campione è insufficiente.

Se in futuro verrà introdotto un proxy più raffinato del ritmo attuale, dovrà essere aggiunto come informazione separata e validata, senza cambiare retroattivamente il significato dei campi già esposti.

# 5. Card “Lavori in corso”

Mostrare:

```text
wip_jobs
wip_points
```

Etichetta principale:

> **Lavori in corso**

Messaggio secondario possibile:

> X lavori attivi · Y punti

Il perimetro è esclusivamente:

```text
role = wip
```

Non includere:

- prep;
- backlog;
- stand_by.

Se disponibili:

```text
wip_status
wip_message
```

devono provenire dal backend.

---

# 6. Card “Lavoro già acquisito”

Mostrare:

```text
future_work_jobs
future_work_points
```

dove:

```text
future_work = backlog + prep
```

Etichetta:

> **Lavoro già acquisito**

Sottotitolo possibile:

> Da programmare o avviare

Non includere:

- WIP;
- attese;
- pipeline commerciale.

---

# 7. Card “Settimane già impegnate”

Mostrare:

```text
committed_weeks
```

Etichetta:

> **Settimane di lavoro già impegnate**

Messaggio esplicativo consigliato:

> Settimane equivalenti necessarie per assorbire il lavoro già acquisito, sulla base del ritmo osservato con cui nuovi lavori entrano in lavorazione.

Tooltip sintetico:

> Calcolate sul ritmo di assorbimento del nuovo lavoro.

Evitare formule generiche come:

> capacità necessaria

perché possono confondere questa metrica con la capacità di completamento o con la capacità storica osservata.

Non presentare `committed_weeks` come:

- tempo di consegna;
- previsione di chiusura;
- SLA;
- promessa al cliente.

Se `committed_weeks = null`, mostrare:

> Ritmo di assorbimento del nuovo lavoro non ancora stimabile.

# 8. Card “Lavori in attesa”

Mostrare:

```text
waiting_jobs
waiting_points
```

Etichetta:

> **In attesa**

Questa card rappresenta anche il concetto precedentemente indicato come:

> carico potenzialmente in rientro

La scelta è deliberata: non creare una card separata, ma rendere esplicito nella card “In attesa” che questo lavoro può rientrare nel sistema produttivo.

Testo esplicativo consigliato:

> Lavoro temporaneamente fermo che può rientrare in lavorazione.

Se il backend distingue le tipologie:

- attesa cliente;
- attesa ente;
- attesa interna;

queste possono essere mostrate nel dettaglio, non necessariamente nella card principale.

Distinzione UX da mantenere:

```text
In attesa
= lavoro che può rientrare

Lavori ripresi
= lavoro che è già rientrato
```

# 9. Riprese e frammentazione

La dashboard deve distinguere chiaramente:

```text
wip_episode_number = 1
```

da:

```text
wip_episode_number > 1
```

Indicatori possibili:

```text
first_wip_episodes
rework_wip_episodes
total_wip_episodes
rework_episode_share
```

Etichetta UI consigliata:

> **Lavori ripresi**

Il significato è:

> nuove entrate in lavorazione di job già precedentemente usciti dal WIP.

Non usare:

- `numero_visita` legacy;
- `consegna_ts`;

per determinare la ripresa.

---

# 10. CFD operativo

Il grafico principale di flusso deve utilizzare le bande basate sugli stock reali.

Stock:

```text
future_work_stock = backlog + prep
wip_stock = wip
waiting_stock = stand_by
```

Boundary:

```text
completed_boundary
waiting_boundary
wip_boundary
future_work_boundary
```

Il requisito fondamentale è:

```text
waiting_boundary - completed_boundary
= waiting_stock

wip_boundary - waiting_boundary
= wip_stock

future_work_boundary - wip_boundary
= future_work_stock
```

Il cambio d'anno non deve azzerare gli stock già presenti.

---

# 11. Vista dei flussi

Le cumulative degli eventi restano distinte dal CFD.

Eventi:

- nuovi incarichi acquisiti;
- lavori ripresi;
- ingressi in WIP;
- completamenti tecnici.

La scelta UX è **deliberata**:

> il grafico cumulativo dei flussi non appartiene alla home principale della V3.

Motivo:

- la home deve restare operativa e leggibile;
- il grafico principale “Andamento del lavoro” basato sugli stock reali è sufficiente per la lettura quotidiana;
- un secondo grafico cumulativo in home renderebbe la schermata più analitica e meno immediata.

La vista cumulativa dei flussi deve restare disponibile come:

- drill-down;
- approfondimento;
- diagnostica;
- analisi avanzata;
- taratura.

Non deve essere eliminata dal sistema dati, solo retrocessa rispetto alla gerarchia principale.

# 12. Capacità: terminologia UI

Evitare una card generica chiamata soltanto:

> Capacità

Distinguere semanticamente:

## 12.1 Ritmo di assorbimento del nuovo lavoro

Backend attuale:

```text
new_work_capacity_points_per_week
```

Significato:

> ritmo con cui nuovi job entrano nel loro primo episodio WIP.

Serve soprattutto per:

```text
committed_weeks
```

## 12.2 Throughput recente di completamento

Backend attuale:

```text
rolling_capacity_points_per_week
rolling_capacity_visits_per_week
```

Da presentare come:

> **Throughput recente**

oppure:

> **Ritmo recente di completamento**

Non chiamarlo da solo “capacità produttiva”.

## 12.3 Capacità storica osservata

Nuova estensione backend necessaria per lo “Stato del flusso”.

Significato:

> ritmo storicamente osservato nei periodi in cui il sistema aveva sufficiente lavoro attivo.

Nella prima implementazione rappresenta il riferimento di plateau per il sistema sufficientemente alimentato.

## 12.4 Ritmo produttivo atteso

Non è necessario esporre in V3 una stima continua del ritmo atteso come funzione del WIP.

Per la prima implementazione:

- WIP sotto fascia → sottoalimentato;
- WIP nella fascia → riferimento alla capacità storica di regime;
- WIP sopra fascia → carico elevato, senza assumere maggiore capacità.

Un proxy continuo potrà essere introdotto in futuro dopo una calibrazione più robusta.

La dashboard principale deve comunque mostrare un solo segnale sintetico: **Stato del flusso**.

---

# 13. Gestione della qualità del dato

Ogni indicatore stimato deve poter esporre:

```text
value
quality
sample_size
window
```

La UI deve distinguere almeno:

- disponibile e affidabile;
- disponibile ma poco stabile;
- non disponibile.

Il minimo campionario non deve necessariamente trasformare ogni valore con pochi campioni in `null`.

Per il throughput recente, valutare in V3/V3-backend se mostrare comunque il valore con qualità bassa, invece di sopprimerlo rigidamente sotto una soglia.

Non modificare però il comportamento attuale senza una decisione esplicita e test dedicati.

---

# 14. Storico e confronto tra anni

La V3 può mostrare storico descrittivo.

Non deve ancora dichiarare:

- anni statisticamente comparabili;
- trend storici robusti;
- medie storiche affidabili;

se `comparable_years` non è stato implementato.

Se lo storico non è sufficiente:

> Storico ancora insufficiente per un confronto affidabile.

---

# 15. Diagnostica e “Da verificare”

`issues[]` è attualmente predisposto ma non ha rilevatori attivi.

Quindi:

```text
issues = []
```

non deve essere interpretato come:

> nessun problema rilevato

ma come:

> rilevazione non ancora attiva

Finché i rilevatori non vengono implementati, evitare una card verde “Nessun problema”.

---

# 16. Dashboard legacy

Durante lo sviluppo V3:

- mantenerla disponibile per confronto;
- non copiarne la struttura;
- non usarla come riferimento visuale obbligatorio.

Dopo validazione V3:

- nuova dashboard = vista principale;
- legacy = sezione secondaria di diagnostica/taratura oppure rimossa;
- eventuali grafici teorici e modelli di coda possono essere spostati in “Analisi avanzata”.

---

# 17. Wireframe concettuale

Struttura consigliata desktop:

```text
┌───────────────────────────────────────────────────────────┐
│ STATO DEL FLUSSO                                         │
│ [Regolare / Rallentato / Sottoalimentato / ...]          │
│ Messaggio sintetico                                      │
│ dettaglio: storico / atteso / recente / qualità          │
└───────────────────────────────────────────────────────────┘

┌───────────────┬───────────────┬───────────────┬───────────┐
│ Lavori in     │ Lavoro già    │ Settimane     │ In attesa │
│ corso         │ acquisito     │ impegnate     │           │
└───────────────┴───────────────┴───────────────┴───────────┘

┌───────────────────────────────────────────────────────────┐
│ CFD OPERATIVO                                            │
│ backlog/prep · WIP · attese · completamenti              │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────┬───────────────────────────────┐
│ Lavori ripresi            │ Andamento / dettaglio        │
│ episodi e quota riprese   │ flussi                       │
└───────────────────────────┴───────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ Diagnostica / dati insufficienti / approfondimenti       │
└───────────────────────────────────────────────────────────┘
```

---

# 18. Mobile

Su mobile mantenere questo ordine:

1. Stato del flusso;
2. Lavori in corso;
3. Lavoro già acquisito;
4. Settimane impegnate;
5. In attesa;
6. CFD semplificato;
7. Riprese;
8. dettagli.

Non ridurre il significato dei messaggi a soli colori.

---

# 19. Stati visivi e accessibilità

Non affidarsi esclusivamente ai colori.

Ogni stato deve avere:

- etichetta testuale;
- breve messaggio;
- eventuale icona;
- colore di supporto.

Esempio:

```text
RALLENTATO
Il carico attivo è sufficiente, ma i completamenti recenti sono sotto il ritmo atteso.
```

---

# 20. Drill-down

Le card principali devono poter aprire un dettaglio.

Esempi:

## Lavori in corso

Mostrare:

- job;
- punti;
- data ingresso WIP;
- durata episodio corrente.

## Lavoro acquisito

Mostrare:

- backlog;
- prep;
- punti;
- anzianità.

## Attese

Mostrare:

- cliente;
- ente;
- interno;
- durata.

## Riprese

Mostrare:

- job;
- numero episodio;
- data precedente uscita dal WIP;
- data rientro.

Il drill-down non deve ricostruire metriche nel client.

---

# 21. Bug e miglioramenti paralleli alla V3

Gli interventi seguenti non bloccano l'avvio della V3, salvo dove indicato.

## 21.1 Writer `from` dell'activity log

### Stato

Bug accertato.

`addActivityEvent` e `updateActivityEvent` possono lasciare `from` successivi incoerenti.

`deleteActivityEvent` oggi riallinea i `from`.

### Impatto V3

Non blocca la V3 perché la normalizzazione V2 è risultata invariante rispetto ai `from` alterati.

### Azione

Correzione autonoma consigliata in parallelo.

Obiettivo:

- riallineare deterministicamente i `from` dopo inserimento/modifica;
- preservare eventi e metadati;
- evitare correzioni manuali caso per caso.

Non bonificare automaticamente lo storico senza passaggio separato.

---

# 22. Audit delle modifiche storiche

## Stato

Limite accertato.

Non sono conservati sistematicamente:

- `created_at`;
- `updated_at`;
- versione precedente;
- uso di `force`;
- autore effettivo della modifica storica.

## Azione

Miglioramento autonomo, preferibilmente insieme al bug `from`.

Separare:

```text
event_ts
```

da:

```text
operation_ts
```

e introdurre audit prospettico.

Non tentare di ricostruire retroattivamente ciò che non è disponibile.

---

# 23. Numero visita legacy vs episodi WIP

Non è un bug residuo V2.

Regola:

- `numero_visita` resta legacy;
- `wip_episode_number` è il riferimento V2/V3 per riprese e frammentazione.

La V3 non deve usare etichette o componenti che confondano i due concetti.

---

# 24. Capacità recente e riferimento storico del ritmo

## Stato

Il backend attuale dispone di:

- ritmo di assorbimento del nuovo lavoro;
- throughput recente di completamento;
- minimo campionario.

Non dispone ancora in forma ufficiale di:

- baseline storica della capacità in regime carico;
- classificazione completa “Stato del flusso”.

## Azione

Questa è l'estensione backend direttamente legata alla UX V3.

Per la prima implementazione **non è obbligatorio** stimare una curva continua WIP → throughput.

Usare:

```text
fascia WIP
+
baseline storica di regime
+
throughput recente
```

per ottenere la diagnosi sintetica.

La funzione può essere sviluppata:

- immediatamente prima del relativo componente UI;
- oppure in parallelo alla costruzione del layout.

Se il WIP è nella fascia ordinaria ma il throughput recente non è sufficientemente affidabile:

```text
system_flow_status = INSUFFICIENT_DATA
```

o stato equivalente.

Se il WIP è chiaramente sotto o sopra la fascia utile, possono invece essere restituiti rispettivamente:

```text
UNDERFED
HIGH_LOAD
```

anche in assenza di completamenti recenti sufficienti.

Non simulare dati nel frontend.

# 25. Chiusure e riaperture definitive

Il conteggio affidabile non è attualmente possibile per tutta la storia.

Non mostrare un indicatore:

> Riaperture: 0

se il dato non è ricostruibile.

Per ora:

- escludere dalla dashboard principale;
- eventuale implementazione prospettica come intervento separato.

---

# 26. Copertura storica

La V3 deve distinguere:

```text
available_years
```

da:

```text
comparable_years
```

Finché `comparable_years` non è implementato:

- storico descrittivo sì;
- confronti statistici robusti no.

---

# 27. Punti storici e taglia corrente

I punti storici V2 derivano ancora dalla taglia corrente del job.

Quindi una modifica odierna della taglia può influenzare ricostruzioni storiche.

Per V3:

- non presentare i punti storici come misura fisica immutabile;
- evitare formule che attribuiscano nuovamente l'intera taglia a ogni ripresa;
- valutare in diagnostica futura la provenienza del valore.

Versionamento storico della taglia: intervento successivo, non bloccante.

---

# 28. Riconciliazione stock corrente / storico

Attualmente:

- stock corrente usa lo stato corrente dei job;
- stock storico è ricostruito dal log.

Nel TEST i due sistemi si riconciliano.

Aggiungere in futuro un controllo esplicito:

```text
current_state_vs_reconstructed_state
```

e produrre warning se divergono.

Non correggere automaticamente una fonte usando l'altra.

---

# 29. Soglie e classificazioni

Prima di attivare semafori nella UI:

- validare le soglie effettivamente utilizzate;
- verificare ordine logico min/max;
- non trattare “non configurato” come “regolare”.

`future_work_warning_weeks` non deve comparire nella UI come regola attiva finché il backend non la utilizza realmente.

---

# 30. Prestazioni e rilascio

Prima dell'accettazione integrata:

1. smoke test nel runtime GAS;
2. misura dei tempi di `calculateMetrics_`;
3. verifica delle quote;
4. controllo coerenza snapshot;
5. commit selettivo del codice V2/V3;
6. confronto TEST ↔ repository;
7. successivo collaudo PROD.

La validazione locale V2 non equivale alla certificazione del comportamento in produzione.

---

# 31. Ordine operativo consigliato

## Step 1 — Consolidamento V2

Prima di modificare la UI:

- commit dei file V2;
- gate umano finale;
- smoke test GAS iniziale;
- conferma contratto `dashboardState`.

## Step 2 — Scheletro V3

Realizzare:

- nuova pagina/dashboard;
- struttura responsive;
- card principali;
- CFD;
- drill-down base.

Usare soltanto metriche già disponibili.

## Step 3 — Stato del flusso

Implementare backend:

- baseline storica di capacità in regime sufficientemente carico;
- fascia WIP di riferimento;
- throughput recente con qualità;
- regole di precedenza deterministiche fra gli stati;
- classificazione sintetica.

La prima implementazione deve utilizzare il modello a fasce WIP + plateau.

Non rendere la V3 dipendente da una curva continua WIP → throughput se i dati non sono sufficienti per stimarla in modo robusto.

Collegare quindi il componente UI.

## Step 4 — Correzioni autonome in parallelo

Priorità:

1. writer `from`;
2. audit cronologia;
3. chiusure/riaperture prospettiche;
4. riconciliazione stato/log;
5. validazione soglie;
6. prestazioni e snapshot.

## Step 5 — Collaudo V3 TEST

Verificare:

- significato;
- valori;
- drill-down;
- messaggi null;
- responsive;
- coerenza con snapshot V2.

## Step 6 — PROD

Solo dopo collaudo TEST:

- verifica operativa;
- confronto con comportamento reale;
- eventuale revisione soglie/messaggi.

---

# 32. Test UX minimi

## Stato insufficiente

Se manca la stima recente:

- nessun valore inventato;
- nessun colore verde automatico;
- messaggio comprensibile.

## WIP

La card deve coincidere con `role=wip`.

## Lavoro futuro

Deve coincidere con `backlog + prep`.

## Settimane impegnate

Deve coincidere con il backend e non essere ricalcolato dal frontend.

## CFD

Le bande devono corrispondere agli stock.

## Riprese

Devono derivare dagli episodi WIP, non da `numero_visita`.

## Storico

Non deve dichiarare comparabilità non certificata.

## Diagnostica

`issues=[]` con rilevatori inattivi non deve apparire come “nessun problema”.

---


## Precedenza degli stati

Verificare almeno:

```text
WIP sopra fascia + throughput sotto riferimento
→ HIGH_LOAD
```

con messaggio secondario che segnali anche il rallentamento.

```text
WIP sotto fascia + pochi completamenti recenti
→ UNDERFED
```

non `INSUFFICIENT_DATA`.

```text
WIP nella fascia + campione recente insufficiente
→ INSUFFICIENT_DATA
```

## In attesa / carico potenzialmente in rientro

La card “In attesa” deve spiegare chiaramente che rappresenta lavoro temporaneamente fermo che può rientrare.

Non creare una seconda card duplicata “Carico potenzialmente in rientro”.

## Grafico cumulativo dei flussi

Verificare che non sia necessario per comprendere la home.

Deve restare accessibile come approfondimento senza occupare la gerarchia principale.

---

# 33. Criteri di chiusura V3

La V3 può essere considerata conclusa quando:

1. la nuova dashboard è la vista operativa principale su TEST;
2. tutte le card principali usano `dashboardState`;
3. nessun calcolo di business è duplicato nel frontend;
4. il CFD è coerente con gli stock;
5. il drill-down apre dati coerenti;
6. stati `null` / insufficienti sono gestiti correttamente;
7. lo “Stato del flusso” è operativo oppure esplicitamente marcato come non ancora disponibile;
8. la dashboard legacy non è più necessaria per l'uso quotidiano;
9. smoke test e benchmark GAS non evidenziano regressioni rilevanti;
10. è completato un collaudo umano TEST.

---

# 34. Destino finale della dashboard legacy

Dopo la validazione V3:

- la nuova dashboard diventa l'interfaccia principale;
- la legacy viene rimossa dalla navigazione primaria;
- eventuali elementi utili vengono trasferiti a:
  - Diagnostica;
  - Taratura;
  - Analisi avanzata.

Non mantenere due dashboard operative parallele.

---

# 35. Principio finale

La V3 deve trasformare il backend V2 in una lettura operativa semplice.

L'utente deve poter capire:

> c'è abbastanza lavoro?
>
> quanto ne stiamo gestendo?
>
> quanto ne dobbiamo ancora assorbire?
>
> stiamo lavorando al ritmo atteso?
>
> quanto il lavoro viene interrotto e ripreso?

senza conoscere:

- teoria delle code;
- struttura delle visite legacy;
- formule CFD;
- finestre statistiche;
- dettagli della normalizzazione.

La complessità resta nel backend e nella diagnostica.

La home deve mostrare **decisioni e segnali**, non il modello matematico.

Le scelte di gerarchia sono deliberate: un solo segnale principale di stato, un solo grafico operativo nella home, e il carico potenzialmente in rientro incorporato nella card “In attesa”.
