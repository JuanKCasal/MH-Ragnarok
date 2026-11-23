/**
 * Acceso a Google Sheets como tablas de objetos.
 * Todas las celdas se guardan como texto plano (formato '@') y se convierten según el esquema.
 * Tipos: s = texto, n = número, b = booleano.
 */

var ESQUEMA = {
  Miembros: { id: 's', nick: 's', nick_juego: 's', uid_juego: 's', pais: 's', rol: 's', estado: 's', bio: 's',
    avatar_id: 's', adventurer_principal_id: 's', creado: 's', actualizado: 's', nick_cambios: 's' },
  Credenciales: { miembro_id: 's', pin_hash: 's', sal: 's', intentos_fallidos: 'n', bloqueado_hasta: 's',
    pin_temporal: 'b', actualizado: 's' },
  Sesiones: { token_hash: 's', miembro_id: 's', creado: 's', expira: 's', ultimo_uso: 's' },
  Adventurers: { id: 's', miembro_id: 's', adventurer: 's', arma: 's', elemento: 's', tipo: 's', nivel: 'n',
    poder_total: 'n', poder_equipo: 'n', poder_rostros: 'n', poder_camarada: 'n', loadout: 's', notas: 's',
    capturas: 's', creado: 's', actualizado: 's' },
  Noticias: { id: 's', titulo: 's', resumen: 's', cuerpo_md: 's', tipo: 's', portada_id: 's', autor_id: 's',
    publicado: 'b', fijada: 'b', fecha_pub: 's', creado: 's', actualizado: 's' },
  Guias: { id: 's', slug: 's', titulo: 's', categoria: 's', nivel: 's', resumen: 's', cuerpo_md: 's',
    portada_id: 's', autor_id: 's', orden: 'n', publicado: 'b', creado: 's', actualizado: 's' },
  ClashSemanas: { id: 's', estado: 's', tam_equipo: 'n', publicado_en: 's', puesto: 'n', puntos: 'n', notas: 's' },
  ClashAsistencia: { semana_id: 's', miembro_id: 's', respuesta: 's', poder_snapshot: 'n', adventurer_id: 's',
    actualizado: 's' },
  ClashEquipos: { semana_id: 's', equipo: 'n', miembro_id: 's', poder_snapshot: 'n', fijado: 'b' },
  Imagenes: { id: 's', miembro_id: 's', tipo: 's', creado: 's' },
  Config: { clave: 's', valor: 's' },
  Log: { fecha: 's', miembro_id: 's', accion: 's', entidad: 's', entidad_id: 's', detalle: 's' },
  Catalogo: { tipo: 's', id: 's', nombre_es: 's', nombre_en: 's', extra_json: 's', validado: 'b', creado_por: 's' }
};

var memoTablas_ = {};
var libro_ = null;

function libro_get_() {
  if (!libro_) {
    var id = prop_('SHEET_ID');
    if (!id) fallar_('NO_INSTALADO', 'El backend no está instalado (ejecuta instalar()).');
    libro_ = SpreadsheetApp.openById(id);
  }
  return libro_;
}

function hoja_(nombre) {
  var h = libro_get_().getSheetByName(nombre);
  if (!h) fallar_('NO_INSTALADO', 'Falta la hoja ' + nombre);
  return h;
}

function columnas_(nombre) {
  return Object.keys(ESQUEMA[nombre]);
}

function convertir_(tipo, v) {
  // Si Sheets convirtió el texto (filas fuera del rango con formato '@'), se normaliza.
  if (v instanceof Date) v = v.toISOString();
  if (tipo === 'n') return v === '' || v === null ? '' : Number(v);
  if (tipo === 'b') return v === true || String(v).toUpperCase() === 'TRUE';
  return v === null || v === undefined ? '' : String(v);
}

