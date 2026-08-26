// Harness Node minimale per eseguire la logica reale dei file .gs di SigmaFlow
// fuori da Apps Script, mockando SpreadsheetApp/PropertiesService/Utilities.
// Serve a verificare davvero il comportamento (non a occhio) quando clasp run
// non e' disponibile. Non sostituisce runAllTestsAndLog nel vero ambiente GAS,
// e non richiede alcuna credenziale: puo' girare sia in locale sia in una
// sessione cloud che ha solo il checkout del repository.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_DIR = path.join(__dirname, '..', 'src');

function pad(n, len) { return String(n).padStart(len || 2, '0'); }

function formatDate(date, tz, pattern) {
  // Implementazione semplificata: ignora la vera conversione di timezone
  // (sufficiente per verificare la logica, non la resa visuale esatta).
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const h = date.getHours(), mi = date.getMinutes(), s = date.getSeconds();
  if (pattern === 'yyyyMMdd') { return '' + y + pad(mo) + pad(d); }
  if (pattern === 'yyyyMMdd-HHmmss') { return '' + y + pad(mo) + pad(d) + '-' + pad(h) + pad(mi) + pad(s); }
  if (pattern === 'yyyy-MM-dd') { return y + '-' + pad(mo) + '-' + pad(d); }
  if (pattern === 'yyyy-MM') { return y + '-' + pad(mo); }
  if (pattern === 'MM/yyyy') { return pad(mo) + '/' + y; }
  // default: "yyyy-MM-dd'T'HH:mm:ssXXX"
  return y + '-' + pad(mo) + '-' + pad(d) + 'T' + pad(h) + ':' + pad(mi) + ':' + pad(s) + '+02:00';
}

class Range {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet; this.row = row; this.col = col;
    this.numRows = numRows || 1; this.numCols = numCols || 1;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowIdx = this.row + r - 1;
      const rowArr = [];
      for (let c = 0; c < this.numCols; c++) {
        rowArr.push(this.sheet._get(rowIdx, this.col + c - 1));
      }
      out.push(rowArr);
    }
    return out;
  }
  getValue() { return this.sheet._get(this.row - 1, this.col - 1); }
  setValues(values) {
    values.forEach((rowArr, r) => {
      rowArr.forEach((val, c) => {
        this.sheet._set(this.row - 1 + r, this.col - 1 + c, val);
      });
    });
  }
  setValue(value) { this.sheet._set(this.row - 1, this.col - 1, value); }
  getRow() { return this.row; }
  // O3 (DESIGN_performance.md): mock minimale della vera TextFinder API
  // (Range.createTextFinder), usata da findOpenVisitRow_ (Kanban.gs) al
  // posto di una scansione manuale in JS di tutta la colonna job_id.
  createTextFinder(text) { return new TextFinder(this, text); }
}

class TextFinder {
  constructor(range, text) {
    this.range = range;
    this.text = String(text);
    this._matchEntireCell = false;
  }
  matchEntireCell(value) { this._matchEntireCell = Boolean(value); return this; }
  findAll() {
    const values = this.range.getValues();
    const results = [];
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        const cell = values[r][c];
        const matched = this._matchEntireCell
          ? String(cell) === this.text
          : String(cell).indexOf(this.text) !== -1;
        if (matched) {
          results.push(new Range(this.range.sheet, this.range.row + r, this.range.col + c, 1, 1));
        }
      }
    }
    return results;
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.data = []; // array di array, riga 0 = header se presente
  }
  _ensureSize(row, col) {
    while (this.data.length <= row) { this.data.push([]); }
    while (this.data[row].length <= col) { this.data[row].push(''); }
  }
  _get(row, col) {
    if (!this.data[row]) { return ''; }
    return this.data[row][col] === undefined ? '' : this.data[row][col];
  }
  _set(row, col, value) {
    this._ensureSize(row, col);
    this.data[row][col] = value;
  }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.length ? Math.max(...this.data.map(r => r.length)) : 0; }
  getRange(row, col, numRows, numCols) { return new Range(this, row, col, numRows, numCols); }
  getDataRange() { return new Range(this, 1, 1, this.data.length, this.getLastColumn()); }
  appendRow(arr) { this.data.push(arr.slice()); }
  deleteRow(row) { this.data.splice(row - 1, 1); }
  setFrozenRows() {}
  clear() { this.data = []; }
}

