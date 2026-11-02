# Stato SigmaFlow
Aggiornato: 2026-11-02

## Stato corrente e prossimi passi (2026-11-02)

- PR #24 e #25 unite; origin/main 07817f6. Marco ha verificato TEST.
- PROD versione 37 pubblicata dopo approvazione esplicita; 17/17 sorgenti
  della versione immutabile identici al merge, deployment esistente confermato.
- Card PROD verificata il 02/11: WIP 5/49 punti, fascia 3–6; Regolare.
  Finestra 07/09 incluso – 02/11 escluso, otto settimane ISO complete.
  Prima lavorazione 12/63 punti + rientri 6/42 = flusso 18/105;
  tassi 1,5/7,88 + 0,75/5,25 = 2,25/13,13 (lavori/punti per settimana).
  Consegne 3/21 punti = 0,38/2,63; visite PROD lette in sola lettura.
  Riferimento 13,5 punti/settimana (19 finestre); soglia 40% = 5,4.
- Nessuna card o proiezione Incarichi fatturati; spunta e data conservate.
- Rollback disponibile alla 36, non eseguito: procedura in
  docs/google-workspace-setup.md, sezione Pubblicazione PROD.
- Branch codex/ordine-repo: riordino documentale approvato da Marco al Gate 3.
  Cinque design storici e il corpo cronologico sono archiviati; documenti
  locali esclusi con .gitignore. Stash conservati.

### Punti aperti

- Riallineamento dei from nel log delle attività: da valutare separatamente,
  nessuna correzione dei dati eseguita in questa sessione.
- Verifica manuale del lavoro JOB-20260707-8NJ7 ancora da completare.
- Bug «null» su Archivio/Cestino/Dashboard in PROD da riverificare con Marco;
  il caricamento Situazione qui verificato non chiude la verifica complessiva.
- Prossimo passo: Gate 4, revisione e merge della PR documentale da parte
  di Marco. Resoconto e decisioni: docs/PROPOSTE_riordino_repo_2026-11-02.md.

## Riferimenti correnti e cronologia

- [Metriche e vocabolario](docs/dashboard-metrics.md).
- [Architettura](docs/architecture.md).
- [Design dashboard corrente](docs/DESIGN_V5_revisione_nuova_dashboard.md).
- [Procedura di pubblicazione e rollback](docs/google-workspace-setup.md#pubblicazione-prod-sul-deployment-esistente).
- [Test e sicurezza](docs/testing-and-security.md).
- [Cronologia agosto–novembre 2026](docs/storico/PROGRAMMA_STATO_2026-08_2026-11.md).
- [Cronologia precedente](docs/storico/PROGRAMMA_STATO_storico.md).
