# Metriche dashboard SigmaFlow

## V5 — precisione home, lettura verticale e viste temporali

I valori di presentazione nei riquadri principali sono meno precisi del
contratto numerico: `committed_weeks` mostra al massimo una cifra decimale;
`lead_time_median_days` e `lead_time_p80_days` sono arrotondati all'intero.
Il dettaglio e la diagnostica conservano la precisione backend a due decimali.

"Andamento del lavoro" usa le boundary settimanali del backend senza
ricalcolare gli stock nel browser. La selezione puntuale espone lavoro già
acquisito, WIP nuovo, WIP rework, WIP totale, in attesa, completato e totale;
funziona con puntatore,
tocco e frecce da tastiera. Sotto le bande, sullo stesso asse temporale, sono
mostrati i conteggi settimanali `new_work_jobs`, `rework_wip_episodes` e
`completed_visits` come Nuovi ingressi, Rientri e Consegne.

Il WIP puntuale è classificato dal numero dell'episodio osservato: il primo è
`wip_new_*`, i successivi sono `wip_rework_*`. La boundary totale V2 resta
disponibile; nella pila il rework rosso è sotto il nuovo blu.

`dashboardV2History_` espone `weekly`, `monthly`, `quarterly` e `annual_cfd`.
Espone inoltre `daily` per la navigazione del CFD. La home consente 8
settimane, 3/6/12 mesi, anno corrente, mese, trimestre, anno e Da/A alle
risoluzioni giorno/settimana/mese; la scelta filtra bucket calcolati dal
backend e non ricostruisce le metriche nel browser.

Zoom, pan, reset e selezione di sottointervallo agiscono esclusivamente sulla
finestra dei bucket visualizzati. Il tooltip legge gli stock e le cumulative
dal contratto backend e aggiunge ingressi/completamenti cumulativi ai valori
puntuali già disponibili.

La legenda delle cinque bande può applicare un focus visivo: la serie scelta
resta piena e le altre sono attenuate. La geometria dello stack non cambia;
“Mostra tutte” azzera il focus.

La modalità “Misura tempo” permette di scegliere data e quota cumulativa con
le coordinate orizzontale e verticale del puntatore. La quota è vincolata fra
zero e il bordo superiore degli ingressi della colonna selezionata, ed è
sempre mostrata insieme a ingresso equivalente, uscita equivalente e durata.
Da tastiera, le frecce orizzontali cambiano data, quelle verticali regolano
la quota, mentre Inizio/Fine scelgono zero/massimo della colonna.
L'incrocio usa i `completed_boundary` già prodotti dal backend, anche oltre
il periodo momentaneamente visibile; il client applica la stessa
interpolazione lineare del backend senza ricostruire stock o cumulative e
senza round-trip durante l'interazione. `equivalent_time.jobs/points` resta
nel contratto backend come esito per la quota massima. Un incrocio non ancora
osservato resta nullo. P50 e P80 dei tempi effettivi conclusi sono mostrati
accanto come confronto di plausibilità, non come misure equivalenti.

Le rate lines opzionali mostrano la pendenza fra prima e ultima boundary del
periodo visibile, normalizzata per la durata reale in settimane. Ingresso e
completamento sono indipendenti e cambiano unità insieme al CFD.

Nel dettaglio dello Stato del flusso, il ritmo di completamento osservato usa
`capacity_window_weeks`: è una media mobile distinta dalla finestra
`wip_trend_weeks` usata per serie e analisi WIP. Riferimento, osservato e
campione sono presentati in colonne parallele per completamenti e punti; la
soglia che determina lo stato resta espressa in punti/settimana.

Lo zoom tramite rotella è disattivato sotto 900 px e sui dispositivi con
puntatore coarse, così il canvas non interrompe lo scorrimento verticale della
pagina. Il tooltip sovrapposto mostra soltanto stock, composizione e totale;
cumulative e movimenti del bucket restano nel riepilogo testuale accessibile
sotto il grafico.

