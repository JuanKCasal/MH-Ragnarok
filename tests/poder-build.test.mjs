// v10 (E3): el Proof of Mastery es del perfil y el poder de la build (5 de 5) alimenta al adventurer.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './gas-mock.mjs';

let E, pepe, pepeId, advId;
const CODIGO = 'ragna-2026';
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.data; };
const err = (r, codigo) => { assert.equal(r.ok, false, 'se esperaba error ' + codigo); assert.equal(r.error.codigo, codigo, r.error.mensaje); };

// "Fire Heavy" de las capturas de Juan: 7228 + 2099 + 220 + 1998 + 5798 = 17343.
const completa = (extra = {}) => ({
  v: 1, camarada: { id: 'kojiro', nv: 80, estrellas: 6, poder: 1998 }, keepsake: { nv: 80, poder: 5798, grabados: [] },
  poder: { equipo: 7228, rostros: 2099, maestria: 220 }, ...extra,
});
const adv = () => ok(E.get({ accion: 'miembro', id: pepeId })).adventurers.find((a) => a.id === advId);

before(() => {
  E = crearEntorno();
  E.run('instalar()');
  E.run(`setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + ${JSON.stringify(CODIGO)}))`);
  const p = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe', pin: '246810' }));
  pepe = p.token; pepeId = p.miembro.id;
  advId = ok(E.post('adventurer.guardar', { adventurer: 'Fated', arma: 'heavy_bowgun', poder_total: 16851 }, pepe)).id;
});

test('instalar agrega las columnas nuevas al final (Miembros.maestria, Adventurers.poder_build_id)', () => {
  const libro = Object.values(E.libros)[0];
  const cab = (n, cols) => libro.getSheetByName(n).getRange(1, 1, 1, cols).getValues()[0];
  assert.equal(cab('Miembros', 14).at(-1), 'maestria');
  assert.equal(cab('Adventurers', 17).at(-1), 'poder_build_id');
});

test('una build incompleta no toca el poder del adventurer', () => {
  ok(E.post('build.guardar', { nombre: 'A medias', adventurer_id: advId, datos: { v: 1, poder: { equipo: 7000 } } }, pepe));
  assert.equal(adv().poder_total, 16851);
  assert.equal(adv().poder_build_id, '');
});

test('build completa: el Proof of Mastery pasa al perfil y el poder al adventurer', () => {
  const b = ok(E.post('build.guardar', { nombre: 'Fire Heavy', adventurer_id: advId, datos: completa() }, pepe));
  const m = ok(E.get({ accion: 'miembro', id: pepeId }));
  assert.equal(m.maestria, 220, 'migrado desde la build');
  const a = adv();
  assert.equal(a.poder_total, 17343);
  assert.equal(a.poder_equipo, 7228);
  assert.equal(a.poder_rostros, 2099);
  assert.equal(a.poder_camarada, 1998);
  assert.equal(a.poder_build_id, b.id);
  const lista = ok(E.get({ accion: 'builds', miembro: pepeId }));
  assert.deepEqual(lista[0].autor, { id: pepeId, nick: 'Pepe', maestria: 220 });
});

test('el perfil manda sobre la build: cambiar el Proof of Mastery rehace el poder', () => {
  err(E.post('perfil.guardar', { maestria: -5 }, pepe), 'DATO_INVALIDO');
  const yo = ok(E.post('perfil.guardar', { maestria: 300 }, pepe));
  assert.equal(yo.maestria, 300);
  assert.equal(adv().poder_total, 17423, 'la build sigue diciendo 220, pero manda el perfil');
  // Una build nueva con otro valor no pisa el del perfil.
  ok(E.post('build.guardar', { nombre: 'Débil', adventurer_id: advId, datos: completa({ poder: { equipo: 5000, rostros: 2000, maestria: 1 } }) }, pepe));
  assert.equal(ok(E.get({ accion: 'miembro', id: pepeId })).maestria, 300);
});

test('manda la build más fuerte; el formulario del adventurer no pisa ese poder', () => {
  const fuerte = ok(E.post('build.guardar', { nombre: 'Fuerte', adventurer_id: advId, datos: completa({ poder: { equipo: 9000, rostros: 2099 } }) }, pepe));
  assert.equal(adv().poder_total, 9000 + 2099 + 300 + 1998 + 5798);
  assert.equal(adv().poder_build_id, fuerte.id);
  ok(E.post('adventurer.guardar', { id: advId, adventurer: 'Fated', arma: 'heavy_bowgun', poder_total: 1 }, pepe));
  assert.equal(adv().poder_total, 9000 + 2099 + 300 + 1998 + 5798);
  // Desligarla: vuelve la siguiente más fuerte (Fire Heavy).
  ok(E.post('build.guardar', { id: fuerte.id, nombre: 'Fuerte', adventurer_id: '', datos: completa({ poder: { equipo: 9000, rostros: 2099 } }) }, pepe));
  assert.equal(adv().poder_total, 17423);
});

test('sin builds completas el adventurer conserva el último poder y vuelve a ser a mano', () => {
  for (const b of ok(E.get({ accion: 'builds', miembro: pepeId }))) {
    if (b.adventurer_id === advId) ok(E.post('build.eliminar', { id: b.id }, pepe));
  }
  const a = adv();
  assert.equal(a.poder_build_id, '');
  assert.equal(a.poder_total, 17423);
  ok(E.post('adventurer.guardar', { id: advId, adventurer: 'Fated', arma: 'heavy_bowgun', poder_total: 15000 }, pepe));
  assert.equal(adv().poder_total, 15000);
});

test('Clash: hasta cerrar la semana manda el poder actual del principal (no la foto de cuando confirmó)', () => {
  const r = ok(E.post('clash.asistencia', { respuesta: 'voy' }, pepe));
  assert.equal(r.poder, 15000);
  // Mejora después de confirmar: una build completa sube el poder del principal.
  ok(E.post('build.guardar', { nombre: 'Nueva', adventurer_id: advId, datos: completa() }, pepe));
  const nuevo = 7228 + 2099 + 300 + 1998 + 5798;
  const c = ok(E.get({ accion: 'clash' }));
  assert.equal(c.asistencia.find((x) => x.miembro_id === pepeId).poder, nuevo, 'el armado ve el poder nuevo sin volver a confirmar');
});
