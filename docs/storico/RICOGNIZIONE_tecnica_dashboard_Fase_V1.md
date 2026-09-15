# Fase V1 — Ricognizione tecnica della dashboard

Ricognizione eseguita sul codice del branch `codex/fase-v1-ricognizione-dashboard`, a partire dal commit `74afcda` (`merge: completa fase U`). Il documento descrive esclusivamente lo stato osservato nel repository. I valori indicati per il foglio `config` sono i default presenti nel codice; il contenuto corrente dei fogli Google TEST/PROD non è versionato nel repository.

## 1. Inventario backend

`getMetrics()` legge `jobs`, `visite`, `jobs_archivio`, `visite_archivio` e `config`, chiama `calculateMetrics_()` e restituisce sia metriche top-level sia `systemState`. Il Cestino è escluso. Le metriche storiche di `systemState` includono l'Archivio; le metriche di lavoro presente usano solo i job attivi.

### 1.1 `systemState`: stato, qualità, flusso, rilavorazione, carico, tempi e capacità

| Campo (path in `systemState`) | Formula/fonte dati (`file:funzione`) | Mostrato oggi in UI? Dove | Etichetta UI attuale, se mostrato |
|---|---|---|---|
| `dataQuality.level` | Fascia su lavori osservati: `<10` low, `10-30` medium, `>30` good (`Model.gs:dataQuality_`) | Sì, Dashboard / Vista rapida e Stato del sistema | Affidabilità della lettura; badge BASSA/MEDIA/BUONA |
| `dataQuality.label` | Etichetta italiana della fascia (`Model.gs:dataQuality_`) | Sì, stessi punti | BASSA / MEDIA / BUONA |
| `dataQuality.message` | Testo associato alla fascia, integrato se i completati utili sono `<5` (`Model.gs:dataQuality_`) | Sì, Stato del sistema | Messaggio sotto il badge qualità |
| `dataQuality.observed_initiatives` | Numero di job distinti fra le visite con `apertura_ts >= now-window` (`Model.gs:buildSystemState_`, `initiativeGroups_`) | Sì, Stato del sistema | “N lavori osservati…” |
| `dataQuality.completed_samples` | Visite con `consegna_ts` nella finestra e tempo di servizio positivo (`Model.gs:buildSystemState_`, `visitServiceTimeDays_`) | Sì, Stato del sistema | “…N completati utili” |
| `dataQuality.capacity_estimable` | `completed_samples >= 5` (`Model.gs:dataQuality_`) | No | — |
| `systemStatus.code` | Fascia di `capacityMetrics.effective_load`: unknown se nullo; stable `<0,70`; attention `<0,85`; stressed `<=1`; critical `>1` (`Model.gs:systemStatus_`) | Sì, Dashboard / Vista rapida e Stato del sistema | Classe colore del badge |
| `systemStatus.label` | Etichetta della fascia di carico (`Model.gs:systemStatus_`) | Sì, stessi punti | STABILE / ATTENZIONE / SOTTO PRESSIONE / CRITICO |
| `systemStatus.message` | Messaggio associato alla fascia (`Model.gs:systemStatus_`) | Sì, Stato del sistema | Messaggio operativo sotto il badge |
| `flowMetrics.window_days` | `max(1, config.observation_window_days || 30)` (`Model.gs:buildSystemState_`) | Sì, Flusso e carico; usato anche per calcolare tassi UI da totali | “Periodo analizzato: N giorni” |
| `flowMetrics.new_initiatives_observed` | Job distinti fra visite aperte nella finestra (`Model.gs:buildSystemState_`, `initiativeGroups_`) | No, non direttamente | — |
| `flowMetrics.new_initiatives_per_day` | `new_initiatives_observed / window_days` (`Model.gs:buildSystemState_`) | No, non direttamente | — |
| `flowMetrics.new_work_per_day` | Alias di `new_initiatives_per_day` (`Model.gs:buildSystemState_`) | Sì, Rilavorazione | Carico da lavoro nuovo (a settimana) |
| `flowMetrics.completed_initiatives` | Job distinti fra visite con `consegna_ts` nella finestra (`Model.gs:buildSystemState_`, `initiativeGroups_`) | Sì, Flusso e carico | Completati (periodo), colonna Lavori; Lavori completati (periodo) |
| `flowMetrics.completed_per_day` | `completed_initiatives / window_days`; `null` se nessun completato (`Model.gs:buildSystemState_`) | Sì, Flusso e carico, convertito `×7` nel client | Completati (periodo), Lavori/settimana |
| `flowMetrics.completed_passages` | Numero di visite con `consegna_ts` nella finestra, prima del raggruppamento per job (`Model.gs:buildSystemState_`) | Sì, Flusso e carico | Passaggi completati (periodo) |
| `flowMetrics.estimated_capacity_per_day` | Se almeno 5 campioni validi: `team_size / media(visitServiceTimeDays_)` (`Model.gs:buildSystemState_`) | Sì, Flusso e carico, convertito `×7` | Capacità disponibile stimata (team, N persone) |
| `flowMetrics.entry_exit_difference` | `new_initiatives_per_day - completed_per_day`; `null` senza completati (`Model.gs:buildSystemState_`) | Sì, Flusso e carico, convertito `×7` | Differenza tra entrate e uscite (lavori/settimana) |
| `flowMetrics.avg_points_per_initiative` | `pointsMetrics.added_points / new_initiatives_observed` (`Model.gs:buildSystemState_`) | Sì, indirettamente: conversione stimata dei tassi di passaggi in punti | Suffissi “~N pt/settimana stimati” |
| `flowMetrics.team_size` | `max(1, config.team_size || 1)` (`Model.gs:buildSystemState_`) | Sì, nell'etichetta capacità | “…team, N persone” |
| `reworkMetrics.initiatives_with_rework` | Quota di job osservati che hanno almeno una visita con `numero_visita > 1` nella finestra (`Model.gs:buildSystemState_`, `initiativeGroups_`) | Sì, Vista rapida e Rilavorazione | Rilavorazione; Lavori che hanno richiesto una rilavorazione |
| `reworkMetrics.average_reentries_when_reworked` | Media dei rientri osservati sui soli job rientrati (`Model.gs:buildSystemState_`) | Sì, Rilavorazione | Rilavorazioni medie quando capitano |
| `reworkMetrics.average_passages_per_initiative` | `1 + quota_con_rientro × media_rientri_condizionata` (`Model.gs:buildSystemState_`) | Sì, Rilavorazione | Passaggi medi per lavoro |
| `reworkMetrics.total_passages_per_day` | `new_work_per_day × average_passages_per_initiative` (`Model.gs:buildSystemState_`) | Sì, Rilavorazione, convertito `×7` | Carico totale (a settimana) |
| `reworkMetrics.additional_passages_from_rework` | `max(0, total_passages_per_day - new_work_per_day)` (`Model.gs:buildSystemState_`) | Sì, Rilavorazione e Capacità, convertito `×7` | Carico da rilavorazione; Assorbita dalla rilavorazione |
| `reworkMetrics.by_cause.total` | Numero di visite osservate con `numero_visita > 1` e causa riconosciuta (`Model.gs:reworkByCause_`) | Usato come condizione per mostrare il dettaglio; non come numero | — |
| `reworkMetrics.by_cause.client` | Rientri con `rework_cause=wait_client` (`Model.gs:reworkByCause_`) | Sì, Rilavorazione | Rilavorazioni da cliente |
| `reworkMetrics.by_cause.authority` | Rientri con `rework_cause=wait_authority` (`Model.gs:reworkByCause_`) | Sì, Rilavorazione | Rilavorazioni da enti |
| `reworkMetrics.by_cause.internal` | Rientri con `rework_cause=wait_internal` (`Model.gs:reworkByCause_`) | Sì, Rilavorazione | Rilavorazioni da decisione interna |
| `reworkMetrics.by_cause.controllable_share` | `(client + internal) / total` (`Model.gs:reworkByCause_`) | Sì, Rilavorazione | Quota controllabile (cliente + interno, leva: gating) |
| `reworkMetrics.by_cause.external_share` | `authority / total` (`Model.gs:reworkByCause_`) | Sì, Rilavorazione | Quota di rilavorazioni da enti (non controllabile direttamente) |
| `workloadMetrics.ready`, `.ready_points` | Job attivi con stadio 1 (`role=backlog`), conteggio e punti (`Model.gs:currentWorkload_`, `workStage_`, `jobPoints_`) | Sì, Lavoro accettato e capacità | Lavoro pronto |
| `workloadMetrics.preparing`, `.preparing_points` | Job attivi con stadio 2 (`role=prep`), conteggio e punti | Sì, stesso pannello | In preparazione |
| `workloadMetrics.in_progress`, `.in_progress_points` | Job attivi con stadio 3 (`role=wip`), conteggio e punti | Sì, stesso pannello | Lavorazione |
| `workloadMetrics.blocked`, `.blocked_points` | Job attivi con stadio 4 (`role=stand_by`), conteggio e punti | Sì, stesso pannello | Lavoro in attesa (totale) |
| `workloadMetrics.can_return`, `.can_return_points` | Job attivi con stadio 5 (`role=done`, `invoiced=false`), conteggio e punti | Sì, stesso pannello / Da fatturare | Concluso, non ancora fatturato |
| `workloadMetrics.waiting_client`, `.waiting_client_points` | `job.status === wait_client`, conteggio e punti (`Model.gs:currentWorkload_`) | Sì, stesso pannello | In attesa di cliente |
| `workloadMetrics.waiting_authority`, `.waiting_authority_points` | `job.status === wait_authority`, conteggio e punti | Sì, stesso pannello | In attesa di enti |
| `workloadMetrics.waiting_internal`, `.waiting_internal_points` | `job.status === wait_internal`, conteggio e punti | Sì, stesso pannello | Fermi per decisione interna |
| `timeMetrics.completed_samples` | Numero di visite consegnate nella finestra con tempo di servizio positivo (`Model.gs:buildSystemState_`) | No, non da questo path; lo stesso conteggio compare tramite `dataQuality.completed_samples` | — |
| `timeMetrics.average_service_days` | Media di `consegna_ts-start_ts` sulle visite consegnate nella finestra con durata positiva (`Model.gs:buildSystemState_`, `visitServiceTimeDays_`, `sampleStats_`) | Sì, Tempi e variabilità | Tempo medio di lavorazione |
| `timeMetrics.variability` | `Var(S) / E[S]^2` sui tempi di servizio validi (`Model.gs:sampleStats_`) | Sì | Variabilità dei tempi (Cv²) |
| `timeMetrics.variability_level` | BASSA `<0,75`; MEDIA `0,75-1,33`; ALTA `>1,33` (`Model.gs:variabilityLevel_`) | Sì | Parte testuale di “Variabilità dei tempi” |
| `timeMetrics.variability_message` | Messaggio associato alla fascia (`Model.gs:variabilityInterpretation_`) | Sì | Messaggio sotto Tempi e variabilità |
| `timeMetrics.high_observed_days` | Massimo dei tempi di servizio validi nella finestra (`Model.gs:buildSystemState_`) | Sì | Tempo alto osservato |
| `timeMetrics.prudent_service_days` | `media + deviazione standard` (`Model.gs:buildSystemState_`) | Sì | Tempo prudenziale consigliato |
| `timeMetrics.estimated_wait_days` | `lambda_effettivo × E[S²] / (2 × (1-rho_effettivo))`; nullo se `rho>=1` (`Model.gs:queueMG1_`) | Sì | Attesa stimata, oppure messaggio unico di non stimabilità |
| `timeMetrics.estimated_total_days` | `estimated_wait_days + media servizio` (`Model.gs:queueMG1_`) | Sì | Tempo totale stimato, oppure messaggio unico di non stimabilità |
| `timeMetrics.waiting_message` | Testo per fasce di carico `<0,70`, `<0,85`, `<=1`, `>1` (`Model.gs:waitingMessage_`) | Sì | Parte del messaggio sotto Tempi e variabilità |
| `capacityMetrics.theoretical_per_day` | Valore positivo di `config.theoretical_capacity_per_day`, altrimenti `null` (`Model.gs:positiveOrNull_`) | Sì solo se configurato, convertito `×7` | Capacità teorica alla settimana |
| `capacityMetrics.effective_per_day` | `team_size / media servizio`, con almeno 5 campioni (`Model.gs:buildSystemState_`) | Sì, convertito `×7` | Capacità effettiva alla settimana |
| `capacityMetrics.absorbed_by_new_work` | `new_initiatives_observed / window_days` (`Model.gs:buildSystemState_`) | Sì, convertito `×7` | Assorbita dai nuovi lavori |
| `capacityMetrics.absorbed_by_rework` | `total_passages_per_day - new_work_per_day` (`Model.gs:buildSystemState_`) | Sì, convertito `×7` | Assorbita dalla rilavorazione |
| `capacityMetrics.effective_load` | `total_passages_per_day / effective_per_day` (`Model.gs:buildSystemState_`) | Sì, Vista rapida, Rilavorazione e base degli stati | Carico rispetto alla capacità; Quota di capacità occupata dal carico totale |
| `capacityMetrics.residual_per_day` | `effective_per_day - total_passages_per_day` (`Model.gs:buildSystemState_`) | Sì, convertito `×7` | Margine residuo (alla settimana) |
| `capacityMetrics.available_share` | `1 - effective_load` (`Model.gs:buildSystemState_`) | No | — |
| `capacityMetrics.safety_margin` | Alias di `available_share` (`Model.gs:buildSystemState_`) | No | — |

