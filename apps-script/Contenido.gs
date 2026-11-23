/** Noticias y guías. */

var TIPOS_NOTICIA = ['juego', 'gremio', 'evento'];
var CATEGORIAS_GUIA = ['primeros-pasos', 'armas', 'rostros', 'camaradas', 'eventos', 'otros'];
var NIVELES_GUIA = ['basico', 'intermedio', 'avanzado'];
var POR_PAGINA = 12;

function autores_() {
  var out = {};
  leer_('Miembros').forEach(function (m) { out[m.id] = m.nick; });
  return out;
}

function noticiaPublica_(n, conCuerpo, autores) {
  var o = elegir_(n, ['id', 'titulo', 'resumen', 'tipo', 'portada_id', 'fijada', 'fecha_pub', 'actualizado']);
  o.autor = autores[n.autor_id] || '';
  if (conCuerpo) o.cuerpo_md = n.cuerpo_md;
  return o;
}

function listarNoticias_(p) {
  var autores = autores_();
  var lista = filtrar_('Noticias', function (n) { return n.publicado && (!p.tipo || n.tipo === p.tipo); })
    .sort(function (a, b) {
      if (a.fijada !== b.fijada) return a.fijada ? -1 : 1;
      return a.fecha_pub < b.fecha_pub ? 1 : -1;
    });
  var pagina = Math.max(1, Number(p.pagina) || 1);
  return {
    total: lista.length, pagina: pagina, por_pagina: POR_PAGINA,
    items: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(function (n) { return noticiaPublica_(n, false, autores); })
  };
}

function verNoticia_(id) {
  var n = buscar_('Noticias', function (x) { return x.id === id && x.publicado; });
  if (!n) fallar_('NO_EXISTE', 'Noticia no encontrada.');
  return noticiaPublica_(n, true, autores_());
}

function guardarNoticia_(token, d) {
  var yo = requerir_(token, 'oficial');
  var ahora = ahoraIso_();
  var n = d.id ? buscar_('Noticias', function (x) { return x.id === d.id; }) : null;
  if (d.id && !n) fallar_('NO_EXISTE', 'Noticia no encontrada.');
  if (!n) n = { id: nuevoId_(), autor_id: yo.id, creado: ahora, fecha_pub: '' };
  n.titulo = limpiarTexto_(d.titulo, 120);
  if (!n.titulo) fallar_('DATO_INVALIDO', 'La noticia necesita un título.');
  n.resumen = limpiarTexto_(d.resumen, 280);
  n.cuerpo_md = limpiarTexto_(d.cuerpo_md, 40000);
  n.tipo = enumValido_(d.tipo || 'gremio', TIPOS_NOTICIA, 'tipo');
  if (d.portada_id !== undefined && d.portada_id !== n.portada_id) {
    if (d.portada_id) validarImagenPropia_(d.portada_id, null, 'portada');
    if (n.portada_id) enviarAPapelera_(n.portada_id);
    n.portada_id = limpiarTexto_(d.portada_id, 80);
  }
  n.fijada = !!d.fijada;
  var publicar = !!d.publicado;
  if (publicar && !n.publicado) n.fecha_pub = ahora;
  n.publicado = publicar;
  n.actualizado = ahora;
  if (n._fila) actualizar_('Noticias', n); else insertar_('Noticias', n);
  log_(yo.id, 'noticia_guardada', 'Noticias', n.id);
  invalidarCache_();
  return sinFila_(n);
}

function eliminarNoticia_(token, d) {
  var yo = requerir_(token, 'oficial');
  var n = buscar_('Noticias', function (x) { return x.id === d.id; });
  if (!n) fallar_('NO_EXISTE', 'Noticia no encontrada.');
  if (n.portada_id) enviarAPapelera_(n.portada_id);
  borrarFilas_('Noticias', [n]);
  log_(yo.id, 'noticia_eliminada', 'Noticias', d.id, n.titulo);
  invalidarCache_();
  return { eliminado: true };
}

function guiaPublica_(g, conCuerpo, autores) {
  var o = elegir_(g, ['id', 'slug', 'titulo', 'categoria', 'nivel', 'resumen', 'portada_id', 'orden', 'actualizado']);
  o.autor = autores[g.autor_id] || '';
  if (conCuerpo) o.cuerpo_md = g.cuerpo_md;
  return o;
}

