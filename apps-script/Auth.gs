/** Registro, login, sesiones y PIN. Ver SPEC.md §7. */

var ITERACIONES_PIN = 1000;
var MAX_INTENTOS = 5;
var BLOQUEO_MIN = 15;
var SESION_DIAS = 30;
var MAX_SESIONES = 5;
var REG_MAX_FALLOS = 20;     // fallos de código del clan…
var REG_VENTANA_SEG = 600;   // …en 10 minutos → pausa

function hashPin_(pin, sal) {
  var pimienta = prop_('PIN_PEPPER');
  if (!pimienta) fallar_('NO_INSTALADO', 'Falta PIN_PEPPER (ejecuta instalar()).');
  var h = sal + ':' + pin;
  for (var i = 0; i < ITERACIONES_PIN; i++) {
    h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h, pimienta));
  }
  return h;
}

function validarPin_(pin) {
  if (!/^\d{6}$/.test(String(pin || ''))) fallar_('PIN_FORMATO', 'El PIN debe tener exactamente 6 dígitos.');
  if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321') {
    fallar_('PIN_DEBIL', 'Ese PIN es muy fácil de adivinar. Elige otro.');
  }
  return String(pin);
}

function validarNick_(nick) {
  var n = limpiarTexto_(nick, 24);
  if (!/^[\p{L}\p{N} _.\-]{3,24}$/u.test(n)) {
    fallar_('NICK_FORMATO', 'El nick debe tener entre 3 y 24 caracteres (letras, números, espacio, _ . -).');
  }
  return n;
}

function claveNick_(nick) {
  return String(nick).trim().toLowerCase();
}

function nuevaSal_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function nuevoToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function crearSesion_(miembroId) {
  var token = nuevoToken_();
  var ahora = new Date();
  var mias = filtrar_('Sesiones', function (s) { return s.miembro_id === miembroId; })
    .sort(function (a, b) { return a.ultimo_uso < b.ultimo_uso ? -1 : 1; });
  if (mias.length >= MAX_SESIONES) borrarFilas_('Sesiones', mias.slice(0, mias.length - MAX_SESIONES + 1));
  insertar_('Sesiones', {
    token_hash: sha256Hex_(token), miembro_id: miembroId, creado: ahora.toISOString(),
    expira: new Date(ahora.getTime() + SESION_DIAS * 864e5).toISOString(), ultimo_uso: ahora.toISOString()
  });
  return token;
}

/** Devuelve el miembro de la sesión o lanza error. Renueva el vencimiento (como mucho 1 vez por hora). */
function requerir_(token, rolMinimo) {
  if (!token) fallar_('SIN_SESION', 'Inicia sesión para continuar.');
  var hash = sha256Hex_(String(token));
  var s = buscar_('Sesiones', function (x) { return x.token_hash === hash; });
  var ahora = new Date();
  if (!s || new Date(s.expira) < ahora) {
    if (s) borrarFilas_('Sesiones', [s]);
    fallar_('SESION_VENCIDA', 'Tu sesión venció. Vuelve a entrar.');
  }
  var m = buscar_('Miembros', function (x) { return x.id === s.miembro_id; });
  if (!m || m.estado !== 'activo') fallar_('SIN_ACCESO', 'Tu cuenta no está activa.');
  if (rolMinimo && (NIVEL_ROL[m.rol] || 0) < NIVEL_ROL[rolMinimo]) {
    fallar_('SIN_PERMISO', 'No tienes permiso para esta acción.');
  }
  if (ahora - new Date(s.ultimo_uso) > 3600e3) {
    s.ultimo_uso = ahora.toISOString();
    s.expira = new Date(ahora.getTime() + SESION_DIAS * 864e5).toISOString();
    actualizar_('Sesiones', s);
  }
  m._token_hash = hash;
  return m;
}

function registro_(d) {
  var cache = CacheService.getScriptCache();
  var fallos = Number(cache.get('reg_fallos') || 0);
  if (fallos >= REG_MAX_FALLOS) fallar_('REGISTRO_PAUSADO', 'Demasiados intentos. Prueba de nuevo en unos minutos.');

  var hashCodigo = prop_('CLAN_CODE_HASH');
  if (!hashCodigo) fallar_('NO_INSTALADO', 'El código del clan no está configurado.');
  if (sha256Hex_(prop_('PIN_PEPPER') + ':' + limpiarTexto_(d.codigo_clan, 64)) !== hashCodigo) {
    cache.put('reg_fallos', String(fallos + 1), REG_VENTANA_SEG);
    fallar_('CODIGO_INVALIDO', 'El código del clan no es correcto.');
  }

  var nick = validarNick_(d.nick);
  var pin = validarPin_(d.pin);
  if (buscar_('Miembros', function (m) { return claveNick_(m.nick) === claveNick_(nick); })) {
    fallar_('NICK_OCUPADO', 'Ese nick ya está registrado.');
  }
  var ahora = ahoraIso_();
  var m = insertar_('Miembros', {
    id: nuevoId_(), nick: nick, nick_juego: limpiarTexto_(d.nick_juego, 32) || nick, uid_juego: limpiarTexto_(d.uid_juego, 32),
    pais: limpiarTexto_(d.pais, 2).toUpperCase(), rol: 'miembro', estado: 'activo', bio: '', avatar_id: '',
    adventurer_principal_id: '', creado: ahora, actualizado: ahora
  });
  var sal = nuevaSal_();
  insertar_('Credenciales', { miembro_id: m.id, pin_hash: hashPin_(pin, sal), sal: sal, intentos_fallidos: 0,
    bloqueado_hasta: '', pin_temporal: false, actualizado: ahora });
  log_(m.id, 'registro', 'Miembros', m.id);
  invalidarCache_();
  return { token: crearSesion_(m.id), miembro: miembroPrivado_(m, false) };
}