### 1.2 `systemState`: punti, attese, serie diagnostiche, stabilità e scenari

| Campo (path in `systemState`) | Formula/fonte dati (`file:funzione`) | Mostrato oggi in UI? Dove | Etichetta UI attuale, se mostrato |
|---|---|---|---|
| `pointsMetrics.pipeline_points`, `.pipeline_cards` | Job attivi a stadio 0 (`role=neutral`), somma punti e conteggio (`Model.gs:pointsStatistics_`, `workStage_`) | Sì, Flusso e carico | Pipeline commerciale (preventivi) |
| `pointsMetrics.committed_points`, `.committed_cards` | Job attivi agli stadi 1-4 (`backlog/prep/wip/stand_by`) (`Model.gs:pointsStatistics_`) | Sì, Vista rapida e Flusso e carico | Punti accettati (adesso); Lavoro accettato (attuale) |
| `pointsMetrics.completed_points`, `.completed_cards` | Job attivi+archiviati con `done_ts` nella finestra (`Model.gs:pointsStatistics_`) | Punti sì; cards solo nella tabella mensile tramite bucket, non questo scalare | Punti completati (ultimi 30 giorni); Completati (periodo), Punti |
| `pointsMetrics.added_points`, `.added_cards` | Job attivi+archiviati con `arrival_ts` nella finestra (`Model.gs:pointsStatistics_`) | Sì, Vista rapida e Flusso e carico | Nuovi punti (ultimi 30 giorni); Nuovi (periodo) |
| `pointsMetrics.timeline[*].key` | Chiave `yyyy-MM` degli ultimi 6 mesi (`Model.gs:monthBuckets_`) | No | — |
| `pointsMetrics.timeline[*].label` | Etichetta `MM/yyyy` | Sì, grafico e Carico mensile | Mese / etichetta asse X |
| `pointsMetrics.timeline[*].entered_points`, `.entered_cards` | Punti/conteggio job con `arrival_ts` nel mese | Sì, grafico (punti) e Carico mensile | Nuovi / Nuovi lavori / Nuovi punti |
| `pointsMetrics.timeline[*].completed_points`, `.completed_cards` | Punti/conteggio job con `done_ts` nel mese | Sì, grafico (punti) e Carico mensile | Completati / Lavori completati / Punti completati |
| `pointsMetrics.timeline[*].accepted_points` | Fotografia a fine mese, o `now` per il mese corrente, dei punti in ruoli `backlog/prep/wip/stand_by`, ricostruita dal log (`Model.gs:stockInstantSeriesFromIndex_`) | Sì, grafico e Carico mensile | Lavoro accettato |
| `pointsMetrics.timeline[*].net_points` | `entered_points - completed_points` | Sì, Carico mensile | Saldo punti |
| `pointsMetrics.by_size[*].key/.label/.cards/.points` | Ripartizione del lavoro impegnato (stadi 1-4) per `size_class` (`Model.gs:pointsBreakdown_`) | Sì, Distribuzione | Per taglia |
| `pointsMetrics.by_assignee[*].key/.label/.cards/.points` | Ripartizione del lavoro impegnato per assegnatario | Sì, Distribuzione | Per assegnatario |
| `pointsMetrics.by_column[*].key/.label/.cards/.points` | Ripartizione di job attivi+archiviati per stato; `order` ordina le righe (`Model.gs:pointsByColumn_`) | Sì, Distribuzione (`key` non mostrata se è presente `label`; `order` non mostrato) | Per colonna |
| `pointsMetrics.by_column[*].order` | `column.order` | Usato solo per ordinare lato server | — |
| `waitTimeMetrics.window_days` | Copia della finestra di osservazione, benché i campioni di attesa usino tutto lo storico (`Model.gs:buildSystemState_`) | No | — |
| `waitTimeMetrics.client/authority/internal.total_days` | Somma dei rispettivi `t_*_d` positivi su tutte le visite attive+archiviate (`Model.gs:waitStats_`) | Sì, Rilavorazione / Dove si blocca il lavoro | Totale (giorni), per categoria |
| `waitTimeMetrics.client/authority/internal.occurrences` | Numero di valori `t_*_d > 0` | Sì | Occorrenze |
| `waitTimeMetrics.client/authority/internal.average_days` | `total_days / occurrences` | Sì | Media (giorni) |
| `waitTimeMetrics.client/authority/internal.min_days`, `.max_days` | Minimo/massimo del campione | Sì | Min / Max |
| `waitTimeMetrics.summary.total_days/.occurrences/.average_days/.min_days/.max_days` | Aggregazione pesata delle tre categorie (`Model.gs:waitSummaryRow_`) | Sì | Tutte le attese |
| `currentlyBlocked[*].job_id` | ID dei job attivi in una delle tre colonne di attesa riconosciute (`Model.gs:currentlyBlocked_`) | Solo come fallback se manca il titolo; nessun link/click | Lavoro |
| `currentlyBlocked[*].title`, `.client`, `.wait_type`, `.elapsed_days` | Anagrafica job; tipo da `WAIT_ACCUMULATOR_FIELDS`; giorni da `status_since_ts` a `now` | Sì, prime 5 righe | Fermi in questo momento: Lavoro, Cliente, Tipo attesa, Giorni |
| `currentlyBlocked[*].band` | Se almeno 20 campioni storici: green fino a p50, yellow fino a p85, red oltre (`Model.gs:buildSystemState_`) | Sì, colore riga | Nessuna etichetta per riga; criterio nella legenda |
| `cycleTimeBands.p50`, `.p85` | Percentili nearest-rank dei tempi di servizio storici (`Model.gs:percentile_`) | Sì, legenda di Fermi in questo momento | Verde fino alla mediana; giallo fino all'85° percentile |
| `cycleTimeBands.p95` | 95° percentile degli stessi campioni | No | — |
| `latentBacklogMetrics.window_days` | Finestra di osservazione | Sì, Rilavorazione / Esposizione futura | Periodo analizzato |
| `latentBacklogMetrics.count` | Visite consegnate nella finestra, mai rientrate, il cui job attivo non ha `incarico_chiuso_ts` (`Model.gs:buildSystemState_`) | Sì | Consegne non ancora chiuse |
| `delayProfileMetrics.sample_size` | Numero di visite, su tutto lo storico, con `rientro_ts` (`Model.gs:delayProfile_`) | Sì | Rilavorazioni osservate (campione) |
| `delayProfileMetrics.alpha` | `visite con rientro_ts / visite chiuse per servizio o rientro`; disponibile da 5 rientri | Sì | Quota di passaggi rilavorati (alpha) |
| `delayProfileMetrics.bin_days` | Ampiezza hardcoded dei bin: 7 giorni | Usato nel grafico | Etichette 0-6g, 7-13g, … |
| `delayProfileMetrics.kernel[*]` | Frequenze normalizzate in 8 bin; ultimo bin raccoglie la coda | Sì, istogramma | Profilo della rilavorazione |
| `delayProfileMetrics.p80_days` | 80° percentile nearest-rank dei giorni di attesa accumulati prima del rientro; presente da 5 campioni | Sì | 80° percentile del tempo prima della rilavorazione |
| `flowWeeklyBuckets[*].key` | Chiave settimana `yyyy-'W'ww` sulle ultime `wip_trend_weeks` (`Model.gs:flowWeeklyBuckets_`) | No | — |
| `flowWeeklyBuckets[*].wip_medio` | Media settimanale dei punti in `prep/wip/stand_by`, ricostruita dai move log (`Model.gs:activeWipWeeklyFromLog_`) | Sì, asse X dei due grafici diagnostici | Lavoro in corso (pt) |
| `flowWeeklyBuckets[*].throughput_punti_settimana` | Somma punti delle visite con `consegna_ts` nella settimana | Sì, grafico diagnostico | Throughput (pt/settimana) |
| `flowWeeklyBuckets[*].ct_medio_giorni` | Media dei tempi di servizio delle visite chiuse nella settimana | Sì, grafico diagnostico | Tempo di ciclo (g) |
| `flowWeeklyBuckets[*].n_campioni_ct` | Numero di campioni usati per `ct_medio_giorni` | No | — |
| `wipMovingAverage[*].wip_medio/.throughput_medio/.ct_medio` | Media mobile di 5 righe, dopo ordinamento per WIP crescente (`Model.gs:wipMovingAverage_`) | Sì, linee continue dei grafici diagnostici | Media mobile |
| `wipMovingAverage[*].n_campioni` | Sempre 5 | No | — |
| `cycleTimeFit.a/.w0/.n_samples` | Fit `ct(w)=a/(w0-w)` sui bucket grezzi; almeno 10 campioni (`Model.gs:cycleTimeTheoreticalFit_`) | Sì: `a/w0` disegnano la curva, `n_samples` alimenta la nota | Curva teorica tempo di ciclo |
| `throughputFit.t_max/.k/.n_samples` | Fit `T(w)=t_max*w/(k+w)` sui bucket grezzi; almeno 10 campioni (`Model.gs:throughputTheoreticalFit_`) | Sì: parametri nella curva, campioni nella nota | Curva teorica throughput |
| `wipCoverage.excluded_jobs`, `.excluded_job_ids` | Job senza eventi `move` interpretabili, esclusi dalla ricostruzione WIP (`Model.gs:buildJobIntervalsIndex_`) | No | — |
| `stabilityMetrics.margin` | `1-rho_effective` (`Model.gs:stabilityMetrics_`) | No; la pagina contiene solo un rimando testuale al margine mostrato altrove | — |
| `stabilityMetrics.congestion_factor` | `rho_raw/(1-rho_raw)`; nullo se `rho_raw>=1` | Sì, Stato del sistema / Margine di stabilità | Fattore di congestione (U) |
| `stabilityMetrics.variability_factor` | `(1+Cs²)/2` | Sì | Fattore di variabilità (V) |
| `stabilityMetrics.variability_level` | Fascia BASSA/MEDIA/ALTA con soglie 0,75/1,33 | Sì | Suffisso della riga V |
| `stabilityMetrics.rho_effective` | Carico totale / capacità effettiva | Sì | Utilizzo (rho effettivo) |
| `stabilityMetrics.system_state` | stable `<0,70`; stressed `0,70-0,85`; critical `0,85-1`; unstable `>=1` (`Model.gs:stabilityMetrics_`) | Sì, badge | STABILE / SOTTO PRESSIONE / CRITICO / INSTABILE |
| `scenarioReadiness.active` | Costante `false` (`Model.gs:buildSystemState_`) | No | — |
| `scenarioReadiness.message` | Testo costante di predisposizione | Sì, Scenari futuri | “La simulazione non è ancora attiva…” |
| `scenarioReadiness.scenarios.<scenario>.label` | Da `config.scenarios_json`, fallback `SIGMAFLOW.SCENARIOS` (`Model.gs:scenariosFromConfig_`) | Sì | Scenario ottimistico / medio / pessimistico |
| `scenarioReadiness.scenarios.<scenario>.arrivals_multiplier/.rework_multiplier/.time_multiplier/.capacity_multiplier` | Da config/default; nessun calcolo di scenario li usa | No | — |
| `descriptions.new_initiatives_per_day/.total_passages_per_day/.effective_load/.ready/.in_progress/.can_return/.prudent_service_days` | Testi costanti (`Model.gs:metricDescriptions_`) | No, l'intero oggetto `descriptions` non è letto dal client | — |

