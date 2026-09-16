# La dashboard V3 riconcilia gli stock, ma lo stato del flusso richiede più trasparenza

Data del confronto: 14/09/2026.

Esito: **Needs revision** per usare lo "Stato del flusso" come segnale
decisionale; **corretta nel perimetro verificato** per stock correnti,
settimane impegnate e costruzione del CFD.

Il confronto è stato eseguito in sola lettura tra:

- `SigmaFlow_verifica_indipendente_dashboard_V3.md`;
- `SigmaFlow_stock_settimanale.csv`;
- `SigmaFlow_capacita_settimanale.csv`;
- `SigmaFlow_nuovo_lavoro_settimanale.csv`;
- `SigmaFlow_CFD_naive_vs_corretto.csv`;
- dashboard V3 reale sul deployment HEAD TEST;
- definizioni e implementazione correnti in `DashboardV2.gs` e nei documenti
  di design V2/V3.

Non sono state modificate la dashboard, le sorgenti dati o PROD.

## Sintesi

- Le quattro grandezze operative principali coincidono: **4 lavori / 39
  punti in WIP**, **10 / 71 già acquisiti**, **12 / 95 in attesa** e
  **10,92 settimane impegnate**.
- Il CFD della V3 usa stock ricostruiti nel tempo. Non usa la differenza
  impropria fra ingressi e completamenti. Il CSV di controllo mostra quanto
  sarebbe grave l'alternativa: **274 punti** con il metodo naive contro
  **39 punti** reali, differenza **235 punti**.
- Due misure non riconciliano ancora: **43 riprese** nella V3 contro **41**
  nella verifica e **5,63 punti/settimana** di ritmo recente contro
  **4,625**. Le cause probabili sono rispettivamente la diversa definizione
  della fonte e la diversa finestra/ora di estrazione, ma servono dettagli
  evento per evento per chiuderle.
- La frase "senza un aumento osservato della capacità" è troppo forte:
  nella stessa card il ritmo recente è **5,63**, circa tre volte il
  riferimento storico **1,87**. La V3 dimostra che il WIP è appena sopra la
  fascia osservata; non dimostra da sola una congestione.
- "Affidabilità buona" non è sufficientemente motivato nell'interfaccia.
  La verifica trova solo **20 completamenti tecnici** nello storico, in gran
  parte recenti, mentre la UI non mostra campione, settimane utilizzate,
  copertura o completezza dello storico.

## Confronto dei valori

| Indicatore | Verifica indipendente | Dashboard V3 TEST | Valutazione |
| --- | ---: | ---: | --- |
| Lavori in corso | 4 job / 39 punti | 4 / 39 | Coincide |
| Lavoro già acquisito | 10 job / 71 punti | 10 / 71 | Coincide |
| In attesa | 12 job / 95 punti | 12 / 95 | Coincide |
| Settimane impegnate | 71 / 6,50 = 10,92 | 10,92 | Coincide |
| Riprese | 41 su 77 episodi, 53,2% | 43, 54% | Da riconciliare |
| Ritmo recente | 4,625 punti/settimana | 5,63 | Da riallineare per istante e finestra |
| Fascia WIP | Non ricalcolabile dai CSV | 1–3,89 | Plausibile, non certificata dagli allegati |
| Ritmo storico di regime | Non ricalcolabile dai CSV | 1,87 | Plausibile, non certificato dagli allegati |
| CFD corrente | 39 punti WIP | 39 punti WIP | Coincide; metodo a stock corretto |

I CSV analizzati non hanno valori nulli o righe esattamente duplicate. Il
file degli stock contiene due osservazioni il 14/09, alle 00:00 e alle 12:00,
con gli stessi valori: sono snapshot distinti e non devono essere sommati.

## Problemi prioritari e correzioni proposte

### 1. P1 — "Carico elevato" confonde fascia osservata e congestione

Lo stato scatta perché **4 > 3,89**, quindi per soli **0,11 lavori**. La
soglia superiore è il 75° percentile di medie WIP settimanali frazionarie,
non un limite operativo dimostrato. Inoltre il ritmo recente mostrato è
superiore al riferimento, mentre il testo dichiara che non è stato osservato
un aumento della capacità.

