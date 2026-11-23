import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage mínimo para los borradores locales (en Node no existe).
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  key: (i) => [...almacen.keys()][i] ?? null,
  get length() { return almacen.size; },
};
// Entrar importa el router, que importa los relojes (escuchan visibilitychange al cargar).
globalThis.document ??= { addEventListener() {}, hidden: false };

const { aplicarFormato } = await import('../site/js/editor-formato.js');
const { validarContenido } = await import('../site/js/validar.js');
const { destino } = await import('../site/js/views/entrar.js');
const { leerBorrador, guardarBorrador, borrarBorrador } = await import('../site/js/borradores.js');
const demo = await import('../site/js/demo-data.js');

const sel = (r) => r.texto.slice(r.inicio, r.fin);

test('formato: negrita y cursiva envuelven la selección y funcionan como interruptor', () => {
  let r = aplicarFormato('hola mundo', 0, 4, 'negrita');
  assert.equal(r.texto, '**hola** mundo');
  assert.equal(sel(r), 'hola');
  r = aplicarFormato(r.texto, r.inicio, r.fin, 'negrita');
  assert.equal(r.texto, 'hola mundo');
  assert.equal(aplicarFormato('ver esto ', 4, 9, 'cursiva').texto, 'ver *esto* ', 'el espacio del borde queda fuera');
  r = aplicarFormato('', 0, 0, 'negrita');
  assert.equal(r.texto, '**texto**');
  assert.equal(sel(r), 'texto');
});

test('formato: listas, títulos y citas trabajan por línea y separan del párrafo anterior', () => {
  let r = aplicarFormato('Intro\nuno\ndos', 6, 13, 'lista');
  assert.equal(r.texto, 'Intro\n\n- uno\n- dos');
  assert.equal(aplicarFormato(r.texto, r.inicio, r.fin, 'lista').texto, 'Intro\n\nuno\ndos', 'quitar la lista');
  assert.equal(aplicarFormato('a\n\nPaso\nOtro', 3, 12, 'numerada').texto, 'a\n\n1. Paso\n2. Otro');
  assert.equal(aplicarFormato('- uno', 0, 5, 'numerada').texto, '1. uno', 'cambia viñeta por número');
  r = aplicarFormato('Texto\n', 6, 6, 'titulo');
  assert.equal(r.texto, 'Texto\n\n## ');
  assert.equal(r.inicio, r.texto.length, 'el cursor queda listo para escribir');
  assert.equal(aplicarFormato('### Viejo', 2, 2, 'titulo').texto, '## Viejo');
  assert.equal(aplicarFormato('Ojo', 0, 3, 'cita').texto, '> Ojo');
});

test('formato: enlaces', () => {
  let r = aplicarFormato('mira esto', 5, 9, 'enlace');
  assert.equal(r.texto, 'mira [esto](https://)');
  assert.equal(sel(r), 'https://');
  r = aplicarFormato('ver https://x.cl', 4, 16, 'enlace');
  assert.equal(r.texto, 'ver [texto](https://x.cl)');
  assert.equal(sel(r), 'texto');
});

test('validarContenido: noticia', () => {
  const { datos, errores } = validarContenido('noticia', { titulo: '  Hola ', resumen: '', cuerpo_md: 'a\r\nb', tipo: 'juego' });
  assert.deepEqual(errores, {});
  assert.equal(datos.titulo, 'Hola');
  assert.equal(datos.cuerpo_md, 'a\nb');
  assert.equal(datos.tipo, 'juego');
  assert.equal(validarContenido('noticia', { titulo: 'x', tipo: 'raro' }).datos.tipo, 'gremio');
  assert.ok(validarContenido('noticia', { titulo: '' }).errores.titulo);
  assert.ok(validarContenido('noticia', { titulo: 'x'.repeat(121) }).errores.titulo);
  assert.ok(validarContenido('noticia', { titulo: 'x', cuerpo_md: 'y'.repeat(40001) }).errores.cuerpo_md);
});

