# DESIGN_V5_revisione_nuova_dashboard.md

## SigmaFlow — Revisione della nuova dashboard

**Versione:** V5  
**Revisione integrale:** 15 settembre 2026  
**Stato:** specifica master prescrittiva

---

# 0. Obiettivo

La V5 deve riportare la dashboard agli obiettivi originari:

- leggere stock, flussi, tempi e rientri;
- usare dati reali e definizioni stabili;
- eliminare autotarature operative, categorie inventate e codice inutile;
- mantenere la home essenziale;
- trasformare il CFD in uno strumento analitico realmente interrogabile;
- predisporre viste e confronti futuri anche quando oggi i dati non esistono ancora.

La dashboard deve rispondere a:

> quanto lavoro abbiamo aperto;  
> quanto dobbiamo ancora assorbire;  
> quanto è fermo;  
> quanto WIP è nuovo e quanto è rework;  
> quanto rientra;  
> quanto tempo impiegano le pratiche;  
> se il ritmo è coerente con il carico;  
> come cambiano stock, flussi e tempi.

---

# 1. Gerarchia e regole di sviluppo

Questo file è la specifica master V5. Se codice legacy, vecchi test o specifiche V3/V4 sono in conflitto, prevale questo documento salvo BLOCKER REPORT.


## 1.1 Target e stato di avanzamento sono due cose diverse

Questo documento definisce **come SigmaFlow deve funzionare a V5 conclusa**.

NON è la fonte dello stato di avanzamento delle attività.

La sola fonte operativa per sapere cosa è già stato sviluppato, testato, validato o chiuso è:

> `PROGRAMMA_STATO.md`

All'inizio di ogni sessione Codex deve quindi:

1. leggere `CLAUDE.md`;
2. leggere `PROGRAMMA_STATO.md`;
3. identificare la fase/sottofase attualmente aperta;
4. verificare che la precedente risulti `DONE` prima di iniziare;
5. eseguire **solo** la fase/sottofase aperta.

Una specifica presente in questo documento ma relativa a una fase già `DONE` rappresenta un **vincolo di regressione**, non un'attività da rifare.

Codex NON deve riaprire, riscrivere o riauditare da zero una fase già chiusa soltanto perché il comportamento target è descritto qui. Può toccare codice di una fase chiusa solo se la fase aperta lo richiede esplicitamente e solo nella misura strettamente necessaria, mantenendo verdi i test di regressione.

Se `PROGRAMMA_STATO.md` dichiara `DONE` una funzione ma il codice reale contraddice questa specifica target, NON correggere incidentalmente: produrre **BLOCKER REPORT** indicando la discrepanza tra stato dichiarato e codice.

Codex NON deve:

- reinterpretare requisiti;
- sostituire una funzione con una versione “equivalente” più semplice;
- omettere funzioni perché mancano dati storici;
- inventare fallback, soglie, categorie o semantiche;
- mantenere codice inutile solo perché già esiste;
- dichiarare completa una funzione parziale.

Se un requisito non è implementabile correttamente:

> **STOP sulla funzione + BLOCKER REPORT**

Il report deve indicare: requisito, problema, causa, file/funzioni, conseguenza, alternative, raccomandazione.

Una funzione incompleta va dichiarata:

> **INCOMPLETA**

Assenza di dati ≠ assenza della funzione. Se un periodo è vuoto:

> **Dati non ancora disponibili per il periodo selezionato.**

Devono comunque esistere selettore, componente, contratto backend, empty state e test.

Ogni fase deve eliminare enum, parametri, funzioni, output, test e commenti diventati inutili.

---

# 2. Principi UX

Tutto ciò che è visibile all'utente ordinario deve essere in italiano, sintetico e comprensibile.

Evitare nella home:

```text
WIP
throughput
baseline
rolling average
sample size
boundary
queue
rework episode
CFD
```

Usare:

```text
Lavori in corso
Ritmo recente
Ritmo di riferimento
Rientri nel lavoro
Tempo tipico alla consegna
In attesa
Andamento del lavoro
```

`CFD` resta termine tecnico. Titolo UX:

> **Andamento del lavoro**

Precisione home:

- giorni: interi;
- settimane: massimo 1 decimale;
- punti/settimana: precisione coerente col dato;
- stesso tipo di grandezza: stessa precisione visiva.

---

# 3. Quadro teorico

FSC resta il riferimento generale. La dashboard deve rendere osservabili:

1. stock;
2. completamenti;
3. tempi;
4. rientri/rework;
5. attese;
6. lavoro acquisito;
7. relazione stock–flusso–tempo.

Il modello serve a decidere cosa osservare, non va mostrato come tale.

---

# 4. Rientri / rework

Eliminare dalla UX:

> Ripresa / Riprese

Usare:

> **Rientri**

Definizione SigmaFlow:

> **ogni nuova entrata nel lavoro attivo di un job che era già entrato precedentemente nel lavoro attivo ed era successivamente uscito.**

Esempi validi:

```text
WIP → attesa cliente → WIP
WIP → attesa ente → WIP
WIP → attesa interna → WIP
WIP → prep/backlog → WIP
WIP → consegna → nuovo WIP
```

Logica V2 da mantenere:

```text
wip_episode_number = 1     → primo ingresso
wip_episode_number > 1     → rientro / rework
```

Questa stessa definizione alimenta il CFD.

---

# 5. Taratura: solo CONFIG

La dashboard NON deve auto-derivare operativamente:

- fascia WIP;
- ritmo di riferimento;
- soglia di rallentamento.

Parametri di taratura:

```text
wip_target_min_jobs
wip_target_max_jobs
flow_reference_points_per_week
flow_reference_completions_per_week
flow_slow_ratio
calibration_date
calibration_version
calibration_note
```

Nessun valore numerico reale di taratura nel codice applicativo. I valori reali stanno nel foglio CONFIG. Numeri concreti ammessi solo nelle fixture di test.

Parametri tecnici, non di taratura:

```text
wip_trend_weeks
capacity_window_weeks
min_samples_capacity
```

Audit obbligatorio ed eliminazione se non servono a funzioni V5 attive:

```text
flow_accelerated_ratio
wip_warning_jobs
future_work_warning_weeks
history_comparison_granularity
```

Non inventare funzioni per giustificare parametri legacy.

---

# 6. Stato del flusso

Domanda:

> Il sistema sta funzionando normalmente oppure c'è una condizione da osservare?

Stati ammessi:

```text
Poco lavoro attivo
Regolare
Rallentato
Carico elevato
Dati insufficienti
```

NON esiste:

```text
ACCELERATED
Ritmo elevato
```

Logica:

```text
config necessaria assente/invalida
→ DATI INSUFFICIENTI
→ "Taratura non configurata."

WIP > massimo configurato
→ CARICO ELEVATO

WIP < minimo configurato
→ POCO LAVORO ATTIVO

WIP in fascia + ritmo non affidabile
→ DATI INSUFFICIENTI

WIP in fascia +
recent_points_per_week <
flow_reference_points_per_week * flow_slow_ratio
→ RALLENTATO

altrimenti
→ REGOLARE
```

## 6.1 Card chiusa

Esempio:

```text
Stato del flusso

Rallentato

Il carico attivo è nella fascia prevista,
ma il ritmo recente è sotto la soglia di rallentamento.
```

## 6.2 Dettaglio aperto

Mostrare SOLO:

```text
Lavori attivi
4

Fascia di riferimento
3–5 lavori

Ritmo recente
3 punti/settimana

Soglia di rallentamento
7,25 punti/settimana
```

Non mostrare qui:

- riferimento completamenti;
- timestamp ISO;
- sample size;
- settimane con completamenti;
- qualità dettagliata;
- algoritmi;
- riferimento storico;
- metodi percentile.

Questi dati vanno in **Diagnostica e taratura**.

---

# 7. Struttura home

Ordine:

1. Stato del flusso;
2. quattro card di carico;
3. due KPI Tempi;
4. Andamento del lavoro;
5. card Rientri;
6. Qualità dati e approfondimenti.

Card carico:

```text
Lavori in corso
Lavoro già acquisito
Settimane di lavoro già impegnate
In attesa
```

Sottotitoli:

```text
Lavoro già acquisito
→ Da programmare o avviare.

Settimane di lavoro già impegnate
→ Settimane equivalenti necessarie per assorbire il lavoro già acquisito.

In attesa
→ Lavori temporaneamente fermi in attesa di cliente, ente o altre condizioni.
```

