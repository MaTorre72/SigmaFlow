# CLAUDE.md — Istruzioni operative per Claude Code
# Progetto: SigmaFlow

## Come leggere questo file
Questo file viene letto da Claude Code all'inizio di ogni sessione.
Contiene le regole operative del progetto. Seguirle sempre,
anche se il prompt di sessione non le ripete.

---

## Stato del progetto

Il programma a fasi originale (Activity Log, Fasi A-K; modello
caso/visita, Fasi L1-L5; migrazione PROD) è **completato**. SigmaFlow è
in produzione. Non c'è più un "programma" da eseguire una fase alla
volta: il lavoro prosegue come manutenzione/evoluzione ordinaria, su
richiesta esplicita di Marco in ciascuna sessione.

- Stato corrente e prossimi passi noti: `PROGRAMMA_STATO.md`
- Cronologia completa delle fasi già chiuse: `docs/storico/PROGRAMMA_STATO_storico.md`

All'inizio di ogni sessione, leggere `PROGRAMMA_STATO.md` per il
contesto, poi seguire la richiesta di Marco. Aggiornare
`PROGRAMMA_STATO.md` quando si chiude un pezzo di lavoro significativo
(non ad ogni singola modifica).

---

## Regole di codice

- Commenti: **italiano**
- Variabili, funzioni, parametri: **inglese**
- Gestione errori: sempre esplicita — mai lasciare catch vuoti
- Output: leggibili per utenti non tecnici quando mostrati in UI

---

## Regole di progetto

- Mai modificare `main` direttamente — lavorare su un branch dedicato e
  unire tramite pull request.
- Ambiente TEST sempre separato da PROD.
- Nessuna scrittura su PROD (dati o deployment) senza gate umano
  esplicito — Marco esegue lui le azioni che toccano i dati reali o il
  deployment pubblicato.
- Se un file non esiste dove atteso: documentarlo, non inventarlo.
- Prima di ogni consegna: eseguire la suite di test (harness Node o
  `runAllTestsAndLog`), verificare il push su TEST con `clasp pull`
  isolato + diff, poi aggiornare `PROGRAMMA_STATO.md`.

---

## In caso di ambiguità

Se un'istruzione è ambigua rispetto al codice esistente, seguire questo
ordine di priorità:

1. Codice esistente (non rompere ciò che funziona)
2. Documentazione tecnica in `docs/` (`architecture.md`,
   `DESIGN_modello_caso_visita.md`, `dashboard-metrics.md`,
   `testing-and-security.md`)
3. Chiedere a Marco

Se l'ambiguità non è risolvibile con questi tre passi → documentare il
problema in `PROGRAMMA_STATO.md` e fermarsi.

---

## Riferimenti tecnici

- Architettura (schema fogli, backend, frontend): `docs/architecture.md`
- Design del modello caso/visita: `docs/DESIGN_modello_caso_visita.md`
- Metriche dashboard: `docs/dashboard-metrics.md`
- Testing e sicurezza: `docs/testing-and-security.md`
- Setup Google Workspace: `docs/google-workspace-setup.md`

Consultare la documentazione tecnica quando serve un dettaglio di
implementazione — non tenere tutto a memoria.
