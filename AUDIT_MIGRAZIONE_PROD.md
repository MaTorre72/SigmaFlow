# Audit — Migrazione PROD del modello caso/visita

> **v2 — corretto dopo chiarimenti di Marco (16/08/2026).** La v1
> (allegata in fondo come cronologia) conteneva un allarme rientrato: il
> punto §0 è chiarito, e la strategia di migrazione è cambiata su
> proposta di Marco (copia di PROD come ambiente di prova reale, invece
> di dati sintetici che imitano PROD). Questo documento sostituisce la
> sequenza operativa della v1; le osservazioni sui dati e sul divario
> di schema restano valide e sono riportate invariate.

---

## 0. Architettura — RISOLTO

**Stesso progetto Apps Script per PROD e TEST**, confermato da Marco.
La distinzione non è di codice ma di **deployment**: PROD gira su un
deployment ufficiale pubblicato (versione congelata), TEST lavora
sullo script senza mai essere stato pubblicato come deployment a sé.
`clasp push` aggiorna solo il sorgente (HEAD) del progetto — **non**
tocca automaticamente un deployment già pubblicato.

Conseguenza pratica: **nessun rischio immediato**. Il codice che
esegue oggi PROD è quello congelato all'ultimo deploy ufficiale, non
quello scritto in questa sessione. Il team che usa PROD è comunque già
fermo (confermato da Marco), quindi anche un rischio residuo sarebbe
comunque non attivo in questo momento.

### 0.1 — Script Property condivisa: il rischio si sposta, non sparisce

Resta vero che `PROP_SCHEMA_VERSION` è una Script Property **condivisa
a livello di progetto**, non separata per spreadsheet. Ma con
l'architettura chiarita, il momento critico non è "ora" — è **il
momento del deploy per PROD** (fase P4 più sotto): se in quel momento
la property risultasse già allineata da un giro precedente su TEST, il
nuovo codice PROD salterebbe `setupSigmaFlow()` pensando lo schema del
*foglio* fosse già corretto, quando non lo è. Va verificato/gestito
esplicitamente in P4, non prima.

---

## 1. Cosa è stato verificato in questa sessione, e come

- **Accesso**: `.clasp.json` configurato solo per il progetto Apps
  Script (unico, condiviso PROD/TEST, vedi §0). Nessuna configurazione
  per un secondo progetto.
- **Dati PROD**: conosciuti tramite l'export del foglio `jobs`/`cases`
  e, ora, il contenuto reale del foglio `config` — entrambi incollati
  da Marco in chat. Non letti in autonomia dalla sessione.
- **Codice**: letto dal branch `codex/case-visit-model` (35 commit
  avanti a `main`, mai unito) e confrontato con `main`.

## 2. Stato osservato di PROD

Intestazioni del foglio `jobs`:

```
job_id, case_id, visit_number, title, client, ambassador, status,
assignee, tag, size_class, size_points, priority_class,
priority_class_manual, impact, manageability, priority_score,
description, due_date, arrival_ts, start_ts, done_ts, invoiced,
service_time_d, lead_time_d, wait_time_d, is_rework, rework_cause,
notes, card_color, checklist_json, correction_log_json
```

**Non c'è `activity_log_json`** — lo schema live di PROD è precedente
persino a `main`. Nessun `incarico_ts`, `prep_ts`,
`incarico_chiuso_ts`, nessun foglio `visite`. PROD non ha mai ricevuto
nessuna delle fasi di questo programma (G, K, L1-L5).

Foglio `cases`: struttura invariata, nessuna migrazione necessaria di
per sé.

### 2.1 — `columns_json` reale di PROD: trovato un problema concreto, non ipotetico

Valore reale (fornito da Marco):

```json
{"id":"todo","label":"TO DO","role":"wip","order":30,"color":"#37b22e","hidden":false}
```

**`TO DO` ha ancora `role: "wip"`**, non `"prep"` — esattamente lo
stato pre-Fase-K. Se il deploy va live senza correggere questo valore,
la regola di apertura/chiusura visita (L2) tratterebbe TO DO come WIP,
riproducendo su PROD il bug che la Fase K ha risolto su TEST. Non si
corregge da sola col deploy: `readColumns_()` legge `columns_json` dal
foglio `config` quando popolato (lo è), i default nel codice non
intervengono.

