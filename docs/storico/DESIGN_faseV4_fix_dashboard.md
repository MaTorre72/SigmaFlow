# DESIGN_faseV4_fix_dashboard.md

## Fase V4 — Trasparenza dello Stato del flusso e debito tecnico residuo

### Stato del documento

Documento di design operativo per Codex.

La V3 è pubblicata su TEST come vista principale (`docs/DESIGN_faseV3_nuova_dashboard.md`). Le quattro card operative e il CFD a stock sono verificati corretti da due fonti indipendenti (revisione Claude sui dati grezzi + confronto Codex sulla dashboard reale, `docs/VERIFICA_indipendente_dashboard_V3_confronto.md`): **non li tocca nessun punto di questo documento**.

La V4 non introduce nuove metriche né nuova UX. Chiude i problemi di trasparenza/fiducia emersi dalla revisione indipendente sullo "Stato del flusso" e salda debito tecnico già noto ma mai pianificato (`from` incoerenti, audit cronologia). È un programma di correzione, non di design.

---

# 0. Cosa NON cambia

Per evitare regressioni sul lavoro già validato, questi restano invariati:

- perimetro dei ruoli (`wip`/`backlog`/`prep`/`stand_by`/`done`/`neutral`);
- `wip_jobs`/`wip_points`, `future_work_jobs`/`future_work_points`, `waiting_jobs`/`waiting_points`;
- `committed_weeks` e la sua formula;
- CFD a stock (boundary, ribasamento, identità §17 della V2);
- definizione di episodio WIP/ripresa basata sugli ingressi/uscite dal ruolo `wip` nella cronologia (confermata in V2.2, non `numero_visita`, non `visite.start_ts`);
- `computeVisiteFromLog_` — resta non toccata, come da vincolo V2 §1.3.

---

# 1. Trasparenza dello "Stato del flusso" (da revisione indipendente V3)

Le card sono corrette nei valori ma insufficientemente motivate in UI: un utente non può verificare da solo perché il sistema dice "Carico elevato" o "Affidabilità buona". Cinque interventi, tutti P1, nessuno cambia i valori già validati — solo cosa viene esposto e come viene descritto.

## 1.1 Separare il fatto osservato dalla diagnosi in "Carico elevato"

**Problema**: lo stato scatta perché il WIP (4) supera di poco la fascia osservata (1–3,89, cioè per 0,11 lavori). Il messaggio "senza un aumento osservato della capacità" non è coerente con il ritmo recente mostrato nella stessa card (5,63, superiore al riferimento storico 1,87).

**Fix**:
- `system_flow_message` per `HIGH_LOAD` non deve più affermare l'assenza di un aumento di ritmo quando `recent_completion_throughput > historical_observed_capacity`. Costruire il messaggio da entrambi i fatti separatamente, es.: *"WIP sopra la fascia centrale osservata (X su Y–Z). Ritmo recente superiore allo storico."*
- Valutare un'isteresi o tolleranza sul confine superiore della fascia (parametro backend, non hardcoded frontend) per evitare che uno scarto di pochi decimi cambi stato — solo se Marco conferma che è un problema pratico, non solo estetico.
- Non introdurre il termine "congestione" o sinonimi finché non c'è un segnale dedicato per quello (vedi V2 §30, resta sperimentale).

## 1.2 Esporre le prove dietro "Affidabilità buona"

**Problema**: il backend applica un minimo campionario, ma l'interfaccia non mostra `sample_size`, `window`, periodo coperto o quanto i campioni siano concentrati nel tempo. "Buona" non è verificabile da chi guarda lo schermo.

**Fix**:
- Nel dettaglio/tooltip di "Stato del flusso" mostrare, quando disponibili: numero di completamenti nella finestra, `window_start`/`window_end`, numero di settimane con almeno un completamento.
- Distinguere esplicitamente qualità del ritmo recente da qualità della baseline storica (sono stime diverse, con campioni diversi).
- "Parziale"/qualità intermedia per uno storico disponibile ma raro o non certificato, invece del solo binario buona/insufficiente.

## 1.3 Rendere riconciliabile il ritmo recente

**Problema**: la finestra usata dal backend (`generated_at − 56 giorni, generated_at]`) non è visibile; chi verifica esternamente coi dati grezzi (come la revisione indipendente) non può allinearsi senza dettaglio evento-per-evento.

**Fix**:
- Esporre nel dettaglio: `window_start`, `window_end`, timezone, numero di completamenti e punti inclusi nella finestra.
- Aggiungere un export/drill-down con job, numero visita, `consegna_ts`, punti — sufficiente a un confronto riga per riga senza dover leggere `activity_log_json` a mano.

