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
 * Bloque reflexiones (E4): { cap?, activas: [ids] }. El backend no conoce el catálogo: solo valida
 * la forma (ids tipo slug, sin repetir, máx. 20). La web filtra las que no son del adventurer.
 */
function reflexionesValidas_(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  var act = Array.isArray(r.activas) ? r.activas : [];
  if (act.length > 20) fallar_('DATO_INVALIDO', 'Demasiadas Reflexiones.');
  var out = { activas: [] };
  act.forEach(function (x) {
    var id = idCatalogo_(x, 'reflexión');
    if (out.activas.indexOf(id) === -1) out.activas.push(id);
  });
  var cap = numeroValido_(r.cap, 0, 300, 'puntos de Reflexión', true);
  if (cap !== '') out.cap = cap;
  return out.cap !== undefined || out.activas.length ? out : null;
}

/** Pasos de grabado como en el juego (backend v8): ver GRABADOS en build-calc.js; 31 en total. */
var GRABADO_RE = /^(sb(1|40|60|70|80|80b[1-3])|[ue]l(1|30|40|50|60|70|80)|cp(50|60|70|80)|ca(80|80b[1-4]))$/;

/** Bloque keepsake (E4): { nv?, poder?, grabados: [ids de paso] }. Ver GRABADOS en build-calc.js. */
function keepsakeValido_(k) {
  if (!k || typeof k !== 'object' || Array.isArray(k)) return null;
  var gra = Array.isArray(k.grabados) ? k.grabados : [];
  if (gra.length > 31) fallar_('DATO_INVALIDO', 'Demasiados grabados.');
  var out = { grabados: [] };
  gra.forEach(function (x) {
    var id = String(x);
    if (!GRABADO_RE.test(id)) fallar_('DATO_INVALIDO', 'Grabado no válido: ' + id.slice(0, 20));
    if (out.grabados.indexOf(id) === -1) out.grabados.push(id);
  });
  var nv = numeroValido_(k.nv, 1, 80, 'nivel del Recuerdo', true);
  var poder = numeroValido_(k.poder, 0, 999999, 'poder del Recuerdo', true);
  if (nv !== '') out.nv = nv;
  if (poder !== '') out.poder = poder;
  return out.nv !== undefined || out.poder !== undefined || out.grabados.length ? out : null;
}

/**
 * Reconstruye la composición solo con lo conocido (versión 1). Bloques opcionales.
 * Rostros, Camarada, Reflexiones y Recuerdo (Keepsake) desde la E4.
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
  var reflexiones = reflexionesValidas_(d.reflexiones);
  if (reflexiones) out.reflexiones = reflexiones;
  var keepsake = keepsakeValido_(d.keepsake);
  if (keepsake) out.keepsake = keepsake;
  if (d.poder && typeof d.poder === 'object') {
    var poder = {};
    // A mano mientras no exista E7: equipo (arma + 5 piezas), rostros y maestria (Proof of Mastery, desde la v9).
    // total y camarada se aceptan por compatibilidad (la web calcula el total; el camarada guarda su poder en su bloque).
    ['total', 'equipo', 'rostros', 'maestria', 'camarada'].forEach(function (k) {
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
    b.adventurer_id_guardado = b.adventurer_id;
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
  var advAntes = b._fila ? b.adventurer_id_guardado : '';

  if (b._fila) actualizar_('Builds', b); else insertar_('Builds', b);
  // v10: Proof of Mastery al perfil y poder de la build al adventurer (el de antes y el de ahora).
  migrarMaestria_(b.miembro_id, datos);
  if (advAntes && advAntes !== b.adventurer_id) recalcularAdventurer_(advAntes);
  if (b.adventurer_id) recalcularAdventurer_(b.adventurer_id);
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
  if (b.adventurer_id) recalcularAdventurer_(b.adventurer_id);
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
    o.autor = autorBuild_(activos[b.miembro_id]);
    return o;
  }).sort(function (a, b) { return String(b.actualizado).localeCompare(String(a.actualizado)); });
}

/** GET build?id=ID (las de perfil solo si el dueño sigue activo). */
function verBuild_(id) {
  var b = buscar_('Builds', function (x) { return x.id === id; });
  var activos = activosPorId_();
  if (!b || (b.clase === 'perfil' && !activos[b.miembro_id])) fallar_('NO_EXISTE', 'Build no encontrada.');
  var o = buildPublica_(b);
  o.autor = autorBuild_(activos[b.miembro_id]);
  return o;
}