NON usare “lavoro che può rientrare” come sinonimo di `In attesa`.

---

# 8. Tempi

Home:

```text
Tempo tipico alla consegna
→ P50 / mediana

8 pratiche su 10 entro
→ P80
```

Regola temporale:

```text
ingresso
→ lavoro
→ attesa
→ rientro
→ lavoro
→ consegna
```

è un unico attraversamento fino a quella consegna.

Dopo una consegna, nuovo lavoro sullo stesso job può creare una nuova unità temporale fino alla consegna successiva.

Dettaglio per taglia:

```text
XS / S / M / L / XL
```

con P50, P80, numero casi.

---

# 9. Card Rientri

La card esistente resta e NON viene sostituita dal CFD.

Mostra:

```text
numero rientri nella finestra recente
quota rientri / totale ingressi WIP
```

Formula:

```text
rientri / (primi ingressi + rientri)
```

---

# 10. CFD — ruolo

Il CFD è il principale strumento grafico della dashboard.

Non deve essere un semplice stacked-area chart con tooltip.

Deve permettere di leggere:

- stock;
- composizione WIP nuovo/rework;
- ingressi;
- completamenti;
- stabilità;
- tempi;
- tassi;
- confronti fra periodi.

Titolo UX:

> **Andamento del lavoro**

---

# 11. CFD — struttura matematica

Definire:

```text
A(t) = unità entrate cumulativamente nel perimetro
D(t) = unità completate cumulativamente
```

Per ogni bucket deve valere:

```text
A(t) - D(t)
=
Lavoro già acquisito
+ In attesa
+ WIP rework
+ WIP nuovo
```

La stessa identità deve valere in:

```text
Lavori
Punti
```

Ingresso, uscita e stock devono riferirsi alla stessa unità di flusso.

Se questa identità non è ottenibile:

> **STOP + BLOCKER REPORT**

Non produrre geometrie visivamente plausibili ma semanticamente incoerenti.

---

# 12. CFD — unità di flusso e carry-in

Una unità CFD è un attraversamento fino a una consegna tecnica.

Durante:

```text
backlog/prep
→ WIP
→ attesa
→ WIP
→ consegna
```

resta una sola unità CFD.

Dopo una consegna, nuovo lavoro può generare una nuova unità CFD. Questo NON modifica la definizione generale di rework.

Se all'inizio della copertura esiste stock già aperto:

> rappresentarlo come **carry-in / stock iniziale**

senza inventare una falsa data di ingresso.

Backend:

```text
initial_stock_offset
historical_events
```

---

# 13. CFD — WIP nuovo/rework

Vincolo:

```text
WIP totale = WIP nuovo + WIP rework
```

Classificazione:

```text
wip_episode_number = 1
→ WIP nuovo

wip_episode_number > 1
→ WIP rework
```

Ordine verticale obbligatorio dal basso:

```text
Completato

In attesa
→ senape attuale

WIP rework
→ rosso

WIP nuovo
→ blu, SOPRA il rosso

Lavoro già acquisito
→ colore attuale
```

Vincolo visuale:

> **rosso sotto, blu sopra**

Non invertire.

---

# 14. CFD — Lavori / Punti

Toggle:

```text
Lavori
Punti
```

Vista Lavori: ogni unità vale 1.

Vista Punti: usare la taglia corrente del job in modo coerente su tutta la ricostruzione.

Se la taglia cambia, rivalutare coerentemente:

- ingresso storico;
- stock storico;
- completamento storico.

Non serve storicizzare la vecchia taglia per il CFD V5.

È vietato usare pesi diversi per ingresso e uscita della stessa unità.

---

# 15. CFD — navigazione temporale

Periodi rapidi minimi:

```text
8 settimane
3 mesi
6 mesi
12 mesi
Anno corrente
```

Periodi calendario:

```text
Mese
Trimestre
Anno
```

Periodo libero:

```text
Da
A
```

Risoluzione:

```text
Giorno
Settimana
Mese
```

Periodo senza dati:

> **Dati non ancora disponibili per il periodo selezionato.**

---

# 16. CFD — interazioni

Obbligatori:

- zoom orizzontale;
- pan/scorrimento;
- reset zoom;
- selezione di sottointervallo;
- crosshair temporale;
- touch equivalente su mobile.

Non è sufficiente usare frecce sinistra/destra per leggere bucket fissi.

Le cumulative restano integre nel backend. È ammesso un rebasing grafico comune alle boundary, purché NON cambi:

- spessori;
- pendenze;
- distanze temporali;
- stock iniziale.

Il 1° gennaio NON resetta gli stock.

---

# 17. CFD — tooltip e selezione serie

Tooltip/crosshair minimo:

```text
Data / periodo
Lavoro già acquisito
WIP nuovo
WIP rework
WIP totale
In attesa
Ingressi cumulativi
Completamenti cumulativi
```

Per il bucket possono essere mostrati:

```text
Nuovi ingressi
Rientri
Consegne
```

NON creare per questi tre dati un secondo grafico permanente nella home.

Selezione serie:

- evidenzia;
- attenua/nasconde visivamente;
- NON ricostruisce matematicamente lo stack.

Prevedere:

> **Mostra tutte**

---

# 18. CFD — misura orizzontale

Modalità obbligatoria:

> **Misura tempo**

L'utente seleziona una quota cumulativa sulla curva degli ingressi; il sistema individua l'intersezione orizzontale con la curva dei completamenti.

Mostrare:

```text
Data ingresso equivalente
Data uscita equivalente
Durata in giorni calendario
```

Etichetta:

> **Tempo equivalente dal CFD**

Vista Lavori:

> stima geometrica del tempo di attraversamento delle unità.

Vista Punti:

> stima geometrica ponderata per quantità di lavoro.

NON definirlo tempo esatto del singolo job.

Confronto, se disponibile nello stesso periodo:

```text
Tempo equivalente CFD
P50 osservato
P80 osservato
```

L'obiettivo è verificare compatibilità, non uguaglianza.

---

# 19. CFD — rate lines

Linee opzionali:

```text
Tasso di ingresso
Tasso di completamento
```

Interpretazione:

```text
ingressi ≈ uscite  → stock relativamente stabile
ingressi > uscite  → accumulo
uscite > ingressi  → smaltimento
```

Non generare nuovi stati o soglie.

---

# 20. CFD — confronti

Opzioni:

```text
Nessun confronto
Periodo precedente equivalente
Stesso periodo anno precedente
Periodo personalizzato
```

Usare due CFD sincronizzati, NON due stack sovrapposti.

Devono avere:

- stessa unità;
- stessa risoluzione;
- stessi colori;
- stesso ordine;
- scala Y coerente;
- navigazione sincronizzata.

Desktop: affiancati quando possibile.  
Mobile: uno sotto l'altro.

Dati mancanti:

> **Confronto non ancora disponibile per il periodo selezionato.**

---

# 21. CFD — continuità temporale

Test obbligatori:

- cambio mese;
- cambio trimestre;
- dicembre/gennaio;
- anno bisestile;
- settimana ISO 53.

Il cambio anno NON azzera:

```text
Lavoro già acquisito
In attesa
WIP nuovo
WIP rework
```

---

# 22. Contratto backend

Il frontend visualizza e interagisce. NON ricostruisce logica di business.

## 22.1 Nessun rename del contratto pubblico V5

Questa sezione **NON prescrive il rename dell'intero contratto backend**.

Il contratto pubblico reale di `buildDashboardStateV2_` costituisce la baseline da preservare. Al momento della presente revisione è strutturato come:

```text
{
  contract_version,
  currentWork,
  futureWork,
  capacity,
  flow,
  cfd,
  history,
  timing,
  rework,
  systemFlow,
  details,
  issues,
  diagnostics,
  wipEpisodes
}
```

Non rinominare questi blocchi e non introdurre un nuovo involucro `dashboardState` con chiavi alternative (`summary`, `current_load`, `flow_status`, ecc.) nell'ambito della V5.

Un eventuale refactoring globale del contratto pubblico richiederebbe una fase dedicata e un'approvazione esplicita: **non fa parte di questo design**.

## 22.2 Regola per le estensioni CFD

Le nuove necessità del CFD devono essere implementate **additivamente dentro il blocco `cfd` esistente**, salvo campi già presenti con identico significato.

Regola obbligatoria:

