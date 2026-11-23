/**
 * MH-Ragnarok — API JSON (Google Apps Script Web App).
 * GET  ?accion=...           lecturas públicas (cacheadas)
 * POST text/plain {accion, token?, datos}   escrituras y login
 * Ver SPEC.md §6.
 */

var LECTURAS = {
  inicio: function () { return inicio_(); },
  noticias: function (p) { return listarNoticias_(p); },
  noticia: function (p) { return verNoticia_(p.id); },
  guias: function () { return listarGuias_(); },
  guia: function (p) { return verGuia_(p.slug); },
  miembros: function () { return listarMiembros_(); },
  miembro: function (p) { return verMiembro_(p.id); },
  clash: function (p) { return verClash_(p); },
  clash_historial: function () { return historialClash_(); }
};

// Acciones que no escriben (no necesitan LockService).
var POST_SIN_LOCK = { sesion: true, 'admin.miembros': true, 'editor.contenido': true };

var ESCRITURAS = {
  registro: function (t, d) { return registro_(d); },
  login: function (t, d) { return login_(d); },
  logout: function (t) { return logout_(t); },
  sesion: function (t) { return sesion_(t); },
  'pin.cambiar': function (t, d) { return cambiarPin_(t, d); },
  'perfil.guardar': function (t, d) { return guardarPerfil_(t, d); },
  'adventurer.guardar': function (t, d) { return guardarAdventurer_(t, d); },
  'adventurer.eliminar': function (t, d) { return eliminarAdventurer_(t, d); },
  'adventurer.principal': function (t, d) { return marcarPrincipal_(t, d); },
  'imagen.subir': function (t, d) { return subirImagen_(t, d); },
  'clash.asistencia': function (t, d) { return asistenciaClash_(t, d); },
  'clash.guardarEquipos': function (t, d) { return guardarEquiposClash_(t, d); },
  'clash.cerrar': function (t, d) { return cerrarClash_(t, d); },
  'noticia.guardar': function (t, d) { return guardarNoticia_(t, d); },
  'noticia.eliminar': function (t, d) { return eliminarNoticia_(t, d); },
  'guia.guardar': function (t, d) { return guardarGuia_(t, d); },
  'guia.eliminar': function (t, d) { return eliminarGuia_(t, d); },
  'editor.contenido': function (t, d) { return contenidoEditor_(t, d); },
  'admin.miembros': function (t) { return adminMiembros_(t); },
  'miembro.resetPin': function (t, d) { return resetPin_(t, d); },
  'miembro.estado': function (t, d) { return cambiarEstado_(t, d); },
  'miembro.rol': function (t, d) { return cambiarRol_(t, d); },
  'config.guardar': function (t, d) { return guardarConfig_(t, d); },
  'config.codigoClan': function (t, d) { return cambiarCodigoClan_(t, d); }
};

function doGet(e) {
  return responder_(function () {
    var p = (e && e.parameter) || {};
    var fn = LECTURAS[p.accion];
    if (!fn) fallar_('ACCION_DESCONOCIDA', 'Acción desconocida.');
    var clave = p.accion + '?' + Object.keys(p).filter(function (k) { return k !== 'accion' && k !== '_'; }).sort()
      .map(function (k) { return k + '=' + p[k]; }).join('&');
    var enCache = cacheGet_(clave);
    if (enCache) return enCache;
    var data = fn(p);
    cachePut_(clave, data);
    return data;
  });
}

function doPost(e) {
  return responder_(function () {
    var cuerpo;
    try { cuerpo = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (err) { fallar_('JSON_INVALIDO', 'Petición mal formada.'); }
    var fn = ESCRITURAS[cuerpo.accion];
    if (!fn) fallar_('ACCION_DESCONOCIDA', 'Acción desconocida.');
    var datos = cuerpo.datos && typeof cuerpo.datos === 'object' ? cuerpo.datos : {};
    if (POST_SIN_LOCK[cuerpo.accion]) return fn(cuerpo.token, datos);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) fallar_('OCUPADO', 'El servidor está ocupado. Intenta de nuevo.');
    try { return fn(cuerpo.token, datos); }
    finally { lock.releaseLock(); }
  });
}