### 1.3 Campi top-level restituiti da `getMetrics()`

Questi campi non sono dentro `systemState`, ma fanno parte della stessa risposta. Il “Quadro avanzato” ne usa una parte.

| Campo top-level | Formula/fonte dati (`file:funzione`) | Mostrato oggi in UI? Dove | Etichetta UI attuale |
|---|---|---|---|
| `window_days` | `config.observation_window_days` (`Model.gs:calculateMetrics_`) | No da questo path | — |
| `n_jobs_observed` | Numero di visite con `apertura_ts` nella finestra, non job distinti | Sì, Quadro avanzato | Passaggi osservati nel periodo |
| `lambda` | `n_jobs_observed/window_days` | Sì, convertito `×7` | Tasso di arrivo (lambda) |
| `mu` | `1/media tempo servizio` per persona | Sì, convertito `×7` | Tasso di servizio per persona (mu) |
| `rho` | `lambda/(team_size*mu)` | Sì | Utilizzo (rho) |
| `E_S` | Media tempo di servizio | Sì | Tempo medio per passaggio (E[S]) |
| `E_S2` | Secondo momento dei tempi di servizio | No | — |
| `Var_S` | Varianza dei tempi di servizio | No | — |
| `Cs2` | `Var_S/E_S²` | Sì | Variabilità del servizio (Cv²) |
| `E_S0`, `E_S1` | Media servizio per prima visita / visite con `numero_visita>1` | Sì | Tempo medio primo passaggio; Tempo medio passaggio di rilavorazione |
| `MM1.Wq/.W/.Lq/.L` | Formule M/M/1 (`Model.gs:queueMM1_`) | Sì, Quadro avanzato | Attesa in coda; Tempo totale; Passaggi in coda; Passaggi nel sistema |
| `MG1.Wq/.W/.Lq/.L` | Formule M/G/1 (`Model.gs:queueMG1_`) | Sì, Quadro avanzato | Stesse etichette |
| `rework.p1/.r/.E_K/.lambda_effective/.rho_effective` | Metriche per visita (`Model.gs:reworkMetrics_`) | Sì, Quadro avanzato | Quota di passaggi rilavorati; Rilavorazioni medie per passaggio; Passaggi attesi per lavoro; Tasso di arrivo effettivo; Utilizzo effettivo |
| `rework.Wq` | Attesa M/G/1 calcolata con `rho_effective` | No | — |
| `stability.margin/.congestion_factor/.variability_factor/.variability_level/.rho_effective/.system_state` | `Model.gs:stabilityMetrics_` sulla popolazione top-level | No da questo path; la UI usa `systemState.stabilityMetrics` | — |
| `distributions.size_counts` | Conteggio visite osservate per taglia del job | No | — |
| `distributions.lead_time_by_size.<size>.count/.mean/.stddev` | Statistiche di `consegna_ts-apertura_ts` per taglia (`Model.gs:leadTimeBySize_`) | No | — |
| `systemState` | `Model.gs:buildSystemState_` | Sì, quasi tutta la Dashboard | Vedi tabelle precedenti |