**Correzione minima, individuata, da applicare in P5** (unica modifica
rispetto al valore reale, tutto il resto — etichette, colori, ordine —
invariato):

```json
[{"id":"notes","label":"PREVENTIVI","role":"neutral","order":10,"color":"#e8e8e8","hidden":false},{"id":"backlog","label":"INCARICHI","role":"backlog","order":20,"color":"#c8d8e8","hidden":false},{"id":"todo","label":"TO DO","role":"prep","order":30,"color":"#37b22e","hidden":false},{"id":"wip","label":"WIP","role":"wip","order":40,"color":"#5B9BD5","hidden":false},{"id":"wait_internal","label":"REV INTERNA","role":"stand_by","order":50,"color":"#e8a020","hidden":false},{"id":"wait_client","label":"ATTESA CLIENTE","role":"stand_by","order":60,"color":"#FFD966","hidden":false},{"id":"wait_authority","label":"ATTESA ENTI","role":"stand_by","order":70,"color":"#F4B942","hidden":false},{"id":"done","label":"DA INVIARE / DA FATTURARE","role":"done","order":80,"color":"#70ad47","hidden":false}]
```

### 2.2 — Altri valori di `config`, non bloccanti

- `team_size: 3` (non 4 come assunto in simulazioni precedenti) — da
  usare come divisore corretto in eventuali calcoli di $\rho$/stabilità
  futuri.
- `size_XS_days`…`size_XL_days` = 7/14/30/60/120, molto diversi dai
  default nel codice (0.5/1/2/4/8) — già tarati sul lavoro reale, letti
  da `config` non dai default: il deploy non li tocca, nessuna azione.

### 2.3 — Qualità dei dati reali (osservazioni originali, invariate)

- Diversi case con `total_visits: 0`, `is_open: FALSE`, chiusi pochi
  secondi dopo la creazione — creazioni doppie accidentali preesistenti.
- Alcuni job con `status: notes` e `arrival_ts` vuoto — card mai avviate.
- Diversi `title` segnaposto (`??`) — dato preesistente, non tecnico.

## 3. Divario tra PROD e lo stato attuale di TEST

Invariato dalla v1 — PROD deve ricevere in sequenza Fase G, Fase K,
L1-L5, non si può saltare direttamente a L5. Tabella di dettaglio nella
v1 (in fondo), non ripetuta qui: nessun punto è cambiato dai
chiarimenti di questa sessione, salvo il contenuto concreto di §2.1
sopra (prima solo "da verificare", ora verificato e con fix pronto).

## 4. Strategia di migrazione — cambiata su proposta di Marco

**v1**: wrapper `*_OnProd()` testati su TEST con dati *sintetici* che
imitano lo schema-precedente di PROD.

**v2 (adottata)**: invece di imitare PROD, si usa una **copia reale**
del foglio PROD come ambiente di prova. Risolve insieme tre rischi che
la v1 teneva separati: dati "sporchi" mai visti prima (§2.3), collaudo
della procedura vera invece che di un'approssimazione, e verifica della
correzione `columns_json` (§2.1) sul valore reale.

**Attenzione operativa**: la copia non deve sovrascrivere il foglio
TEST attuale (contiene i dati sintetici già usati per collaudare L1-L5,
con `columns_json` già corretta) — si usa una copia Google Sheets
separata, puntata temporaneamente tramite la Script Property
`SIGMAFLOW_TEST_SPREADSHEET_ID`, ripristinata al termine della prova.

