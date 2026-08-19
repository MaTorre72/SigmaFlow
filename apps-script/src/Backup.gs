// N-B1 (docs/DESIGN_backup.md): backup giornaliero del foglio PROD
// reale. Nato dall'incidente del 2026-08-19 (property ambientale
// SIGMAFLOW_SPREADSHEET_ID rimasta bloccata su TEST) — una rete di
// sicurezza che non dipende dalla correttezza logica del resto del
// sistema.
//
// Nessuna scrittura sul foglio PROD stesso: Spreadsheet.copy() legge
// PROD e crea un file NUOVO altrove, la sorgente non viene mai toccata
// (§2 del design). Nessuna funzione di ripristino automatico esiste qui
// (§6): restaurare da un backup resta sempre un'azione manuale di
// Marco, mai automatizzata.

var BACKUP_FOLDER_NAME = 'SigmaFlow — Backup PROD';

// Restituisce sempre la stessa cartella (idempotente): la crea solo se
// non esiste ancora.
function ensureBackupFolder_() {
  var existing = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (existing.hasNext()) {
    return existing.next();
  }
  return DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

// §4 del design: legge backup_retention_giorni direttamente dal config
// di PROD passato esplicitamente (readConfig_(ss), N-B1) - mai tramite
// la risoluzione ambientale che ha causato l'incidente del 2026-08-19.
// Se il foglio PROD non ha ancora questa chiave in config (schema non
// ancora allineato lì), readConfig_ ricade comunque sul default in
// SIGMAFLOW.DEFAULT_CONFIG - nessuna dipendenza da un allineamento
// schema preventivo su PROD.
function backupRetentionDays_(ss) {
  var days = Number(readConfig_(ss).backup_retention_giorni);
  return (days && days > 0) ? days : Number(SIGMAFLOW.DEFAULT_CONFIG.backup_retention_giorni);
}

// §3 del design: copia integrale del foglio PROD reale, spostata nella
// cartella di backup dedicata. Stesso controllo di sicurezza già usato
// da allineaSchemaSuProd() (Schema.gs) - id e nome verificati
// indipendentemente, si ferma da sola se non corrispondono.
function backupProd_() {
  var ss = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
  if (ss.getName() !== 'SigmaFlow Database') {
    throw new Error('Nome foglio inatteso ("' + ss.getName() + '"), controllo di sicurezza fallito. Nessun backup creato.');
  }

  var today = Utilities.formatDate(new Date(), SIGMAFLOW.TZ, 'yyyy-MM-dd');
  var copy = ss.copy('SigmaFlow Database — backup ' + today);

  // Spreadsheet.copy() crea il file nella cartella radice di Drive -
  // spostarlo nella cartella dedicata è un passo esplicito separato
  // (stesso pattern standard di Apps Script: nessun parametro "cartella"
  // su copy() stesso).
  var file = DriveApp.getFileById(copy.getId());
  var folder = ensureBackupFolder_();
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return { backup_id: copy.getId(), backup_name: copy.getName(), folder_id: folder.getId() };
}

// §3 del design: elimina dalla cartella di backup i file più vecchi
// della soglia di retention - confronta getDateCreated(), mai il nome
// (parsing fragile, §3: "non dipendere da un parsing fragile").
function pruneOldBackups_(retentionDays) {
  var folder = ensureBackupFolder_();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  var deletedNames = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.getDateCreated() < cutoff) {
      file.setTrashed(true);
      deletedNames.push(file.getName());
    }
  }

  return { deleted_count: deletedNames.length, deleted_names: deletedNames };
}

// Handler del trigger giornaliero (N-B3, non ancora installato in
// questa sotto-fase). Backup e pulizia restano due passi indipendenti
// (§3 del design): se la pulizia retention fallisce, il backup appena
// creato con successo resta comunque valido - non è un'unica
// transazione tutto-o-niente. Loggato invece di restituito
// silenziosamente: un trigger a tempo non ha un chiamante interattivo
// che legga il valore di ritorno (stesso principio di
// eseguiArchiviazioneAutomaticaGiornaliera, Kanban.gs).
function eseguiBackupGiornalieroProd() {
  var backupResult;
  try {
    backupResult = backupProd_();
  } catch (err) {
    Logger.log('Backup PROD fallito: ' + err.message);
    throw err;
  }

  try {
    var prodSs = SpreadsheetApp.openById(SIGMAFLOW.DEFAULT_SPREADSHEET_ID);
    var retentionDays = backupRetentionDays_(prodSs);
    var pruneResult = pruneOldBackups_(retentionDays);
    Logger.log(
      'Backup PROD creato: ' + backupResult.backup_name + '. Pulizia retention: ' +
      pruneResult.deleted_count + ' file rimossi (soglia ' + retentionDays + ' giorni).'
    );
    return { backup: backupResult, prune: pruneResult };
  } catch (err) {
    Logger.log('Backup PROD creato (' + backupResult.backup_name + '), ma la pulizia retention e\' fallita: ' + err.message);
    return { backup: backupResult, prune: null, prune_error: err.message };
  }
}

// N-B3 (GATE 🔴 UMANO, docs/DESIGN_backup.md §8): contiene il passo che
// rende il backup un processo che scatta da solo, senza supervisione -
// per questo nessun altro codice di questa sotto-fase la invoca. Va
// eseguita manualmente da Marco dall'editor Apps Script (menu Esegui)
// solo dopo aver verificato manualmente (N-B2) che backupProd_() crea
// davvero una copia corretta del foglio PROD vero. Idempotente: rimuove
// un eventuale trigger preesistente con lo stesso handler prima di
// crearne uno nuovo, stesso pattern di
// installaTriggerArchiviazioneAutomatica (Kanban.gs). Ore 2, non legato
// a livello di codice al trigger di archiviazione (ore 3) - vedi §3 del
// design sul perché.
function installaBackupGiornalieroProd() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'eseguiBackupGiornalieroProd') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  return ScriptApp.newTrigger('eseguiBackupGiornalieroProd')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
}
