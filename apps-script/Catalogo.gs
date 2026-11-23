/**
 * Nombres en español del catálogo del builder (E6). Ver docs/BUILDER.md §12.
 * El catálogo estático (site/data/catalogo) trae los nombres de GameWith es-MX "por confirmar";
 * la hoja Catalogo guarda encima las correcciones y confirmaciones de los oficiales (validado = TRUE).
 * Armas y armaduras se corrigen por nombre base EN (sin número romano ni elemento): id = slug de ese nombre.
 */

var TIPOS_NOMBRE = ['arma', 'pieza', 'habilidad', 'set', 'monstruo'];
var MAX_NOMBRE_ES = 80;

/** GET catalogo_nombres: todas las correcciones (la hoja es chica: a lo más unos cientos de filas). */
function listarNombres_() {
  var nicks = {};
  leer_('Miembros').forEach(function (m) { nicks[m.id] = m.nick; });
  return leer_('Catalogo').filter(function (x) { return TIPOS_NOMBRE.indexOf(x.tipo) !== -1 && x.nombre_es; })
    .map(function (x) {
      var extra = {};
      try { extra = JSON.parse(x.extra_json || '{}'); } catch (e) { extra = {}; }
      return { tipo: x.tipo, id: x.id, es: x.nombre_es, en: x.nombre_en, validado: x.validado,
        por: nicks[x.creado_por] || '', fecha: extra.fecha || '' };
    });
}

/**
 * POST catalogo.nombre {tipo, id, en, es} (oficiales).
 * es con texto → guarda/reemplaza y queda confirmado. es vacío → quita la corrección (vuelve el de GameWith).
 */
function guardarNombre_(token, d) {
  var yo = requerir_(token, 'oficial');
  var tipo = enumValido_(d.tipo, TIPOS_NOMBRE, 'tipo');
  var id = idCatalogo_(d.id, 'id');
  var es = limpiarTexto_(d.es, MAX_NOMBRE_ES).replace(/\s+/g, ' ');
  var en = limpiarTexto_(d.en, MAX_NOMBRE_ES);
  var fila = buscar_('Catalogo', function (x) { return x.tipo === tipo && x.id === id; });
  if (!es) {
    if (fila) borrarFilas_('Catalogo', [fila]);
    log_(yo.id, 'nombre_quitado', 'Catalogo', tipo + ':' + id);
    invalidarCache_();
    return { tipo: tipo, id: id, quitado: true };
  }
  var nuevo = !fila;
  if (nuevo) fila = { tipo: tipo, id: id };
  fila.nombre_es = es;
  fila.nombre_en = en || fila.nombre_en || '';
  fila.extra_json = JSON.stringify({ fecha: ahoraIso_() });
  fila.validado = true;
  fila.creado_por = yo.id;
  if (nuevo) insertar_('Catalogo', fila); else actualizar_('Catalogo', fila);
  log_(yo.id, 'nombre_guardado', 'Catalogo', tipo + ':' + id, es);
  invalidarCache_();
  return { tipo: tipo, id: id, es: es, en: fila.nombre_en, validado: true, por: yo.nick, fecha: JSON.parse(fila.extra_json).fecha };
}
