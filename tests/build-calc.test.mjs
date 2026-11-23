import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  indexarCatalogo, calcular, diferencia, conPieza, buscarPiezas, rarezaDe, enRareza, nombreEn,
  habilidadesDePieza, limpiarBuild, resumenParaGuardar, buildVacia, PARTES,
} from '../site/js/build-calc.js';
import { ARCHIVOS } from '../site/js/catalogo.js';

const raw = Object.fromEntries(ARCHIVOS.map((n) => [n, JSON.parse(readFileSync(new URL(`../site/data/catalogo/${n}.json`, import.meta.url), 'utf8'))]));
const cat = indexarCatalogo(raw);

// Piezas reales del catálogo (sets de 3 piezas: Rathalos's Weakness y Anjanath Ember).
const RATH = ['rathalos-helm-ii', 'rathalos-mail-ii', 'rathalos-vambraces-ii', 'rathalos-coil-ii', 'rathalos-greaves-ii'];
const ANJA = ['anja-helm-i', 'anja-mail-i', 'anja-vambraces-i', 'anja-coil-i', 'anja-greaves-i'];
const build = (ids, r = 13, extra = {}) => ({ v: 1, piezas: Object.fromEntries(PARTES.map((p, i) => [p, { id: ids[i], r }]).filter(([, x]) => x.id)), ...extra });

test('rareza: se ajusta al rango de la pieza; sin dato, la máxima', () => {
  const p = cat.armaduras.get('rathalos-helm-ii');
  assert.equal(rarezaDe(p, 3), 6);
  assert.equal(rarezaDe(p, 20), 14);
  assert.equal(rarezaDe(p, ''), 14);
  assert.equal(rarezaDe(p, 13), 13);
  assert.equal(enRareza(p.def, p, 13), p.def[13 - 6]);
  assert.equal(nombreEn(p, 13), 'Rathalos Helm V');
  assert.equal(nombreEn(p, 6), 'Rathalos Helm II');
  assert.equal(habilidadesDePieza(p, 7).length, 2);
  assert.equal(habilidadesDePieza(p, 13).length, 3);
});

test('build vacía: todo en cero y sin avisos', () => {
  const c = calcular(cat, buildVacia());
  assert.equal(c.def, 0);
  assert.equal(c.atk, 0);
  assert.deepEqual(c.habilidades, []);
  assert.deepEqual(c.sets, []);
  assert.deepEqual(c.avisos, []);
});

test('defensa y habilidades suman por pieza; el aporte queda por parte', () => {
  const c = calcular(cat, build(RATH));
  const esperada = RATH.reduce((s, id) => { const p = cat.armaduras.get(id); return s + p.def[13 - p.rmin]; }, 0);
  assert.equal(c.def, esperada);
  const fuego = c.habilidades.find((h) => h.id === 'fire-damage-up');
  assert.ok(fuego, 'Rathalos da Fire Damage Up');
  const suma = PARTES.reduce((s, p) => s + (fuego.aportes[p] || 0), 0) + (fuego.aportes.set || 0);
  assert.equal(fuego.suma, suma);
  assert.equal(fuego.nivel, Math.min(fuego.suma, fuego.max));
  assert.equal(fuego.sobra, Math.max(0, fuego.suma - fuego.max));
});

test('set: activo con las piezas necesarias y suma su habilidad como aporte "set"', () => {
  const tres = calcular(cat, build(RATH.slice(0, 3)));
  const set = tres.sets.find((s) => s.id === 'rathalos-weakness');
  assert.equal(set.puestas, 3);
  assert.equal(set.necesarias, 3);
  assert.equal(set.activo, true);
  assert.equal(tres.habilidades.find((h) => h.id === 'weakspot-exploit')?.aportes.set, 1);
  assert.equal(tres.resumen.setsListos, 1);

  const dos = calcular(cat, build(RATH.slice(0, 2)));
  const s2 = dos.sets.find((s) => s.id === 'rathalos-weakness');
  assert.equal(s2.activo, false);
  assert.equal(s2.faltan, 1);
  assert.equal(dos.resumen.setsAUna, 1);
  assert.equal(dos.habilidades.find((h) => h.id === 'weakspot-exploit')?.aportes.set, undefined);
});

test('arma: ataque, afinidad en %, elemento y habilidad innata', () => {
  const w = cat.armas.get('carapace-buster-i');
  const c = calcular(cat, { v: 1, arma: { id: w.id, r: 14 }, piezas: {} });
  assert.equal(c.atk, 1262);
  assert.equal(c.afi, -3);
  assert.equal(c.ele, null);
  assert.equal(c.estado.tipo, 'paralysis');

  const conInnato = cat.lista.armas.find((x) => x.innato && x.ele);
  const c2 = calcular(cat, { v: 1, arma: { id: conInnato.id, r: 14 }, piezas: {} });
  assert.equal(c2.ele.tipo, conInnato.ele.tipo);
  assert.equal(c2.habilidades[0].id, conInnato.innato.hab);
  assert.equal(c2.habilidades[0].aportes.arma, conInnato.innato.nv);
});