- se un campo esistente rappresenta già esattamente il dato richiesto → riusarlo;
- se manca → aggiungerlo nel perimetro `cfd`;
- non creare due campi sinonimi per lo stesso concetto;
- non spostare dati top-level solo per adeguarli a uno schema teorico;
- non cambiare il parsing frontend di aree non interessate dal CFD.

Se per soddisfare un requisito CFD risultasse realmente necessario rompere o rinominare il contratto pubblico:

> **STOP + BLOCKER REPORT**

## 22.3 Dati minimi richiesti al CFD

Per ogni bucket il backend deve rendere disponibili, direttamente o tramite campi esistenti semanticamente equivalenti:

```text
timestamp

cumulative_arrivals_jobs
cumulative_completed_jobs

future_jobs
waiting_jobs
wip_new_jobs
wip_rework_jobs

cumulative_arrivals_points
cumulative_completed_points

future_points
waiting_points
wip_new_points
wip_rework_points

new_entries_in_bucket
rework_entries_in_bucket
completions_in_bucket
```

Metadati necessari:

```text
coverage_start
coverage_end
granularity
initial_stock_offset
quality
```

I nomi sopra sono vincolanti **solo per i nuovi campi che non hanno già un equivalente esatto nel contratto `cfd` esistente**. Se esiste già un campo equivalente, va mantenuto e documentata la corrispondenza nei test/report della fase, senza duplicarlo.

Il frontend NON deve:

- classificare episodi WIP;
- calcolare stock;
- inventare cumulative;
- creare fallback di business.

# 23. Diagnostica

Spostare fuori dalla home/dettaglio Stato:

- sample size;
- settimane con completamenti;
- qualità statistica dettagliata;
- timestamp UTC/ISO;
- finestre esatte;
- algoritmi;
- percentili tecnici;
- osservazioni storiche;
- anomalie log;
- tarature suggerite.

Sezione:

> **Qualità dati e approfondimenti / Diagnostica e taratura**

---

# 24. Riconciliazione V2

Le metriche V2 validate non devono cambiare involontariamente.

Fixture corrente di riferimento:

```text
Lavori in corso          4 / 39 punti
Lavoro già acquisito    10 / 71 punti
In attesa               12 / 95 punti
Episodi WIP             79
Primi ingressi          36
Rientri                 43
Quota rientri           54,4%
Ritmo nuovo lavoro      6,50 punti/settimana
Settimane impegnate     10,92
```

Sono fixture di test, NON valori applicativi hardcoded.

---

# 25. Wireframe

```text
┌───────────────────────────────────────────────────────┐
│ STATO DEL FLUSSO                                     │
│ Rallentato                                           │
│ Il carico è nella fascia prevista, ma il ritmo       │
│ recente è sotto la soglia di rallentamento.          │
│ [Come è stata ottenuta questa lettura]               │
└───────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐
│ Lavori in │ Lavoro già │ Settimane  │ In attesa │
│ corso     │ acquisito  │ impegnate  │           │
└────────────┴────────────┴────────────┴────────────┘

┌───────────────────────┬───────────────────────────┐
│ Tempo tipico          │ 8 pratiche su 10 entro   │
└───────────────────────┴───────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ ANDAMENTO DEL LAVORO                                 │
│ [Lavori|Punti] [Periodo] [Risoluzione] [Confronto]   │
│ [Serie] [Misura tempo] [Rate lines] [Reset zoom]     │
│                                                       │
│ Lavoro già acquisito                                 │
│ WIP NUOVO — blu                                      │
│ WIP REWORK — rosso                                   │
│ In attesa — senape                                   │
│ Completato                                            │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ RIENTRI NEL LAVORO                                   │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ QUALITÀ DATI E APPROFONDIMENTI                       │
└───────────────────────────────────────────────────────┘
```

---

# 26. Piano esecutivo e aggancio a PROGRAMMA_STATO.md

Il piano di questo documento parte dalla situazione registrata in `PROGRAMMA_STATO.md` e **non rinumera retroattivamente né riapre le fasi già chiuse**.

Le specifiche dei §§4–9 descrivono il target V5 di:

- taratura;
- Stato del flusso;
- rientri;
- tempi.

Il fatto che siano descritte nel master NON significa che debbano essere rieseguite.

Per sapere se tali attività sono già concluse, parziali o ancora aperte, vale esclusivamente `PROGRAMMA_STATO.md`.

## 26.1 Regola di avvio di ogni sessione

Prima di modificare codice:

1. leggere `CLAUDE.md`;
2. leggere `PROGRAMMA_STATO.md`;
3. individuare la **prima sottofase non `DONE`**;
4. verificare che non esista una sessione concorrente sullo stesso branch/file;
5. lavorare solo su quella sottofase;
6. eseguire i test pertinenti e quelli di regressione strettamente necessari;
7. aggiornare `PROGRAMMA_STATO.md` solo dopo esito positivo.

Non è richiesto né ammesso un audit generale delle fasi già chiuse prima di iniziare ogni nuova sessione.

## 26.2 Fasi già chiuse

Quando `PROGRAMMA_STATO.md` marca una fase come `DONE`:

- non rifarla;
- non riscriverla;
- non modificarne l'architettura per preferenza personale;
- non sostituire una soluzione già validata con una nuova equivalente;
- trattarne i test come regressione da mantenere verde.

Se una nuova fase richiede un'estensione di una funzione già chiusa, modificare solo ciò che è indispensabile alla nuova specifica.

## 26.3 Continuazione del programma

Il lavoro nuovo introdotto dalla presente revisione prosegue con:

> **Fase 5 — completamento del CFD evoluto**, suddivisa nelle sottofasi atomiche 5A–5H del §27.

La Fase 5 non deve essere eseguita in un'unica sessione.

Dopo la chiusura di 5A–5H segue:

> **Fase 6 — collaudo integrato V5** (§28).

Lo stato reale delle singole sottofasi continua a essere registrato esclusivamente in `PROGRAMMA_STATO.md`.

> **Nota (16/09/2026)**: durante il collaudo umano di Fase 6 sono emerse novità sostanziali
> che tengono **Fase 5E e Fase 6F entrambe aperte**, non chiuse per un errore ma perché il
> lavoro utile a chiuderle definitivamente non era ancora stato specificato: (a) un difetto
> reale nella selezione della quota della Misura tempo (§18), corretto con una sessione
> dedicata di correzione della Fase 5E, tracciata in `PROGRAMMA_STATO.md`; (b) un insieme di
> miglioramenti metodologici sostanziali (settimane calendario complete, distinzione fra
> flusso attivo e throughput di consegna, taratura suggerita, WIP suggerito da Little,
> riorganizzazione Diagnostica) descritti nei §§32–47 e organizzati come **Fase 7** (§48). Il
> gate 6F non va approvato finché Fase 5E non risulta corretta e verificata **e** Fase 7 non
> risulta DONE (§48, sottofase 7G) — vedi nota aggiornata in §28.

# 27. Fase 5 — CFD evoluto: sottofasi atomiche

NON sviluppare Fase 5 in un'unica sessione.

Prima di ciascuna sottofase, leggere il relativo stato in `PROGRAMMA_STATO.md`. Se una capacità richiesta risulta già implementata e validata, **riusarla e mantenerla**, senza reimplementarla. La sottofase deve intervenire solo sul delta ancora necessario per soddisfare questa specifica.

Componenti precedentemente validati (ad esempio lettura verticale, viste temporali o serie già esistenti) non vanno riscritti per uniformità stilistica: vanno estesi solo dove la Fase 5 richiede funzioni ulteriori.

## 5A — Split WIP nuovo/rework

Backend:

```text
wip_new_jobs
wip_rework_jobs
wip_new_points
wip_rework_points
```

Vincolo:

```text
wip_new + wip_rework = WIP V2
```

UI:
- rosso rework sotto;
- blu nuovo sopra;
- attesa senape invariata.

Test:
- episodio 1 → nuovo;
- episodio >1 → rework;
- WIP totale invariato.

**Gate umano 5A.**

## 5B — Periodi e bucket

Implementare:
- giorno/settimana/mese;
- 8 settimane;
- 3/6/12 mesi;
- anno corrente;
- mese;
- trimestre;
- anno;
- Da/A.

Test empty state e cambio anno.

## 5C — Zoom/pan/crosshair/tooltip

Implementare:
- zoom;
- pan;
- reset;
- sottointervallo;
- crosshair;
- tooltip §17.

