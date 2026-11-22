/** Utilidades comunes del backend MH-Ragnarok. */

class ApiError extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function fallar_(codigo, mensaje) {
  throw new ApiError(codigo, mensaje);
}

function ahoraIso_() {
  return new Date().toISOString();
}

/** ID corto aleatorio (base36, 10 caracteres, 48 bits). */
function nuevoId_() {
  var hex = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16).toString(36).padStart(10, '0');
}

function prop_(clave) {
  return PropertiesService.getScriptProperties().getProperty(clave);
}

function setProp_(clave, valor) {
  PropertiesService.getScriptProperties().setProperty(clave, String(valor));
}

function bytesAHex_(bytes) {
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function sha256Hex_(texto) {
  return bytesAHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8));
}

/** Texto recortado y sin caracteres de control. */
function limpiarTexto_(valor, max) {
  if (valor === null || valor === undefined) return '';
  var s = String(valor).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return max ? s.slice(0, max) : s;
}

function enumValido_(valor, permitidos, campo) {
  if (permitidos.indexOf(valor) === -1) fallar_('DATO_INVALIDO', 'Valor no válido para ' + campo);
  return valor;
}

function numeroValido_(valor, min, max, campo, opcional) {
  if ((valor === '' || valor === null || valor === undefined) && opcional) return '';
  var n = Number(valor);
  if (!isFinite(n) || n < min || n > max) fallar_('DATO_INVALIDO', 'Número fuera de rango en ' + campo);
  return Math.round(n);
}

function slug_(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || nuevoId_();
}

/** Copia solo las claves permitidas. */
function elegir_(obj, claves) {
  var out = {};
  claves.forEach(function (k) { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

var ARMAS = ['great_sword', 'long_sword', 'dual_blades', 'hammer', 'charge_blade', 'lance', 'heavy_bowgun', 'bow'];
var ELEMENTOS = ['fire', 'water', 'thunder', 'ice', 'dragon', 'none'];
var TIPOS_ADV = ['assault', 'disruptor', 'support'];
var NIVEL_ROL = { miembro: 1, oficial: 2, admin: 3 };
