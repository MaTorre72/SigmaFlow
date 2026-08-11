# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-11 21:29

Fase corrente: B
Titolo: Schema e helpers
Stato: COMPLETATA

Criteri di accettazione:
[x] JOB_HEADERS aggiornato, activity_log_json in fondo all'array (Schema.gs:33)
[x] ActivityLog.gs creato con tutte e sei le funzioni
[x] clasp push riuscito senza errori
[x] parseActivityLog_('') restituisce [] senza eccezioni — verificato con node
[x] parseActivityLog_('json-non-valido') restituisce [] senza eccezioni — verificato con node

Prossima fase: C

Note:
Fase A: trattata come approvata sulla base della richiesta esplicita di
Marco di avviare "tutte le fasi successive" in autonomia notturna via
loop locale. Fase F e Fase J restano hard-stop 🔴 UMANO invariati, nessuna
eccezione: nessun merge su main, nessuna migrazione dati, nessun deploy
senza conferma esplicita.

Fase B: generateId_() della specifica rinominata generateActivityEventId_()
in ActivityLog.gs per evitare collisione con generateId_(prefix) gia'
esistente in Utils.gs (usato per job_id/case_id) — una seconda definizione
con lo stesso nome l'avrebbe sovrascritta silenziosamente. Deviazione
documentata nei commenti del file.

La specifica dice "cinque funzioni" ma ne elenca sei (1-6): implementate
tutte e sei, dato che addActivityEvent (Fase C) e deleteActivityEvent
(Fase D) usano sia validateSequence_ sia checkStructuralAlignment_.

validateSequence_ e checkStructuralAlignment_ toccano API Apps Script
(readColumns_) quindi non sono testabili in Node puro come parseActivityLog_
— la loro correttezza verra' esercitata dai test dedicati in Fase G.
L'interpretazione di "ATTESA_SENZA_USCITA" (rientro nella stessa colonna
stand_by senza uscita nel mezzo) e' una lettura ragionevole ma non
l'unica possibile della specifica — da verificare in Fase G.

Push effettuato su Web App (versione HEAD/dev), non ancora un deploy
pubblico — resta per la Fase J.
