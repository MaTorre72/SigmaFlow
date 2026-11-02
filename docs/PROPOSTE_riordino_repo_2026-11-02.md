# Riordino approvato — esito Gate 3, 02/11/2026

## Esito dell’approvazione

Marco ha risposto «approvo, procediamo». Eseguiti gli elementi proposti:
D1–D5 (cinque design archiviati), A1 (cronologia separata dallo stato),
B1/B2/B3/B5/B6/B7/B8/B9 (otto branch locali già uniti rimossi con branch -d),
R1 (branch remoto riga-flusso-attivo rimosso), T1 (riferimenti obsoleti
rimossi con fetch --prune), U1 (.gitignore, file locali conservati).
B4/B10/R2 conservati; S0–S3 conservati, come raccomandato. Restano anche
i branch locali non inclusi nella proposta: docs/nota-bug-archivio-prod-null
e metrics/parte1-generatore-pesante. Nessun codice o dato modificato.
La riga «origin» dell’inventario sotto indica il riferimento simbolico
origin/HEAD, non un branch remoto: non è stato eliminato.
.gitignore conteneva caratteri nulli preesistenti: rimossi per conservare
in testo leggibile le regole già presenti e aggiungere /Claude outputs/.

Il resto del documento conserva l’inventario prima delle operazioni,
compresi i vecchi numeri di riga: le proposte non sono più in attesa.
Il prossimo gate è il 4: Marco rivede e unisce la PR documentale.

## Pubblicazione completata

PR #25 unita; deployment PROD esistente aggiornato da 36 a 37 con approvazione.
HEAD TEST e versione immutabile 37 coincidono con origin/main: 17/17 sorgenti.
Nessun clasp push durante la pubblicazione. Nessuna scrittura dei dati.
Rollback alla 36 disponibile nella procedura google-workspace-setup.md.

Finestra: 07/09/2026 incluso – 02/11/2026 escluso, 8 settimane ISO complete.

| Lettura | Passaggi/visite | Punti | Lavori/settimana | Punti/settimana |
|---|---:|---:|---:|---:|
| Prima lavorazione | 12 | 63 | 1,5 | 7,88 |
| Rientri | 6 | 42 | 0,75 | 5,25 |
| Flusso attivo | 18 | 105 | 2,25 | 13,13 |
| Consegne | 3 | 21 | 0,38 | 2,63 |

Le 18 righe del dettaglio PROD sono state sommate per tipo: 12+6=18,
63+42=105. Le consegne sono riconciliate sulle visite e sui punti jobs
letti da PROD in sola lettura. WIP 5/49 punti, fascia 3–6; riferimento
13,5 punti/settimana su 19 finestre valide, soglia 40%=5,4: stato Regolare.
Le differenze rispetto al controllo del 01/11 derivano dalla nuova finestra
settimanale, non da modifiche ai dati eseguite dall’agente.

## Documenti da proporre per archivio

I documenti seguenti descrivono fasi chiuse; nessuno è privo di richiami.
Per ciascun file approvato, usare git mv in docs/storico/ e aggiornare
nello stesso commit tutti i collegamenti testuali elencati (anche fra i
file spostati). Non spostare lasciando collegamenti interrotti.

### D1 — DESIGN_R_S.md

Proposta approvata: docs/DESIGN_R_S.md → docs/storico/DESIGN_R_S.md. Progetto/collaudo R/S chiusi; il design dashboard corrente è V5.
Ricerca letterale del nome nei Markdown tracciati e locali del repo, esclusi
Claude outputs e il file stesso: 4 richiami, quindi NON zero.

- PROGRAMMA_STATO.md:720
- PROGRAMMA_STATO.md:2443
- docs/dashboard-metrics.md:197
- docs/storico/DESIGN_R_S_addendum_collaudo.md:4

### D2 — DESIGN_R_S_addendum_collaudo.md

Proposta approvata: docs/DESIGN_R_S_addendum_collaudo.md → docs/storico/DESIGN_R_S_addendum_collaudo.md. Progetto/collaudo R/S chiusi; il design dashboard corrente è V5.
Ricerca letterale del nome nei Markdown tracciati e locali del repo, esclusi
Claude outputs e il file stesso: 4 richiami, quindi NON zero.

- PROGRAMMA_STATO.md:721
- PROGRAMMA_STATO.md:1965
- PROGRAMMA_STATO.md:2194
- PROGRAMMA_STATO.md:2293

### D3 — DESIGN_performance.md

Proposta approvata: docs/DESIGN_performance.md → docs/storico/DESIGN_performance.md. Fase O (performance) chiusa secondo PROGRAMMA_STATO.md.
Ricerca letterale del nome nei Markdown tracciati e locali del repo, esclusi
Claude outputs e il file stesso: 7 richiami, quindi NON zero.

- PROGRAMMA_STATO.md:721
- PROGRAMMA_STATO.md:3769
- PROGRAMMA_STATO.md:3808
- PROGRAMMA_STATO.md:3965
- PROGRAMMA_STATO.md:3969
- docs/storico/DESIGN_lock_ambiente.md:36
- docs/storico/DESIGN_lock_ambiente.md:614