## 1.4 Riprese: rendere il dettaglio univoco

**Nota**: lo scarto numerico (41 nella revisione indipendente contro 43 nella dashboard) **è già spiegato** — non serve indagine aggiuntiva sulla causa. Due job (`JOB-20260707-0YXL`, `JOB-20260707-A74L`) hanno eventi recenti in `activity_log_json` non ancora riflessi nel foglio `visite` (vedi §3). La dashboard, leggendo dal log come da V2.2, è corretta; la revisione indipendente, basata sul foglio `visite`, era indietro su questi due job. Non è un problema di definizione.

**Resta da fare, sul dettaglio V3** (segnalato dalla revisione): due righe "ripresa 2" con lo stesso titolo e stesso intervallo di date sono visivamente indistinguibili nel drill-down.

**Fix**:
- Aggiungere un identificatore univoco per riga nel drill-down "Lavori ripresi" (job_id o riferimento cliente/commessa), non solo titolo e date.
- Rinominare la card se aiuta la lettura: "Episodi di ripresa" invece di "Lavori ripresi", o mostrare accanto sia il numero di episodi sia il numero di job distinti coinvolti (36 job, 41–43 episodi non sono la stessa cosa e la card attuale può far pensare che coincidano).

## 1.5 Fascia WIP e baseline storica: rendere auditabile il calcolo

**Problema**: fascia (25°–75° percentile) e baseline (`historical_observed_capacity`) sono derivate dallo storico quando i target non sono in `config`, ma non c'è un export che permetta di ricalcolarle indipendentemente — il CSV degli stock settimanali usato nella revisione indipendente sono fotografie puntuali, non le medie pesate per durata che il backend usa davvero.

**Fix**:
- Aggiungere un export diagnostico (sezione "Analisi avanzata"/Taratura, non home) con la serie settimanale usata per calcolare fascia e baseline: `avg_wip_jobs` pesato per durata, settimane "sufficientemente cariche" incluse nel calcolo della baseline, metodo del percentile usato.
- In UI, preferire "Fascia centrale osservata" a "Fascia abituale" — la fascia è una statistica descrittiva, non un obiettivo o un valore ottimale, ed è importante che non sembri l'uno o l'altro.

## 1.6 Attivare il riepilogo diagnostico già pronto nel backend

**Problema**: il CFD è verificato coerente e la revisione indipendente non trova stati orfani, ma la UI mostra "Controlli diagnostici non ancora attivi" — un lettore non ha modo di sapere cosa è stato effettivamente validato.

**Fix**:
- Esporre un riepilogo minimo (sezione Diagnostica, Livello 5 della V3): identità CFD verificate/violate per l'ultimo bucket, job senza stato osservato, log non parsabili, colonne orfane, visite senza job corrispondente, timestamp dell'ultimo dato.
- Il riepilogo conferma cosa è stato controllato, non garantisce l'assenza di ogni possibile anomalia — evitare che l'assenza di righe in `issues[]` sembri una certificazione totale (vale lo stesso principio già scritto in V2 §20 per `issues=[]`).

---

# 2. Tempo di caricamento (P2, non bloccante)

Il tempo di risposta è sceso da ~30s a ~12,7s complessivi (backend 6-8ms, il resto è round-trip/rendering), ma resta variabile e percepibile.

**Fix, solo se prioritario per Marco — non blocca il resto della V4**:
- Misurare separatamente lettura fogli, normalizzazione, calcolo storico/CFD, trasferimento al client (strumentazione minima, non un refactor).
- Valutare una cache breve lato server (snapshot materializzato, invalidato dalle scritture) mantenendo visibile l'istante dell'ultimo aggiornamento — non deve mai servire dati vecchi presentati come correnti senza dirlo.

---

# 3. Verifica da fare: sincronizzazione del foglio `visite`

Non è un problema della V3 (che legge `activity_log_json`, non `visite`), ma è emerso durante la revisione indipendente e vale la pena chiudere la domanda: **il foglio `visite` è sempre aggiornato in tempo reale, o solo a fasi/migrazioni?**

Evidenza raccolta (dati TEST del 14/09/2026, sola lettura):

- `jobs.status` è sempre coerente con l'ultimo evento di `activity_log_json` (0 discrepanze su 56 job) — è live.
- Il foglio `visite`, per almeno 2 job su 56, non riflette eventi recenti già presenti nel log:
  - `JOB-20260707-0YXL`: un completamento del 28/08/2026 (`wait_authority → done`, 8 punti) non risulta come `consegna_ts` in nessuna riga `visite`.
  - `JOB-20260707-A74L`: un rientro in WIP del 09/09/2026 (`wait_client → todo → wip`) ha aperto una riga `visite` (con `rework_cause` valorizzato) ma `apertura_ts` e `start_ts` sono rimasti vuoti.

