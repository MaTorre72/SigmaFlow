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