Test:
- interazioni non cambiano dati;
- tooltip = backend.

**Gate umano 5C desktop + mobile.**

## 5D — Focus serie

Implementare:
- evidenzia;
- attenua/nasconde visivamente;
- Mostra tutte.

Vincolo:
- geometria matematica invariata.

## 5E — Misura orizzontale

Implementare §18 in Lavori e Punti.

Test con fixture a date note.

**Gate umano 5E:** confronto con P50/P80.

## 5F — Rate lines

Implementare ingresso/completamento.

Test:
- coerenti col periodo;
- on/off non cambia CFD.

## 5G — Confronti

Implementare:
- precedente equivalente;
- stesso periodo anno precedente;
- personalizzato;
- due CFD sincronizzati.

Test:
- periodo vuoto;
- scala coerente;
- navigazione sincronizzata;
- Lavori/Punti.

**Gate umano 5G desktop + mobile.**

## 5H — Pulizia legacy CFD

Solo dopo 5A–5G verdi:
- eliminare mini-chart/barre permanenti Nuovi/Rientri/Consegne se presenti;
- eliminare output/funzioni/test sostituiti;
- verificare nessuna duplicazione con la card Rientri.

---

# 28. Fase 6 — Collaudo integrato V5

## 6A — Riconciliazione V2
Rieseguire fixture.

## 6B — Stato/taratura
Verificare:
- nessuna autotaratura operativa;
- nessun `ACCELERATED`;
- nessun valore di taratura hardcoded.

## 6C — Tempi
Verificare P50/P80 e casi con rientro.

## 6D — CFD
Verificare tutti i requisiti delle Fasi 4–5.

## 6E — Desktop/mobile
Desktop + almeno viewport 390×844.

## 6F — Gate umano finale
Nessuna chiusura automatica.

> **Nota (16/09/2026)**: 6F resta esplicitamente non approvabile finché non risultano DONE,
> oltre a 6A–6E: la correzione della Fase 5E (misura orizzontale, §18) e la Fase 7 —
> Miglioramenti metodologici (§§32–48) nella sua interezza, sottofase 7G inclusa. Non è una
> riapertura di 6A–6E per errore: quel lavoro resta valido così com'è stato verificato. È
> un'estensione del perimetro di chiusura, decisa da Marco il 16/09/2026 perché durante il
> collaudo sono emerse novità sostanziali che vanno integrate prima della chiusura definitiva
> di V5.

---

# 29. Test minimi obbligatori

## Stato
```text
CONFIG assente → Dati insufficienti
WIP sotto fascia → Poco lavoro attivo
WIP sopra fascia → Carico elevato
WIP in fascia + ritmo sotto soglia → Rallentato
WIP in fascia + ritmo sopra soglia → Regolare
ritmo molto elevato → Regolare, mai ACCELERATED
```

## Rientri
```text
WIP → attesa → WIP → rientro
```

## Tempi
Rientro intermedio non azzera l'intervallo.

## CFD
```text
arrivi - completamenti
=
future + waiting + wip_new + wip_rework
```

```text
wip_new + wip_rework = WIP V2
```

## Punti
Cambio taglia fixture → ingresso, stock e uscita rivalutati coerentemente.

## Orizzontale
Date note → delta corretto.

## Periodi
- mese vuoto;
- trimestre vuoto;
- anno vuoto;
- Da/A;
- dicembre/gennaio;
- bisestile;
- ISO week 53.

## Interazioni
Zoom, pan, reset, crosshair e focus serie non modificano i dati.

---

# 30. Criteri di chiusura V5

V5 è chiusa soltanto quando:

1. home leggibile rapidamente;
2. Stato del flusso usa solo CONFIG;
3. `ACCELERATED` eliminato;
4. dettaglio Stato essenziale;
5. rientri corretti;
6. card Rientri valida;
7. P50/P80 disponibili;
8. CFD riconciliato stock-flow;
9. WIP diviso nuovo/rework;
10. nuovo blu sopra, rework rosso sotto;
11. Lavori/Punti funzionano;
12. mese/trimestre/anno funzionano;
13. Da/A funziona;
14. empty state corretti;
15. zoom/pan/reset funzionano;
16. crosshair/tooltip funzionano;
17. focus serie funziona;
18. misura orizzontale funziona;
19. confronto CFD/P50/P80 disponibile;
20. rate lines funzionano;
21. confronti tra periodi funzionano;
22. cambio anno mantiene gli stock;
23. codice legacy inutile rimosso;
24. nessun requisito omesso senza BLOCKER REPORT;
25. metriche V2 riconciliate;
26. collaudo umano finale completato.

---

# 31. Principio finale

SigmaFlow non deve accumulare complessità perché “ormai esiste”.

Ogni elemento deve avere:

- funzione;
- significato;
- utilizzo;
- test.

Se non serve:

> **si elimina.**

Se serve:

> **si implementa integralmente.**

Se non può essere implementato correttamente:

> **STOP + BLOCKER REPORT.**

Il CFD deve essere il principale strumento per leggere nel tempo:

> stock, nuovo lavoro, rework, attese, ingressi, completamenti, tempi, stabilità e confronti.

**Niente scorciatoie. Niente sostituzioni implicite. Niente funzioni “quasi equivalenti”.**

---

# 32. Miglioramenti metodologici (Fase 7, aggiunta 16/09/2026)

Le sezioni §§32–47 integrano nel design master i miglioramenti metodologici emersi
dall'analisi dei dati reali durante il collaudo di Fase 6, organizzati come **Fase 7**
(§48). Valgono le stesse regole operative inderogabili di §1: nessuna reinterpretazione,
nessun fallback inventato, STOP + BLOCKER REPORT se un requisito non è implementabile senza
alterare in modo sostanziale una parte già validata.

**Perimetro**: NON riscrivere il CFD già validato (split WIP nuovo/rework, colori, periodi e
navigazione, rate lines, tooltip, Lavori/Punti). NON aggiungere al CFD: turnover WIP, una
nuova linea del flusso attivo, un secondo grafico permanente, nuove serie cumulative, un
pannello capacità. Il CFD deve restare leggibile così com'è. La card **Rientri nel lavoro**
resta invariata nella struttura e nella UX. Le card Lavori in corso, Lavoro già acquisito,
Settimane impegnate, In attesa, P50, P80 restano strutturalmente invariate.

## 32.1 Tre grandezze da distinguere esplicitamente

Da questa revisione in avanti, la dashboard e il codice devono distinguere:

**Flusso attivo / turnover WIP** — quanta quantità di lavoro attraversa ed esce dal lavoro
attivo. Definizione: somma dei punti associati alla conclusione di episodi WIP. Un episodio
WIP termina quando il job passa da WIP a uno stato logico non-WIP:

```text
WIP → attesa cliente
WIP → attesa ente
WIP → attesa interna
WIP → prep/backlog
WIP → consegna/done
```

`WIP → WIP` normalizzato NON genera una nuova uscita. Usare esclusivamente la normalizzazione
e gli episodi WIP V2 già validati (`dashboardV2WipEpisodes_`) — non implementare una seconda
ricostruzione indipendente.

**Throughput di consegna** — il lavoro effettivamente arrivato a consegna tecnica, con la
semantica già validata delle consegne tecniche. È una grandezza diversa dal turnover WIP.

**Capacità sostenibile** — non coincide automaticamente né con il turnover WIP né con le
consegne. È una proprietà da inferire dai dati. La dashboard può produrre **tarature
suggerite**, ma non deve mai modificare automaticamente la CONFIG.

---

# 33. Settimane calendario complete — sostituisce la finestra rolling 🔴 revisione intenzionale