class MockSpreadsheet {
  constructor(id) { this.id = id; this.name = id; this.sheets = {}; }
  getId() { return this.id; }
  getName() { return this.name; }
  getUrl() { return 'mock://' + this.id; }
  getSheetByName(name) { return this.sheets[name] || null; }
  insertSheet(name) { const s = new MockSheet(name); this.sheets[name] = s; return s; }
  deleteSheet(sheet) {
    const name = sheet && sheet.getName ? sheet.getName() : sheet;
    delete this.sheets[name];
  }
}

// N-B1 (DESIGN_backup.md): mock minimale di Drive - solo cio' che
// backupProd_()/pruneOldBackups_() usano davvero (file, cartelle,
// getDateCreated/setTrashed, iteratori hasNext/next come la vera API).
// Nessuna persistenza reale, nessuna chiamata di rete: un test che apre
// SIGMAFLOW.DEFAULT_SPREADSHEET_ID qui crea solo un oggetto in memoria
// per la durata del processo Node, mai il vero foglio PROD.
class MockDriveFile {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.created = new Date();
    this.trashed = false;
  }
  getId() { return this.id; }
  getName() { return this.name; }
  getDateCreated() { return this.created; }
  setTrashed(value) { this.trashed = Boolean(value); return this; }
  isTrashed() { return this.trashed; }
}

class MockDriveFolder extends MockDriveFile {
  constructor(id, name) {
    super(id, name);
    this.fileIds = new Set();
  }
}

