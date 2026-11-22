/** Guild Clash: asistencia, equipos y resultados. Ver SPEC.md §9–10. */

var RESPUESTAS = ['voy', 'no', 'quiza'];

function hmMin_(s) {
  var p = String(s || '0:0').split(':');
  return Number(p[0]) * 60 + Number(p[1] || 0);
}

/** Fecha (AAAA-MM-DD, hora del juego) del sábado del Clash vigente. Misma lógica que site/js/time.js. */
function semanaVigente_(ahora) {
  ahora = ahora || new Date();
  var c = config_();
  var off = Number(c.zona_juego_offset_min || -360);
  var dia = Number(c.clash_dia || 6);
  var hora = hmMin_(c.clash_hora || '20:15');
  var dur = Number(c.clash_duracion_min || 60);
  var j = new Date(ahora.getTime() + off * 60000);
  var base = Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate());
  var delta = (dia - new Date(base).getUTCDay() + 7) % 7;
  for (var s = -1; s <= 1; s++) {
    var inicioJ = base + (delta + s * 7) * 864e5 + hora * 60000;
    var fin = inicioJ - off * 60000 + dur * 60000;
    if (fin > ahora.getTime()) return new Date(inicioJ).toISOString().slice(0, 10);
  }
  throw new Error('No se pudo calcular la semana');
}

function validarSemanaId_(id) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(id || ''))) fallar_('DATO_INVALIDO', 'Semana inválida.');
  return id;
}

function semana_(id, crear) {
  var s = buscar_('ClashSemanas', function (x) { return x.id === id; });
  if (!s && crear) {
    insertar_('ClashSemanas', { id: id, estado: 'abierta', tam_equipo: 4, publicado_en: '', puesto: '', puntos: '', notas: '' });
    s = buscar_('ClashSemanas', function (x) { return x.id === id; });
  }
  return s;
}

function poderPrincipal_(miembro, advs) {
  var a = advs[miembro.adventurer_principal_id];
  return { poder: a ? Number(a.poder_total) || 0 : 0, adventurer_id: a ? a.id : '' };
}

function indiceAdventurers_() {
  var advs = {};
  leer_('Adventurers').forEach(function (a) { advs[a.id] = a; });
  return advs;
}

/** GET clash: semana + asistencia + equipos. */
function verClash_(p) {
  var id = p.semana ? validarSemanaId_(p.semana) : semanaVigente_();
  var s = semana_(id, false) || { id: id, estado: 'abierta', tam_equipo: 4, publicado_en: '', puesto: '', puntos: '', notas: '' };
  var miembros = {};
  miembrosActivos_().forEach(function (m) { miembros[m.id] = m; });
  var advs = indiceAdventurers_();
  var ficha = function (miembroId, poderSnap) {
    var m = miembros[miembroId];
    if (!m) return null;
    var a = advs[m.adventurer_principal_id];
    return { miembro_id: m.id, nick: m.nick, avatar_id: m.avatar_id, pais: m.pais, poder: poderSnap,
      adventurer: a ? elegir_(a, ['adventurer', 'arma', 'elemento', 'tipo']) : null };
  };
  var asistencia = filtrar_('ClashAsistencia', function (x) { return x.semana_id === id; })
    .map(function (x) {
      var f = ficha(x.miembro_id, x.poder_snapshot);
      if (f) { f.respuesta = x.respuesta; f.actualizado = x.actualizado; }
      return f;
    }).filter(Boolean);
  var equipos = {};
  filtrar_('ClashEquipos', function (x) { return x.semana_id === id; }).forEach(function (x) {
    var f = ficha(x.miembro_id, x.poder_snapshot);
    if (!f) return;
    f.fijado = x.fijado;
    (equipos[x.equipo] = equipos[x.equipo] || []).push(f);
  });
  return {
    semana: sinFila_(s),
    asistencia: asistencia,
    equipos: Object.keys(equipos).sort(function (a, b) { return a - b; }).map(function (k) {
      var js = equipos[k];
      return { numero: Number(k), jugadores: js, suma: js.reduce(function (t, j) { return t + (j.poder || 0); }, 0) };
    })
  };
}

function historialClash_() {
  return filtrar_('ClashSemanas', function (s) { return s.estado === 'cerrada'; })
    .sort(function (a, b) { return a.id < b.id ? 1 : -1; }).slice(0, 52).map(sinFila_);
}

