# Metriche dashboard SigmaFlow

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