/* ---------- Poder de la build → adventurer (v10, E3) ---------- */

/**
 * Poder total escrito de una build (misma cuenta que calcularPoder de site/js/build-calc.js):
 * equipo + Rostros + Proof of Mastery + camarada + Recuerdo. El Proof of Mastery es de la cuenta:
 * manda el del perfil; si el perfil no lo tiene, el que traiga la build (builds anteriores a la v10).
 * @return {{total:number, completo:boolean, equipo:*, rostros:*, camarada:*}}
 */
function poderBuild_(datos, maestriaPerfil) {
  var d = datos || {};
  var p = d.poder || {};
  var num = function (v) { return v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v); };
  var maestria = num(maestriaPerfil);
  if (maestria === null) maestria = num(p.maestria);
  var partes = {
    equipo: num(p.equipo), rostros: num(p.rostros), maestria: maestria,
    camarada: d.camarada && d.camarada.id ? num(d.camarada.poder) : null,
    keepsake: d.keepsake ? num(d.keepsake.poder) : null
  };
  var total = 0;
  var escritos = 0;
  Object.keys(partes).forEach(function (k) { if (partes[k] !== null) { total += partes[k]; escritos++; } });
  return { total: total, completo: escritos === 5, equipo: partes.equipo, rostros: partes.rostros, camarada: partes.camarada };
}

function datosBuild_(b) {
  try { return JSON.parse(b.datos || '{}'); } catch (e) { return {}; }
}

/**
 * El poder del adventurer sale de su build más fuerte con el poder completo (5 de 5).
 * Sin ninguna completa, el adventurer conserva lo último que tenía y vuelve a ser "a mano".
 */
function recalcularAdventurer_(advId) {
  if (!advId || !libro_get_().getSheetByName('Builds')) return;
  var a = buscar_('Adventurers', function (x) { return x.id === advId; });
  if (!a) return;
  var dueno = buscar_('Miembros', function (x) { return x.id === a.miembro_id; });
  var maestria = dueno ? dueno.maestria : '';
  var mejor = null;
  filtrar_('Builds', function (x) { return x.adventurer_id === advId && x.clase === 'perfil'; }).forEach(function (b) {
    var pw = poderBuild_(datosBuild_(b), maestria);
    if (pw.completo && (!mejor || pw.total > mejor.pw.total)) mejor = { b: b, pw: pw };
  });
  var antes = [a.poder_total, a.poder_equipo, a.poder_rostros, a.poder_camarada, a.poder_build_id].join('|');
  if (mejor) {
    a.poder_total = mejor.pw.total;
    a.poder_equipo = mejor.pw.equipo;
    a.poder_rostros = mejor.pw.rostros;
    a.poder_camarada = mejor.pw.camarada;
    a.poder_build_id = mejor.b.id;
  } else {
    a.poder_build_id = '';
  }
  if ([a.poder_total, a.poder_equipo, a.poder_rostros, a.poder_camarada, a.poder_build_id].join('|') !== antes) {
    a.actualizado = ahoraIso_();
    actualizar_('Adventurers', a);
  }
}

/** Tras cambiar el Proof of Mastery del perfil: rehace el poder de todos sus adventurers. */
function recalcularPoderMiembro_(m) {
  filtrar_('Adventurers', function (x) { return x.miembro_id === m.id; })
    .forEach(function (a) { recalcularAdventurer_(a.id); });
}

/** Migración v10: el primer Proof of Mastery escrito en una build pasa al perfil si el perfil no lo tiene. */
function migrarMaestria_(miembroId, datos) {
  var m = buscar_('Miembros', function (x) { return x.id === miembroId; });
  if (!m || m.maestria !== '' || !datos.poder || datos.poder.maestria === undefined) return;
  m.maestria = datos.poder.maestria;
  m.actualizado = ahoraIso_();
  actualizar_('Miembros', sinToken_(m));
}

function autorBuild_(m) {
  return m ? { id: m.id, nick: m.nick, maestria: m.maestria } : null;
}
