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

function createHarness() {
  const spreadsheets = {};
  const scriptProperties = {};

  const SpreadsheetApp = {
    openById(id) {
      if (!spreadsheets[id]) { spreadsheets[id] = new MockSpreadsheet(id); }
      return spreadsheets[id];
    },
    getActiveSpreadsheet() { return null; },
    flush() {} // mock sincrono: nulla da forzare, no-op
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

  const LockService = {
    getScriptLock() {
      return { waitLock() {}, releaseLock() {} };
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
    SpreadsheetApp, PropertiesService, LockService, Utilities, ContentService, HtmlService, Logger,
    Math, Date, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat
  };
  vm.createContext(context);

  const files = ['Constants.gs', 'Schema.gs', 'Utils.gs', 'ActivityLog.gs', 'Model.gs', 'Kanban.gs', 'Tests.gs'];
  files.forEach(file => {
    const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  });

  return { context, spreadsheets, scriptProperties };
}

module.exports = { createHarness };
