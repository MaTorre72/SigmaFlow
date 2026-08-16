# Stato programma: SigmaFlow — Activity Log / Modello caso-visita
Aggiornato: 2026-08-16 10:15

Fase corrente: L2
Titolo: Modello caso/visita — moveJob, regola di apertura/chiusura visita
Branch: `codex/case-visit-model` (da `codex/activity-log-prep-role`)
Documento di riferimento: `DESIGN_modello_caso_visita.md` (sezione 11, sotto-fasi L1-L6)

Stato: IN_ATTESA_GATE_UMANO

Fase J e Fase K: chiuse. L1: chiusa, gate umano confermato da Marco
("verificato, tutto ok" sul foglio `visite` su TEST) prima di avviare L2.

## L1 — riepilogo (chiuso)

Schema additivo: foglio `visite` nuovo e separato (`VISITE_HEADERS`,
sez. 9.2), `cases`/`CASE_HEADERS`/`refreshCaseVisitCount_` invariati,
`incarico_chiuso_ts` aggiunto a `JOB_HEADERS`, `SCHEMA_VERSION` 4->5.
Push su TEST verificato con `clasp pull` + diff (13/13 file identici).
Dettaglio completo nella cronologia del branch (commit `da56212`,
`cedf8fd`).

## L2 — lavoro svolto (da verificare su TEST, poi gate umano)

Ricognizione mirata su `Kanban.gs` prima di scrivere: confermato che il
guardia anti-reingresso-WIP copriva solo provenienza `stand_by` (non
`done`) e che il ramo di marcatura rework copriva anch'esso solo
`stand_by`, esattamente come segnalato nell'audit L1.

Implementata la regola di apertura/chiusura visita (sez. 2 del
documento di design) in `moveJob` (`Kanban.gs`):

- **Guardia anti-reingresso-WIP esteso**: ora blocca il rientro diretto
  a WIP sia da `stand_by` sia da `done` (prima solo da `stand_by`).
  Normalizzato a confrontare `targetColumn.role === 'wip'` invece del
  solo id letterale `'wip'`, per coerenza con il resto del codice.
- **Chiusura/apertura visita**: qualunque spostamento con provenienza
  `stand_by` o `done` verso `backlog` o `prep` chiude la visita aperta
  (`chiusura_ts`, `chiusura_tipo` = colonna di provenienza) e ne apre
  una nuova (`apertura_ts` = ora, `rework_cause` = `chiusura_tipo`
  della precedente). Uno spostamento tra due colonne di attesa diverse,
  o l'ingresso in `done`, non apre/chiude nulla — la visita resta
  aperta.
- **`consegna_ts`**: si valorizza al primo ingresso in una colonna di
  ruolo `done` entro la visita aperta; non la chiude (la card puo'
  ancora rientrare).
- **Accumulatori per tipo** (`t_cliente_d`/`t_ente_d`/`t_interno_d`):
  incrementati ad ogni uscita da una colonna `stand_by`, qualunque sia
  la destinazione, cercando l'ingresso nella colonna lasciata
  all'indietro nel log (stesso principio di `computeFrom_`, non
  toccato). Mappa fissa colonna->campo aggiunta in `Constants.gs`
  (`SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS`), sugli stessi tre id gia'
  assunti da `REWORK_CAUSES`.
- **Scrittura su `visite` in aggiunta a `jobs`**: la mutazione in-place
  esistente su `jobs` (start_ts/incarico_ts/prep_ts/done_ts/ecc.) resta
  invariata, non ancora rimossa (previsto solo in L5). `visite` si
  aggiorna in parallelo.
- **Bootstrap visita mancante**: i job creati prima di questa sessione
  non hanno ancora una riga in `visite` (la materializzazione storica e'
  L5, non ancora eseguita). Per non bloccare gli spostamenti nel
  frattempo, `moveJob` crea al volo una visita aperta minima se non ne
  trova una per il job — verra' sovrascritta dalla migrazione storica
  autorevole di L5. **Assunzione non esplicitata nel documento di
  design, segnalata qui per visibilita': da confermare o correggere.**
- `ensureCurrentSchema_()` aggiunto in testa a `moveJob` (mancava,
  presente solo in `getBoard()`): garantisce che il foglio `visite`
  esista anche se `moveJob` viene chiamato senza un caricamento board
  precedente.

**Esplicitamente fuori scope in questa sotto-fase** (non implementato):
l'avviso "incarico risulta chiuso" (sez. 3) quando si sposta verso
lavoro attivo un caso con `incarico_chiuso_ts` gia' valorizzato — non
elencato tra i punti che L2 doveva coprire (guardia esteso, regola
apertura/chiusura, accumulatori, consegna_ts) e richiederebbe una
modifica frontend non prevista in questa sessione.

`addJob`, `ActivityLog.gs`, `Model.gs`: non toccati, come richiesto.

## Test dedicati aggiunti (Tests.gs)

7 nuovi test, tutti verificati con l'harness Node (48/48 passati,
nessuna regressione sui 41 preesistenti):

- `testVisitWipToWipDoesNotOpenNewVisit` — wip->wip non apre nulla
- `testVisitStandByReentryOpensNewVisit` — ciclo attesa->rientro apre
  una nuova visita, con chiusura_tipo/rework_cause coerenti
- `testVisitDoneReentryTreatedLikeStandBy` — rientro da done trattato
  come da stand_by (chiude/apre visita, visit_number su jobs coerente)
- `testDoneCannotReturnDirectlyToWip` — guardia esteso verificato
- `testVisitConsegnaTsSetOnDoneWithoutClosingVisit` — consegna_ts si
  valorizza senza chiudere la visita
- `testVisitAccumulatesWaitTimeOnStandByExit` — accumulatore per tipo
  si aggiorna sull'uscita da un'attesa
- `testVisitStandByToStandByDoesNotOpenNewVisit` — spostamento tra due
  attese diverse non apre una nuova visita, accumulatore comunque
  aggiornato

`resetTestDatabase_` esteso per creare/pulire anche il foglio `visite`
tra un test e l'altro (mancava, avrebbe lasciato righe residue).

## Verifica

- Suite test completa: **48/48 passati** (41 preesistenti + 7 nuovi),
  nessuna regressione.
- Push su TEST: **eseguito e verificato**. `clasp pull` in directory
  isolata + diff riga per riga contro i sorgenti locali per tutti i 13
  file — **identici**, nessuna divergenza. La logica L2 e' ora live sul
  progetto Apps Script TEST.

## Prossimo passo

1. **Gate umano**: Marco verifica su TEST che gli spostamenti sulla
   board si comportino come atteso (in particolare: rientro da
   `done`/`stand_by` verso `backlog`/`prep` blocca ancora la card come
   prima visivamente, ma ora apre una nuova riga in `visite`), e
   **decide sull'assunzione di bootstrap segnalata sopra** (visita
   creata al volo per i job pre-esistenti) prima di procedere a L3
   (`ActivityLog.gs`: allineamento sulla visita aperta) — sessione
   Claude Code separata, non questa.

Nessuna scrittura su PROD.