function listarGuias_() {
  var autores = autores_();
  var grupos = {};
  CATEGORIAS_GUIA.forEach(function (c) { grupos[c] = []; });
  filtrar_('Guias', function (g) { return g.publicado; })
    .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0) || (a.titulo < b.titulo ? -1 : 1); })
    .forEach(function (g) { (grupos[g.categoria] || grupos.otros).push(guiaPublica_(g, false, autores)); });
  return CATEGORIAS_GUIA.map(function (c) { return { categoria: c, guias: grupos[c] }; })
    .filter(function (x) { return x.guias.length; });
}

function verGuia_(slug) {
  var g = buscar_('Guias', function (x) { return x.slug === slug && x.publicado; });
  if (!g) fallar_('NO_EXISTE', 'Guía no encontrada.');
  return guiaPublica_(g, true, autores_());
}

function guardarGuia_(token, d) {
  var yo = requerir_(token, 'oficial');
  var ahora = ahoraIso_();
  var g = d.id ? buscar_('Guias', function (x) { return x.id === d.id; }) : null;
  if (d.id && !g) fallar_('NO_EXISTE', 'Guía no encontrada.');
  if (!g) g = { id: nuevoId_(), autor_id: yo.id, creado: ahora };
  g.titulo = limpiarTexto_(d.titulo, 120);
  if (!g.titulo) fallar_('DATO_INVALIDO', 'La guía necesita un título.');
  var slug = slug_(d.slug || g.slug || g.titulo);
  var choque = buscar_('Guias', function (x) { return x.slug === slug && x.id !== g.id; });
  g.slug = choque ? slug + '-' + g.id.slice(0, 4) : slug;
  g.categoria = enumValido_(d.categoria || 'otros', CATEGORIAS_GUIA, 'categoría');
  g.nivel = enumValido_(d.nivel || 'basico', NIVELES_GUIA, 'nivel');
  g.resumen = limpiarTexto_(d.resumen, 280);
  g.cuerpo_md = limpiarTexto_(d.cuerpo_md, 40000);
  if (d.portada_id !== undefined && d.portada_id !== g.portada_id) {
    if (d.portada_id) validarImagenPropia_(d.portada_id, null, 'portada');
    if (g.portada_id) enviarAPapelera_(g.portada_id);
    g.portada_id = limpiarTexto_(d.portada_id, 80);
  }
  g.orden = numeroValido_(d.orden || 0, -9999, 9999, 'orden', false);
  g.publicado = !!d.publicado;
  g.actualizado = ahora;
  if (g._fila) actualizar_('Guias', g); else insertar_('Guias', g);
  log_(yo.id, 'guia_guardada', 'Guias', g.id);
  invalidarCache_();
  return sinFila_(g);
}

function eliminarGuia_(token, d) {
  var yo = requerir_(token, 'oficial');
  var g = buscar_('Guias', function (x) { return x.id === d.id; });
  if (!g) fallar_('NO_EXISTE', 'Guía no encontrada.');
  if (g.portada_id) enviarAPapelera_(g.portada_id);
  borrarFilas_('Guias', [g]);
  log_(yo.id, 'guia_eliminada', 'Guias', d.id, g.titulo);
  invalidarCache_();
  return { eliminado: true };
}

/** Oficial: borradores incluidos, para el editor. */
function contenidoEditor_(token, d) {
  requerir_(token, 'oficial');
  var hoja = d.tipo === 'guia' ? 'Guias' : 'Noticias';
  if (d.id) {
    var x = buscar_(hoja, function (r) { return r.id === d.id; });
    if (!x) fallar_('NO_EXISTE', 'No encontrado.');
    var o = sinFila_(x);
    o.autor = autores_()[x.autor_id] || '';
    return o;
  }
  return leer_(hoja).map(function (r) {
    return elegir_(r, ['id', 'titulo', 'slug', 'tipo', 'categoria', 'nivel', 'orden', 'publicado', 'fijada', 'fecha_pub', 'actualizado']);
  });
}