### D4 — DESIGN_lock_ambiente.md

Proposta approvata: docs/DESIGN_lock_ambiente.md → docs/storico/DESIGN_lock_ambiente.md. Fase P (lock/ambiente) chiusa secondo PROGRAMMA_STATO.md.
Ricerca letterale del nome nei Markdown tracciati e locali del repo, esclusi
Claude outputs e il file stesso: 14 richiami, quindi NON zero.

- PROGRAMMA_STATO.md:722
- PROGRAMMA_STATO.md:2589
- PROGRAMMA_STATO.md:2704
- PROGRAMMA_STATO.md:2714
- PROGRAMMA_STATO.md:2787
- PROGRAMMA_STATO.md:2919
- PROGRAMMA_STATO.md:3106
- PROGRAMMA_STATO.md:3286
- PROGRAMMA_STATO.md:3380
- PROGRAMMA_STATO.md:3392
- docs/storico/DESIGN_derivazione_visite.md:3
- docs/storico/DESIGN_derivazione_visite.md:102
- docs/storico/DESIGN_derivazione_visite.md:157
- docs/storico/DESIGN_derivazione_visite.md:159

### D5 — DESIGN_derivazione_visite.md

Proposta approvata: docs/DESIGN_derivazione_visite.md → docs/storico/DESIGN_derivazione_visite.md. Fase Q (derivazione visite) chiusa secondo PROGRAMMA_STATO.md.
Ricerca letterale del nome nei Markdown tracciati e locali del repo, esclusi
Claude outputs e il file stesso: 7 richiami, quindi NON zero.

- PROGRAMMA_STATO.md:722
- PROGRAMMA_STATO.md:2588
- PROGRAMMA_STATO.md:2600
- PROGRAMMA_STATO.md:2736
- docs/storico/DESIGN_lock_ambiente.md:609
- docs/storico/DESIGN_lock_ambiente.md:625
- docs/storico/DESIGN_lock_ambiente.md:748

Da mantenere in docs/: DESIGN_V5_revisione_nuova_dashboard.md (dashboard
corrente), DESIGN_modello_caso_visita.md, DESIGN_archiviazione.md e
DESIGN_backup.md (riferimenti tecnici correnti richiamati da CLAUDE.md).
I documenti già in docs/storico/ restano dove sono. Nessuna proposta di
cancellazione per i documenti di riferimento architecture, metriche, FSC,
runbook, testing o setup.

## A1 — PROGRAMMA_STATO.md

Prima delle aggiunte di questa sessione: 345.120 byte, circa 5.700 righe.
Proposta: lasciare in testa Stato corrente e prossimi passi, Punti aperti,
link ai riferimenti tecnici e alle procedure; spostare il corpo cronologico
(dalla sezione Rimozione della proiezione del 02/11/2026 fino ai riferimenti
tecnici in coda) in docs/storico/PROGRAMMA_STATO_2026-08_2026-11.md.
La cronologia include le fasi N/O/P/Q/R/S/U/V e i collaudi, più note di
sessione già superate. Conservare i testi, aggiungere una nota di contesto
storico per evitare che vecchi prossimi passi sembrino correnti; nessuna
riscrittura della storia Git. Il vecchio PROGRAMMA_STATO_storico.md resta
integro. Aggiornare nel file principale il link al nuovo archivio.
Non archiviare i tre punti aperti: from nel log, verifica manuale 8NJ7,
riverifica del bug null in Archivio/Cestino/Dashboard PROD.

## Branch locali già uniti — proposta elemento per elemento

La verifica usa git branch --merged origin/main. Sì indica tecnicamente
eliminabile dopo approvazione, non una cancellazione già autorizzata.

| ID | Branch locale | Eliminabile | Motivo |
|---|---|---|---|
| B1 | codex/fase-u-bug-residui | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B2 | codex/fase-v1-ricognizione-dashboard | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B3 | codex/fase-v2-dashboard-metriche | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B4 | codex/ordine-repo | No | Ramo corrente del riordino |
| B5 | codex/restyling-dashboard-metrics | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B6 | codex/riga-flusso-attivo | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B7 | codex/ripresa-modifiche-locali | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B8 | feat/fase-r-s-metriche-2026-08-27 | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B9 | fix/m1-null-sheet-archivio | Sì, dopo approvazione | Punta a un commit contenuto in origin/main; nessun commit esclusivo da perdere |
| B10 | main | No | Ramo principale da conservare |

## Branch remoti e riferimenti locali

La lettura diretta git ls-remote --heads origin mostra soltanto main e
codex/riga-flusso-attivo.

| ID | Elemento remoto | Eliminabile | Motivo |
|---|---|---|---|
| R1 | codex/riga-flusso-attivo | Sì, dopo approvazione | Già unito con PR #24 |
| R2 | main | No | Ramo principale |

