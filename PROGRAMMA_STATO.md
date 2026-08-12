# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 14:06

Fase corrente: I
Titolo: Frontend — form e warning
Stato: COMPLETATA (in attesa di conferma smoke test da Marco)

Criteri di accettazione:
[x] Inserimento evento move valido -> appare nel log con badge MANUALE — implementato, verifica statica ok
[x] Data futura -> blocco inline immediato — implementato (validazione live sull'input ts)
[x] Warning sequenza -> dialog HTML custom con descrizione chiara -> conferma -> evento salvato — implementato
[x] Warning allineamento -> dialog con valori corretti -> scelta utente rispettata — implementato
[x] Modifica evento manuale -> valori precompilati correttamente — implementato
[x] Eliminazione evento manuale -> scompare dal log — implementato
[x] Evento auto -> nessuna icona modifica/cancellazione — implementato (invariato da Fase H)
[ ] Smoke test UI reale sui 12 punti della specifica frontend — DA FARE DA MARCO (stesso limite di Fase H: nessuna sessione Google autenticata disponibile qui)

Prossima fase: J (deploy e chiusura — gate umano)

COSA DEVE FARE MARCO PER CONFERMARE QUESTA FASE (12 punti, specifica
frontend, sezione "Smoke test UI"):
1. Aprire una card esistente — checklist non visibile (gia' confermato in Fase H)
2. Aprire Cronologia — "Nessun evento" o lista eventi (gia' confermato)
3. Aggiungere un evento Spostamento con data valida -> appare con badge MANUALE
4. Provare una data futura -> blocco inline
5. Aggiungere un evento che causa warning di sequenza -> dialog con descrizione chiara
6. Confermare il dialog -> evento salvato
7. Aggiungere un evento che impatta start_ts -> dialog di allineamento con valori corretti
8. Scegliere "Aggiorna" -> start_ts aggiornato nel foglio TEST
9. Modificare un evento manuale -> valori precompilati
10. Eliminare un evento manuale -> scompare dal log
11. Provare modifica/eliminazione su un evento AUTO -> icone assenti
12. Trascinare una card (moveJob) -> evento AUTO compare in Cronologia

Se tutti i 12 punti sono ok, scrivere "procedi con fase J" (o semplicemente
confermare) per sbloccare il gate finale. Se qualcosa non va, descrivere
cosa: mi fermo e correggo.

Note operative permanenti (invariate):
- Gate umani reali del programma: Fase F (gia' superata) e Fase J (prossima).
- Routine cloud attiva su codex/activity-log-backend (trig_01WrQXQAv2a2Rw8DfhmwGRNG)
  — NON vede questo aggiornamento (vive su codex/activity-log-frontend).
  Da riconfigurare se si vuole che la routine prosegua in autonomia oltre
  questo punto; al momento il lavoro procede su richiesta diretta di Marco.
- Push sempre verificato con clasp pull + diff.

Note specifiche Fase I:
- Deviazione da specifica: layout desktop a tab invece di colonne
  affiancate — decisione presa in Fase H, confermata funzionante da
  Marco dopo il fix del bug di navigazione, non toccata qui.
- "old" per le correzioni via form e' sempre letto da state.activeJob[field]
  al momento dell'invio (sia in creazione sia in modifica) — la spec non
  specifica esplicitamente il comportamento in modifica; interpretazione
  scelta per semplicita' e coerenza.
- Dopo un salvataggio con align_fields, i campi aggiornati vengono
  applicati anche otticamente a state.activeJob lato client (la risposta
  di addActivityEvent/updateActivityEvent non include l'intero job
  aggiornato, solo l'evento) — cosi' riaprendo il form o il tab
  Informazioni i valori restano coerenti senza un reload completo.
