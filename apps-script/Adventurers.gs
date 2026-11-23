/** Adventurers (build resumen, Fase 1). Ver SPEC.md §5.4. */

var MAX_CAPTURAS = 5;
var MAX_ADVENTURERS = 30;

function guardarAdventurer_(token, d) {
  var yo = requerir_(token);
  var ahora = ahoraIso_();
  var a;
  if (d.id) {
    a = buscar_('Adventurers', function (x) { return x.id === d.id; });
    if (!a) fallar_('NO_EXISTE', 'Adventurer no encontrado.');
    if (a.miembro_id !== yo.id && NIVEL_ROL[yo.rol] < NIVEL_ROL.oficial) fallar_('SIN_PERMISO', 'Solo puedes editar tus adventurers.');
  } else {
    if (filtrar_('Adventurers', function (x) { return x.miembro_id === yo.id; }).length >= MAX_ADVENTURERS) {
      fallar_('LIMITE', 'Llegaste al máximo de ' + MAX_ADVENTURERS + ' adventurers.');
    }
    a = { id: nuevoId_(), miembro_id: yo.id, creado: ahora, capturas: '' };
  }

  var nombre = limpiarTexto_(d.adventurer, 40);
  if (!nombre) fallar_('DATO_INVALIDO', 'Indica el nombre del adventurer.');
  a.adventurer = nombre;
  a.arma = enumValido_(d.arma, ARMAS, 'arma');
  a.elemento = enumValido_(d.elemento || 'none', ELEMENTOS, 'elemento');
  a.tipo = d.tipo ? enumValido_(d.tipo, TIPOS_ADV, 'tipo') : '';
  a.nivel = numeroValido_(d.nivel, 1, 80, 'nivel', true);
  a.poder_total = numeroValido_(d.poder_total, 0, 999999, 'poder total', false);
  a.poder_equipo = numeroValido_(d.poder_equipo, 0, 999999, 'poder de equipo', true);
  a.poder_rostros = numeroValido_(d.poder_rostros, 0, 999999, 'poder de Rostros', true);
  a.poder_camarada = numeroValido_(d.poder_camarada, 0, 999999, 'poder de camarada', true);
  a.loadout = limpiarTexto_(d.loadout, 40);
  a.notas = limpiarTexto_(d.notas, 500);

  if (d.capturas !== undefined) {
    var nuevas = (Array.isArray(d.capturas) ? d.capturas : []).map(function (x) { return limpiarTexto_(x, 80); })
      .filter(String).slice(0, MAX_CAPTURAS);
    var antes = a.capturas ? String(a.capturas).split(',').filter(String) : [];
    nuevas.forEach(function (id) { if (antes.indexOf(id) === -1) validarImagenPropia_(id, a.miembro_id, 'captura'); });
    antes.forEach(function (id) { if (nuevas.indexOf(id) === -1) enviarAPapelera_(id); });
    a.capturas = nuevas.join(',');
  }
  a.actualizado = ahora;

  if (a._fila) actualizar_('Adventurers', a); else insertar_('Adventurers', a);

  // Si es el primero del miembro, queda como principal.
  var dueno = buscar_('Miembros', function (x) { return x.id === a.miembro_id; });
  if (dueno && !dueno.adventurer_principal_id) {
    dueno.adventurer_principal_id = a.id;
    dueno.actualizado = ahora;
    actualizar_('Miembros', dueno);
  }
  log_(yo.id, d.id ? 'adventurer_editado' : 'adventurer_creado', 'Adventurers', a.id);
  invalidarCache_();
  return advPublico_(a);
}

function eliminarAdventurer_(token, d) {
  var yo = requerir_(token);
  var a = buscar_('Adventurers', function (x) { return x.id === d.id; });
  if (!a) fallar_('NO_EXISTE', 'Adventurer no encontrado.');
  if (a.miembro_id !== yo.id && NIVEL_ROL[yo.rol] < NIVEL_ROL.oficial) fallar_('SIN_PERMISO', 'Solo puedes borrar tus adventurers.');
  String(a.capturas || '').split(',').filter(String).forEach(enviarAPapelera_);
  borrarFilas_('Adventurers', [a]);
  desvincularBuilds_(a.id);
  var dueno = buscar_('Miembros', function (x) { return x.id === a.miembro_id; });
  if (dueno && dueno.adventurer_principal_id === a.id) {
    var otro = filtrar_('Adventurers', function (x) { return x.miembro_id === dueno.id; })
      .sort(function (x, y) { return (y.poder_total || 0) - (x.poder_total || 0); })[0];
    dueno.adventurer_principal_id = otro ? otro.id : '';
    dueno.actualizado = ahoraIso_();
    actualizar_('Miembros', dueno);
  }
  log_(yo.id, 'adventurer_eliminado', 'Adventurers', a.id);
  invalidarCache_();
  return { eliminado: true };
}

function marcarPrincipal_(token, d) {
  var yo = requerir_(token);
  var a = buscar_('Adventurers', function (x) { return x.id === d.id && x.miembro_id === yo.id; });
  if (!a) fallar_('NO_EXISTE', 'Adventurer no encontrado.');
  yo.adventurer_principal_id = a.id;
  yo.actualizado = ahoraIso_();
  actualizar_('Miembros', sinToken_(yo));
  invalidarCache_();
  return { principal: a.id };
}

/** Quita la marca interna de sesión antes de guardar un miembro que vino de requerir_(). */
function sinToken_(m) {
  delete m._token_hash;
  return m;
}