## 2. Inventario frontend

| File | Pannello/card | Contenuto | Azioni al click | Dati consumati / funzione backend |
|---|---|---|---|---|
| `index.html` | Testata e navigazione principale | Titolo, sottotitolo, badge ambiente; viste Board, Dashboard, Archivio, Cestino | Cambio vista; il primo accesso alle viste attiva il relativo caricamento | `getBoard` all'avvio; `getMetrics`, `getArchivio`, `getCestino` all'apertura delle viste tramite `client.html` |
| `index.html` | Contenitori delle quattro viste | Include `board.html`, `dashboard.html`, `archivio.html`, `cestino.html` e `client.html` | Nessuna azione propria oltre alla navigazione | Rendering condiviso in `client.html` |
| `board.html` | Toolbar Board | Filtri Team, Tag, Taglia, Priorità; reset; aggiunta colonna; gestione menu; colonne nascoste; ultimo aggiornamento | Filtri e reset sono locali; aggiungi/modifica/mostra colonne chiama `addColumn`/`updateColumn`; gestione menu chiama `updateOptionList`; frecce scorrono la board | `getBoard`; mutazioni indicate |
| `board.html` | Lavagna Kanban | Colonne configurabili, contatori card/punti, badge aging, card filtrate e ordinate | Click card apre il modal; drag/drop e touch spostano con `moveJob`; ordinamento e spostamento colonne; creazione/cancellazione card | `getBoard`, `moveJob`, `addJob`, `updateJob`, `deleteJob`, `moveColumn`, `addColumn`, `updateColumn` |
| `board.html` | Modal Informazioni | Cliente, titolo, percorso, cronologia recente, descrizione, assegnatario, ambasciatore, tag, taglia, priorità, scadenza, colore, flag Chiuso | Salva/crea, archivia, chiudi modal, cambio tab | `addJob`, `updateJob`, `archiveJob`; opzioni iniziali da `getBoard` |
| `board.html` | Modal Cronologia | Storico movimenti/note/correzioni e riepilogo rientri | Aggiunge/modifica/elimina eventi; alcuni warning richiedono conferma | `getActivityLog`, `addActivityEvent`, `updateActivityEvent`, `deleteActivityEvent` |
| `board.html` | Dialog sequenza cronologia | Warning su sequenza modificata, colonna doppia, attesa senza uscita | Annulla o forza il salvataggio | Stesse azioni Activity Log con `force` |
| `board.html` | Gestione menu | Liste assegnatari, ambasciatori, tag | Aggiunge/rimuove/riordina voci | `updateOptionList` |
| `board.html` | Impostazioni colonna | Nome, colore, ruolo, `aging_days`, posizione, visibilità | Salva o annulla | `addColumn`, `updateColumn`, `moveColumn` |
| `dashboard.html` | Vista rapida | Stato, affidabilità, carico/capacità, gauge rilavorazione; punti accettati/nuovi/completati | In TEST: “Genera dati TEST”; le card non navigano | `getMetrics`; `seedTestData` per il pulsante TEST |
| `dashboard.html` | Andamento del carico | Grafico a linee mensile: stock accettato e flussi nuovi/completati, con due assi | Nessuna | `getMetrics` → `systemState.pointsMetrics.timeline` |
| `dashboard.html` | Stato del sistema / Margine di stabilità | Badge e messaggi di stato/qualità; utilizzo, V, U | Nessuna | `getMetrics` → `systemStatus`, `dataQuality`, `stabilityMetrics` |
| `dashboard.html` | Flusso e carico | Tabella pipeline, lavoro accettato, nuovi, completati in lavori/punti/tassi; capacità e bilancio | Nessuna | `getMetrics` → `pointsMetrics`, `flowMetrics` |
| `dashboard.html` | Rilavorazione | Carico nuovo/rilavorazione/totale; quota capacità; quota e frequenza rilavorazioni; cause | Nessuna | `getMetrics` → `flowMetrics`, `reworkMetrics`, `capacityMetrics` |
| `dashboard.html` | Dove si blocca il lavoro | Tabella storico attese per categoria e riepilogo | Nessuna | `getMetrics` → `waitTimeMetrics` |
| `dashboard.html` | Fermi in questo momento | Prime 5 attese correnti, colore per fascia storica | Nessuna: le righe non sono cliccabili | `getMetrics` → `currentlyBlocked`, `cycleTimeBands` |
| `dashboard.html` | Esposizione futura a rilavorazione | Periodo e conteggio consegne non ancora chiuse | Nessuna | `getMetrics` → `latentBacklogMetrics` |
| `dashboard.html` | Profilo della rilavorazione | Campione, alpha, p80 e istogramma dei tempi prima del rientro | Nessuna | `getMetrics` → `delayProfileMetrics` |
| `dashboard.html` | Tempi e variabilità | Media, Cv²/fascia, massimo, prudenziale, attesa/tempo totale stimati | Nessuna | `getMetrics` → `timeMetrics` |
| `dashboard.html` | Lavoro accettato e capacità | Conteggi/punti per backlog, preparazione, lavorazione, attese; da fatturare; capacità settimanale | Nessuna | `getMetrics` → `workloadMetrics`, `capacityMetrics` |
| `dashboard.html` | Distribuzione | Tre viste di punti/lavori per taglia, assegnatario, colonna | Click sui tab cambia solo il pannello visibile | `getMetrics` → `pointsMetrics.by_size/by_assignee/by_column` |
| `dashboard.html` | Carico mensile | Tabella ultimi 6 mesi: nuovi/completati, punti, saldo, lavoro accettato. La nota statica lo descrive ancora come “media”, mentre `monthBuckets_` restituisce una fotografia a fine mese/ora corrente | Nessuna | `getMetrics` → `pointsMetrics.timeline` |
| `dashboard.html` | Scenari futuri | Nomi scenari e stato “Non ancora attivo” | Nessuna | `getMetrics` → `scenarioReadiness` |
| `dashboard.html` | Quadro avanzato | Metriche base, code M/M/1 e M/G/1, rilavorazione per passaggio, due scatter WIP/throughput e WIP/tempo ciclo | Apertura/chiusura del `<details>`; nessuna azione dati | `getMetrics` → campi top-level e serie/fit di `systemState` |
| `archivio.html` | Archivio | Tabella casi archiviati con anagrafica, date e visite totali | “Usa come nuovo caso” crea un caso attivo senza storico pregresso | `getArchivio`, `duplicaJob` |
| `cestino.html` | Cestino | Tabella casi cestinati con anagrafica, date e visite totali | Ripristina; elimina definitivamente; svuota cestino, tutti con conferma prevista | `getCestino`, `ripristinaJob`, `eliminaJobDefinitivamente`, `svuotaCestino` |
| `client.html` | Controller/render condiviso | Stato client, caricamenti lazy, polling Board, rendering Board/Dashboard/Archivio/Cestino, canvas e dialog | Collega tutti gli handler descritti sopra | Tutte le chiamate passano da `callApi()` verso `Kanban.gs:api` |

