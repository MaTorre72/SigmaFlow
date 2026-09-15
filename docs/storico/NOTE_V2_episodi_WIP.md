# V2.2 — Episodi WIP e assorbimento del nuovo lavoro

Decisione di Marco del 13 settembre 2026. Questa nota sostituisce il
criterio provvisorio `numero_visita == 1` nei calcoli V2 di nuovo lavoro
e precisa il §12 del design. Le visite legacy restano invariate.

## Episodi

`dashboardV2WipEpisodes_` consuma gli eventi della normalizzazione V2,
una volta per job. L'ingresso nel ruolo WIP apre un episodio, l'uscita
verso qualunque altro ruolo lo chiude. Spostamenti fra colonne WIP e
duplicati WIP mantengono lo stesso episodio. L'episodio ancora attivo
ha `closed_at = null`; consegne e chiusura amministrativa non lo chiudono.

`wip_episode_number` viene assegnato sull'intera cronologia disponibile,
incluso l'archivio, prima del filtro temporale. Il primo ingresso WIP
osservabile vale 1, i successivi sono riprese. Non si usa `numero_visita`.
La completezza antecedente al primo evento disponibile non e' dimostrata
da questo calcolo; eventuali lacune restano un limite del dato sorgente.
La gestione delle anomalie di normalizzazione non e' stata modificata.

## Assorbimento e finestre

La serie `capacity.new_work.weekly` conta i punti del job soltanto
all'apertura dell'episodio 1. Nessun punto viene attribuito alle riprese.
Ogni bucket espone `first_wip_episodes`, `rework_wip_episodes`,
`total_wip_episodes`, `rework_episode_share` e
`new_work_absorbed_points_week`.

Per questa sotto-fase i bucket sono intervalli mobili di sette giorni
esatti, ancorati a `generated_at`, con estremi (inizio, fine]. Non sono
settimane ISO solari: il calendario ISO dei quattro flussi resta V2.3.
La serie ha profondita' `wip_trend_weeks`; ciascuna media usa
`capacity_window_weeks` bucket consecutivi, comprese settimane a zero.
Le prime medie senza una finestra completa restituiscono null.
`min_samples_capacity` viene applicato al numero di primi episodi nella
finestra per l'assorbimento, e alle consegne per la capacita' di output.

`new_work_capacity_points_per_week` e' la media dei punti assorbiti.
`committed_weeks` divide backlog+prep per questa media senza arrotondare
il denominatore; il risultato finale mantiene l'arrotondamento V2 a due
decimali. Campione insufficiente o denominatore nullo producono null.

`capacity.observed` continua a misurare output da `consegna_ts`.
Non costituisce una somma in punti di primi episodi e riprese: quest'ultima
ponderazione non e' definita e non viene inventata.

`wipEpisodes` contiene dettaglio e riepilogo su tutto lo storico fino a
`generated_at`. Le quote settimanali hanno invece il perimetro del bucket.
Senza episodi la quota e' null. La diagnostica TEST stampa i riepiloghi;
le serie complete restano disponibili in `dashboardState`.

## Verifica

### Vincolo sul `from` e debito tecnico storico

Decisione di Marco: nessun calcolo V2 (episodi WIP, riprese, stock,
flussi e CFD) deve dipendere dal `from` salvato quando contraddice la
sequenza ricostruita. La provenienza storica deriva dalle destinazioni
`to` ordinate; il `from` grezzo resta disponibile solo per diagnostica.
Il vincolo vale anche per le sotto-fasi ancora da implementare.

Verifica del percorso attuale: la normalizzazione legge `event.from`
solo per segnalare `discontinuous_from`; gli episodi consumano i ruoli
di destinazione normalizzati. Riprese e assorbimento derivano dagli
episodi. Lo stock corrente legge `job.status`, non il `from` del log:
questo non certifica la coerenza di `job.status` con la storia. Stock
storici, flussi e CFD non sono ancora implementati in questo percorso.

Backlog tecnico — priorita' medio-alta, non bloccante per V2:
riallineamento dei `from` dopo inserimenti/modifiche retroattive della
cronologia. Attualmente aggiunta e modifica ricalcolano il solo evento
toccato; eliminazione ricalcola e salva tutti i movimenti rimasti;
lettura Cronologia ricalcola solo la risposta. La futura correzione
richiede test sui successori nella vecchia e nuova posizione, timestamp
uguali e regressioni legacy. Nessuna correzione del meccanismo o dei
dati storici viene introdotta con questa decisione.

### Esito della precedente verifica funzionale

Suite completa: 221/221. Coperti rientro diretto da attesa, rientro via
prep, duplicati, colonne diverse con ruolo WIP, attesa prima del primo
WIP, uscita verso backlog, assorbimento senza consegne, primo ingresso
fuori finestra e ripresa dentro finestra, archivio e settimane a zero.
I vecchi numeri TEST basati sulle visite 1 consegnate sono superati;
il gate V2.2 richiede una nuova esecuzione della diagnostica.