Il branch remoto codex/ripresa-modifiche-locali risulta già cancellato da
Marco. Gli altri origin/* qui sotto sono riferimenti locali obsoleti, NON
branch ancora presenti su GitHub. Proposta T1: rimuovere solo questi
riferimenti con una potatura dei riferimenti remoti, previa approvazione.

- origin
- origin/codex/fase-u-bug-residui
- origin/codex/fase-v2-dashboard-metriche
- origin/codex/ripresa-modifiche-locali
- origin/docs/fase-q-chiusura-2026-08-26
- origin/docs/nota-bug-archivio-prod-null
- origin/docs/nota-chiusura-pr19-2026-09-10
- origin/docs/pulizia-prossimi-passi-2026-09-10
- origin/docs/stato-fase-r-s-chiusura-2026-09-10
- origin/feat/fase-r-s-metriche-2026-08-27
- origin/fix/fase-p-lock-ambiente-2026-08-26
- origin/fix/fase-q-derivazione-visite-2026-08-26
- origin/fix/m1-null-sheet-archivio
- origin/fix/reconcile-fase-o-2026-08-25

## Stash — nessuna rimozione proposta senza verifica e approvazione

| ID | Stash / data | Contenuto | Eliminabile ora e motivo |
|---|---|---|---|
| S0 | stash@{0}, 01/11/2026 18:41 +01 | 19 file: conclusioni/CFD/parametro, design e stato; 10 documenti locali non tracciati | No: il codice selezionato è nella PR #25 unita, ma parte è stata rimossa per decisione di prodotto e i documenti locali restano fuori PR. Serve conferma esplicita di Marco che il lavoro da conservare è nella PR unita e che i residui possono essere scartati |
| S1 | stash@{1}, 26/08/2026 18:09 +02 | 202 righe di docs/storico/DESIGN_derivazione_visite.md | No: non verificata la conservazione integrale del contenuto, richiede confronto e approvazione dedicati |
| S2 | stash@{2}, 25/08/2026 17:14 +02 | 11 file: fase O, cronologia, archivio, property ambiente, test e documenti; 1472 inserimenti/117 eliminazioni | No: lavori storici sovrapposti ai successivi merge; non basta l’età per stabilire che tutto sia conservato |
| S3 | stash@{3}, 25/08/2026 10:11 +02 | .claude/launch.json e due copie .bak di impostazioni/CLAUDE | No: configurazioni locali non equivalenti a codice già unito; conservare finché Marco non ne autorizza esplicitamente l’eliminazione |

Gli stash sono stati soltanto letti con stash list/show, mai applicati,
popolati, modificati o eliminati in questa sessione.

## U1 — Claude outputs/

10 file locali non tracciati, compresa la guida di preparazione del merge.
Raccomando aggiungere /Claude outputs/ a .gitignore, mantenendo tutti i file
sul disco e gli stash invariati: è l’opzione reversibile e non rompe i
percorsi usati da Marco. Alternativa: spostamento fuori repo, ma richiede
una destinazione scelta e modifica dei riferimenti locali. Nessuna delle
due opzioni è stata applicata prima dell’approvazione.

## Dopo Gate 3

Eseguire solo gli elementi approvati, ricontrollare i richiami dei documenti,
suite GAS e UI con TZ=UTC, commit documentale, push codex/ordine-repo e PR
(non merge). Nessun nuovo push Apps Script per sole modifiche documentali.
Gate 4: Marco unisce la PR.

Riferimento prima della rimozione approvata: codex/fase-u-bug-residui = 139a88c3b7967b9646c3b03f7e0eea1d9893a1bc

Riferimento prima della rimozione approvata: codex/fase-v1-ricognizione-dashboard = 74afcdaa2d918ce70e73feae0b42d3755e1e7959

Riferimento prima della rimozione approvata: codex/fase-v2-dashboard-metriche = 0dd2c717b4f7f9935521a36677b850b688c91684

Riferimento prima della rimozione approvata: codex/restyling-dashboard-metrics = c030da0dc635b9a96bbea86c3b6d1efbc36cc988

Riferimento prima della rimozione approvata: codex/riga-flusso-attivo = b8ac4393d5e1bcf9a0c2cf39c5d3d8e1d8d38850

Riferimento prima della rimozione approvata: codex/ripresa-modifiche-locali = 02627aeb25d39997056fd6d142eef3863b09ef83

Riferimento prima della rimozione approvata: feat/fase-r-s-metriche-2026-08-27 = 3f50ec394362611f2133122ad6d55e6cd6dd86c4

Riferimento prima della rimozione approvata: fix/m1-null-sheet-archivio = 3ec0384b7734fff8ddf44c441677935b9fe5b839

## Verifica finale del riordino

TZ=UTC: 261/261 test GAS e 58/58 controlli UI, confermati anche separatamente.
Cinque design e corpo cronologico conservati, salvo percorsi aggiornati.
Due collegamenti storici a NOTE_V2_episodi_WIP.md e DESIGN_dashboard.md
corretti verso i file già presenti nello stesso archivio. Nessuna modifica
a apps-script rispetto a origin/main; nessun push TEST o deployment aggiuntivo.
I quattro hash degli stash sono invariati.