## 3. Inventario configurazione e soglie

### 3.1 Parametri letti dal foglio `config`

| Parametro | Dove vive | Valore di default nel codice | Cosa controlla / uso osservato |
|---|---|---:|---|
| `team_size` | Foglio `config`; default in `Constants.gs:DEFAULT_CONFIG` | `4` | Capacità effettiva: persone / tempo medio di servizio; rho e metriche collegate |
| `observation_window_days` | Foglio `config`; `Constants.gs` | `30` | Finestra mobile di flusso, rientri, completamenti recenti, punti aggiunti/completati e backlog latente |
| `wip_trend_weeks` | Foglio `config`; `Constants.gs` | `26` | Numero di bucket settimanali dei grafici diagnostici WIP/throughput/tempo ciclo |
| `archiviazione_giorni_default` | Foglio `config`; `Constants.gs` | `30` | Età minima dalla chiusura per l'archiviazione automatica (`Kanban.gs:archiveEligibleJobs_`) |
| `backup_retention_giorni` | Foglio `config`; `Constants.gs` | `14` | Giorni di conservazione dei backup PROD (`Backup.gs:backupRetentionDays_`) |
| `theoretical_capacity_per_day` | Foglio `config`; `Constants.gs` | vuoto | Capacità teorica opzionale in passaggi/giorno; mostrata solo se positiva |
| `size_XS_days`, `size_S_days`, `size_M_days`, `size_L_days`, `size_XL_days` | Foglio `config`; `Constants.gs` | `0,5 / 1 / 2 / 4 / 8` | Parametri seminati e descritti come giorni medi attesi per taglia; nessun consumer trovato nei file ispezionati |
| `columns_json` | Foglio `config`; default da `Constants.gs:DEFAULT_COLUMNS`; normalizzazione in `Utils.gs:normalizeColumns_` | Array delle 8 colonne standard | Struttura, ordine e comportamento della board e classificazione delle metriche per ruolo |
| `assignees_json` | Foglio `config`; `Constants.gs` | `['Alessandra','Giovanni D','Marco','Altro']` | Opzioni assegnatario e ordine della distribuzione per assegnatario |
| `ambassadors_json` | Foglio `config`; `Constants.gs` | `[]` | Opzioni ambasciatore nel modal |
| `tags_json` | Foglio `config`; `Constants.gs` | `['AIA','ADR','VIA','rifiuti','acque','aria','suolo','rumore']` | Opzioni e filtri tag |
| `scenarios_json` | Foglio `config`; fallback `Constants.gs:SCENARIOS` | JSON degli scenari standard | Nomi e moltiplicatori degli scenari predisposti; oggi i moltiplicatori non alimentano calcoli |
| `column_backlog`, `column_in_progress`, `column_stand_by`, `column_in_review`, `column_done` | Foglio `config`; `Constants.gs` | `Backlog / In corso / Stand-by / In review / Fatto` | Etichette legacy/fallback quando `columns_json` manca; la configurazione ordinaria usa `columns_json` |

