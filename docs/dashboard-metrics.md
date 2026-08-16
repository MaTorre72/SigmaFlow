# Metriche dashboard SigmaFlow

## Principio

La dashboard descrive lo stato osservato nel periodo configurato. Non produce ancora previsioni future.

Dalla Fase L4, le metriche di governo (rientri, tempi, capacità) sono
calcolate leggendo il foglio `visite` — ogni riga è un ciclo reale
(apertura -> eventuale rientro), non più un campo derivato e
duplicato su `jobs`. `workloadMetrics`/`pointsMetrics` (lavoro
presente, punti) restano invece su `jobs`, e funzionano anche a
`visite` vuota.

## Qualita' del dato

- `BASSA`: meno di 10 iniziative osservate (righe `visite` nel periodo).
- `MEDIA`: da 10 a 30 iniziative osservate.
- `BUONA`: piu' di 30 iniziative osservate.
- Tempi, capacita' e carico sono stimati solo con almeno 5 lavori completati e un tempo di lavorazione valido.

## Flusso

- **Nuove iniziative al giorno**: visite aperte (`apertura_ts`) nel periodo divise per i giorni osservati.
- **Lavori completati al giorno**: visite con `consegna_ts` valorizzato nel periodo, divise per i giorni osservati, anche quando il tempo di lavorazione non e' calcolabile.
- **Differenza tra entrate e uscite**: nuove iniziative al giorno meno iniziative completate al giorno.

## Rientri

- **Iniziative con almeno un rientro**: quota di job la cui visita più recente ha `numero_visita > 1`.
- **Rientri medi quando il lavoro rientra**: media di `numero_visita - 1` sui soli job rientrati.
- **Passaggi medi per iniziativa**: `1 + quota con rientro * rientri medi`.
- **Passaggi totali al giorno**: nuove iniziative al giorno moltiplicate per i passaggi medi.

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
