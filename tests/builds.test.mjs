import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './gas-mock.mjs';

let E, admin, pepe, pepeId, ana, advId;
const CODIGO = 'ragna-2026';
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.data; };
const err = (r, codigo) => { assert.equal(r.ok, false, 'se esperaba error ' + codigo); assert.equal(r.error.codigo, codigo, r.error.mensaje); };

const DATOS = {
  v: 1, adv: { id: 'fated-adventurer-heavy-bowgun', nivel: 70 }, arma: { id: 'blazing-assault-i', r: 14 },
  piezas: { head: { id: 'rathalos-helm-ii', r: 13 }, legs: { id: 'anja-greaves-i', r: 13 } },
  rostros: { nucleo: { id: 'x' } }, extra: 'se descarta',
};

before(() => {
  E = crearEntorno();
  E.run('instalar()');
  E.run(`setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + ${JSON.stringify(CODIGO)}))`);
  E.run(`crearAdmin_('Juan', '135790')`);
  admin = ok(E.post('login', { nick: 'juan', pin: '135790' })).token;
  const p = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe', pin: '246810' }));
  pepe = p.token; pepeId = p.miembro.id;
  ana = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Ana', pin: '246810' })).token;
  advId = ok(E.post('adventurer.guardar', { adventurer: 'Fated', arma: 'heavy_bowgun', poder_total: 16851 }, pepe)).id;
});

test('instalar agrega la hoja Builds sin tocar las demás', () => {
  const libro = Object.values(E.libros)[0];
  const h = libro.getSheetByName('Builds');
  assert.ok(h);
  assert.equal(h.getRange(1, 1, 1, 13).getValues()[0].join(','),
    'id,miembro_id,clase,adventurer_id,nombre,arma_tipo,elemento,datos,catalogo_version,poder_estimado,notas,creado,actualizado');
});

test('guardar: composición limpia, validaciones y lectura pública', () => {
  err(E.post('build.guardar', { nombre: 'X', datos: DATOS }), 'SIN_SESION');
  err(E.post('build.guardar', { nombre: '', datos: DATOS }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: { v: 2 } }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: '{roto' }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: { v: 1, piezas: { cabeza: { id: 'a', r: 3 } } } }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: { v: 1, piezas: { head: { id: 'A B', r: 3 } } } }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: { v: 1, arma: { id: 'a', r: 15 } } }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: DATOS, arma_tipo: 'espada' }, pepe), 'DATO_INVALIDO');
  err(E.post('build.guardar', { nombre: 'X', datos: DATOS, clase: 'ejemplo' }, pepe), 'SIN_PERMISO');

  const b = ok(E.post('build.guardar', { nombre: 'Fire Heavy', datos: DATOS, adventurer_id: advId, arma_tipo: 'heavy_bowgun',
    elemento: 'fire', catalogo_version: '2026-11-23', poder_estimado: 16700, notas: 'Para Rathalos' }, pepe));
  assert.equal(b.clase, 'perfil');
  assert.deepEqual(b.datos, { v: 1, adv: DATOS.adv, arma: DATOS.arma, piezas: DATOS.piezas,
    rostros: { nucleo: { id: 'x', cal: 'superior', nv: 10 }, cartas: [null, null, null, null], maestria: true } });

  const lista = ok(E.get({ accion: 'builds', miembro: pepeId }));
  assert.equal(lista.length, 1);
  assert.equal(lista[0].autor.nick, 'Pepe');
  assert.equal(ok(E.get({ accion: 'build', id: b.id })).nombre, 'Fire Heavy');
  err(E.get({ accion: 'build', id: 'nada' }), 'NO_EXISTE');
  err(E.get({ accion: 'builds' }), 'DATO_INVALIDO');
});