function createHarness() {
  const spreadsheets = {};
  const scriptProperties = {};
  const driveFiles = {}; // id -> MockDriveFile | MockDriveFolder

  function driveIterator(items) {
    let idx = 0;
    return { hasNext: () => idx < items.length, next: () => items[idx++] };
  }

  const rootFolder = new MockDriveFolder('drive-root', 'Il mio Drive');
  driveFiles[rootFolder.getId()] = rootFolder;

  const DriveApp = {
    createFolder(name) {
      const folder = new MockDriveFolder('drive-folder-' + Object.keys(driveFiles).length, name);
      driveFiles[folder.getId()] = folder;
      return folder;
    },
    getFoldersByName(name) {
      return driveIterator(Object.keys(driveFiles)
        .map(id => driveFiles[id])
        .filter(f => f instanceof MockDriveFolder && f.getName() === name));
    },
    getFileById(id) { return driveFiles[id] || null; },
    getRootFolder() { return rootFolder; }
  };
  // addFile/removeFile/getFoldersByName/createFolder/getParents sul
  // prototipo di MockDriveFile/MockDriveFolder: hanno bisogno di
  // driveFiles per risolvere gli id, quindi definiti qui dentro
  // createHarness() invece che nella dichiarazione di classe sopra.
  MockDriveFolder.prototype.addFile = function(file) { this.fileIds.add(file.getId()); return this; };
  MockDriveFolder.prototype.removeFile = function(file) { this.fileIds.delete(file.getId()); return this; };
  MockDriveFolder.prototype.getFiles = function() {
    return driveIterator(Array.from(this.fileIds).map(id => driveFiles[id]).filter(Boolean));
  };
  // Sottocartelle dirette di questa cartella (non una ricerca globale su
  // Drive come DriveApp.getFoldersByName) - stessa semantica della vera
  // API Folder.getFoldersByName.
  MockDriveFolder.prototype.getFoldersByName = function(name) {
    return driveIterator(Array.from(this.fileIds)
      .map(id => driveFiles[id])
      .filter(f => f instanceof MockDriveFolder && f.getName() === name));
  };
  // Crea una cartella FIGLIA di questa (Folder.createFolder della vera
  // API, distinto da DriveApp.createFolder che non traccia un genitore).
  MockDriveFolder.prototype.createFolder = function(name) {
    const folder = new MockDriveFolder('drive-folder-' + Object.keys(driveFiles).length, name);
    driveFiles[folder.getId()] = folder;
    this.fileIds.add(folder.getId());
    return folder;
  };
  // Cartelle che contengono questo file in questo momento (File.getParents()
  // della vera API) - ricerca lineare su driveFiles, sufficiente per il
  // volume minuscolo di oggetti che un test crea.
  MockDriveFile.prototype.getParents = function() {
    const id = this.getId();
    return driveIterator(Object.keys(driveFiles)
      .map(k => driveFiles[k])
      .filter(f => f instanceof MockDriveFolder && f.fileIds.has(id)));
  };
  // Sottocartelle dirette di questa cartella (non una ricerca globale su
  // Drive come DriveApp.getFoldersByName) - stessa semantica della vera
  // API Folder.getFoldersByName.
  MockDriveFolder.prototype.getFoldersByName = function(name) {
    return driveIterator(Array.from(this.fileIds)
      .map(id => driveFiles[id])
      .filter(f => f instanceof MockDriveFolder && f.getName() === name));
  };
  // Crea una cartella FIGLIA di questa (Folder.createFolder della vera
  // API, distinto da DriveApp.createFolder che non traccia un genitore).
  MockDriveFolder.prototype.createFolder = function(name) {
    const folder = new MockDriveFolder('drive-folder-' + Object.keys(driveFiles).length, name);
    driveFiles[folder.getId()] = folder;
    this.fileIds.add(folder.getId());
    return folder;
  };

  const SpreadsheetApp = {
    openById(id) {
      if (!spreadsheets[id]) {
        spreadsheets[id] = new MockSpreadsheet(id);
        // N-B1: ogni foglio e' anche un file Drive - il backup deve poter
        // risalire alla sua cartella genitore (DriveApp.getFileById(id).
        // getParents()). Di default vive nella radice, come qualunque
        // file appena aperto per la prima volta senza un genitore noto -
        // un test puo' spostarlo esplicitamente altrove.
        if (!driveFiles[id]) {
          const file = new MockDriveFile(id, id);
          driveFiles[id] = file;
          rootFolder.addFile(file);
        }
      }
      return spreadsheets[id];
    },
    getActiveSpreadsheet() { return null; },
    flush() {} // mock sincrono: nulla da forzare, no-op
  };

  // Spreadsheet.copy(name) - copia integrale di tutti i fogli (stesso
  // principio della vera API: nuovo id, nuovo file Drive, sorgente
  // invariata), registrata anche come MockDriveFile nella cartella
  // radice - stesso punto di partenza della vera API prima di uno
  // spostamento esplicito in una cartella dedicata.
  MockSpreadsheet.prototype.copy = function(name) {
    const newId = 'copy-' + Object.keys(spreadsheets).length + '-' + Math.random().toString(36).slice(2, 8);
    const copySs = new MockSpreadsheet(newId);
    copySs.name = name;
    Object.keys(this.sheets).forEach(sheetName => {
      const src = this.sheets[sheetName];
      const dst = copySs.insertSheet(sheetName);
      dst.data = src.data.map(row => row.slice());
    });
    spreadsheets[newId] = copySs;
    const file = new MockDriveFile(newId, name);
    driveFiles[newId] = file;
    rootFolder.addFile(file);
    return copySs;
  };

  const PropertiesService = {
    getScriptProperties() {
      return {
        getProperty(key) { return scriptProperties[key] !== undefined ? scriptProperties[key] : null; },
        setProperty(key, value) { scriptProperties[key] = value; },
        deleteProperty(key) { delete scriptProperties[key]; }
      };
    }
  };

  // P2 (DESIGN_lock_ambiente.md): il mock e' un no-op per definizione
  // (Node e' single-thread, non c'e' vera concorrenza da mediare), ma
  // conta le acquisizioni per permettere ai test di verificare
  // direttamente QUALI azioni prendono il lock globale — il vero
  // meccanismo introdotto da P2, non simulabile con una gara di
  // concorrenza reale in questo harness.
  const sfLockState = { waitCalls: 0 };
  const LockService = {
    getScriptLock() {
      return { waitLock() { sfLockState.waitCalls++; }, releaseLock() {} };
    }
  };

  const Utilities = {
    formatDate,
    getUuid() { return 'uuid-' + Math.random().toString(36).slice(2, 10); },
    sleep() {},
    // Solo la parte usata da Diagnostica.gs (byteLength_ via
    // newBlob(str).getBytes().length): Buffer.byteLength con encoding
    // 'utf8' ha la stessa semantica del conteggio byte reale di Apps
    // Script per una stringa di testo.
    newBlob(data) {
      return { getBytes() { return { length: Buffer.byteLength(String(data), 'utf8') }; } };
    }
  };

  const ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput(text) {
      return { text, setMimeType() { return this; } };
    }
  };

  const Logger = { log(msg) { console.log('[Logger]', msg); } };

  const HtmlService = { createHtmlOutputFromFile() { return { getContent() { return ''; } }; } };

  const context = {
    console,
    SpreadsheetApp, PropertiesService, LockService, Utilities, ContentService, HtmlService, Logger, DriveApp,
    Math, Date, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat,
    __sfLockState: sfLockState
  };
  vm.createContext(context);

  const files = ['Constants.gs', 'Schema.gs', 'Utils.gs', 'ActivityLog.gs', 'Model.gs', 'Kanban.gs', 'Backup.gs', 'Tests.gs'];
  files.forEach(file => {
    const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  });

  return { context, spreadsheets, scriptProperties };
}

module.exports = { createHarness };