Struttura osservata di ogni elemento di `columns_json`:

| Campo | Tipo/comportamento |
|---|---|
| `id` (o legacy `status`) | Identificatore normalizzato e univoco della colonna |
| `label` | Etichetta UI |
| `role` | Uno fra `backlog`, `prep`, `wip`, `stand_by`, `done`, `neutral`; guida stadi, workload, WIP, rientri e attese |
| `order` | Ordine numerico; riscritto a multipli di 10 al salvataggio |
| `color` | Colore esadecimale, fallback `#E8E8E8` |
| `hidden` | Visibilità della colonna |
| `aging_days` | Soglia opzionale per evidenziare le card rimaste nella colonna oltre N giorni; modificabile dal modal colonna |

Default `aging_days` delle colonne standard: `wait_client=15`, `wait_authority=45`, `wait_internal=5`; le altre colonne non hanno soglia. La migrazione di schema assegna `5` alle vecchie colonne `stand_by` prive del campo, senza sovrascrivere valori già presenti.

Struttura osservata di ogni scenario in `scenarios_json`: `label`, `arrivals_multiplier`, `rework_multiplier`, `time_multiplier`, `capacity_multiplier`. Default: ottimistico `0,85 / 0,80 / 0,90 / 1,05`; medio `1 / 1 / 1 / 1`; pessimistico `1,15 / 1,25 / 1,20 / 0,90`.

