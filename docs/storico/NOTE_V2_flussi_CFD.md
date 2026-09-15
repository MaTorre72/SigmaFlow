# V2.3 — Flussi e calendario

Il via libera di Marco chiude il gate V2.2. La correzione storica dei
`from` resta debito tecnico medio-alto, non bloccante.

## Contratto flussi

`flow.events` contiene eventi classificati con job, istante e riferimento
alla sorgente. `flow.weekly` aggrega settimane ISO Europe/Rome, lunedi
00:00 incluso fino al lunedi successivo escluso. `period_end` e' il
confine completo; `observed_until` e `is_partial` dichiarano la settimana
in corso. Anno civile e mese sono quelli dell'inizio locale del bucket;
anno/settimana ISO sono separati. Le settimane senza eventi valgono zero.
Profondita': `wip_trend_weeks`. Le medie di capacita' V2.2 conservano i
bucket mobili di sette giorni e non sono sostituite da settimane parziali.

- `new_work_jobs/points`: prima entrata osservabile in backlog/prep/WIP;
  nessun uso di arrival_ts commerciale. Uno storico inizialmente in
  attesa/done non prova una nuova acquisizione al successivo rientro.
- `returns_after_wait_events`: passaggi stand_by verso backlog/prep/WIP.
  Distinti dalle riprese WIP; le chiusure registrate antecedenti escludono
  il ritorno. La completa esclusione di riaperture amministrative storiche
  resta limitata dalla persistenza delle chiusure, dichiarata nel contratto.
- `started_wip_episodes`, `first_wip_episodes`, `rework_wip_episodes`:
  episodi effettivi. Nessuna replica dei punti a ogni avvio/ripresa.
- `new_work_absorbed_points`: taglia soltanto al primo episodio WIP.
- `completed_visits/points`: consegne tecniche da consegna_ts, mai done_ts.

Archivio incluso. Taglie storiche valorizzate con i punti attuali del job:
non esiste qui una ricostruzione storica delle modifiche di taglia.
Timestamp senza offset interpretati nel fuso applicativo nel solo percorso
V2. Nessuna modifica a log grezzi, writer storici o computeVisiteFromLog_.

## Verifica V2.3

Suite locale: 224/224. Nuovi casi: quattro flussi, ritorno via prep e
diretto, invariabilita' rispetto ai from, archivio, settimane vuote,
bordo esclusivo/inclusivo, settimana ISO 53, cambio anno ISO e settimane
DST di 167/169 ore. Push TEST/pull isolato: 17/17 file identici. V2.3 DONE.

## V2.4 — Stock e CFD

`cfd.weekly` usa stock puntuali: ultimo stato prima del bordo esclusivo
per settimane chiuse, stato a generated_at per quella corrente. Medie
WIP (`avg_wip_jobs/points`) pesate sulla durata effettivamente osservata,
inclusa la settimana parziale e il cambio d'ora. Fine permanenza al
successivo stato normalizzato, non alla consegna o alla cache di chiusura.

`flow.cumulative` espone separatamente cumulative su tutta la storia
disponibile (non azzerate all'inizio della finestra). La base CFD in
conteggi conta consegne tecniche, non job unici: le bande superiori
aggiungono stock in job. Non interpretare la boundary superiore come
numero di incarichi acquisiti. Le taglie sono quelle attuali.

Le tre identita' sono controllate per bucket e unita'. Tolleranza
numerica dichiarata 1e-9 per punti decimali; nello snapshot TEST tutte
le identita' risultano esatte anche senza tolleranza. Nessuna soglia
operativa inventata: flow_status resta non_classificato finche' la
classificazione del bilanciamento non e' configurata.

### Gate sui dati TEST — 13 settembre 2026, 22:15 Europe/Rome

Fonte letta con connettore, sola lettura:
`1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU` (SigmaFlow Database TEST).
56 job, 50 visite, archivi vuoti. Esecuzione locale del codice reale
tramite harness sullo snapshot, non esecuzione remota Apps Script.
Non coincide con il precedente log incollato da 58 cronologie: non
si presume che le due fotografie abbiano gli stessi aggregati storici.

- 26 bucket: 156/156 identita' esatte, zero fallimenti.
- 156/156 controlli indipendenti degli stock contro l'ultimo `to` grezzo.
- Invarianza di flow/CFD/episodi/capacita' cambiando tutti i from grezzi.
- Stock corrente: futuro 10 job/71 punti, WIP 5/47, attesa 11/87.
- Ultime boundary conteggi: 12, 23, 28, 38; differenze 11, 5, 10.
- Ultime boundary punti: 86, 173, 220, 291; differenze 87, 47, 71.
- JOB-20260707-0YXL (8 punti): 6 aprile WIP; 8 e 10 aprile attesa;
  28 aprile prep/futuro; 30 aprile WIP. Verificato su stato grezzo e
  normalizzato, senza from e senza inventare consegne.

Verificatore riproducibile: `apps-script/test-harness/verify-v2-snapshot.js`.
Lo snapshot minimizzato e' temporaneo, non committato nel repository.
Restano 15 incoerenze from nel dato attualmente letto, non corrette.
V2.5 non avviata: attende conferma umana delle identita' sopra.

Suite finale 226/226 in UTC e in Europe/Rome; push TEST e pull isolato
verificati con 17/17 file identici. Nessuna modifica al deployment PROD.
