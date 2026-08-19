# SigmaFlow — Backup giornaliero di PROD (design)

> Nasce dall'incidente del 2026-08-19 (vedi `PROGRAMMA_STATO.md`): la
> Script Property condivisa `SIGMAFLOW_SPREADSHEET_ID` è rimasta
> bloccata su TEST dopo un'esecuzione di test interrotta a metà, e per
> qualche tempo la webapp PROD ha mostrato dati di TEST. Nessun dato
> reale è stato toccato — ma l'episodio ha reso evidente che
> un'automazione non presidiata (il trigger di archiviazione, N3) può
> sbagliare ambiente in modi che il codice applicativo da solo non
> intercetta sempre. Un backup non dipende dalla correttezza logica del
> resto del sistema: è la rete di sicurezza indipendente.

---

## 1. Perché, e perché non è urgente quanto sembra

L'archiviazione automatica (N3) **è installata solo su TEST** — PROD
non ha oggi nessun trigger automatico attivo, quindi non c'è al
momento un'automazione notturna che tocchi PROD. Questo backup non
"ripara" un rischio già in corso: **prepara la rete di sicurezza prima
che un domani si decida di estendere qualunque automazione a PROD**,
così quella decisione non debba aspettare che il backup esista ancora
da costruire.

## 2. Cosa si salva, e cosa no

- **Solo PROD.** TEST è rigenerabile in qualunque momento
  (`setupSigmaFlow()`, `seedTestData`, le migrazioni) — non vale la
  spesa di Drive/tempo di eseguire di conservarne backup automatici.
- **L'intero file Spreadsheet**, non singoli fogli: `Spreadsheet.copy()`
  produce una copia integrale (tutti i fogli, dati e formattazione) in
  un colpo solo — più semplice e più sicuro di ricostruire un
  sottoinsieme di fogli riga per riga.
- **Nessuna scrittura sul foglio PROD stesso.** `copy()` legge PROD e
  crea un file *nuovo* altrove — la sorgente non viene mai modificata.
  Non è quindi una "scrittura su PROD" nel senso vietato da CLAUDE.md,
  ma resta un accesso diretto al foglio PROD reale: stessa cautela già
  usata da `allineaSchemaSuProd()` (Schema.gs) — verifica indipendente
  di `id`+`nome` prima di procedere, si ferma da sola se non
  corrispondono.

## 3. Meccanismo

- `backupProd_()` — apre `SIGMAFLOW.DEFAULT_SPREADSHEET_ID` (l'id reale
  di PROD, **mai** l'ambiente ambientale via `getSpreadsheet_()` —
  proprio l'errore corretto oggi in `archiveEligibleJobs_()`, qui
  evitato dall'inizio invece che scoperto più tardi), verifica
  `ss.getName() === 'SigmaFlow Database'`, poi `ss.copy('SigmaFlow Database — backup ' + oggi)`
  dentro una cartella dedicata (`ensureBackupFolder_()`, nome
  **"SigmaFlow — Backup PROD"**, creata se assente). **Decisione di
  Marco**: questa cartella vive **nella stessa cartella Drive del
  foglio PROD reale** (`prodParentFolder_()` — risale al genitore del
  file tramite `DriveApp.getFileById(ss.getId()).getParents()`), non un
  id fisso da tenere sincronizzato a mano — se il foglio PROD viene
  spostato, il backup lo segue automaticamente. Fallback alla radice di
  Drive solo nel caso limite (non atteso) in cui il file non abbia
  nessun genitore.
- `pruneOldBackups_()` — nella stessa cartella, elimina i file più
  vecchi di `backup_retention_giorni` (config, **default 14**, stesso
  pattern di `archiviazione_giorni_default`), confrontando
  `file.getDateCreated()` — non il nome, per non dipendere da un
  parsing fragile.
- `eseguiBackupGiornalieroProd()` — handler del trigger: chiama le due
  funzioni sopra in sequenza, logga l'esito (`Logger.log`, stesso
  principio di `eseguiArchiviazioneAutomaticaGiornaliera`: un trigger
  non ha un chiamante interattivo che legga il valore di ritorno). Un
  fallimento nella pulizia retention non deve invalidare un backup
  appena creato con successo — due passi indipendenti, non un'unica
  transazione tutto-o-niente.