### 3.2 Soglie e parametri hardcoded

| Valore hardcoded | Dove | Cosa controlla |
|---:|---|---|
| `<10`, `10-30`, `>30` lavori osservati | `Model.gs:dataQuality_` | Fasce BASSA/MEDIA/BUONA della qualità dati |
| `5` completati utili | `Model.gs:buildSystemState_`, `dataQuality_` | Minimo per stimare tempi e capacità |
| `0,70`, `0,85`, `1,00` | `Model.gs:systemStatus_`, `waitingMessage_`, `stabilityMetrics_`; specchio colore in `client.html` | Fasce di carico/stabilità e messaggi; i due sistemi di etichette hanno nomi diversi ma gli stessi tagli |
| `0,75`, `1,33` | `Model.gs:variabilityLevel_` | Fasce BASSA/MEDIA/ALTA per Cv² e V |
| `20` campioni; percentili `50%`, `85%`, `95%` | `Model.gs:buildSystemState_` | Disponibilità e soglie delle fasce colore per i job attualmente fermi; p95 è calcolato ma non renderizzato |
| `5` righe mostrate | `client.html:CURRENTLY_BLOCKED_LIMIT_` | Limite della tabella “Fermi in questo momento” |
| `5` rientri | `Model.gs:delayProfile_` | Minimo per alpha, kernel e p80 del profilo di rilavorazione |
| Bin da `7` giorni, `8` bin | `Model.gs:delayProfile_` | Istogramma del ritardo prima del rientro |
| `80%` | `Model.gs:delayProfile_` | Percentile del tempo prima della rilavorazione |
| `6` mesi | `Model.gs:pointsStatistics_` → `monthBuckets_` | Estensione del grafico “Andamento del carico” e della tabella “Carico mensile” |
| Finestra mobile `5` campioni | `Model.gs:WIP_MOVING_AVERAGE_WINDOW_` | Smussamento dei grafici diagnostici ordinati per WIP |
| `10` campioni | `Model.gs:MIN_SAMPLES_FOR_THEORETICAL_FIT_` | Minimo per i fit teorici di throughput e tempo ciclo |
| `1` punto di media mobile | `client.html:MIN_MOVING_AVERAGE_POINTS_` | Minimo client per mostrare gli scatter diagnostici |
| Gauge rilavorazione con fondo scala `0,50` | `client.html:renderMetrics` → `renderGauge` | Riempimento visivo del gauge; il testo continua a mostrare la percentuale reale |
| Poll Board ogni `45.000 ms` | `client.html:startBoardPolling_` | Frequenza di aggiornamento quando la pagina è visibile |
| Punti taglia `3/5/8/13/20`, fallback `M=8` | `Constants.gs:SIZE_POINTS`, specchio in `client.html` | Conversione taglia→punti e valore usato se `size_points`/taglia mancano |
| Soglie priorità `2/3/4/99` | `Constants.gs:PRIORITY_CLASSES` | Classificazione suggerita dal punteggio priorità |
| Rientro riconosciuto solo da `stand_by`/`done` verso `backlog`/`prep` | `ActivityLog.gs:computeVisiteFromLog_`; `Kanban.gs` | Apertura di una nuova visita e causa del rientro |

## 4. Mappatura concetto → codice

