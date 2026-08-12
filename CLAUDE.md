# CLAUDE.md — Istruzioni operative per Claude Code
# Progetto: SigmaFlow

## Come leggere questo file
Questo file viene letto da Claude Code all'inizio di ogni sessione.
Contiene le regole operative del progetto. Seguirle sempre,
anche se il prompt di sessione non le ripete.

---

## Regola principale
**Eseguire una sola fase del programma per sessione.**

Il programma attivo si trova in `PROGRAMMA_ACTIVITY_LOG.md`.
Lo stato corrente si trova in `PROGRAMMA_STATO.md`.

All'inizio di ogni sessione:
1. Leggere `PROGRAMMA_STATO.md`
2. Identificare la fase corrente
3. Leggere la fase corrispondente in `PROGRAMMA_ACTIVITY_LOG.md`
4. Eseguire solo quella fase
5. Aggiornare `PROGRAMMA_STATO.md` a fine fase

---

## Regole di codice

- Commenti: **italiano**
- Variabili, funzioni, parametri: **inglese**
- Gestione errori: sempre esplicita — mai lasciare catch vuoti
- Output: leggibili per utenti non tecnici quando mostrati in UI

---

## Regole di progetto

- Mai modificare `main` direttamente
- Ogni fase ha il suo branch — usare quello indicato nel programma
- Ambiente TEST sempre separato da PROD
- Nessuna scrittura su PROD senza gate umano esplicito
- Se un file non esiste dove atteso: documentarlo, non inventarlo

---

## Regole sui gate

### Gate 🟢 AUTO
Verificare tutti i criteri di accettazione della fase.
Se tutti TRUE → aggiornare `PROGRAMMA_STATO.md` con esito COMPLETATA.
Se anche uno solo FALSE → aggiornare con esito BLOCCATA e fermarsi.
Non procedere alla fase successiva se la fase corrente è BLOCCATA.

### Gate 🔴 UMANO
Fermarsi sempre. Aggiornare `PROGRAMMA_STATO.md` con stato
IN_ATTESA_GATE_UMANO. Non procedere senza risposta esplicita di Marco.

---

## Formato aggiornamento `PROGRAMMA_STATO.md`

Sovrascrivere il file con questo formato:

```
# Stato programma: SigmaFlow — Activity Log
Aggiornato: [data e ora]

Fase corrente: [lettera]
Titolo: [titolo fase]
Stato: COMPLETATA | BLOCCATA | IN_CORSO | IN_ATTESA_GATE_UMANO

Criteri di accettazione:
[x] Criterio 1
[x] Criterio 2
[ ] Criterio 3 — FALLITO: [motivo]

Prossima fase: [lettera] | IN_ATTESA_GATE_UMANO | PROGRAMMA_COMPLETATO

Note:
[eventuale descrizione di errori, blocchi o osservazioni]
```

---

## Riferimenti tecnici

- Specifica backend completa: `docs/codex_sigmaflow_activity_log_backend.md`
- Specifica frontend completa: `docs/codex_sigmaflow_activity_log_frontend.md`
- Ricognizione iniziale: `RICOGNIZIONE.md` (creato in Fase A)

Consultare la specifica tecnica quando il programma rimanda ai dettagli
di implementazione — non tenere tutto a memoria.

---

## In caso di ambiguità

Se un'istruzione del programma è ambigua rispetto al codice trovato
in ricognizione, seguire questo ordine di priorità:

1. Codice esistente (non rompere ciò che funziona)
2. Specifica tecnica (`docs/codex_sigmaflow_activity_log_*.md`)
3. Programma (`PROGRAMMA_ACTIVITY_LOG.md`)

Se l'ambiguità non è risolvibile → aggiornare `PROGRAMMA_STATO.md`
con stato BLOCCATA, descrivere il problema, fermarsi.