function asistenciaClash_(token, d) {
  var yo = requerir_(token);
  var id = semanaVigente_();
  var s = semana_(id, true);
  if (s.estado === 'cerrada') fallar_('CERRADA', 'Esta semana de Clash ya está cerrada.');
  var respuesta = enumValido_(d.respuesta, RESPUESTAS, 'respuesta');
  var pp = poderPrincipal_(yo, indiceAdventurers_());
  if (respuesta === 'voy' && !pp.adventurer_id) fallar_('SIN_ADVENTURER', 'Carga tu adventurer principal antes de confirmar.');
  var fila = buscar_('ClashAsistencia', function (x) { return x.semana_id === id && x.miembro_id === yo.id; });
  var datos = { semana_id: id, miembro_id: yo.id, respuesta: respuesta, poder_snapshot: pp.poder,
    adventurer_id: pp.adventurer_id, actualizado: ahoraIso_() };
  if (fila) { datos._fila = fila._fila; actualizar_('ClashAsistencia', datos); } else insertar_('ClashAsistencia', datos);
  invalidarCache_();
  return { semana_id: id, respuesta: respuesta, poder: pp.poder };
}

/**
 * Oficial: guarda los equipos (resultado del algoritmo del navegador + ajustes manuales).
 * d = { semana_id?, equipos: [ [ {miembro_id, fijado?}, … ], … ] }
 */
function guardarEquiposClash_(token, d) {
  var yo = requerir_(token, 'oficial');
  var id = d.semana_id ? validarSemanaId_(d.semana_id) : semanaVigente_();
  var s = semana_(id, true);
  if (s.estado === 'cerrada') fallar_('CERRADA', 'Esta semana de Clash ya está cerrada.');
  if (!Array.isArray(d.equipos) || !d.equipos.length || d.equipos.length > 30) fallar_('DATO_INVALIDO', 'Equipos inválidos.');
  var tam = Number(s.tam_equipo) || 4;
  var miembros = {};
  miembrosActivos_().forEach(function (m) { miembros[m.id] = m; });
  var advs = indiceAdventurers_();
  var vistos = {};
  var filas = [];
  d.equipos.forEach(function (eq, i) {
    if (!Array.isArray(eq) || eq.length > tam) fallar_('DATO_INVALIDO', 'El equipo ' + (i + 1) + ' tiene más de ' + tam + ' jugadores.');
    eq.forEach(function (j) {
      var m = miembros[j && j.miembro_id];
      if (!m) fallar_('DATO_INVALIDO', 'Miembro desconocido en el equipo ' + (i + 1) + '.');
      if (vistos[m.id]) fallar_('DATO_INVALIDO', m.nick + ' está en dos equipos.');
      vistos[m.id] = true;
      filas.push({ semana_id: id, equipo: i + 1, miembro_id: m.id, poder_snapshot: poderPrincipal_(m, advs).poder, fijado: !!j.fijado });
    });
  });
  borrarFilas_('ClashEquipos', filtrar_('ClashEquipos', function (x) { return x.semana_id === id; }));
  var h = hoja_('ClashEquipos');
  if (filas.length) {
    h.getRange(h.getLastRow() + 1, 1, filas.length, columnas_('ClashEquipos').length)
      .setValues(filas.map(function (f) { return filaDe_('ClashEquipos', f); }));
    delete memoTablas_.ClashEquipos;
  }
  s.estado = 'armada';
  s.publicado_en = ahoraIso_();
  actualizar_('ClashSemanas', s);
  log_(yo.id, 'clash_equipos', 'ClashSemanas', id, filas.length + ' jugadores en ' + d.equipos.length + ' equipos');
  invalidarCache_();
  return verClash_({ semana: id });
}

function cerrarClash_(token, d) {
  var yo = requerir_(token, 'oficial');
  var id = validarSemanaId_(d.semana_id || semanaVigente_());
  var s = semana_(id, true);
  s.puesto = numeroValido_(d.puesto, 1, 100000, 'puesto', true);
  s.puntos = numeroValido_(d.puntos, 0, 1e9, 'puntos', true);
  s.notas = limpiarTexto_(d.notas, 500);
  s.estado = 'cerrada';
  actualizar_('ClashSemanas', s);
  log_(yo.id, 'clash_cerrado', 'ClashSemanas', id);
  invalidarCache_();
  return sinFila_(s);
}