| # | Concetto | Esito | Equivalente reale e differenza di perimetro |
|---:|---|---|---|
| 1 | Capacità osservata | Simile, non identico | I tassi osservati esistono già in “Completati (periodo)”: `flowMetrics.completed_per_day × 7` per lavori/settimana e `pointsMetrics.completed_points / flowMetrics.window_days × 7` per punti/settimana, entrambi sulla finestra configurabile `observation_window_days`. Il nome reale non è “capacità osservata”. Separatamente, `capacityMetrics.effective_per_day` stima la capacità come `team_size / tempo medio di servizio`, mentre `flowWeeklyBuckets.throughput_punti_settimana` conserva il throughput di ogni singola settimana sulle ultime `wip_trend_weeks`. |
| 2 | Ritmo attuale / utilizzo della capacità | Simile, non identico | Esistono `capacityMetrics.effective_load`, `systemStatus`, `waiting_message` e `stabilityMetrics.system_state`: confrontano carico stimato e capacità effettiva e producono percentuale/testi. La capacità di riferimento non è la capacità osservata del concetto 1 e le etichette reali sono STABILE/ATTENZIONE/SOTTO PRESSIONE/CRITICO oppure STABILE/SOTTO PRESSIONE/CRITICO/INSTABILE. |
| 3 | Lavoro già acquisito | Simile, perimetro più ampio | `pointsMetrics.committed_cards/committed_points`, etichettato “Lavoro accettato”, include tutti gli stadi 1-4: backlog, preparazione, lavorazione e attesa. Comprende quindi anche lavoro già avviato/fermo. Esclude lo stadio 0, “Pipeline commerciale (preventivi)”. |
| 4 | Settimane di lavoro già impegnate | Non esiste | Nessun campo divide il lavoro acquisito per una capacità settimanale e nessuna etichetta esprime settimane impegnate. |
| 5 | Lavori rientrati / rientri | Simile, incompleto rispetto al concetto | `reworkMetrics` espone quota di lavori con almeno un rientro, media dei rientri e conteggi per causa cliente/enti/interno nella finestra. `delayProfileMetrics` espone anche alpha storico. Non esistono punti dei rientri; `by_cause.total` conta visite di rientro, mentre `initiatives_with_rework` è una quota di job distinti. |
| 6 | Stato del WIP con fasce | Simile solo nei dati di base | `workloadMetrics.in_progress`/`in_progress_points` fotografa il solo ruolo `wip`; la serie diagnostica definisce “Lavoro in corso” come `prep+wip+stand_by`. Non esiste una classificazione basso/regolare/alto/attenzione del numero WIP con soglie configurabili. Le fasce di `systemStatus` riguardano il carico/capacità e sono hardcoded; `cycleTimeBands` riguarda il tempo fermo, non il livello WIP. |
| 7 | Lavoro da programmare (backlog) | Simile, con nomi/stadi reali diversi | `workloadMetrics.ready/_points` = ruolo `backlog` (“Lavoro pronto”); `preparing/_points` = ruolo `prep` (“In preparazione”). Entrambi hanno numero e punti e sono separati. Il codice non usa due categorie denominate “incarichi accettati” e “lavori pronti”: “Lavoro accettato” è invece l'aggregato più ampio degli stadi 1-4. |
| 8 | Attese, per categoria | Simile, incompleto | `workloadMetrics.waiting_*` dà numero e punti correnti per cliente/enti/interno; `currentlyBlocked` dà il tempo corrente per singolo job; `waitTimeMetrics` dà totale/occorrenze/media/min/max storici per categoria. Non esiste mediana per categoria. Le soglie `aging_days` sono configurabili per colonna sulla Board; nella Dashboard le fasce dei fermi usano percentili storici hardcoded e non `aging_days`. La lista mostra solo 5 righe e non è cliccabile. |
| 9 | Carico potenzialmente in rientro | Simile, più stretto e solo in numero | `latentBacklogMetrics.count`, etichettato “Consegne non ancora chiuse”, conta visite consegnate di recente, mai rientrate, con incarico non chiuso. Non include genericamente lavori “fermi” e non restituisce punti. Anche `workloadMetrics.can_return` conta/punti dei conclusi non fatturati, senza finestra temporale. |
| 10 | Riaperture dopo chiusura definitiva | Non esiste come metrica | `Kanban.gs:recomputeIncaricoChiusoTs_` riconosce un rientro successivo a `incarico_chiuso_ts` e azzera la chiusura, ma nessun campo di `getMetrics()` conta separatamente queste riaperture. |
| 11 | Grafico andamento dei flussi cumulativo | Non esiste | `pointsMetrics.timeline` e “Andamento del carico” sono mensili e non cumulativi: nuovi punti, punti completati e fotografia del lavoro accettato. Non includono serie separate per rientri e avvii. |
| 12 | Andamento della capacità nel tempo | Non esiste | La dashboard ha throughput e tempo di ciclo rispetto al WIP su `wip_trend_weeks`, più una capacità effettiva corrente. Non esiste una serie temporale della capacità osservata su finestra scorrevole. |
| 13 | Sezione “Da verificare” / anomalie | Non esiste come sezione o lista unificata | Esistono segnali separati: aging configurabile sulle card Board, lista dei 5 job fermi più a lungo, esclusioni WIP in `wipCoverage` non mostrate e warning di sequenza nel modal Cronologia. Non esiste una lista aggregata di anomalie cliccabile verso il job; le righe “Fermi in questo momento” non hanno handler di click. |
| 14 | Normalizzazione eventi duplicati consecutivi | Non esiste nel calcolo | `ActivityLog.gs:validateSequence_` rileva `COLONNA_DOPPIA` e, per attese, `ATTESA_SENZA_USCITA`, ma sono warning superabili con `force`. `computeVisiteFromLog_` e `jobColumnIntervalsFromLog_` percorrono tutti i `to` in ordine e non eliminano/collassano move consecutivi verso la stessa colonna. |
| 15 | Tolleranza ai passaggi di colonna saltati | Esiste, nel calcolo | `ActivityLog.gs:computeVisiteFromLog_` ricostruisce esclusivamente dalla sequenza reale dei `to`; valorizza `incarico_ts`, `prep_ts`, `start_ts`, `consegna_ts` solo quando il relativo ruolo compare. Un passaggio saltato resta senza timestamp e non viene inventato. Un rientro storico diretto da attesa/done a WIP è tollerato nella ricostruzione ma produce `RIENTRO_DIRETTO_A_WIP`; l'inserimento live/manuale ordinario di quel pattern è bloccato. |

## 5. Verifica puntuale post-Fase U

La verifica rapida è già registrata in `docs/DESIGN_fase_U.md` §4 e in `PROGRAMMA_STATO.md`: dopo la pulizia PROD del 10 settembre 2026, `completed_initiatives_periodo = 8` e `completed_passages_periodo = 8`.

I due valori risultano quindi ancora uguali nello snapshot post-pulizia. Il codice mantiene aggregazioni distinte: il primo deduplica per `job_id`, il secondo conta le visite consegnate. L'uguaglianza osservata deriva dal fatto che ciascuno degli 8 lavori conclusi nel periodo aveva una sola visita consegnata nella finestra.