I confronti CFD possono usare il periodo precedente equivalente, lo stesso
periodo dell'anno precedente o un intervallo Da/A dedicato. Il browser
seleziona sempre bucket già calcolati dal backend; non ricostruisce stock,
flussi o boundary. Il CFD principale e quello di confronto condividono unità,
massimo dell'asse verticale, finestra di zoom/pan, focus e rate lines. La
selezione è sincronizzata per posizione relativa, così serie di lunghezza
diversa restano confrontabili senza forzare date artificialmente uguali.

Le barre permanenti Nuovi ingressi/Rientri/Consegne della prima versione non
fanno più parte del CFD. Questi movimenti rimangono leggibili nel tooltip del
bucket e nel riepilogo accessibile del confronto. La card Rientri è l'unico
riepilogo aggregato della finestra recente, evitando una seconda lettura
grafica dello stesso fenomeno.
I bucket trimestrali sono calendariali (`quarter` 1–4), attraversano il cambio
anno senza azzerare gli stock e condividono con i mesi lo stesso motore di
stock/flussi. Un mese o trimestre privo sia di stock sia di movimenti porta
`has_data: false` e il relativo `empty_state_message` esplicito.

## Trasparenza V4 dello Stato del flusso

La fascia mostrata in UI si chiama **Fascia centrale osservata**: quando non
configurata e' il 25°–75° percentile (`linear_interpolation_p25_p75`) delle
medie settimanali di WIP pesate per durata. L'export di taratura espone per
ogni settimana `avg_wip_jobs`, copertura temporale, completamenti/punti e i
flag `sufficiently_loaded`/`included_in_baseline`.

Il ritmo recente usa la finestra `(generated_at - capacity_window_weeks,
generated_at]`. Contratto e dettaglio espongono estremi ISO, timezone,
completamenti, punti e settimane con almeno un completamento; il drill-down
aggiunge `job_id`, numero visita, `consegna_ts` e punti. Qualita' del ritmo
recente e qualita' della baseline storica sono distinte (`sufficient`,
`partial`, `insufficient`). Il messaggio di stato combina separatamente il
fatto sul WIP e quello sul ritmo, senza dedurre congestione.

Il riepilogo diagnostico copre soltanto i controlli dichiarati: identita' CFD
dell'ultimo bucket, job senza stato osservato, log non parsabili, colonne
orfane, visite senza job e timestamp dell'ultimo dato. Uno zero non equivale
a una certificazione generale del dataset.

## Principio

La dashboard descrive lo stato osservato nel periodo configurato. Non produce ancora previsioni future.

Dalla Fase L4, le metriche di governo (rientri, tempi, capacità) sono
calcolate leggendo il foglio `visite` — ogni riga è un ciclo reale
(apertura -> eventuale rientro), non più un campo derivato e
duplicato su `jobs`. `workloadMetrics`/`pointsMetrics` (lavoro
presente, punti) restano invece su `jobs`, e funzionano anche a
`visite` vuota.

Fase R/S (2026-08-27, `docs/DESIGN_R_S.md`) ha corretto due errori di
conteggio (rientri finestrati, popolazione della riga "Aggiunte"),
scomposto i rientri per causa, separato l'attesa "in corso" dal trend
mensile concluso, e aggiunto tre strumenti diagnostici (percentile 80°
del profilo di rientro, scatter WIP/tempo di ciclo, fasce a percentile
sulla lista dei job attualmente fermi) in preparazione della futura
Fase T (calibrazione, bloccata dal backfill storico).

## Qualita' del dato

- `BASSA`: meno di 10 iniziative osservate (righe `visite` nel periodo).
- `MEDIA`: da 10 a 30 iniziative osservate.
- `BUONA`: piu' di 30 iniziative osservate.
- Tempi, capacita' e carico sono stimati solo con almeno 5 lavori completati e un tempo di lavorazione valido.

## Flusso

- **Nuove iniziative al giorno**: visite aperte (`apertura_ts`) nel periodo divise per i giorni osservati — dopo Fase R conta ogni caso *toccato* (nuovo o rientrato) nella finestra, non solo i nuovi arrivi.
- **Lavori completati al giorno**: visite con `consegna_ts` valorizzato nel periodo, divise per i giorni osservati, anche quando il tempo di lavorazione non e' calcolabile.
- **Differenza tra entrate e uscite**: nuove iniziative al giorno meno iniziative completate al giorno.
- **Aggiunte (periodo)**: card/punti con `arrival_ts` nella finestra (`pointsMetrics.added_cards`/`added_points`) — R2 (2026-08-27): il tasso settimanale mostrato accanto e' derivato dallo **stesso totale** (`added_cards`), non piu' da `flow.new_initiatives_per_day` (che conta iniziative *toccate*, una popolazione diversa da "aggiunte").

