/**
 * Builds del builder (E2). Ver docs/BUILDER.md §3.
 * El backend valida forma y tamaños de la composición; la lógica del juego vive en el navegador.
 */

var MAX_BUILDS_PERFIL = 10;
var MAX_DATOS_BUILD = 8000;
var CLASES_BUILD = ['perfil', 'ejemplo'];
var PARTES_BUILD = ['head', 'chest', 'arms', 'waist', 'legs'];
var ID_CATALOGO_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
var CALIDADES_ROSTRO = ['fine', 'rare', 'epic', 'superior'];
var CARTAS_ROSTROS = 4;
var CAMARADA_NV_MAX = 80;
var ESTRELLAS_MAX = 6;
var CAMPOS_BUILD_PUBLICO = ['id', 'miembro_id', 'clase', 'adventurer_id', 'nombre', 'arma_tipo', 'elemento',
  'catalogo_version', 'poder_estimado', 'notas', 'creado', 'actualizado'];

function buildPublica_(b) {
  var o = elegir_(b, CAMPOS_BUILD_PUBLICO);
  try { o.datos = JSON.parse(b.datos || '{}'); } catch (e) { o.datos = { v: 1 }; }
  return o;
}

function idCatalogo_(v, campo) {
  var s = String(v === null || v === undefined ? '' : v);
  if (!ID_CATALOGO_RE.test(s)) fallar_('DATO_INVALIDO', 'Identificador no válido en ' + campo);
  return s;
}

function rarezaBuild_(v, campo) {
  return numeroValido_(v, 1, 14, 'rareza de ' + campo, false);
}

/** Una carta de Rostro: { id, cal, nv } (Fine solo nivel 1; las demás 1–10). Vacía → null. */
function cartaRostro_(x, campo) {
  if (!x || !x.id) return null;
  var cal = enumValido_(x.cal || 'superior', CALIDADES_ROSTRO, 'calidad de ' + campo);
  var max = cal === 'fine' ? 1 : 10;
  var nv = numeroValido_(x.nv, 1, max, 'nivel de ' + campo, true);
  if (nv === '') nv = max;
  return { id: idCatalogo_(x.id, campo), cal: cal, nv: nv };
}

/** Bloque rostros (E4): núcleo + 4 cartas (null = ranura vacía) + Proof of Mastery. Sin cartas → null. */
function rostrosValidos_(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  var nucleo = cartaRostro_(r.nucleo, 'núcleo');
  var fuente = Array.isArray(r.cartas) ? r.cartas : [];
  if (fuente.length > CARTAS_ROSTROS) fallar_('DATO_INVALIDO', 'Demasiados Rostros.');
  var cartas = [];
  for (var i = 0; i < CARTAS_ROSTROS; i++) cartas.push(cartaRostro_(fuente[i], 'Rostro ' + (i + 1)));
  if (!nucleo && !cartas.some(function (c) { return c; })) return null;
  return { nucleo: nucleo, cartas: cartas, maestria: r.maestria !== false };
}

/** Bloque camarada (E4): { id, nv?, estrellas?, poder? }. Lo numérico lo escribe el miembro. Sin id → null. */
function camaradaValido_(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || !c.id) return null;
  var out = { id: idCatalogo_(c.id, 'camarada') };
  var nv = numeroValido_(c.nv, 1, CAMARADA_NV_MAX, 'nivel del camarada', true);
  var estrellas = numeroValido_(c.estrellas, 0, ESTRELLAS_MAX, 'estrellas del camarada', true);
  var poder = numeroValido_(c.poder, 0, 999999, 'poder del camarada', true);
  if (nv !== '') out.nv = nv;
  if (estrellas !== '') out.estrellas = estrellas;
  if (poder !== '') out.poder = poder;
  return out;
}

/**
 * Reconstruye la composición solo con lo conocido (versión 1). Bloques opcionales.
 * Rostros y Camarada desde la E4; Keepsake y Reflexiones todavía se descartan.
 */
function composicionValida_(entrada) {
  var d = entrada;
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) { fallar_('DATO_INVALIDO', 'La build está mal formada.'); }
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) fallar_('DATO_INVALIDO', 'La build está mal formada.');
  if (Number(d.v) !== 1) fallar_('DATO_INVALIDO', 'Versión de build no soportada.');
  var out = { v: 1 };
  if (d.adv && d.adv.id) {
    out.adv = { id: idCatalogo_(d.adv.id, 'adventurer') };
    var nv = numeroValido_(d.adv.nivel, 1, 80, 'nivel del adventurer', true);
    if (nv !== '') out.adv.nivel = nv;
  }
  if (d.arma && d.arma.id) out.arma = { id: idCatalogo_(d.arma.id, 'arma'), r: rarezaBuild_(d.arma.r, 'arma') };
  out.piezas = {};
  var piezas = d.piezas && typeof d.piezas === 'object' ? d.piezas : {};
  Object.keys(piezas).forEach(function (p) {
    if (PARTES_BUILD.indexOf(p) === -1) fallar_('DATO_INVALIDO', 'Parte de armadura no válida: ' + p);
    var x = piezas[p];
    if (!x || !x.id) return;
    out.piezas[p] = { id: idCatalogo_(x.id, p), r: rarezaBuild_(x.r, p) };
  });
  var rostros = rostrosValidos_(d.rostros);
  if (rostros) out.rostros = rostros;
  var camarada = camaradaValido_(d.camarada);
  if (camarada) out.camarada = camarada;
  if (d.poder && typeof d.poder === 'object') {
    var poder = {};
    ['total', 'equipo', 'rostros', 'camarada'].forEach(function (k) {
      var n = numeroValido_(d.poder[k], 0, 999999, 'poder ' + k, true);
      if (n !== '') poder[k] = n;
    });
    if (Object.keys(poder).length) out.poder = poder;
  }
  return out;
}