- **Trigger separato da quello di archiviazione**, non lo stesso
  handler: l'esito dell'uno non deve dipendere da quello dell'altro.
  Orario proposto **ore 2** (`atHour(2)`, archiviazione resta ore 3) —
  stessa granularità già in uso per l'archiviazione: l'API dei trigger
  a tempo di Apps Script garantisce solo l'ora, non il minuto esatto
  (il trigger N3 doveva scattare "alle 3:00" ed è effettivamente
  scattato alle 03:28:53). Un'ora di margine è sufficiente a dare al
  backup buone probabilità di finire prima delle 3, ma i due
  meccanismi restano **non legati a livello di codice** — nessuna
  garanzia d'ordine assoluta, per design.

## 4. Config additivo

- `backup_retention_giorni` — numero di giorni di backup da conservare.
  Default **14**, modificabile. Stesso foglio `config`, stesso pattern
  di `archiviazione_giorni_default` — ma **letto direttamente dal
  config di PROD** (`SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID)`),
  non tramite `readConfig_()` ambientale, per lo stesso motivo del §3.

## 5. Scope OAuth — nuovo, da anticipare (precedente: N3)

`Spreadsheet.copy()` e la gestione dei file nella cartella di backup
richiedono uno scope Drive non ancora presente in `appsscript.json`
(oggi: `spreadsheets`, `script.container.ui`, `script.scriptapp`).

