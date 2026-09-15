# V2.5 — Ribasamento annuale e predisposizione storico

Gate V2.4 confermato da Marco il 13 settembre 2026.

## Contratto

`history` e' distinto dal CFD operativo e dalla sua finestra mobile.
`monthly` e `weekly` coprono l'intero intervallo della storia disponibile,
includendo job archiviati. Entrambe le serie espongono acquisizioni,
consegne tecniche/throughput in conteggi e punti, stock futuri e WIP,
metadati temporali e copertura del bucket. `selected_granularity` legge
history_comparison_granularity (week/month); entrambe le serie restano
disponibili. Nessuna media, mediana o fascia statistica viene inventata.

Bucket senza eventi dentro l'intervallo disponibile: zero osservato,
non certificazione di assenza di lacune. Primo bucket troncato a sinistra
se inizia prima della prima evidenza; ultimo bucket in_progress. I periodi
sono solari Europe/Rome, [inizio, fine), fotografia a fine esclusiva oppure
generated_at se in corso. Throughput espone i completamenti nel bucket,
non un rate annualizzato su un mese/settimana parziale.

`history_start`: prima evidenza valida disponibile, non inizio certificato
della raccolta. `available_years`: anni dell'intervallo disponibile.
`fully_observed_calendar_years`: anni interamente contenuti nell'intervallo
temporale, non garanzia di completezza dei record. Per evitare ambiguita',
coverage_definition dichiara questo limite esplicitamente.
`comparable_years` resta vuoto e comparison_quality=insufficient: manca
una prova della completezza storica. Non usare gli anni disponibili come
anni automaticamente confrontabili. Una futura politica di certificazione
potra' alimentare il confronto statistico senza cambiare le definizioni.

## Vista CFD annuale

`annual_cfd` contiene una vista per anno, campionata mensilmente, con
fotografia aggiuntiva esattamente a t0 (1 gennaio locale).
Offset comune per unita': completed_boundary(t0), inclusivo degli eventi
esattamente a t0. Tutte le boundary ricevono lo stesso offset. Ogni
punto espone original_boundaries e rebased_boundaries; stock invariati.
Le cumulative operative non vengono modificate. Se t0 precede la prima
evidenza, quality=insufficient_start_coverage, offset=null e nessuna curva
annuale inventata. Le serie storiche parziali restano consultabili.

## Verifica

- Suite 229/229 in UTC e Europe/Rome.
- Test dedicati: offset comune, evento esattamente a t0, WIP ereditato,
  bande in entrambe le unita', input immutati, settimana ISO 53, archivio,
  indipendenza dalla finestra operativa e dal from, storico assente,
  confronto insufficiente e anno iniziale incompleto.
- Stesso snapshot TEST congelato alle 22:15 del gate V2.4, non nuova
  esecuzione GAS: 56 job e 50 visite; inizio evidenza 2022-07-27T07:00Z.
- 51 mesi, 216 settimane; anni disponibili 2022–2026; anni calendariali
  interamente contenuti 2023–2025, anni certificati confrontabili nessuno.
- 294 identita' annuali esatte contro gli stock ricavati indipendentemente
  dai to grezzi. Riconciliazione dei totali mensili e settimanali con gli
  eventi di acquisizione e consegna; invarianza rispetto a tutti i from.
- Gennaio 2026: offset 1 consegna / 8 punti; stock ereditati futuro
  7 job/47 punti, WIP 1/5, attesa 10/87. Base ribasata zero, stock conservati.

Nessuna modifica ai dati storici, writer legacy o deployment PROD.
Push TEST/pull isolato: 17/17 file identici. V2.5 DONE.