function responder_(fn) {
  var salida;
  try {
    salida = { ok: true, data: fn() };
  } catch (err) {
    if (err instanceof ApiError) {
      salida = { ok: false, error: { codigo: err.codigo, mensaje: err.message } };
    } else {
      console.error(err && err.stack ? err.stack : err);
      salida = { ok: false, error: { codigo: 'INTERNO', mensaje: 'Error interno del servidor.' } };
    }
  }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

/** GET inicio: lo que necesita la portada en una sola llamada. */
function inicio_() {
  var semana = semanaVigente_();
  var s = buscar_('ClashSemanas', function (x) { return x.id === semana; });
  return {
    gremio: configPublica_(),
    miembros: miembrosActivos_().length,
    noticias: listarNoticias_({ pagina: 1 }).items.slice(0, 3),
    clash: { semana_id: semana, estado: s ? s.estado : 'abierta',
      confirmados: filtrar_('ClashAsistencia', function (x) { return x.semana_id === semana && x.respuesta === 'voy'; }).length }
  };
}

/* ---------- Configuración (admin) ---------- */

var CLAVES_CONFIG_EDITABLES = ['gremio_nombre', 'gremio_rango', 'gremio_etiqueta', 'gremio_declaracion', 'lider_juego',
  'max_miembros', 'whatsapp_invitacion', 'clash_dia', 'clash_hora', 'clash_duracion_min', 'carnival_horas',
  'carnival_duracion_min', 'zona_juego_offset_min', 'nick_cambios_semana'];

/** Rangos de las claves numéricas (los horarios mal escritos romperían la cuenta regresiva de todos). */
var RANGOS_CONFIG = {
  max_miembros: [1, 200], clash_dia: [0, 6], clash_duracion_min: [5, 600], carnival_duracion_min: [5, 600],
  zona_juego_offset_min: [-720, 840], nick_cambios_semana: [0, 10]
};
var HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function guardarConfig_(token, d) {
  var yo = requerir_(token, 'admin');
  Object.keys(d).forEach(function (k) {
    if (CLAVES_CONFIG_EDITABLES.indexOf(k) === -1) fallar_('DATO_INVALIDO', 'Clave no editable: ' + k);
  });
  if (d.whatsapp_invitacion && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(d.whatsapp_invitacion)) {
    fallar_('DATO_INVALIDO', 'El enlace de WhatsApp debe ser https://chat.whatsapp.com/…');
  }
  Object.keys(RANGOS_CONFIG).forEach(function (k) {
    if (d[k] !== undefined) d[k] = String(numeroValido_(d[k], RANGOS_CONFIG[k][0], RANGOS_CONFIG[k][1], k, false));
  });
  if (d.clash_hora !== undefined && !HORA_RE.test(String(d.clash_hora).trim())) fallar_('DATO_INVALIDO', 'La hora del Clash debe ser HH:MM.');
  if (d.carnival_horas !== undefined) {
    var horas = String(d.carnival_horas).split(',').map(function (h) { return h.trim(); }).filter(String);
    if (!horas.length || horas.some(function (h) { return !HORA_RE.test(h); })) {
      fallar_('DATO_INVALIDO', 'Las horas del Carnival deben ser HH:MM separadas por coma.');
    }
    d.carnival_horas = horas.join(',');
  }
  if (d.gremio_nombre !== undefined && !limpiarTexto_(d.gremio_nombre, 40)) fallar_('DATO_INVALIDO', 'El gremio necesita un nombre.');
  Object.keys(d).forEach(function (k) { setConfig_(k, limpiarTexto_(d[k], 300)); });
  log_(yo.id, 'config_guardada', 'Config', '', Object.keys(d).join(','));
  invalidarCache_();
  return configPublica_();
}

function cambiarCodigoClan_(token, d) {
  var yo = requerir_(token, 'admin');
  var codigo = limpiarTexto_(d.codigo, 64);
  if (codigo.length < 6) fallar_('DATO_INVALIDO', 'El código debe tener al menos 6 caracteres.');
  setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + codigo));
  log_(yo.id, 'codigo_clan_cambiado', 'Config', '');
  return { cambiado: true };
}