## Rientri

- **Iniziative con almeno un rientro** (`reworkMetrics.initiatives_with_rework`): quota di casi con almeno un rientro *osservato nella finestra*.
- **Rientri medi quando il lavoro rientra** (`average_reentries_when_reworked`): media dei rientri osservati nella finestra sui soli casi rientrati.
  - R1 (2026-08-27): `initiativeGroups_` conta i rientri **osservati nell'insieme filtrato per finestra** (ogni riga con `numero_visita > 1` presente nell'insieme e' gia' un rientro avvenuto nella finestra), non piu' `numero_visita - 1` dell'ultima visita osservata — quella lettura sovrastimava i rientri per i casi con alcuni rientri fuori finestra e solo l'ultimo dentro.
- **Passaggi medi per iniziativa**: `1 + quota con rientro * rientri medi`.
- **Passaggi totali al giorno**: nuove iniziative al giorno moltiplicate per i passaggi medi.
- **Rientri per causa** (`reworkMetrics.by_cause`, R4, 2026-08-27): scompone i rientri osservati nella finestra per `rework_cause` della visita rientrata — `client`/`authority`/`internal` (conteggi), `controllable_share` (cliente + interno, leva: gating diretto sul team) e `external_share` (enti, nessuna leva diretta).
- **Quadro avanzato — p1/r/E[K]/lambda_effective/rho_effective** (R3, 2026-08-27): stesso blocco di sempre (`reworkMetrics_`, Model.gs), ma calcolato **per visita**, non per iniziativa come il resto di questa sezione — le etichette in dashboard lo dicono esplicitamente ("per visita, non per iniziativa") per non farlo sembrare la stessa grandezza di `initiatives_with_rework` con un numero diverso.

## Dove si blocca il lavoro (attesa)

R5 (2026-08-27) ha diviso quello che prima era un unico numero mescolato in tre letture distinte:

- **Tabella (chiuse nel periodo)** (`waitTimeMetrics`): totale/occorrenze/media/min/max per tipo di attesa (`t_cliente_d`/`t_ente_d`/`t_interno_d`), **solo** su visite chiuse nella finestra osservata — non include piu' l'attesa di job ancora fermi ora (prima la mescolava, distorcendo la media).
- **Fermi ora** (`currentlyBlocked`): elenco dei job attualmente in una colonna di attesa, con `elapsed_days` (da `status_since_ts` a ora), ordinato per giorni decrescenti — nessuna finestra, e' lo stato adesso. S3 (2026-08-27): quando lo storico ha almeno 20 campioni di tempo di ciclo, ogni riga porta anche `band` (`green`/`yellow`/`red`) in base a dove cade `elapsed_days` rispetto ai percentili 50°/85°/95° dei tempi di ciclo storici (`cycleTimeBands`); sotto soglia, nessun colore.
- **Andamento mensile** (`waitTimeTrend`): ultimi 6 mesi, una serie per tipo di attesa — ogni visita **chiusa** (`consegna_ts` o, in mancanza, `rientro_ts`) attribuisce la sua attesa cumulata al mese in cui si e' chiusa. Serve per vedere se una leva di controllo sta funzionando nel tempo, non per lo stato attuale.

## Esposizione futura a rientri

- **Consegne non ancora chiuse** (`latentBacklogMetrics`): consegne recenti (nella finestra) la cui visita non e' mai rientrata e il cui caso non e' ancora formalmente chiuso.

## Profilo di rientro

- **Rientri osservati / alpha** (`delayProfileMetrics`): quanto spesso e con quale attesa reale accumulata (`t_cliente_d + t_ente_d + t_interno_d`) un caso rientra — calcolato su tutto lo storico disponibile, non sulla finestra.
- **80° percentile del tempo prima del rientro** (`p80_days`, S1, 2026-08-27): soglia indicativa per la futura calibrazione della finestra `H` (Fase T, bloccata dal backfill) — presente quando `sample_size >= 5`.