function guardarBuild_(token, d) {
  var yo = requerir_(token);
  var esOficial = NIVEL_ROL[yo.rol] >= NIVEL_ROL.oficial;
  var ahora = ahoraIso_();
  var b;
  if (d.id) {
    b = buscar_('Builds', function (x) { return x.id === d.id; });
    if (!b) fallar_('NO_EXISTE', 'Build no encontrada.');
    if (b.miembro_id !== yo.id && !esOficial) fallar_('SIN_PERMISO', 'Solo puedes editar tus builds.');
  } else {
    b = { id: nuevoId_(), miembro_id: yo.id, creado: ahora };
  }

  var clase = d.clase === undefined ? (b.clase || 'perfil') : enumValido_(d.clase, CLASES_BUILD, 'clase');
  if (clase === 'ejemplo' && !esOficial) fallar_('SIN_PERMISO', 'Solo los oficiales crean builds de ejemplo.');
  if (clase === 'perfil' && b.clase !== 'perfil') {
    var propias = filtrar_('Builds', function (x) { return x.miembro_id === b.miembro_id && x.clase === 'perfil' && x.id !== b.id; });
    if (propias.length >= MAX_BUILDS_PERFIL) fallar_('LIMITE', 'Llegaste al máximo de ' + MAX_BUILDS_PERFIL + ' builds en tu perfil.');
  }
  b.clase = clase;

  var nombre = limpiarTexto_(d.nombre, 40);
  if (!nombre) fallar_('DATO_INVALIDO', 'Ponle un nombre a la build.');
  b.nombre = nombre;

  var datos = composicionValida_(d.datos);
  var texto = JSON.stringify(datos);
  if (texto.length > MAX_DATOS_BUILD) fallar_('DATO_INVALIDO', 'La build es demasiado grande.');
  b.datos = texto;

  b.adventurer_id = '';
  if (clase === 'perfil' && d.adventurer_id) {
    var adv = buscar_('Adventurers', function (x) { return x.id === d.adventurer_id && x.miembro_id === b.miembro_id; });
    if (!adv) fallar_('DATO_INVALIDO', 'Ese adventurer no es del dueño de la build.');
    b.adventurer_id = adv.id;
  }
  b.arma_tipo = d.arma_tipo ? enumValido_(d.arma_tipo, ARMAS, 'arma') : '';
  b.elemento = enumValido_(d.elemento || 'none', ELEMENTOS, 'elemento');
  b.catalogo_version = limpiarTexto_(d.catalogo_version, 20);
  b.poder_estimado = numeroValido_(d.poder_estimado, 0, 999999, 'poder estimado', true);
  b.notas = limpiarTexto_(d.notas, 500);
  b.actualizado = ahora;

  if (b._fila) actualizar_('Builds', b); else insertar_('Builds', b);
  log_(yo.id, d.id ? 'build_editada' : 'build_creada', 'Builds', b.id);
  invalidarCache_();
  return buildPublica_(b);
}

function eliminarBuild_(token, d) {
  var yo = requerir_(token);
  var b = buscar_('Builds', function (x) { return x.id === d.id; });
  if (!b) fallar_('NO_EXISTE', 'Build no encontrada.');
  if (b.miembro_id !== yo.id && NIVEL_ROL[yo.rol] < NIVEL_ROL.oficial) fallar_('SIN_PERMISO', 'Solo puedes borrar tus builds.');
  borrarFilas_('Builds', [b]);
  log_(yo.id, 'build_eliminada', 'Builds', b.id);
  invalidarCache_();
  return { eliminado: true };
}

/** Al borrar un adventurer, sus builds quedan sueltas (no se borran). */
function desvincularBuilds_(advId) {
  if (!libro_get_().getSheetByName('Builds')) return; // backend actualizado sin correr instalar()
  filtrar_('Builds', function (x) { return x.adventurer_id === advId; }).forEach(function (b) {
    b.adventurer_id = '';
    actualizar_('Builds', b);
  });
}

function activosPorId_() {
  var out = {};
  miembrosActivos_().forEach(function (m) { out[m.id] = m; });
  return out;
}

/** GET builds?miembro=ID  ·  GET builds?clase=ejemplo */
function listarBuilds_(p) {
  var activos = activosPorId_();
  var lista;
  if (p.miembro) {
    if (!activos[p.miembro]) return [];
    lista = filtrar_('Builds', function (x) { return x.miembro_id === p.miembro && x.clase === 'perfil'; });
  } else if (p.clase === 'ejemplo') {
    lista = filtrar_('Builds', function (x) { return x.clase === 'ejemplo'; });
  } else {
    fallar_('DATO_INVALIDO', 'Indica el miembro o clase=ejemplo.');
  }
  return lista.map(function (b) {
    var o = buildPublica_(b);
    o.autor = activos[b.miembro_id] ? { id: b.miembro_id, nick: activos[b.miembro_id].nick } : null;
    return o;
  }).sort(function (a, b) { return String(b.actualizado).localeCompare(String(a.actualizado)); });
}

/** GET build?id=ID (las de perfil solo si el dueño sigue activo). */
function verBuild_(id) {
  var b = buscar_('Builds', function (x) { return x.id === id; });
  var activos = activosPorId_();
  if (!b || (b.clase === 'perfil' && !activos[b.miembro_id])) fallar_('NO_EXISTE', 'Build no encontrada.');
  var o = buildPublica_(b);
  o.autor = activos[b.miembro_id] ? { id: b.miembro_id, nick: activos[b.miembro_id].nick } : null;
  return o;
}