function serializar_(tipo, v) {
  if (tipo === 'b') return v ? 'TRUE' : 'FALSE';
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Lee toda la hoja como objetos. Cada objeto lleva _fila (número de fila en la hoja). */
function leer_(nombre) {
  if (memoTablas_[nombre]) return memoTablas_[nombre];
  var h = hoja_(nombre);
  var cols = columnas_(nombre);
  var ult = h.getLastRow();
  var filas = ult < 2 ? [] : h.getRange(2, 1, ult - 1, cols.length).getValues();
  var esquema = ESQUEMA[nombre];
  var datos = [];
  filas.forEach(function (fila, i) {
    if (fila.every(function (c) { return c === '' || c === null; })) return;
    var o = { _fila: i + 2 };
    cols.forEach(function (c, j) { o[c] = convertir_(esquema[c], fila[j]); });
    datos.push(o);
  });
  memoTablas_[nombre] = datos;
  return datos;
}

function buscar_(nombre, pred) {
  var t = leer_(nombre);
  for (var i = 0; i < t.length; i++) if (pred(t[i])) return t[i];
  return null;
}

function filtrar_(nombre, pred) {
  return leer_(nombre).filter(pred);
}

function filaDe_(nombre, obj) {
  var esquema = ESQUEMA[nombre];
  return columnas_(nombre).map(function (c) { return serializar_(esquema[c], obj[c]); });
}

/**
 * Escribe filas como TEXTO desde la fila `desde`. No usar appendRow: ignora el formato '@'
 * y Sheets convierte "20:15" en hora, "8" en número o un hash "12e4…" en notación científica.
 * Se fija '@' en el rango justo antes de setValues (que sí lo respeta).
 */
function escribirFilas_(h, desde, filas) {
  if (!filas.length) return;
  var falta = desde + filas.length - 1 - h.getMaxRows();
  if (falta > 0) h.insertRowsAfter(h.getMaxRows(), Math.max(falta, 100));
  h.getRange(desde, 1, filas.length, filas[0].length).setNumberFormat('@').setValues(filas);
}

function insertar_(nombre, obj) {
  var h = hoja_(nombre);
  escribirFilas_(h, h.getLastRow() + 1, [filaDe_(nombre, obj)]);
  delete memoTablas_[nombre];
  return obj;
}

function actualizar_(nombre, obj) {
  if (!obj._fila) throw new Error('actualizar_ sin _fila');
  escribirFilas_(hoja_(nombre), obj._fila, [filaDe_(nombre, obj)]);
  delete memoTablas_[nombre];
  return obj;
}

/** Borra varias filas (de abajo hacia arriba para no desplazar índices). */
function borrarFilas_(nombre, objs) {
  var h = hoja_(nombre);
  objs.map(function (o) { return o._fila; }).sort(function (a, b) { return b - a; })
    .forEach(function (f) { h.deleteRow(f); });
  delete memoTablas_[nombre];
}

function sinFila_(obj) {
  var o = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_fila') o[k] = obj[k]; });
  return o;
}

function log_(miembroId, accion, entidad, entidadId, detalle) {
  try {
    insertar_('Log', { fecha: ahoraIso_(), miembro_id: miembroId || '', accion: accion, entidad: entidad || '',
      entidad_id: entidadId || '', detalle: detalle ? limpiarTexto_(detalle, 500) : '' });
  } catch (e) {
    console.error('No se pudo escribir el log', e);
  }
}

/* ---------- Config ---------- */

function config_() {
  var out = {};
  leer_('Config').forEach(function (r) { out[r.clave] = r.valor; });
  return out;
}

function configPublica_() {
  var c = config_();
  var out = {};
  Object.keys(c).forEach(function (k) { if (k.charAt(0) !== '_') out[k] = c[k]; });
  delete out.whatsapp_invitacion; // solo con sesión (SPEC §12.3)
  return out;
}

function setConfig_(clave, valor) {
  var fila = buscar_('Config', function (r) { return r.clave === clave; });
  if (fila) { fila.valor = String(valor); actualizar_('Config', fila); }
  else insertar_('Config', { clave: clave, valor: String(valor) });
}

/* ---------- Caché de respuestas públicas ---------- */

function cacheGet_(clave) {
  var v = CacheService.getScriptCache().get((prop_('CACHE_VER') || '0') + ':' + clave);
  return v ? JSON.parse(v) : null;
}

function cachePut_(clave, valor) {
  var s = JSON.stringify(valor);
  if (s.length < 90000) CacheService.getScriptCache().put((prop_('CACHE_VER') || '0') + ':' + clave, s, 600);
}

function invalidarCache_() {
  setProp_('CACHE_VER', Number(prop_('CACHE_VER') || 0) + 1);
}