test('rostros (E4): núcleo + 4 cartas con calidad y nivel; valida forma y rangos', () => {
  const R = { nucleo: { id: 'kushala-daora', cal: 'superior', nv: 10 },
    cartas: [{ id: 'barnos', cal: 'epic', nv: 7 }, null, { id: 'kelbi', cal: 'fine', nv: 1 }], maestria: false };
  const b = ok(E.post('build.guardar', { nombre: 'Rostros', datos: { v: 1, rostros: R } }, pepe));
  assert.deepEqual(b.datos.rostros, { nucleo: R.nucleo, cartas: [R.cartas[0], null, R.cartas[2], null], maestria: false });
  const sinCartas = ok(E.post('build.guardar', { id: b.id, nombre: 'Rostros', datos: { v: 1, rostros: { cartas: [] } } }, pepe));
  assert.equal(sinCartas.datos.rostros, undefined);
  const mal = (rostros) => err(E.post('build.guardar', { nombre: 'X', datos: { v: 1, rostros } }, pepe), 'DATO_INVALIDO');
  mal({ nucleo: { id: 'kushala-daora', cal: 'legendaria', nv: 1 } });
  mal({ nucleo: { id: 'kelbi', cal: 'fine', nv: 2 } });
  mal({ cartas: [{ id: 'barnos', nv: 11 }] });
  mal({ cartas: [{ id: 'Barnos X' }] });
  mal({ cartas: [null, null, null, null, { id: 'barnos' }] });
  ok(E.post('build.eliminar', { id: b.id }, pepe));
});

test('adventurer_id debe ser del dueño; al borrar el adventurer la build queda suelta', () => {
  const ajeno = ok(E.post('adventurer.guardar', { adventurer: 'Midori', arma: 'long_sword', poder_total: 9000 }, ana)).id;
  err(E.post('build.guardar', { nombre: 'X', datos: DATOS, adventurer_id: ajeno }, pepe), 'DATO_INVALIDO');
  const otro = ok(E.post('adventurer.guardar', { adventurer: 'Pyro', arma: 'great_sword', poder_total: 8000 }, pepe)).id;
  const b = ok(E.post('build.guardar', { nombre: 'Pyro GS', datos: { v: 1 }, adventurer_id: otro }, pepe));
  assert.equal(b.adventurer_id, otro);
  ok(E.post('adventurer.eliminar', { id: otro }, pepe));
  assert.equal(ok(E.get({ accion: 'build', id: b.id })).adventurer_id, '');
  ok(E.post('build.eliminar', { id: b.id }, pepe));
});

test('permisos: nadie edita ni borra builds ajenas salvo oficiales; ejemplos solo oficiales', () => {
  const b = ok(E.get({ accion: 'builds', miembro: pepeId }))[0];
  err(E.post('build.guardar', { id: b.id, nombre: 'Robada', datos: DATOS }, ana), 'SIN_PERMISO');
  err(E.post('build.eliminar', { id: b.id }, ana), 'SIN_PERMISO');
  const editada = ok(E.post('build.guardar', { id: b.id, nombre: 'Corregida', datos: DATOS }, admin));
  assert.equal(editada.miembro_id, pepeId);
  assert.equal(editada.adventurer_id, '');

  const ej = ok(E.post('build.guardar', { nombre: 'Ejemplo arco', datos: { v: 1 }, clase: 'ejemplo', adventurer_id: advId }, admin));
  assert.equal(ej.clase, 'ejemplo');
  assert.equal(ej.adventurer_id, '');
  const ejemplos = ok(E.get({ accion: 'builds', clase: 'ejemplo' }));
  assert.deepEqual(ejemplos.map((x) => x.id), [ej.id]);
  assert.equal(ok(E.get({ accion: 'builds', miembro: pepeId })).length, 1, 'los ejemplos no salen en el perfil');
});

test('límite de 10 builds de perfil por miembro', () => {
  const ya = ok(E.get({ accion: 'builds', miembro: pepeId })).length;
  for (let i = ya; i < 10; i++) ok(E.post('build.guardar', { nombre: `B${i}`, datos: { v: 1 } }, pepe));
  err(E.post('build.guardar', { nombre: 'Once', datos: { v: 1 } }, pepe), 'LIMITE');
  // Editar una existente sigue permitido.
  const una = ok(E.get({ accion: 'builds', miembro: pepeId }))[0];
  ok(E.post('build.guardar', { id: una.id, nombre: 'Editada', datos: { v: 1 } }, pepe));
});

test('tamaño máximo de la composición', () => {
  const piezas = {};
  for (const p of ['head', 'chest', 'arms', 'waist', 'legs']) piezas[p] = { id: 'x'.repeat(80), r: 14 };
  // 5 ids de 80 caracteres caben de sobra: el límite protege la hoja, no las builds reales.
  const r = E.post('build.guardar', { id: ok(E.get({ accion: 'builds', miembro: pepeId }))[0].id, nombre: 'Larga', datos: { v: 1, piezas } }, pepe);
  ok(r);
});