## Lavoro presente

- **Lavoro pronto**: job in colonne con ruolo `backlog`.
- **Lavoro in preparazione**: job in colonne con ruolo `prep`.
- **Lavoro in corso**: job in colonne con ruolo `wip`.
- **Lavoro che puo' rientrare**: job in colonne `done` non ancora chiusi (`invoiced` falso).
- **Lavori bloccati**: job in colonne con ruolo `stand_by`.

## Tempi

- **Tempo tipico alla consegna (V5)**: mediana degli intervalli completi dal primo ingresso osservato in backlog/preparazione/WIP alla successiva entrata in `done`. Attese e rientri intermedi restano nello stesso intervallo; un nuovo ingresso operativo dopo `done` apre una nuova unità valida soltanto per questa misura.
- **8 pratiche su 10 entro (V5)**: P80 nearest-rank degli stessi intervalli. Il contratto espone numerosità, qualità e disaggregazione XS/S/M/L/XL; la mediana usa la media dei due valori centrali per campioni pari.
- La stima M/G/1 della vista legacy usa visite e tempi di servizio ed è una grandezza teorica diversa: non viene usata come sostituto del lead time osservato e non compare nella home.

- **Tempo medio di lavorazione**: media del tempo di servizio (`consegna_ts - start_ts` sulla visita) sulle visite completate valide.
- **Variabilita'**: rapporto tra varianza e quadrato della media dei tempi.
- **Tempo prudenziale**: media piu' una deviazione standard.
- **Attesa stimata**: indicazione descrittiva; il valore numerico e mostrato solo quando capacita' e campione sono stimabili.

Il campione dei tempi è distinto dal conteggio delle visite concluse:
una `consegna_ts` senza `start_ts` valido alimenta il flusso in uscita,
ma non la stima di tempi e capacità.

## Capacita'

- **Capacita' teorica**: valore opzionale `theoretical_capacity_per_day` nel foglio `config`.
- **Capacita' effettiva**: persone attive (`team_size`) divise per il tempo medio di lavorazione.
- **Carico effettivo**: passaggi totali al giorno divisi per la capacita' effettiva.
- **Margine residuo**: capacita' effettiva meno passaggi totali richiesti.

## Scenari

Gli scenari `optimistic`, `baseline` e `pessimistic` sono salvati in `scenarios_json`. I moltiplicatori sono predisposti, ma non vengono ancora usati per calcolare traiettorie future.

## Punti e taglie

- **Punti aperti**: somma dei punti delle card non concluse (`jobs`, non richiede `visite`).
- **Punti aggiunti**: punti delle card con `arrival_ts` nel periodo osservato.
- **Punti completati**: punti delle card concluse (`status` in una colonna `done`) nel periodo osservato.
- **Andamento del carico**: confronto mensile, sugli ultimi sei mesi, fra punti entrati, completati e ancora aperti.
- Le distribuzioni per taglia, colonna e assegnatario mostrano sia punti sia numero di card.
- Per le card senza `size_points`, i punti sono ricavati dalla taglia; se manca anche la taglia viene usato il valore predefinito `M = 8`.
- Se non esistono osservazioni utili, il grafico mostra `Dato non ancora stimabile` invece di una serie a zero.

## Diagnostica per la futura calibrazione (Cap. 12, Fase T)

- **WIP vs tempo di ciclo** (`wipCycleTimeScatter`, S2, 2026-08-27): uno scatter diagnostico, dentro il "Quadro avanzato" collassato — per ogni visita con un tempo di ciclo calcolabile, quante altre visite erano attive (WIP) nel momento esatto in cui e' partita. E' un'approssimazione di `L_WIP(t)` al momento dell'avvio, non una serie storica esatta giorno per giorno — pensata per "cercare il ginocchio" nella curva quando il backfill storico sara' completo (Fase T, fuori da questo documento). Sotto 10 punti mostra "Dato non ancora stimabile" invece del grafico vuoto.
