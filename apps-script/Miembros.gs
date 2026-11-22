/** Miembros: directorio, perfiles y administración. */

var CAMPOS_MIEMBRO_PUBLICO = ['id', 'nick', 'nick_juego', 'uid_juego', 'pais', 'rol', 'bio', 'avatar_id',
  'adventurer_principal_id', 'creado'];
var CAMPOS_ADV_PUBLICO = ['id', 'miembro_id', 'adventurer', 'arma', 'elemento', 'tipo', 'nivel', 'poder_total',
  'poder_equipo', 'poder_rostros', 'poder_camarada', 'loadout', 'notas', 'capturas', 'actualizado'];

function miembroPublico_(m) {
  return elegir_(m, CAMPOS_MIEMBRO_PUBLICO);
}

function miembroPrivado_(m, pinTemporal) {
  var o = miembroPublico_(m);
  o.pin_temporal = !!pinTemporal;
  o.whatsapp_invitacion = config_().whatsapp_invitacion || '';
  o.nick_cambios_restantes = nickCambiosRestantes_(m);
  return o;
}

var SEMANA_MS = 7 * 864e5;

/** Fechas (ISO) de los cambios de nick de los últimos 7 días. */
function nickCambiosRecientes_(m, ahora) {
  var t = (ahora || new Date()).getTime();
  return String(m.nick_cambios || '').split(',').filter(function (f) {
    return f && t - new Date(f).getTime() < SEMANA_MS;
  });
}

function nickCambiosRestantes_(m) {
  var max = Number(config_().nick_cambios_semana || 2);
  return Math.max(0, max - nickCambiosRecientes_(m).length);
}

/** Cambio de nick por el propio miembro: único y con límite por 7 días corridos (Config nick_cambios_semana). */
function cambiarNick_(m, nuevo) {
  var nick = validarNick_(nuevo);
  if (nick === m.nick) return;
  if (claveNick_(nick) !== claveNick_(m.nick) &&
      buscar_('Miembros', function (x) { return x.id !== m.id && claveNick_(x.nick) === claveNick_(nick); })) {
    fallar_('NICK_OCUPADO', 'Ese nick ya está registrado.');
  }
  var recientes = nickCambiosRecientes_(m);
  if (recientes.length >= Number(config_().nick_cambios_semana || 2)) {
    fallar_('NICK_LIMITE', 'Ya cambiaste tu nick el máximo de veces esta semana. Prueba en unos días.');
  }
  recientes.push(ahoraIso_());
  log_(m.id, 'nick', 'Miembros', m.id, m.nick + ' → ' + nick);
  m.nick = nick;
  m.nick_cambios = recientes.join(',');
}

function advPublico_(a) {
  var o = elegir_(a, CAMPOS_ADV_PUBLICO);
  o.capturas = a.capturas ? String(a.capturas).split(',').filter(String) : [];
  return o;
}

function miembrosActivos_() {
  return filtrar_('Miembros', function (m) { return m.estado === 'activo'; });
}

/** GET miembros: directorio con el adventurer principal de cada uno. */
function listarMiembros_() {
  var advs = {};
  leer_('Adventurers').forEach(function (a) { advs[a.id] = a; });
  return miembrosActivos_().map(function (m) {
    var o = miembroPublico_(m);
    var p = advs[m.adventurer_principal_id];
    o.principal = p ? advPublico_(p) : null;
    return o;
  }).sort(function (a, b) {
    return ((b.principal && b.principal.poder_total) || 0) - ((a.principal && a.principal.poder_total) || 0);
  });
}

/** GET miembro: perfil con todos sus adventurers. */
function verMiembro_(id) {
  var m = buscar_('Miembros', function (x) { return x.id === id && x.estado === 'activo'; });
  if (!m) fallar_('NO_EXISTE', 'Miembro no encontrado.');
  var o = miembroPublico_(m);
  o.adventurers = filtrar_('Adventurers', function (a) { return a.miembro_id === id; }).map(advPublico_)
    .sort(function (a, b) { return (b.poder_total || 0) - (a.poder_total || 0); });
  return o;
}

function guardarPerfil_(token, d) {
  var m = requerir_(token);
  if (d.nick !== undefined) cambiarNick_(m, d.nick);
  if (d.nick_juego !== undefined) m.nick_juego = limpiarTexto_(d.nick_juego, 32);
  if (d.uid_juego !== undefined) m.uid_juego = limpiarTexto_(d.uid_juego, 32);
  if (d.pais !== undefined) m.pais = limpiarTexto_(d.pais, 2).toUpperCase();
  if (d.bio !== undefined) m.bio = limpiarTexto_(d.bio, 280);
  if (d.avatar_id !== undefined && d.avatar_id !== m.avatar_id) {
    var nuevo = limpiarTexto_(d.avatar_id, 80);
    if (nuevo) validarImagenPropia_(nuevo, m.id, 'avatar');
    if (m.avatar_id) enviarAPapelera_(m.avatar_id);
    m.avatar_id = nuevo;
  }
  m.actualizado = ahoraIso_();
  actualizar_('Miembros', m);
  invalidarCache_();
  return miembroPrivado_(m, false);
}

/** Oficial: activar o desactivar. Desactivar cierra sus sesiones. */
function cambiarEstado_(token, d) {
  var yo = requerir_(token, 'oficial');
  var m = buscar_('Miembros', function (x) { return x.id === d.miembro_id; });
  if (!m) fallar_('NO_EXISTE', 'Miembro no encontrado.');
  if (m.rol === 'admin') fallar_('SIN_PERMISO', 'No se puede desactivar al admin.');
  if (m.rol === 'oficial' && yo.rol !== 'admin') fallar_('SIN_PERMISO', 'Solo el admin puede desactivar oficiales.');
  m.estado = enumValido_(d.estado, ['activo', 'inactivo'], 'estado');
  m.actualizado = ahoraIso_();
  actualizar_('Miembros', m);
  if (m.estado === 'inactivo') {
    borrarFilas_('Sesiones', filtrar_('Sesiones', function (s) { return s.miembro_id === m.id; }));
  }
  log_(yo.id, 'estado_' + m.estado, 'Miembros', m.id);
  invalidarCache_();
  return miembroPublico_(m);
}

/** Admin: nombra o quita oficiales. */
function cambiarRol_(token, d) {
  var yo = requerir_(token, 'admin');
  var m = buscar_('Miembros', function (x) { return x.id === d.miembro_id; });
  if (!m) fallar_('NO_EXISTE', 'Miembro no encontrado.');
  if (m.id === yo.id) fallar_('SIN_PERMISO', 'No puedes cambiar tu propio rol.');
  m.rol = enumValido_(d.rol, ['miembro', 'oficial'], 'rol');
  m.actualizado = ahoraIso_();
  actualizar_('Miembros', m);
  log_(yo.id, 'rol_' + m.rol, 'Miembros', m.id);
  invalidarCache_();
  return miembroPublico_(m);
}

/** Oficial: lista para administración (incluye inactivos y estado del PIN). */
function adminMiembros_(token) {
  requerir_(token, 'oficial');
  var creds = {};
  leer_('Credenciales').forEach(function (c) { creds[c.miembro_id] = c; });
  return leer_('Miembros').map(function (m) {
    var o = miembroPublico_(m);
    o.estado = m.estado;
    var c = creds[m.id];
    o.bloqueado = !!(c && c.bloqueado_hasta && new Date(c.bloqueado_hasta) > new Date());
    o.pin_temporal = !!(c && c.pin_temporal);
    return o;
  });
}