**Consolidamento tecnico**: invece di quattro wrapper `*_OnProd()`
separati da richiamare a mano in ordine (rischio di eseguirli in ordine
diverso tra la prova e l'esecuzione reale), un'unica funzione
orchestratrice, scritta una volta e richiamata identica sia sulla copia
sia su PROD vero:

```
eseguiMigrazioneCompleta_(ss, { confermaNome: "<nome esatto del foglio>" })
```

Esegue in sequenza: backfill Fase G (`activity_log_json`), correzione
`columns_json` (§2.1), allineamento schema K/L1 (additivo), migrazione
storica L5 parte 1. Produce un log dettagliato (conteggi per passo,
stesso pattern già usato in `migrateActivityLogData_`) e un confronto
prima/dopo per i casi campione. Il parametro `confermaNome` è un
controllo aggiuntivo economico contro l'errore di eseguire la funzione
sul foglio sbagliato.

**Resta fuori dall'orchestrazione, deliberatamente**:
- **L5 parte 2** (rimozione campi duplicati) — unico passo
  irreversibile, sempre un gesto separato dopo revisione dei risultati.
- **La verifica umana sui casi campione** — l'orchestratrice produce il
  confronto strutturato, il giudizio resta di Marco.

## 5. Sequenza operativa (v2)

| Fase | Contenuto | Chi |
|---|---|---|
| **R0** | Copia Google Sheets di PROD (= backup di sicurezza, un solo passo per due scopi) | Marco |
| **R1** | Punta `SIGMAFLOW_TEST_SPREADSHEET_ID` alla copia | Marco |
| **R2** | Scrivere e testare `eseguiMigrazioneCompleta_` sul TEST sintetico attuale (non ancora sulla copia — prima si collauda la funzione in astratto) | Claude Code |
| **R3** | Eseguire `eseguiMigrazioneCompleta_` sulla copia di PROD | Claude Code, su richiesta esplicita |
| **R4** | Verifica sui casi campione, usando il confronto prima/dopo prodotto | Marco |
| **R5** | Ripristina `SIGMAFLOW_TEST_SPREADSHEET_ID` al TEST originale | Marco |
| **P4** | Decisione su deployment (nuova versione vs aggiornamento dell'esistente) + gestione esplicita della property condivisa (§0.1) | Marco |
| **P5** | Deploy + `eseguiMigrazioneCompleta_` su PROD vero — stessa identica funzione già collaudata in R3 | Claude Code, su richiesta esplicita |
| **P6** | Verifica sui casi campione reali | Marco |
| **P7** | L5 parte 2 — rimozione campi, irreversibile, solo dopo conferma esplicita separata | Claude Code, gate dedicato |
| **P8** | Comunicazione al team sul cambio di comportamento della board (guardia esteso a `done`, rientri diretti bloccati) | Marco |

## 6. Rischi principali (aggiornati)

1. ~~Property di schema condivisa, rischio immediato~~ **Rientrato** —
   il rischio esiste solo al momento del deploy (P4), non prima.
2. **Dati reali, non demo** — mitigato dalla strategia v2 (prova su
   copia reale prima di toccare PROD), ma non azzerato: la copia è
   comunque uno snapshot, PROD potrebbe divergere leggermente al
   momento dell'esecuzione reale se qualcuno riprendesse a lavorarci
   nel frattempo (non previsto, team già fermo).
3. **Confusione tra copia-di-prova e TEST originale** — nuovo rischio
   introdotto dalla strategia v2 stessa: va sempre verificato a quale
   spreadsheet punta `SIGMAFLOW_TEST_SPREADSHEET_ID` prima di ogni
   azione, specialmente tra R1 e R5.
4. **Branch non uniti a `main`** — invariato dalla v1, decisione
   rimandata.
5. **Irreversibilità di L5 parte 2** — invariato, unico passo senza
   rollback "soft".
6. **Comportamento osservabile cambiato per gli utenti** — invariato,
   comunicazione preventiva necessaria (P8).

## 7. Checklist pre-migrazione

- [x] Architettura confermata (§0) — stesso progetto, deploy separato
- [x] `columns_json` reale letto, correzione individuata (§2.1)
- [ ] Copia Google Sheets di PROD creata (R0)
- [ ] `eseguiMigrazioneCompleta_` scritta e testata su TEST sintetico (R2)
- [ ] Prova completa eseguita sulla copia, verificata da Marco (R3-R4)
- [ ] Decisione su deployment presa (P4)
- [ ] Comunicazione al team pianificata (P8)

## 8. Cosa NON è incluso in questo documento

- Non è stata presa nessuna decisione sul merge dei branch a `main`.
- `eseguiMigrazioneCompleta_` non è stata ancora scritta.
- Non è stata toccata né letta direttamente nessuna risorsa PROD.
- Non è stata presa nessuna decisione sulla dismissione del foglio
  `cases`/`refreshCaseVisitCount_`/`markRework`.

---

## Appendice — v1 originale (cronologia, per riferimento)

> Conservata per tracciabilità. Il punto §0 della v1 ipotizzava un
> rischio di contaminazione codice PROD/TEST poi escluso dai
> chiarimenti di Marco (§0 di questo documento). La sequenza operativa
> della v1 (wrapper `*_OnProd()` con dati sintetici) è sostituita dalla
> v2 (§4-5 sopra), non più valida come piano da seguire.