test('validarContenido: guía (slug, orden, categoría y nivel)', () => {
  const { datos, errores } = validarContenido('guia', { titulo: 'Rostros', slug: 'Guía de Rostros!', orden: '2', categoria: 'rostros', nivel: 'avanzado' });
  assert.deepEqual(errores, {});
  assert.equal(datos.slug, 'guia-de-rostros');
  assert.equal(datos.orden, 2);
  assert.equal(datos.categoria, 'rostros');
  assert.equal(datos.nivel, 'avanzado');
  const b = validarContenido('guia', { titulo: 'x', slug: '', orden: '', categoria: 'nada', nivel: '' }).datos;
  assert.equal(b.slug, '');
  assert.equal(b.orden, 0);
  assert.equal(b.categoria, 'otros');
  assert.equal(b.nivel, 'basico');
  assert.ok(validarContenido('guia', { titulo: 'x', orden: '1.5' }).errores.orden);
  assert.ok(validarContenido('guia', { titulo: 'x', slug: '¡¡!!' }).errores.slug);
});

test('Entrar: "volver" acepta rutas internas con una consulta simple, nada externo', () => {
  assert.equal(destino('editor?tipo=guia'), '/editor?tipo=guia');
  assert.equal(destino('editor/noticia/0abc12def3'), '/editor/noticia/0abc12def3');
  assert.equal(destino('clash/armar'), '/clash/armar');
  for (const malo of ['//evil.com', 'https://x.cl', 'yo?a=<b>', 'yo?a=1&b=2', 'javascript:alert(1)']) assert.equal(destino(malo), '/', malo);
});

test('borradores locales: guardar, leer, borrar y vencer a los 30 días', () => {
  guardarBorrador('noticia', '', { titulo: 'Nueva' });
  guardarBorrador('guia', 'g1', { titulo: 'Cambio' });
  assert.equal(leerBorrador('noticia', '').datos.titulo, 'Nueva');
  assert.equal(leerBorrador('guia', 'g1').datos.titulo, 'Cambio');
  assert.equal(leerBorrador('guia', 'g2'), null);
  borrarBorrador('noticia', '');
  assert.equal(leerBorrador('noticia', ''), null);
  almacen.set('mhr:borrador:guia:viejo', JSON.stringify({ t: Date.now() - 31 * 864e5, datos: { titulo: 'x' } }));
  assert.equal(leerBorrador('guia', 'viejo'), null);
  assert.equal(almacen.has('mhr:borrador:guia:viejo'), false, 'el vencido se limpia');
});

test('demo: un borrador no se ve en la web hasta publicarlo', async () => {
  const n = await demo.escribirDemo('noticia.guardar', { titulo: 'Aviso de prueba', tipo: 'gremio', publicado: false });
  assert.equal(n.publicado, false);
  assert.equal(n.fecha_pub, '');
  const enLista = async () => (await demo.leerDemo('noticias', {})).total;
  const antes = await enLista();
  await assert.rejects(demo.leerDemo('noticia', { id: n.id }), { codigo: 'NO_EXISTE' });
  const lista = await demo.escribirDemo('editor.contenido', { tipo: 'noticia' });
  assert.ok(lista.some((x) => x.id === n.id && !x.publicado), 'el editor sí lo ve');

  const p = await demo.escribirDemo('noticia.guardar', { id: n.id, titulo: 'Aviso de prueba', tipo: 'gremio', publicado: true, fijada: true });
  assert.ok(p.fecha_pub);
  assert.equal(await enLista(), antes + 1);
  assert.equal((await demo.leerDemo('inicio')).noticias[0].id, n.id, 'fijada: primera en el Inicio');

  await demo.escribirDemo('noticia.eliminar', { id: n.id });
  assert.equal(await enLista(), antes);
  await assert.rejects(demo.escribirDemo('noticia.eliminar', { id: n.id }), { codigo: 'NO_EXISTE' });
  await assert.rejects(demo.escribirDemo('noticia.guardar', { titulo: '  ' }), { codigo: 'DATO_INVALIDO' });
});

test('demo: guías con dirección única', async () => {
  const a = await demo.escribirDemo('guia.guardar', { titulo: 'Guild Clash', categoria: 'eventos', publicado: true });
  assert.notEqual(a.slug, 'guild-clash', 'ya existe una guía con esa dirección');
  assert.match(a.slug, /^guild-clash-/);
  const g = await demo.leerDemo('guia', { slug: a.slug });
  assert.equal(g.id, a.id);
  const item = await demo.escribirDemo('editor.contenido', { tipo: 'guia', id: a.id });
  assert.equal(item.categoria, 'eventos');
  await demo.escribirDemo('guia.eliminar', { id: a.id });
});