**Fix proposto:** distinguere il fatto osservato dalla diagnosi. Con i dati
attuali usare, per esempio, "WIP sopra la fascia centrale osservata; ritmo
recente superiore allo storico". Riservare "Carico elevato" a una soglia
operativa configurata oppure applicare una tolleranza/isteresi. Se il WIP è
sopra fascia ma il ritmo è elevato, mostrare entrambe le informazioni senza
dedurre congestione.

### 2. P1 — "Affidabilità buona" non espone le prove necessarie

Il backend considera sufficiente il campione quando raggiunge il minimo
configurato, ma non valuta la concentrazione temporale dei completamenti né
la completezza certificata dello storico. L'interfaccia nasconde
`sample_size`, `loaded_weeks`, intervallo osservato e qualità distinta delle
componenti recenti e storiche.

**Fix proposto:** separare "affidabilità del ritmo recente" da "solidità del
riferimento storico". Mostrare almeno numero di completamenti, settimane
utilizzate, periodo e stato di completezza. Usare "Parziale" quando lo
storico è disponibile ma non certificato o fortemente rarefatto.

### 3. P1 — Il ritmo recente non è riconciliabile dalla UI

Il CSV usa otto settimane di calendario concluse il 13/09 e produce
**37 / 8 = 4,625 punti/settimana**. Il backend usa una finestra mobile esatta
`(generated_at - 56 giorni, generated_at]` e mostra **5,63**, equivalente a
circa **45 / 8**. Uno scarto esatto di 8 punti potrebbe dipendere da un
completamento al bordo o successivo allo snapshot, ma gli allegati non
consentono di dimostrarlo.

**Fix proposto:** esporre `window_start`, `window_end`, timezone, numero di
completamenti e punti inclusi. Aggiungere un dettaglio/esportazione con
job, visita, `consegna_ts`, punti e origine attivo/archivio. In alternativa,
allineare il KPI a settimane ISO complete e dichiararlo chiaramente.

### 4. P1 — Le riprese usano definizioni diverse e il dettaglio non basta

La verifica indipendente considera visite con `start_ts`; la definizione V3
vigente ricostruisce invece gli episodi dagli ingressi e dalle uscite del
ruolo WIP in `activity_log_json`. Quindi l'affermazione della verifica secondo
cui `start_ts` sarebbe la fonte canonica è obsoleta. Resta però uno scarto
reale: **41 contro 43**.

Nel dettaglio V3 due righe "Emissioni diffuse — ripresa 2 — 20/05/2026 →
30/06/2026" risultano visivamente indistinguibili. Potrebbero appartenere a
job diversi oppure essere un duplicato; senza identificatore non è possibile
stabilirlo.

**Fix proposto:** produrre un anti-join fra `wipEpisodes.episodes` e visite
con `start_ts`, usando `job_id`, numero episodio, timestamp e riferimenti agli
eventi. Mantenere l'activity log come fonte canonica se la riconciliazione ne
conferma la qualità. Rinominare la card in "Episodi di ripresa" oppure mostrare
anche il numero di job distinti. Nel dettaglio aggiungere un identificatore
univoco o il committente per distinguere titoli uguali.

### 5. P1 — Fascia e baseline storica non sono auditabili con gli export attuali

La V3 calcola la fascia **1–3,89** sul 25°–75° percentile delle settimane
complete con WIP positivo, usando `avg_wip_jobs` pesato per durata. Il CSV
stock contiene fotografie puntuali, non queste medie. Il ritmo storico
**1,87** usa inoltre tutto lo storico e filtra le settimane sufficientemente
cariche, mentre il CSV capacità contiene solo 25 settimane.

**Fix proposto:** aggiungere un export diagnostico di `history.weekly` con
`temporal_coverage`, `avg_wip_jobs`, completamenti e punti. Esporre anche
campione della fascia, settimane cariche, campione delle finestre mobili e
metodo del percentile. In UI preferire "Fascia centrale osservata" a "Fascia
abituale", per non suggerire che sia ottimale.

### 6. P1 — I controlli di qualità esistono nel backend ma non sono visibili

Il CFD riconcilia correttamente le identità e la verifica indipendente non
trova stati orfani o discrepanze nello snapshot. La UI mostra però
"Controlli diagnostici non ancora attivi", impedendo al lettore di capire
quali parti sono state validate.

**Fix proposto:** mostrare un riepilogo minimo con identità CFD, job senza
stato osservato, log non parsabili, colonne orfane, visite senza job,
completezza storica e timestamp dell'ultimo dato. Non trasformare l'assenza
di anomalie in una garanzia di completezza.