**Tentativo iniziale, insufficiente — trovato al primo tentativo reale
su TEST (N-B2, 2026-08-19)**: `https://www.googleapis.com/auth/drive.file`,
il più stretto dei due possibili, sembrava sufficiente in fase di
design. Non lo è: `drive.file` copre solo i file che lo script *crea o
apre esplicitamente* (le copie di backup stesse), **non** un file
preesistente aperto per id come il vero foglio PROD — e
`prodParentFolder_()` (§3, decisione presa durante N-B2 di risalire
alla cartella del foglio PROD invece di un id fisso) chiama proprio
`DriveApp.getFileById(ss.getId())` su quel file preesistente. Fallito
con `Specified permissions are not sufficient to call
DriveApp.getFileById`. **Corretto**: scope allargato a
**`https://www.googleapis.com/auth/drive`** (accesso completo) — non
esiste una via di mezzo che copra sia "leggi i metadati di un file
Drive arbitrario non creato da questo script" sia "crea/sposta file",
serve il pieno accesso. **Esattamente lo stesso tipo di sorpresa già
capitato in N3** (scope
`script.scriptapp` mancante, trovato solo al primo tentativo reale su
GAS, non rilevabile dall'harness Node) — qui anticipato in fase di
design apposta per non ripeterlo: quando Marco eseguirà per la prima
volta una funzione di questo programma, **aspettati la richiesta di
consenso Google per il nuovo scope**, esattamente come per N3.

## 6. Restore — deliberatamente manuale, mai automatizzato

Nessuna funzione di ripristino automatico: restaurare da un backup è
un'azione distruttiva quanto sbagliare quale backup restaurare, e
merita lo stesso livello di attenzione umana di qualunque altra
scrittura su PROD. Procedura operativa (da eseguire sempre da Marco):
individuare la copia giusta nella cartella "SigmaFlow — Backup PROD"
(nome = data), aprirla, e decidere manualmente come riportarla in uso
(rinomina/sostituzione dell'id in `DEFAULT_SPREADSHEET_ID` è un cambio
di codice a parte, fuori da questo programma). Non in scope da N-B1 a N-B3.

## 7. Fuori scope, per ora

- Notifica via email in caso di fallimento del trigger (`MailApp`,
  nuovo scope aggiuntivo) — utile ma non necessario alla v1; il log
  (`Logger.log` + Esecuzioni dell'editor Apps Script) resta l'unico
  canale, come già per l'archiviazione. Da riconsiderare se il backup
  fallisce silenziosamente più di una volta in uso reale.
- Backup di TEST (§2).
- Qualunque automazione di restore (§6).

---

## 8. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Gate |
|---|---|---|
| **N-B1** | Config additivo (`backup_retention_giorni`); `backupProd_()`, `pruneOldBackups_()`, `eseguiBackupGiornalieroProd()`; scope Drive in `appsscript.json`; test (harness Node, spreadsheet "PROD-like" mockato — **mai il vero PROD**, stesso principio di `allineaSchemaSuProd()` mai testata su dati reali dall'harness) | — |
| **N-B2** | Primo backup reale — **eseguito da Marco stesso**, mai da Claude (regola assoluta di CLAUDE.md: qualunque azione che tocca PROD, anche solo in lettura per una funzione mai provata prima su dati veri, resta riservata a Marco), da editor Apps Script eseguendo `eseguiBackupGiornalieroProd()` (non `backupProd_()` da sola: logga un esito leggibile ed è la funzione esatta che il trigger chiamerà in N-B3 — la pulizia retention che contiene in più non fa nulla sulla cartella ancora vuota), verificando che la copia compaia nella cartella Drive col nome atteso | 🔴 Umano |
| **N-B3** | Installazione del trigger a tempo (`installaBackupGiornalieroProd()`, stesso pattern idempotente di `installaTriggerArchiviazioneAutomatica`) — **eseguita da Marco**, solo dopo N-B2 confermato | 🔴 Umano |

N-B2 e N-B3 possono essere fatte da Marco nella stessa sessione, una dopo
l'altra — restano comunque due gate distinti nella tabella perché sono
due decisioni separate (verificare che funzioni vs. lasciarlo scattare
da solo), stesso principio già applicato in N3 (§9 di
`DESIGN_archiviazione.md`).

---

## 9. Criteri di accettazione

- [x] `backupProd_()` verifica `id`+`nome` di PROD indipendentemente
      prima di procedere, si ferma da sola se non corrispondono (stesso
      pattern di `allineaSchemaSuProd()`) (N-B1)
- [x] La copia creata è nella cartella Drive dedicata, con nome che
      include la data (N-B1)
- [x] `pruneOldBackups_()` elimina solo i file più vecchi della
      soglia configurata, mai quelli entro la soglia (N-B1)
- [x] Un fallimento nella pulizia retention non impedisce che un
      backup valido, già creato, resti disponibile (N-B1)
- [x] Il trigger di backup è **separato** da quello di archiviazione
      (handler diverso, nessuna dipendenza di codice fra i due) (N-B1)
- [x] Nessuna funzione di questo programma scrive mai sul foglio PROD
      stesso (solo letture + creazione di file nuovi altrove) (N-B1)
- [x] Il primo backup reale è eseguito da Marco, mai da Claude —
      confermato il 2026-08-19 ("tutto perfetto") dopo la correzione
      dello scope OAuth (N-B2)
- [x] L'installazione del trigger è eseguita da Marco, mai da Claude —
      confermato il 2026-08-19 (N-B3)
- [x] Nessuna funzione di ripristino automatico esiste nel codice (§6)

## Gate 🔴 UMANO

Come da tabella §8 — dopo N-B2 (prima esecuzione reale su PROD, mai
automatizzabile) e dopo N-B3 (installazione del trigger). Stesso
principio di `DESIGN_archiviazione.md`: un'automazione non presidiata
che tocca dati reali merita verifica umana esplicita prima di essere
lasciata scattare da sola.