> **Decisione di Marco (16/09/2026)**: questa non è un'estensione facoltativa, è una
> correzione da fare "senza dubbio e senza indugio". Il criterio rolling attualmente in uso
> (`now - N*7*24 ore`) produce frammentazione: spostare la finestra di un'ora può far
> comparire o sparire consegne già avvenute (esempio reale osservato: 2 consegne su 3
> misurate cambiano spostando la finestra di un'ora). Le settimane calendario complete
> eliminano questo rischio per costruzione — la finestra è sempre la stessa per l'intera
> durata della settimana. Questo **sostituisce** il comportamento di `capacity_window_weeks`
> già approvato in produzione TEST, non lo affianca.

Il calcolo non deve più usare finestre rolling per le metriche consolidate settimanali.

## 33.1 Definizione settimana

Timezone `Europe/Rome`. Settimana ISO: da lunedì 00:00 locale (incluso) al lunedì successivo
00:00 locale (escluso). Usare operazioni calendario/timezone-safe: NON sottrarre
semplicemente `7*24` ore, perché i passaggi DST possono produrre errori (settimane di 6,99 o
7,01 giorni).

## 33.2 Settimana corrente

La settimana in corso può essere visualizzata nel CFD e deve essere identificabile come
periodo parziale quando necessario, ma NON entra nei KPI consolidati basati su settimane
complete né nella taratura suggerita.

## 33.3 Finestra configurabile

Il numero di settimane non deve essere hardcoded. Verificare se `capacity_window_weeks` (o
altro parametro CONFIG semanticamente equivalente, vedi la sessione "Correzioni feedback
Stato/CFD" del 16/09/2026 che lo ha appena reso visibile in UI) controlla già la finestra
corrente: se sì, riusarlo — non crearne un duplicato. Il significato operativo diventa:
numero di settimane ISO complete concluse usate nella finestra di osservazione recente. Se il
nome esistente risultasse incompatibile semanticamente, documentare il problema prima di
rinominarlo — non eseguire un rename del contratto/CONFIG solo per uniformità terminologica.

## 33.4 Metriche che devono usare la stessa finestra

Salvo una motivazione tecnica esplicitamente documentata in `PROGRAMMA_STATO.md` e approvata
da Marco, devono usare la medesima finestra configurata di settimane complete: ritmo recente
di consegna, flusso attivo recente, nuovi ingressi recenti, rientri recenti, quota rientri,
indicatori recenti mostrati nello Stato del flusso, taratura suggerita del flusso attivo.
Questa uniformità rende i valori confrontabili fra loro.

## 33.5 Separazione semantica da `wip_trend_weeks` 🔴 audit richiesto

> **Nota (16/09/2026)**: `wip_trend_weeks` (default 26) è un parametro attivo, non morto —
> confermato in codice (`dashboardV2Capacity_` lo legge e lo valida come intero ≥
> `capacity_window_weeks`, lo passa a `dashboardV2Absorption_`; `dashboardV2Flow_` lo usa via
> `dashboardV2CalendarWeeks_(now, Number(config.wip_trend_weeks))` per determinare l'estensione
> della serie settimanale di flusso). Non va rimosso senza verifica.

Con l'introduzione di Fase 7 esistono ora **tre parametri temporali distinti** che non devono
interferire semanticamente fra loro:

```text
capacity_window_weeks  → ampiezza delle finestre di calcolo (§33.3)
history_reliable_from  → inizio dello storico ritenuto affidabile per la taratura (§34)
wip_trend_weeks        → profondità massima delle serie settimanali materializzate/esposte
```

**Rischio da verificare**: se `wip_trend_weeks` tronca oggi anche l'input della taratura
suggerita (§36) o di Little (§37) — cioè se una serie costruita con
`dashboardV2CalendarWeeks_(now, wip_trend_weeks)` viene poi riusata come limite per quei
calcoli — allora un parametro pensato per la sola profondità grafica limiterebbe
silenziosamente quanta storia affidabile la taratura può usare. Se domani `history_reliable_from`
retrocede a 18 mesi fa, la taratura non deve restare tagliata a 26 settimane per un effetto
collaterale di un parametro grafico.

**Audit richiesto a Codex**: elencare tutti i consumer attuali di `wip_trend_weeks` e
classificare ciascuno secondo queste categorie: (1) costruzione serie per visualizzazione; (2)
calcolo assorbimento nuovo lavoro; (3) calcolo flusso attivo recente; (4) selezione delle
finestre della taratura suggerita (§36); (5) alimentazione di Little (§37). Se (4) o (5)
risultano influenzati, separare: la taratura suggerita e Little devono scorrere su tutto lo
storico affidabile disponibile da `history_reliable_from`, non sugli ultimi
`wip_trend_weeks` bucket per effetto collaterale.

> **Precisazione (16/09/2026)**: l'audit deve seguire anche la **data lineage indiretta**, non
> limitarsi alla ricerca delle letture dirette di `config.wip_trend_weeks`. Verificare se le
> funzioni di taratura suggerita o Little consumano serie, bucket o strutture già troncate a
> monte da `wip_trend_weeks` (es. una serie costruita da `dashboardV2CalendarWeeks_` con quel
> parametro, poi riusata più a valle per un calcolo diverso da quello per cui era stata
> generata). Un'influenza transitiva vale come influenza diretta del parametro ai fini di
> questo audit.

**Regola target**: `capacity_window_weeks` decide la dimensione delle finestre;
`history_reliable_from` decide il limite storico della taratura; `wip_trend_weeks` decide solo
la profondità delle serie operative/diagnostiche dove una profondità finita serve davvero
(tipicamente visualizzazione). Non eliminare `wip_trend_weeks` in questa fase — è confermato
attivo in codice. Se l'audit dei consumer mostrasse che è diventato superfluo, sarà una
decisione separata, non di questa fase.

**Aggiornare comunque subito** la descrizione CONFIG del parametro, da "Settimane di storico
disponibili per serie e analisi WIP" a un testo che non lasci intendere un ruolo nella
taratura, ad esempio: *"Profondità massima delle serie settimanali operative WIP. Non
definisce né la finestra di osservazione né l'inizio dello storico affidabile per la
taratura."*

---

# 34. Data di affidabilità dello storico

Aggiungere un parametro CONFIG esplicito, `history_reliable_from`, default applicativo
**vuoto** — non hardcodare una data reale nel codice, il valore sarà configurato
manualmente da Marco. Significato: prima data dalla quale la registrazione della board è
considerata sufficientemente completa per analisi di taratura e capacità.

I dati antecedenti possono restare disponibili, essere mostrati nel CFD, contribuire alla
ricostruzione storica se necessario. NON devono però essere usati automaticamente per
taratura suggerita del flusso, stima Little, inferenze sulla capacità recente, quando
`history_reliable_from` è configurato.

---

# 35. Riferimenti CONFIG per flusso attivo e consegna

Non usare più un unico riferimento ambiguo per grandezze differenti. Prima dell'intervento,
fare audit di `flow_reference_points_per_week` e `flow_reference_completions_per_week` (i
valori approvati da Marco in Fase 1bis: rispettivamente 14,5 e 1,9) e di tutti i relativi
consumer, per stabilire a quale delle due grandezze di §32.1 ciascuno si riferisce davvero
oggi.

Il sistema deve distinguere semanticamente `active flow reference` e `delivery flow
reference` — nomi preferibili: `active_flow_reference_points_per_week`,
`delivery_flow_reference_points_per_week`. Non è obbligatorio rinominare chiavi pubbliche già
consolidate se questo produce un refactoring sproporzionato: in tal caso mantenere
compatibilità, introdurre campi espliciti solo dove necessario, documentare quale chiave
rappresenta quale fenomeno, eliminare l'ambiguità dalla business logic.

**Vincolo**: il riferimento usato per stabilire se le consegne sono rallentate deve essere il
riferimento del throughput di consegna. Il riferimento del flusso attivo NON deve governare
direttamente lo Stato del flusso (§7 di questo documento resta valido: nessun nuovo stato,
nessun fallback su tarature storiche).

**Migrazione**: se l'audit conclude che serve un rename o uno split dei parametri esistenti,
**non eseguire una migrazione automatica in questa fase** — fermarsi e documentare in
`PROGRAMMA_STATO.md` cosa servirebbe. Una eventuale migrazione one-time dei valori CONFIG già
approvati verrà decisa e commissionata da Marco separatamente, quando necessaria.

---

# 36. Stima diagnostica del flusso attivo di riferimento

> **Chiarimento architetturale (16/09/2026)**: questa sezione e la successiva (§37) sono state
> riscritte da Marco per eliminare un equivoco emerso in collaudo — vedere §33.5/§46 per il
> contesto. Sostituiscono integralmente la versione precedente dello stesso giorno (che usava
> `active_flow_*_per_week` in modo ambiguo e faceva usare a Little il flusso *osservato*
> anziché quello *suggerito*). `CONFIG ≠ stime diagnostiche`: in CONFIG restano solo le
> politiche operative approvate (riferimento consegne, soglia di rallentamento, fascia WIP);
> il flusso attivo suggerito è una stima automatica, mai trasferita in CONFIG, che non governa
> `REGULAR/SLOWING` e non è un nuovo parametro operativo.

La dashboard deve stimare automaticamente, a partire dallo storico considerato affidabile, il
livello di flusso attivo sostenibile osservato nel sistema, espresso come turnover degli
episodi WIP. Questa grandezza è distinta dal throughput di consegna.

```text
throughput di consegna = punti arrivati a consegna tecnica / tempo
flusso attivo          = punti usciti dal WIP / tempo
```

La stima del flusso attivo:

- NON è un parametro operativo della CONFIG;
- NON sostituisce `flow_reference_points_per_week`, che rappresenta il riferimento configurato
  delle consegne;
- NON modifica automaticamente alcun valore CONFIG;
- NON interviene direttamente nella classificazione dello Stato del flusso;
- costituisce una stima diagnostica della capacità di lavorazione/turnover del sistema.

## 36.1 Calcolo

Utilizzare esclusivamente settimane ISO complete successive a `history_reliable_from`.
Costruire finestre rolling di `capacity_window_weeks` settimane complete su **tutto** lo
storico affidabile disponibile (non limitato a `wip_trend_weeks` — vedere §33.5).

Una finestra è utilizzabile solo quando `mean_wip_jobs >= wip_target_min_jobs` (riuso
consapevole del parametro già configurato in Fase 1bis — se in collaudo risultasse inadeguato
a questo scopo, va segnalato, non silenziosamente sostituito). La media WIP deve usare la
serie backend già disponibile — non inventare una seconda ricostruzione del WIP.

Per ogni finestra calcolare separatamente, dalle chiusure degli episodi WIP:

```text
active_flow_points_per_week
active_flow_jobs_per_week
```

La stima strutturale è la **mediana** delle finestre valide:

```text
suggested_active_flow_points_per_week
suggested_active_flow_jobs_per_week
```

> **Precisazione (16/09/2026)**: le due mediane vanno calcolate **indipendentemente** sulle
> rispettive serie delle stesse finestre valide (punti da `active_flow_points_per_week`, lavori
> da `active_flow_jobs_per_week`). Non ricavare `suggested_active_flow_jobs_per_week` dividendo
> `suggested_active_flow_points_per_week` per una taglia media dei job — è una scorciatoia
> plausibile ma matematicamente diversa (la mediana di un rapporto non è il rapporto delle
> mediane) e va evitata.

> **Regola sull'arrotondamento (16/09/2026)**: tutta la business logic e tutta la statistica
> (comprese le mediane di questa sezione) devono operare su valori a **precisione piena**.
> L'arrotondamento è ammesso esclusivamente per i campi destinati alla presentazione
> umana/UI. Nessun valore arrotondato può essere riutilizzato come input di un calcolo
> successivo, nemmeno se già passato per un punto di serializzazione verso il frontend — vale
> anche per il hardening di questo stesso giorno su questo punto.

NON usare il massimo, NON usare una singola settimana. Mostrare anche: numero finestre valide,
minimo osservato, massimo osservato, periodo coperto — descritti come **intervallo
osservato**, mai come intervallo di confidenza (le finestre sono rolling/sovrapposte, quindi
non indipendenti: non vantano una robustezza statistica che non hanno).

## 36.2 Significato

`suggested_active_flow_*` rappresenta una stima diagnostica del ritmo di turnover che il
lavoro attivo ha mostrato di poter sostenere nelle condizioni osservate. NON rappresenta: il
ritmo delle consegne; una nuova soglia dello Stato del flusso; un valore da trasferire
automaticamente in CONFIG.

La sua funzione principale è: (1) descrivere la capacità attiva strutturale osservata; (2)
confrontarla con il throughput effettivo di consegna e con il rework (§38); (3) alimentare la
stima del WIP di riferimento tramite Little (§37).

---

# 37. WIP di riferimento suggerito tramite Little

La legge di Little viene utilizzata come strumento diagnostico per stimare quale stock medio
di lavoro attivo sia coerente con il flusso attivo strutturale suggerito al §36 e con i tempi
effettivamente osservati negli episodi WIP. Il risultato NON costituisce automaticamente un
nuovo limite operativo e NON modifica la fascia WIP configurata.

Deve essere presentato come **"WIP di riferimento suggerito dai dati"** oppure **"WIP
coerente con la capacità attiva stimata"**. NON come "WIP ottimale". NON come "WIP massimo" —
Little fornisce uno stock medio coerente, non un limite massimo; l'eventuale trasformazione in
soglia minima/massima resta una decisione di policy successiva, esplicita e manuale.

## 37.1 Calcolo in lavori

```text
L_jobs = suggested_active_flow_jobs_per_week * mean_wip_episode_duration_weeks
```

dove `suggested_active_flow_jobs_per_week` è la mediana delle finestre valide definita al §36,
e `mean_wip_episode_duration_weeks` è la durata media degli episodi WIP conclusi e validi
appartenenti allo storico affidabile (§37.2).

## 37.2 Calcolo in punti

```text
weighted_mean_wip_duration_weeks = Σ(points_i * duration_i_weeks) / Σ(points_i)
L_points = suggested_active_flow_points_per_week * weighted_mean_wip_duration_weeks
```

Utilizzare grandezze appartenenti allo stesso perimetro operativo. NON utilizzare nella
formula: throughput di consegna; `flow_reference_points_per_week`; P50; P80; lead time
complessivo ingresso→consegna — sono una popolazione statistica diversa (l'intero
attraversamento ingresso→consegna, non il solo tempo dentro un episodio WIP); mescolarle
invaliderebbe la formula.

**Episodi utilizzabili**: usare episodi WIP conclusi, deterministicamente ricostruiti,
appartenenti al periodo storico affidabile (§34). Non inventare una durata per episodi senza
timestamp sufficienti. Gli episodi WIP ancora aperti non entrano nella media delle durate
concluse, salvo metodologia esplicitamente approvata in futuro.

> **Limite noto e accettato (16/09/2026)**: escludere gli episodi ancora aperti dalla media
> introduce un bias sistematico verso il basso — gli episodi più lunghi sono
> proporzionalmente più probabile che siano ancora aperti al momento del calcolo, quindi
> sotto-rappresentati. Il "WIP suggerito da Little" va quindi letto come stima
> tendenzialmente ottimistica (WIP suggerito più basso del reale), non neutra. Marco ha
> chiesto di tenerne traccia nella documentazione di progetto invece di tentare una
> correzione ora: questo paragrafo è quella traccia. Una correzione (es. tecniche di
> censoring per dati troncati) resta lavoro futuro, non di questa fase.

**Episodi anomali (`discontinuous_from`)**: un episodio con `from` dichiarato incoerente con lo
stato WIP ricostruito non va escluso automaticamente — va classificato caso per caso
(`deterministic_with_anomaly` se apertura/chiusura restano comunque univoche,
`non_deterministic` altrimenti). Solo i `non_deterministic` vanno esclusi. Se emerge una regola
generale codificabile per questa classificazione, può essere inserita nella normalizzazione
condivisa — ma **solo** dimostrando con test di regressione che non cambiano involontariamente:
numero e confini degli episodi WIP già validati, classificazione first/rework, stock CFD,
conteggio rientri e le altre metriche V2 già chiuse. La nuova regola deve qualificare la
determinabilità dell'episodio, non reinterpretare arbitrariamente la cronologia già
ricostruita.

## 37.3 Funzione del risultato

Little restituisce uno stock medio coerente con il flusso e con il tempo attivo osservati. Non
determina direttamente il limite massimo del WIP. La dashboard deve confrontare **fascia WIP
configurata** vs **WIP di riferimento suggerito dai dati**, senza modificare automaticamente
la CONFIG:

```text
Fascia WIP configurata     3–5 lavori
WIP suggerito da Little    3,8 lavori
```

Il risultato indica coerenza o possibile necessità di rivalutazione, ma la decisione sulla
fascia operativa resta esplicita e manuale.

Produrre almeno: `little_wip_jobs`, `little_wip_points`, `mean_wip_episode_duration`,
`weighted_mean_wip_episode_duration`, `sample_size`. Se calcolati per più finestre valide,
possono essere mostrati anche mediana, minimo osservato, massimo osservato — come
**variabilità osservata**, non come falsa fascia statistica.

## 37.4 Flusso recente osservato

Il flusso attivo recente (`observed_active_flow_points_per_week`,
`observed_active_flow_jobs_per_week`, finestra CONFIG §33.3, non l'intero storico affidabile)
resta disponibile nella diagnostica per descrivere il comportamento corrente (§38). Può essere
usato, se utile, per verificare quale stock sia coerente con il ritmo corrente — ma questo
calcolo deve restare distinto semanticamente dal "WIP di riferimento suggerito" e non va
mostrato con la stessa etichetta. **Non utilizzare il flusso recente al posto del flusso
suggerito nel calcolo principale di §37.1/§37.2.**

---

# 38. Capacità e rework (Diagnostica)

NON creare una nuova card primaria. NON inserire questa analisi nel CFD. Creare, dentro
"Diagnostica e taratura", un sottoblocco "Capacità e rientri", mostrando in modo compatto:
flusso attivo osservato (pt/settimana), ritmo di consegna (pt/settimana), rientri (% degli
ingressi WIP). Facoltativo: rapporto output consegnato/turnover WIP (%) — se mostrato, usare
esattamente questa o analoga denominazione. NON chiamarlo efficienza, rendimento, perdita, o
capacità sprecata: non esiste ancora una dimostrazione causale che tutta la differenza fra
turnover e consegne sia causata dal rework.

È ammessa una nota interpretativa sintetica, del tipo: "Il sistema movimenta più lavoro di
quanto ne porti a consegna; l'elevata quota di rientri indica che una parte rilevante
dell'attività viene assorbita da lavoro già transitato nel WIP." NON produrre automaticamente
conclusioni causali più forti, NON introdurre soglie o classificazioni buono/cattivo non
previste dalla CONFIG.

---

# 39. Diagnostica e taratura — struttura finale

Riorganizzare la parte bassa della dashboard in sottoblocchi chiari:

**A — Parametri configurati**: finestra di osservazione (N settimane complete), storico
affidabile da (data / non configurato), fascia WIP configurata (min–max lavori), riferimento
consegne configurato, soglia rallentamento. Non mostrare timestamp ISO grezzi.

**B — Capacità e rientri**: come §38.

**C — Taratura WIP suggerita dai dati** (accorpa le ex "Taratura suggerita" e "WIP suggerito
da Little" — vedi nota sotto):

```text
Capacità attiva stimata
XX,X punti/settimana

WIP di riferimento suggerito
X,X lavori · XX,X punti

Fascia WIP configurata
X–Y lavori
```

Solo questi tre risultati hanno peso visivo primario. Non è un limite massimo (§37). NON
dichiarare automaticamente "configurazione corretta"/"configurazione errata" salvo futura
specifica — il confronto resta informativo.

> **Chiarimento (16/09/2026)**: "Taratura suggerita" (`suggested_active_flow_*`, ex §36) e "WIP
> suggerito da Little" (`little_wip_*`, ex §37) NON sono due tarature indipendenti di pari
> livello — tenerle come blocchi separati crea l'equivoco di due proposte alternative. La
> capacità attiva stimata è una grandezza intermedia diagnostica, non trasferita in CONFIG, non
> governa lo Stato del flusso: serve solo come input del calcolo di Little. Il risultato finale
> utile della catena è il **WIP di riferimento suggerito**, l'unico confrontato con la fascia
> WIP configurata. Catena logica: storico affidabile → capacità attiva stimata → tempo medio
> negli episodi WIP → Little → WIP di riferimento suggerito → confronto con la fascia
> configurata.
>
> **Etichetta**: usare "Capacità attiva stimata", non "Flusso attivo suggerito" — la parola
> "suggerito" induce a pensare "questo è il valore da configurare", mentre è una stima del
> comportamento strutturale osservato, non un valore proponibile per CONFIG. Non rinominare il
> campo backend `suggested_active_flow_*` (resta invariato): è solo l'etichetta UI a cambiare.
> Non confondere con "Flusso attivo osservato" del blocco B (§38) — grandezza diversa, recente
> anziché strutturale.
>
> **Principio UX**: non mostrare un numero solo perché il backend lo calcola. Ogni valore
> visibile in primo piano deve rispondere a una domanda concreta — quanto lavoro attivo il
> sistema sembra poter processare (capacità attiva stimata); quale stock WIP è coerente con
> quella capacità (WIP suggerito da Little); come si confronta con la policy attuale (fascia
> configurata). Numero di finestre valide, intervallo osservato, periodo coperto, permanenza
> media, permanenza ponderata per punti e numerosità del campione sono metadati per verificare
> il calcolo, non risultati di pari peso: vanno nel dettaglio espandibile, confluiscono nel
> blocco D sotto.

**D — Qualità e copertura**: settimane complete disponibili, finestre valide, intervallo
osservato (pt/settimana), periodo coperto, permanenza media nel WIP, permanenza ponderata per
punti, episodi WIP utilizzati, consegne osservate, inizio storico affidabile. Eventuali
anomalie del log (inclusi episodi `discontinuous_from`, §37.2) restano qui.

---

# 40. Semplificazione del dettaglio Stato del flusso

Rafforza quanto già stabilito in §6.2: il dettaglio deve spiegare soltanto il motivo dello
stato — lavori attivi, fascia di riferimento, ritmo recente (ora basato sulle settimane
calendario complete di §33), soglia di rallentamento. Rimuovere se ancora presenti:
riferimento tecnico non usato direttamente nella decisione, qualità statistica, timestamp
ISO, campione dettagliato, settimane con completamenti, parametri diagnostici, formule —
questi dati stanno in Diagnostica e taratura (§39).

---

# 41. Contratto backend — estensioni Fase 7

NON rinominare il contratto pubblico generale di `buildDashboardStateV2_` (§22.1). NON creare
un nuovo wrapper. Estendere in modo additivo le strutture già esistenti (`currentWork,
capacity, flow, timing, rework, systemFlow, diagnostics, ...`), secondo la semantica reale
del codice. Se serve un nuovo blocco diagnostico, inserirlo dove produce il minor impatto sul
contratto esistente.

Struttura concettuale (i nomi concreti seguono le convenzioni già presenti nel contratto —
non rinominare campi pubblici solo per farli coincidere con questo esempio):

```text
diagnostics / calibration_suggestion
  observation_window
  reliable_history
  active_flow
  delivery_flow
  little_wip
  capacity_vs_rework
  data_quality
```

---

# 42. Lavoro futuro non pianificato (backlog, non Fase 7)

> **Nota (16/09/2026)**: Marco ha segnalato l'utilità di una piccola interfaccia frontend per
> aggiornare i valori di taratura, invece di editare direttamente il foglio CONFIG. Non fa
> parte di questa fase e non va implementata ora — resta un'annotazione di backlog. Fino a
> nuova decisione, l'aggiornamento della taratura continua a avvenire direttamente su CONFIG
> nel foglio Google.

> **Nota superata (16/09/2026)**: questa sezione conteneva in precedenza un'annotazione di
> backlog sul "WIP strutturale" (WIP coerente con la taratura suggerita anziché con
> l'osservato). Non è più backlog: è stata adottata come design corrente in §36/§37 (Little usa
> ora `suggested_active_flow_*`, non `observed_active_flow_*`, che resta comunque disponibile
> separatamente in diagnostica per il regime recente — §37.4).

> **Nota (16/09/2026) — Fascia WIP in punti e vincolo operativo sulla board**: oggi la fascia
> WIP configurata (`wip_target_min_jobs`/`wip_target_max_jobs`) esiste solo in lavori. Marco ha
> l'intenzione, non ancora pianificata, di (1) aggiungere una fascia equivalente espressa in
> punti (nuovi parametri CONFIG da calibrare manualmente — non derivabile automaticamente da
> quella in lavori tramite una taglia media, per lo stesso motivo di §36.1: un fattore di
> conversione implicito sarebbe una taratura silenziosa) e, soprattutto, (2) trasformare questa
> fascia da soglia **osservativa** (usata solo per la Diagnostica e per lo Stato del flusso, §6)
> a un vero **vincolo operativo sulla board principale**, che limiti quanti lavori/punti possono
> entrare nella colonna WIP — sia in termini di lavori sia di punti. Decisione esplicita: non
> implementare ora, raccogliere ancora qualche mese di dati prima di calibrare la fascia in
> punti e prima di progettare l'enforcement sulla board. Questo è un cambio di natura, non solo
> di scala: da "la dashboard osserva e segnala" a "la board impedisce l'ingresso oltre soglia" —
> merita una sezione di design dedicata quando verrà ripreso, non un'estensione incrementale di
> §6/§39.

---

# 43. Nessun hardcoding dei valori reali (richiamo)

Vale la regola già stabilita nel resto del documento, qui riaffermata per questa fase: NON
scrivere nel codice applicativo valori come "8 settimane", "15 pt/settimana", "5,5
pt/settimana", "3–5 lavori", "58%". I valori reali derivano da CONFIG o dai dati. Numeri
concreti sono ammessi solo nelle fixture di test.

> **Perimetro della regola (16/09/2026)**: il divieto riguarda valori di configurazione, soglie,
> finestre temporali operative, taratura o fixture del database. NON riguarda le costanti
> tecniche intrinseche alle unità di misura o agli algoritmi (es. 7 giorni/settimana, 1000
> ms/secondo, indici di ciclo) — quelle non sono "valori reali" nel senso di questa regola e non
> vanno spostate in CONFIG né trattate come BLOCKER. In caso di dubbio su un valore specifico,
> segnalarlo invece di indovinare in una direzione o nell'altra.

---

# 44. Test obbligatori — Fase 7

- Settimane complete: fixture con data corrente a metà settimana, l'ultima settimana inclusa
  deve essere l'ultima ISO completamente conclusa, la settimana corrente esclusa.
- DST: almeno un intervallo che attraversa il cambio ora legale/solare; nessuna settimana di
  6,99 o 7,01 giorni.
- Config window: cambiare il parametro dal valore fixture attuale a un altro; tutti i calcoli
  recenti previsti si adeguano, nessun valore implicito sopravvive.
- Historical reliability: eventi precedenti a `history_reliable_from` restano leggibili nello
  storico, non entrano nelle tarature suggerite.
- Active flow: `WIP → waiting`, `WIP → done`, `WIP → prep` terminano episodi e contribuiscono
  al turnover; `WIP → WIP` non contribuisce.
- Finestre sottoalimentate: finestra con `mean_wip_jobs < wip_target_min_jobs` non entra nella
  taratura suggerita.
- Mediana: la taratura suggerita è la mediana delle finestre valide, non il massimo, non la
  media globale, calcolata a precisione piena (fixture che distingue mediana su valori
  arrotondati vs. non arrotondati, come il caso reale 14,3125 → 14,31 contro 14,32 se
  arrotondato prima).
- Taratura suggerita in lavori: `suggested_active_flow_jobs_per_week` deve essere calcolato e
  esposto (§36.1), non solo la versione in punti.
- Little jobs: verificare `suggested_active_flow_jobs_per_week * mean_wip_episode_duration_weeks
  = little_wip_jobs` su fixture deterministica — **non** il flusso recente/osservato.
- Little points: verificare esplicitamente la media temporale ponderata e la conseguente
  formula Little, con `suggested_active_flow_points_per_week` come input — **non** il flusso
  recente/osservato.
- Little vs osservato: fixture in cui flusso suggerito e flusso recente differiscono
  chiaramente; verificare che `little_wip_*` cambi con il suggerito e sia indifferente a
  variazioni del solo recente.
- `wip_trend_weeks`: verificare che la taratura suggerita (§36) e Little (§37) coprano tutto lo
  storico affidabile da `history_reliable_from`, non solo gli ultimi `wip_trend_weeks` bucket.
- Stato del flusso: il turnover WIP non deve influenzare direttamente `SLOWING`, che usa il
  ritmo di consegna e il relativo riferimento configurato.
- Nessuna autotaratura: la taratura suggerita non modifica CONFIG né al caricamento, né al
  refresh, né dopo un calcolo.

---

# 45. Collaudo umano — Fase 7

Dopo push su TEST verificare manualmente: struttura generale della home invariata; CFD
visivamente invariato salvo eventuale indicazione della settimana parziale; nessuna nuova
linea turnover nel CFD; card Rientri invariata; Stato del flusso più semplice; ritmo recente
stabile durante la stessa settimana; cambiando giorno/ora della stessa settimana completa il
valore consolidato non cambia; Diagnostica distingue chiaramente flusso attivo, consegne,
rientri; il blocco unico "Taratura WIP suggerita dai dati" (§39C) mostra in primo piano solo
capacità attiva stimata, WIP di riferimento suggerito (punti e lavori) e fascia WIP configurata
— mai come due tarature separate di pari peso; etichette "suggerito dai dati"/"coerente con la
capacità attiva stimata", mai "ottimale" né "massimo"; il WIP di riferimento mostrato è
numericamente riconciliabile con `suggested_active_flow × durata media WIP`; finestre valide,
intervallo osservato, periodo coperto e permanenza media/ponderata compaiono solo nel dettaglio
espandibile (§39D), non in primo piano; il flusso attivo **recente/osservato** resta visibile e
distinto nel blocco B (§38), con etichetta propria, e non deve necessariamente coincidere con
l'input di Little; nessun valore reale hardcoded; nessuna regressione sulle metriche V2 già
validate.

> **Nota (16/09/2026)**: la verifica che Little cambi al variare del *solo* flusso suggerito
> (e non del recente) è un test automatico su fixture (§44), non un collaudo umano su TEST — il
> flusso suggerito non è un parametro modificabile manualmente senza cambiare dati o algoritmo.
> Il collaudo reale si limita alla riconciliazione numerica sopra descritta.

---

# 46. Verifica di coerenza con lavoro già pubblicato il 16/09/2026

La sessione "Correzioni feedback Stato/CFD", pubblicata e collaudata su TEST il 16/09/2026
(vedi `PROGRAMMA_STATO.md`), ha reso visibile in UI la distinzione fra `capacity_window_weeks`
(8 settimane) e `wip_trend_weeks` (26), con un testo esplicativo "Come è stata ottenuta questa
lettura" scritto assumendo la semantica rolling allora vigente. Prima di chiudere la Fase 7,
verificare se quel testo resta accurato dopo la ridefinizione di `capacity_window_weeks` a
settimane ISO complete (§33) — aggiornarlo se necessario, senza riaprire il resto di quella
sessione già collaudata.

---

# 47. Principio (Fase 7)

Il risultato deve permettere di distinguere chiaramente: quanto lavoro il team riesce a
processare → quanto lavoro ricircola → quanto lavoro arriva effettivamente a consegna; e,
separatamente: flusso attivo + tempo medio nel WIP → WIP coerente suggerito da Little. Il
sistema deve **misurare e suggerire**, non modificare autonomamente le politiche operative,
non aggiungere complessità al CFD quando la stessa informazione può essere spiegata meglio
nella Diagnostica, non reinterpretare/semplificare/sostituire queste specifiche senza BLOCKER
REPORT.

---

# 48. Fase 7 — Miglioramenti metodologici: sottofasi atomiche

Non implementare tutto come un unico refactoring. Prima di ciascuna sottofase, leggere lo
stato reale in `PROGRAMMA_STATO.md` e verificare che non esistano sviluppi concorrenti
incompatibili (in particolare: la correzione in corso della Fase 5E, §18, che è un binario
separato e non va toccata da questa fase).

## 7A — Settimane calendario
Implementare helper unico e testato per le N settimane ISO complete (§33). Adeguare le
metriche recenti elencate in §33.4. Verificare §46. Test + commit.

## 7B — Flusso attivo
Esporre il turnover degli episodi WIP sul backend (§32.1, §36.1). Nessuna modifica al CFD.
Test + commit.

## 7C — Storico affidabile e taratura suggerita
Aggiungere `history_reliable_from` (§34). Costruire le finestre valide e calcolare la mediana
del flusso attivo (§36). Test + commit.

## 7D — Little
Calcolare la versione jobs e la versione points, con campioni e durate (§37). Documentare il
limite noto di §37.2. Test + commit.

## 7E — Diagnostica UX
Aggiungere Capacità e rientri, Taratura suggerita, WIP suggerito da Little, Qualità/copertura
(§38, §39). Non creare nuove card primarie. Test + commit.

## 7F — Stato del flusso
Semplificare il pannello di dettaglio (§40). Verificare che usi il ritmo di consegna basato
su settimane complete e il riferimento di consegna, non quello di flusso attivo (§35).
Test + commit.

## 7G — Gate finale Fase 7
Suite completa. Riconciliazione V2. Push TEST. Collaudo umano (§45). Aggiornamento
`PROGRAMMA_STATO.md`. Al termine di 7G, se anche la correzione della Fase 5E risulta DONE, il
gate 6F (§28) diventa approvabile — non prima.