### 7. P2 — Il tempo di caricamento resta variabile

La prima verifica dopo l'ottimizzazione mostrava **6.211 ms** di backend e
circa **12,7 secondi** complessivi. Nel presente controllo il backend ha
mostrato **8.151 ms**. È un miglioramento netto rispetto ai circa 30 secondi
iniziali, ma resta percepibile e variabile.

**Fix proposto:** misurare separatamente lettura fogli, normalizzazione,
storia/CFD e trasferimento client. Valutare una snapshot materializzata o una
cache breve invalidata dalle scritture, mantenendo visibile l'istante di
aggiornamento e senza servire dati obsoleti come correnti.

## Correzioni necessarie alla verifica indipendente

La verifica allegata resta utile, ma tre conclusioni devono essere aggiornate:

1. il codice V2/V3 è presente nel workspace corrente; l'osservazione sul repo
   fermo alla Fase U descrive una fonte remota non aggiornata;
2. la definizione canonica delle riprese usa gli episodi ricostruiti
   dall'activity log, non `visite.start_ts`;
3. i parametri mancanti dal foglio non rendono oggi impossibile lo stato:
   `readConfig_` applica i default backend e, in assenza dei target WIP,
   la V3 deriva esplicitamente la fascia dallo storico. Questo evita soglie
   numeriche nascoste, ma richiede più trasparenza in UI e nel report.

## Copertura della revisione

I conteggi seguenti descrivono le unità inventariate nel perimetro, non una
percentuale di accuratezza. `0 / N` significa che non è stato osservato un
difetto nelle unità considerate, non che ogni possibile stato sia certificato.

### Pratiche e qualità della dashboard

| Categoria | Difetti osservati | Valutazione |
| --- | ---: | --- |
| Utilità e completezza | 1 / 1 | La vista risponde alle domande operative, ma non permette di verificare le conclusioni principali. |
| Chiarezza analitica | 3 / 8 | Stato, riprese e qualità richiedono definizioni/campioni più espliciti; le quattro card e il CFD sono chiari. |
| Coerenza visiva e interazione | 1 / 4 | Desktop leggibile e senza clipping nel percorso verificato; righe omonime nel dettaglio riprese non sono distinguibili. Vista stretta non ricontrollata in questa revisione. |

### Correttezza e robustezza analitica

| Categoria | Difetti osservati | Valutazione |
| --- | ---: | --- |
| Autorità e confidenza delle fonti | 3 / 8 | Fascia, baseline storica e ritmo recente non hanno nell'UI il dettaglio necessario per una verifica indipendente. |
| Accuratezza dei valori | 0 / 8 | Nessun numero della V3 è stato dimostrato errato; ritmo e riprese restano non riconciliati. |
| Coerenza interna del grafico | 0 / 1 | Metodo a stock e snapshot corrente coerenti; non è stato eseguito un confronto punto per punto dei pixel/tooltips. |
| Dettagli completi della fonte | 3 / 4 | Mancano finestre/eventi per ritmo, input storici della fascia e identificatori completi delle riprese. |
| Coerenza tra verifica e dashboard | 2 / 5 | Discrepanze aperte su ritmo recente e riprese; stock, settimane impegnate e CFD coincidono. |
| Controlli qualità dati | 2 / 3 | Le identità CFD sono calcolate, ma diagnostica e completezza storica non sono esposte in modo operativo. |
| Supporto delle conclusioni | 2 / 2 | "Senza aumento osservato" e "Affidabilità buona" sono più forti delle evidenze visibili. |

## Ordine consigliato degli interventi

1. Correggere testo e semantica dello Stato del flusso, senza cambiare gli
   stock già corretti.
2. Esporre finestra, campione e qualità separata di ritmo recente e storico.
3. Riconciliare i 43 episodi con le 41 visite e rendere univoco il dettaglio.
4. Esportare la serie storica usata per fascia e baseline.
5. Attivare il riepilogo diagnostico già predisposto nel backend.
6. Profilare il tempo residuo e valutare cache/snapshot con invalidazione.

## Limiti

La verifica riguarda gli allegati forniti, il codice locale corrente e il
percorso desktop TEST osservato il 14/09/2026. Non sono stati forniti i raw
`jobs` e `visite` usati dall'analisi indipendente; per questo non è stato
possibile identificare i singoli eventi responsabili degli scarti. Nessuna
conclusione di causalità è stata tratta dal solo confronto WIP/throughput.
