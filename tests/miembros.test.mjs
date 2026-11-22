import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarMiembros, puestos, normalizar } from '../site/js/miembros-filtro.js';

const m = (id, nick, p, extra = {}) => ({ id, nick, nick_juego: extra.nick_juego || nick,
  principal: p ? { adventurer: extra.adv || 'Kestrel', arma: extra.arma || 'bow', elemento: extra.elemento || 'fire', tipo: extra.tipo || 'assault', poder_total: p } : null });

const LISTA = [
  m('a', 'Halcón', 12000, { arma: 'heavy_bowgun', tipo: 'support', elemento: 'ice' }),
  m('b', 'Brasa', 15000, { arma: 'great_sword' }),
  m('c', 'Ceniza', 0),
  m('d', 'Akane', 9000, { arma: 'bow', elemento: 'none', adv: 'Senna' }),
];

test('normaliza tildes y mayúsculas', () => assert.equal(normalizar('  HALCÓN '), 'halcon'));

test('orden por poder: sin adventurer al final', () => {
  assert.deepEqual(filtrarMiembros(LISTA).map((x) => x.id), ['b', 'a', 'd', 'c']);
  assert.deepEqual(filtrarMiembros(LISTA, { orden: 'poder_asc' }).map((x) => x.id), ['d', 'a', 'b', 'c']);
  assert.deepEqual(filtrarMiembros(LISTA, { orden: 'nick' }).map((x) => x.id), ['d', 'b', 'c', 'a']);
});

test('busca por nick sin tildes, adventurer y arma en ES o EN', () => {
  assert.deepEqual(filtrarMiembros(LISTA, { q: 'halcon' }).map((x) => x.id), ['a']);
  assert.deepEqual(filtrarMiembros(LISTA, { q: 'senna' }).map((x) => x.id), ['d']);
  assert.deepEqual(filtrarMiembros(LISTA, { q: 'heavy bowgun' }).map((x) => x.id), ['a']);
  assert.deepEqual(filtrarMiembros(LISTA, { q: 'gran espada' }).map((x) => x.id), ['b']);
});

test('filtros combinados (OR dentro del grupo, AND entre grupos) y "sin elemento"', () => {
  assert.deepEqual(filtrarMiembros(LISTA, { armas: new Set(['bow', 'great_sword']) }).map((x) => x.id), ['b', 'd']);
  assert.deepEqual(filtrarMiembros(LISTA, { armas: new Set(['bow', 'great_sword']), elementos: new Set(['fire']) }).map((x) => x.id), ['b']);
  assert.deepEqual(filtrarMiembros(LISTA, { elementos: new Set(['none']) }).map((x) => x.id), ['d']);
  assert.deepEqual(filtrarMiembros(LISTA, { tipos: new Set(['support']) }).map((x) => x.id), ['a']);
});

test('puestos por poder en todo el gremio', () => {
  const p = puestos(LISTA);
  assert.equal(p.get('b'), 1);
  assert.equal(p.get('d'), 3);
  assert.equal(p.has('c'), false);
});

test('demo: directorio y perfiles con la forma de la API', async () => {
  const { leerDemo } = await import('../site/js/demo-data.js');
  const lista = await leerDemo('miembros');
  assert.equal(lista.length, 52);
  assert.ok(lista.every((x, i) => i === 0 || (x.principal?.poder_total ?? 0) <= (lista[i - 1].principal?.poder_total ?? 0)));
  assert.equal(lista.filter((x) => !x.principal).length, 2);
  for (const x of lista.slice(0, 5)) {
    const perfil = await leerDemo('miembro', { id: x.id });
    assert.equal(perfil.id, x.id);
    assert.ok(perfil.adventurers.some((a) => a.id === perfil.adventurer_principal_id));
  }
  await assert.rejects(leerDemo('miembro', { id: 'nadie' }), (e) => e.codigo === 'NO_EXISTE');
});