**Azione richiesta — solo accertamento, non una correzione al buio**:
1. Confermare se `visite` viene ricalcolato ad ogni `moveJob`/evento, oppure solo in occasioni specifiche (migrazione, trigger periodico). Se il comportamento è per design (`visite` come snapshot periodico, non live), documentarlo esplicitamente da qualche parte visibile (`docs/architecture.md` o `docs/dashboard-metrics.md`) così non genera più falsi allarmi in verifiche future.
2. Se invece `visite` dovrebbe essere live e questi 2 casi sono un bug, isolarne la causa (senza toccare `computeVisiteFromLog_`, per il vincolo V2 §1.3) e verificare quanti altri job nel dataset reale (non solo TEST) sono nella stessa condizione.
3. In ogni caso, verificare se qualche consumatore **diverso dalla V3** (dashboard legacy, report, altre metriche) legge `visite` assumendola aggiornata in tempo reale — se sì, quel consumatore eredita lo stesso ritardo.

Non bloccante per l'uso quotidiano della V3. Bloccante solo per chi userà `visite` come fonte diretta in futuro.

---

# 4. Debito tecnico pregresso, mai pianificato

Due punti erano già descritti in `docs/DESIGN_faseV3_nuova_dashboard.md` (§21.1, §22) come "correzione autonoma consigliata in parallelo", non bloccanti per V3, ma non risultano mai schedulati né chiusi. La validazione finale V2 conferma ancora aperto: "15 incoerenze from restano debito tecnico non bloccante".

## 4.1 Writer `from` dell'activity log

`addActivityEvent`/`updateActivityEvent` possono lasciare `from` successivi incoerenti; `deleteActivityEvent` già riallinea. Non blocca le metriche attuali (la normalizzazione V2 è invariante rispetto al `from` alterato — verificato con test dedicati), ma è debito che cresce ad ogni correzione manuale in Cronologia.

**Fix**: riallineare deterministicamente i `from` dopo inserimento/modifica, preservando eventi e metadati esistenti. Non bonificare lo storico esistente in questo stesso intervento — passaggio separato, con revisione umana, se e quando deciso.

## 4.2 Audit delle modifiche storiche

Non sono conservati sistematicamente `created_at`, `updated_at`, versione precedente, uso di `force`, autore effettivo di una modifica storica.

**Fix**: separare `event_ts` (quando l'evento è accaduto nel mondo reale) da `operation_ts` (quando è stato scritto/modificato nel sistema), e introdurre audit solo in avanti — non tentare di ricostruire retroattivamente ciò che non è mai stato registrato.

Questi due punti possono essere svolti insieme, come già suggerito in V3 §21.2.

---

# 5. Ordine operativo consigliato

1. **§1** — correzioni di testo/trasparenza sullo Stato del flusso (nessun rischio sui valori già validati, il lavoro più visibile per Marco).
2. **§1.4** — identificatore univoco nel drill-down riprese.
3. **§3** — accertamento sulla sincronizzazione di `visite` (mezza giornata, solo lettura/diagnosi).
4. **§4** — writer `from` + audit cronologia, insieme.
5. **§2** — profilazione/cache tempo di caricamento, solo se Marco lo conferma prioritario.

Nessun punto qui richiede di riaprire il gate umano finale di V2 già in corso, né di modificare CFD, stock o `committed_weeks`.

---

# 6. Criteri di chiusura V4

La V4 può essere considerata conclusa quando:

1. i messaggi di "Stato del flusso" non affermano più fatti non coerenti con i dati mostrati nella stessa card (§1.1);
2. il dettaglio espone campione, finestra e qualità separata per ritmo recente e baseline storica (§1.2, §1.3, §1.5);
3. ogni riga del drill-down "Lavori ripresi" è identificabile univocamente (§1.4);
4. il riepilogo diagnostico minimo è visibile invece di "Controlli non ancora attivi" (§1.6);
5. è chiaro — in codice o in documentazione — se `visite` è live o periodico, e se qualche altro consumatore ne dipende (§3);
6. writer `from` e audit cronologia sono corretti o esplicitamente rischedulati con una data (§4);
7. suite di test locale verde, push TEST verificato con pull isolato (stesso standard delle fasi precedenti);
8. nessuna scrittura su PROD; nessuna modifica a stock, CFD, `committed_weeks`, definizione di episodio WIP.
