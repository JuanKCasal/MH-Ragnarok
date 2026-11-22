/**
 * Simulador mínimo de los servicios de Google Apps Script para probar apps-script/*.gs en Node.
 * Solo implementa lo que usa el backend.
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const firmados = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const aBuffer = (bytes) => Buffer.from(bytes.map((b) => (b + 256) % 256));

class Rango {
  constructor(hoja, f, c, nf, nc) { Object.assign(this, { hoja, f, c, nf, nc }); }
  getValues() {
    return Array.from({ length: this.nf }, (_, i) =>
      Array.from({ length: this.nc }, (_, j) => this.hoja.celdas[this.f - 1 + i]?.[this.c - 1 + j] ?? ''));
  }
  setValues(v) {
    v.forEach((fila, i) => fila.forEach((x, j) => {
      const r = this.f - 1 + i;
      this.hoja.celdas[r] = this.hoja.celdas[r] || [];
      this.hoja.celdas[r][this.c - 1 + j] = x;
    }));
    return this;
  }
  setFontWeight() { return this; }
  setNumberFormat() { return this; }
}

class Hoja {
  constructor(nombre) { this.nombre = nombre; this.celdas = []; }
  getName() { return this.nombre; }
  getLastRow() {
    for (let i = this.celdas.length - 1; i >= 0; i--) if ((this.celdas[i] || []).some((x) => x !== '' && x != null)) return i + 1;
    return 0;
  }
  getMaxRows() { return 1000; }
  getRange(f, c, nf = 1, nc = 1) { return new Rango(this, f, c, nf, nc); }
  appendRow(fila) { this.celdas[this.getLastRow()] = [...fila]; }
  deleteRow(f) { this.celdas.splice(f - 1, 1); }
  setFrozenRows() {}
  setTabColor() {}
}

class Libro {
  constructor(id) { this.id = id; this.hojas = [new Hoja('Hoja 1')]; }
  getId() { return this.id; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; }
  getSheetByName(n) { return this.hojas.find((h) => h.nombre === n) || null; }
  insertSheet(n) { const h = new Hoja(n); this.hojas.push(h); return h; }
  getSheets() { return this.hojas; }
  deleteSheet(h) { this.hojas = this.hojas.filter((x) => x !== h); }
}

export function crearEntorno() {
  const libros = {};
  const props = {};
  const cache = {};
  const archivos = {};
  const carpetas = {};

  const globals = {
    console: { log() {}, warn() {}, error: (...a) => globals.__errores.push(a) },
    __errores: [],
    SpreadsheetApp: {
      create() { const id = 'sheet_' + crypto.randomUUID(); return (libros[id] = new Libro(id)); },
      openById(id) { if (!libros[id]) throw new Error('No existe ' + id); return libros[id]; },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cache ? cache[k] : null),
        put: (k, v) => { cache[k] = String(v); },
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (alg, txt) => firmados(crypto.createHash(alg).update(String(txt), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => firmados(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()),
      base64Encode: (bytes) => aBuffer(bytes).toString('base64'),
      base64Decode: (s) => {
        if (!/^[A-Za-z0-9+/=\s]*$/.test(s)) throw new Error('base64 inválido');
        return firmados(Buffer.from(s, 'base64'));
      },
      newBlob: (bytes, mime, nombre) => ({ bytes, mime, nombre }),
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      createFolder(n) { const id = 'carpeta_' + crypto.randomUUID(); carpetas[id] = n; return { getId: () => id }; },
      getFolderById(id) {
        if (!carpetas[id]) throw new Error('No existe carpeta');
        return {
          createFile(blob) {
            const fid = 'img_' + crypto.randomUUID().slice(0, 8);
            archivos[fid] = { ...blob, compartido: null, papelera: false };
            return { getId: () => fid, setSharing(a, p) { archivos[fid].compartido = a + ':' + p; } };
          },
        };
      },
      getFileById(id) { return { setTrashed(v) { archivos[id].papelera = v; } }; },
    },
  };

  const ctx = vm.createContext(globals);
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../apps-script');
  // Mismo orden que en el editor (alfabético); el código no depende del orden porque todo corre en tiempo de petición.
  const fuentes = fs.readdirSync(dir).filter((f) => f.endsWith('.gs')).sort()
    .map((f) => `// ${f}\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  vm.runInContext(fuentes + '\n;globalThis.__ApiError = ApiError;', ctx, { filename: 'apps-script.gs' });

  // En Apps Script cada petición es una ejecución nueva: se limpian las variables globales de memoria.
  const reiniciarMemo = () => { vm.runInContext('memoTablas_ = {}; libro_ = null;', ctx); };
  const get = (params) => { reiniciarMemo(); return JSON.parse(ctx.doGet({ parameter: params }).getContent()); };
  const post = (accion, datos = {}, token) => {
    reiniciarMemo();
    return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ accion, token, datos }) } }).getContent());
  };

  return { ctx, get, post, props, archivos, libros, reiniciarMemo, run: (code) => vm.runInContext(code, ctx) };
}