test('avisos: ids que no existen, pieza en la parte equivocada y arma de otro tipo', () => {
  const c = calcular(cat, {
    v: 1, adv: { id: 'fated-adventurer-bow' }, arma: { id: 'carapace-buster-i', r: 14 },
    piezas: { head: { id: 'no-existe', r: 5 }, chest: { id: 'rathalos-helm-ii', r: 13 } },
  });
  assert.equal(c.avisos.length, 3);
  assert.equal(c.def, 0);
});

test('diferencia: "si la cambias…" separa lo que gana, lo que solo sobra y lo que pierde', () => {
  const antes = calcular(cat, build(RATH));
  const despues = calcular(cat, conPieza(build(RATH), 'legs', 'anja-greaves-i', 13));
  const d = diferencia(antes, despues);
  const pg = cat.armaduras.get('rathalos-greaves-ii');
  const ag = cat.armaduras.get('anja-greaves-i');
  assert.equal(d.def, ag.def[13 - ag.rmin] - pg.def[13 - pg.rmin]);
  assert.ok(d.sets.some((s) => s.id === 'anjanath-ember' && s.antes === 0 && s.despues === 1));
  assert.ok(d.sets.some((s) => s.id === 'rathalos-weakness' && s.antes === 5 && s.despues === 4 && s.efecto === 'igual'));
  for (const h of d.habilidades) {
    assert.notEqual(h.antes, h.despues);
    const ea = Math.min(h.antes, h.max);
    const ed = Math.min(h.despues, h.max);
    assert.equal(h.efecto, ed > ea ? 'gana' : ed < ea ? 'pierde' : 'igual');
  }
  // Misma build → sin diferencias.
  const igual = diferencia(antes, calcular(cat, build(RATH)));
  assert.deepEqual([igual.habilidades, igual.sets, igual.def], [[], [], 0]);
});

test('conPieza no modifica la build original y permite quitar piezas', () => {
  const b = build(RATH);
  const b2 = conPieza(b, 'head', null);
  assert.ok(b.piezas.head);
  assert.equal(b2.piezas.head, undefined);
  const b3 = conPieza(b, 'arma', 'carapace-buster-i', 12);
  assert.deepEqual(b3.arma, { id: 'carapace-buster-i', r: 12 });
  assert.equal(b.arma, undefined);
});

test('buscarPiezas: por parte, texto, monstruo, habilidad y elemento', () => {
  assert.equal(buscarPiezas(cat, { parte: 'legs' }).length, 49);
  const rath = buscarPiezas(cat, { parte: 'legs', monstruo: 'rathalos' });
  assert.ok(rath.length >= 2 && rath.every((p) => p.monstruo === 'rathalos'));
  const fuego = buscarPiezas(cat, { parte: 'legs', hab: 'fire-damage-up', r: 13 });
  assert.ok(fuego.length > 0 && fuego.every((p) => habilidadesDePieza(p, 13).some(([h]) => h === 'fire-damage-up')));
  const elem = buscarPiezas(cat, { parte: 'legs', elemento: 'fire', r: 13 });
  assert.ok(elem.length >= fuego.length);
  assert.ok(buscarPiezas(cat, { parte: 'legs', texto: 'ráthalos' }).some((p) => p.id === 'rathalos-greaves-ii'));
  assert.ok(buscarPiezas(cat, { parte: 'legs', texto: 'Fire Damage' }).length > 0);
  const otros = buscarPiezas(cat, { parte: 'legs', monstruo: 'otros' });
  assert.ok(otros.length > 0 && otros.every((p) => !p.monstruo));

  const armas = buscarPiezas(cat, { parte: 'arma', arma: 'bow' });
  assert.equal(armas.length, 38);
  assert.ok(buscarPiezas(cat, { parte: 'arma', arma: 'bow', elemento: 'none' }).every((w) => !w.ele));
});

test('limpiarBuild descarta lo desconocido y ajusta rarezas; resumenParaGuardar', () => {
  const b = limpiarBuild(cat, {
    v: 1, adv: { id: 'fated-adventurer-great-sword', nivel: 99 }, arma: { id: 'carapace-buster-i', r: 30 },
    piezas: { head: { id: 'rathalos-helm-ii', r: 1 }, chest: { id: 'rathalos-helm-ii', r: 9 }, legs: { id: 'x', r: 3 } },
  });
  assert.deepEqual(b, { v: 1, adv: { id: 'fated-adventurer-great-sword' }, arma: { id: 'carapace-buster-i', r: 14 },
    piezas: { head: { id: 'rathalos-helm-ii', r: 6 } } });
  assert.deepEqual(resumenParaGuardar(cat, b), { arma_tipo: 'great_sword', elemento: 'none' });
  assert.deepEqual(resumenParaGuardar(cat, { adv: { id: 'fated-adventurer-bow' } }), { arma_tipo: 'bow', elemento: 'none' });
});

test('todas las piezas del catálogo se calculan sin avisos en su rareza mínima y máxima', () => {
  for (const p of cat.lista.armaduras) {
    for (const r of [p.rmin, p.rmax]) {
      assert.deepEqual(calcular(cat, { v: 1, piezas: { [p.parte]: { id: p.id, r } } }).avisos, [], p.id);
    }
  }
  for (const w of cat.lista.armas) assert.deepEqual(calcular(cat, { v: 1, arma: { id: w.id, r: w.rmax }, piezas: {} }).avisos, [], w.id);
});