function login_(d) {
  var nick = limpiarTexto_(d.nick, 24);
  var pin = String(d.pin || '');
  var generico = 'Nick o PIN incorrectos.';
  var m = buscar_('Miembros', function (x) { return claveNick_(x.nick) === claveNick_(nick); });
  if (!m) fallar_('LOGIN_INVALIDO', generico);
  if (m.estado !== 'activo') fallar_('SIN_ACCESO', 'Tu cuenta no está activa. Habla con un oficial.');
  var c = buscar_('Credenciales', function (x) { return x.miembro_id === m.id; });
  if (!c) fallar_('LOGIN_INVALIDO', generico);
  var ahora = new Date();
  if (c.bloqueado_hasta && new Date(c.bloqueado_hasta) > ahora) {
    var min = Math.ceil((new Date(c.bloqueado_hasta) - ahora) / 60000);
    fallar_('BLOQUEADO', 'Demasiados intentos fallidos. Espera ' + min + ' min.');
  }
  if (hashPin_(pin, c.sal) !== c.pin_hash) {
    c.intentos_fallidos = Number(c.intentos_fallidos || 0) + 1;
    if (c.intentos_fallidos >= MAX_INTENTOS) {
      c.bloqueado_hasta = new Date(ahora.getTime() + BLOQUEO_MIN * 60000).toISOString();
      c.intentos_fallidos = 0;
    }
    c.actualizado = ahora.toISOString();
    actualizar_('Credenciales', c);
    log_(m.id, 'login_fallido', 'Miembros', m.id);
    fallar_('LOGIN_INVALIDO', generico);
  }
  if (c.intentos_fallidos || c.bloqueado_hasta) {
    c.intentos_fallidos = 0; c.bloqueado_hasta = ''; actualizar_('Credenciales', c);
  }
  return { token: crearSesion_(m.id), miembro: miembroPrivado_(m, c.pin_temporal) };
}

function logout_(token) {
  var hash = sha256Hex_(String(token || ''));
  var s = buscar_('Sesiones', function (x) { return x.token_hash === hash; });
  if (s) borrarFilas_('Sesiones', [s]);
  return { cerrada: true };
}

function sesion_(token) {
  var m = requerir_(token);
  var c = buscar_('Credenciales', function (x) { return x.miembro_id === m.id; });
  return { miembro: miembroPrivado_(m, c && c.pin_temporal) };
}

function cambiarPin_(token, d) {
  var m = requerir_(token);
  var c = buscar_('Credenciales', function (x) { return x.miembro_id === m.id; });
  if (!c || hashPin_(String(d.pin_actual || ''), c.sal) !== c.pin_hash) fallar_('PIN_INVALIDO', 'El PIN actual no es correcto.');
  var nuevo = validarPin_(d.pin_nuevo);
  c.sal = nuevaSal_();
  c.pin_hash = hashPin_(nuevo, c.sal);
  c.pin_temporal = false;
  c.actualizado = ahoraIso_();
  actualizar_('Credenciales', c);
  // Cierra las demás sesiones del miembro.
  borrarFilas_('Sesiones', filtrar_('Sesiones', function (s) { return s.miembro_id === m.id && s.token_hash !== m._token_hash; }));
  log_(m.id, 'pin_cambiado', 'Miembros', m.id);
  return { cambiado: true };
}

/** Oficial: genera un PIN temporal. Se muestra una sola vez y obliga a cambiarlo. */
function resetPin_(token, d) {
  var yo = requerir_(token, 'oficial');
  var m = buscar_('Miembros', function (x) { return x.id === d.miembro_id; });
  if (!m) fallar_('NO_EXISTE', 'Miembro no encontrado.');
  if (m.rol === 'admin' && yo.rol !== 'admin') fallar_('SIN_PERMISO', 'Solo el admin puede resetear su propio PIN.');
  var temporal;
  do {
    temporal = String(100000 + parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 900000);
  } while (/^(\d)\1{5}$/.test(temporal));
  var c = buscar_('Credenciales', function (x) { return x.miembro_id === m.id; });
  var sal = nuevaSal_();
  var datos = { miembro_id: m.id, pin_hash: hashPin_(temporal, sal), sal: sal, intentos_fallidos: 0,
    bloqueado_hasta: '', pin_temporal: true, actualizado: ahoraIso_() };
  if (c) { datos._fila = c._fila; actualizar_('Credenciales', datos); } else insertar_('Credenciales', datos);
  borrarFilas_('Sesiones', filtrar_('Sesiones', function (s) { return s.miembro_id === m.id; }));
  log_(yo.id, 'pin_reseteado', 'Miembros', m.id);
  return { pin_temporal: temporal };
}
