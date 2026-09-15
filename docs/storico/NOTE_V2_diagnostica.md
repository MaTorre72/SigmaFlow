# V2.6 — Struttura diagnostica e spike sulle riaperture

14 settembre 2026. Nessuna modifica dei dati o dei writer legacy.

## Spike: chiusure definitive non ricostruibili in modo affidabile

Evidenze nel codice:

- Kanban.gs, updateJob (circa riga 588): il cambio della spunta invoiced
  scrive incarico_chiuso_ts=now oppure lo svuota; non aggiunge un evento
  di chiusura/riapertura all'activity log.
- moveJob (circa riga 314): il rientro da stand_by/done verso backlog/prep
  svuota la precedente data. L'evento move salva stato/istante/is_rework,
  ma non la chiusura precedente ne' un identificativo di chiusura.
- recomputeIncaricoChiusoTs_ (circa riga 752): puo' svuotare il campo
  sulla base della cronologia, senza conservare il valore cancellato.
- Gli eventi correction possono conservare field/old/new, ma non sono
  obbligatori per tutti i percorsi; possono essere modificati/eliminati.
- done non equivale alla chiusura definitiva e is_rework non prova che
  il caso fosse amministrativamente chiuso.

Controesempio: una card mai chiusa e una card spuntata Chiuso e poi
despuntata possono avere identico log, stato, invoiced=false e data di
chiusura vuota. Nessuna funzione della sola fotografia finale puo'
distinguere queste due storie. Dopo un nuovo ciclo di chiusura il campo
corrente conserva soltanto l'ultima data, non la sequenza precedente.

Esito: non implementare post_closure_reopenings come conteggio completo;
non restituire zero come se fosse stato misurato. Eventuali indizi da
correction non rendono completa la ricostruzione. Nessuna bonifica o
modifica dello schema proposta automaticamente. L'esito resta sottoposto
al gate umano previsto prima di una futura implementazione.

## Contratto aggiunto

- issues[]: struttura vuota, nessun rilevatore o soglia introdotto.
  diagnostics.issue_detection dichiara status=structure_only, categorie
  ammesse, campi e assenza di persistenza. Vuoto non significa sano.
- Le anomalie storiche rimangono in dataQuality.anomalies, invariate:
  nessun nuovo trattamento o duplicazione in issues.
- diagnostics.closure_history dichiara il limite, count_available=false
  e implementazione non eseguita; nessun numero spurio.
- diagnostics.experimental_congestion dichiara official_model=plateau,
  confronto non implementato e affects_operational_metrics=false.
  Non viene creato un modello di decadimento ne' un fit inventato; il
  confronto sperimentale rimane differito, non dichiarato completato.

## Verifica

Suite 230/230. Test dedicato su struttura, categorie, assenza di conteggi
non affidabili, isolamento del modello e assenza di mutazioni/persistenza.
V2.6 completa la predisposizione diagnostica, non i rilevatori opzionali
o il confronto sperimentale. Restano gate spike e validazione finale V2;
V3 non viene aperta automaticamente.
Push TEST/pull isolato verificati: 17/17 file identici.
