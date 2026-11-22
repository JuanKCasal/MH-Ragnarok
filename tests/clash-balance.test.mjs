import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balancearEquipos } from '../site/js/clash-balance.js';

// Generador pseudoaleatorio con semilla (tests reproducibles).
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function jugadores(n, seed = 1) {
  const r = rng(seed);
  const tipos = ['assault', 'disruptor', 'support'];
  const armas = ['great_sword', 'long_sword', 'dual_blades', 'hammer', 'charge_blade', 'lance', 'heavy_bowgun', 'bow'];
  return Array.from({ length: n }, (_, i) => ({
    id: `j${String(i).padStart(2, '0')}`,
    poder: Math.round(8000 + r() * 12000),
    tipo: tipos[Math.floor(r() * 3)],
    arma: armas[Math.floor(r() * 8)],
  }));
}
const ids = (res) => res.equipos.flatMap((e) => e.jugadores.map((j) => j.id)).concat(res.suplentes.map((j) => j.id));

test('52 jugadores → 13 equipos de 4, todos asignados una sola vez', () => {
  const js = jugadores(52);
  const res = balancearEquipos(js);
  assert.equal(res.equipos.length, 13);
  assert.ok(res.equipos.every((e) => e.jugadores.length === 4 && e.completo));
  assert.deepEqual(ids(res).sort(), js.map((j) => j.id).sort());
});

test('el balance es bueno: diferencia máx−mín menor al 3% del promedio por equipo', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const res = balancearEquipos(jugadores(52, seed));
    assert.ok(res.metricas.diferencia / res.metricas.promedioEquipo < 0.03,
      `seed ${seed}: diferencia ${res.metricas.diferencia}`);
  }
});

test('mejor que el greedy simple (o igual)', () => {
  const js = jugadores(40, 7);
  const opt = balancearEquipos(js);
  const sinMejora = balancearEquipos(js, { maxIteraciones: 0 });
  assert.ok(opt.metricas.diferencia <= sinMejora.metricas.diferencia);
});

test('n no múltiplo de 4 → equipos de 3 por defecto', () => {
  const res = balancearEquipos(jugadores(50));
  assert.equal(res.equipos.length, 13);
  const tam = res.equipos.map((e) => e.jugadores.length);
  assert.equal(tam.filter((t) => t === 4).length, 11);
  assert.equal(tam.filter((t) => t === 3).length, 2);
  assert.equal(res.suplentes.length, 0);
});

test('modo suplentes → equipos completos y quedan fuera los de menor poder', () => {
  const js = jugadores(50);
  const res = balancearEquipos(js, { incompletos: 'suplentes' });
  assert.equal(res.equipos.length, 12);
  assert.ok(res.equipos.every((e) => e.jugadores.length === 4));
  assert.equal(res.suplentes.length, 2);
  const minTitular = Math.min(...res.equipos.flatMap((e) => e.jugadores.map((j) => j.poder)));
  assert.ok(res.suplentes.every((s) => s.poder <= minTitular));
});

test('los fijados se respetan', () => {
  const js = jugadores(16);
  const fijados = { j00: 0, j01: 0, j05: 3 };
  const res = balancearEquipos(js, { fijados });
  for (const [id, e] of Object.entries(fijados)) {
    const j = res.equipos[e].jugadores.find((x) => x.id === id);
    assert.ok(j && j.fijado, `${id} debería estar en el equipo ${e + 1}`);
  }
});

test('determinista: misma entrada en distinto orden → mismo resultado', () => {
  const js = jugadores(52, 9);
  const a = balancearEquipos(js);
  const b = balancearEquipos([...js].reverse());
  assert.deepEqual(a.equipos.map((e) => e.jugadores.map((j) => j.id)), b.equipos.map((e) => e.jugadores.map((j) => j.id)));
});

test('modo escalonado: el equipo 1 tiene a los 4 más fuertes', () => {
  const js = jugadores(20);
  const res = balancearEquipos(js, { modo: 'escalonado' });
  const top4 = [...js].sort((a, b) => b.poder - a.poder).slice(0, 4).map((j) => j.id).sort();
  assert.deepEqual(res.equipos[0].jugadores.map((j) => j.id).sort(), top4);
});

test('composición: con la penalización activa, menos equipos sin Apoyo', () => {
  const js = jugadores(52, 11);
  const sinApoyo = (res) => res.equipos.filter((e) => !e.jugadores.some((j) => j.tipo === 'support')).length;
  const base = balancearEquipos(js);
  const comp = balancearEquipos(js, { composicion: true });
  assert.ok(sinApoyo(comp) <= sinApoyo(base));
});

test('casos borde: vacío, 1 jugador, poder inválido, ids repetidos', () => {
  assert.equal(balancearEquipos([]).equipos.length, 0);
  const uno = balancearEquipos([{ id: 'a', poder: 100 }]);
  assert.equal(uno.equipos.length, 1);
  assert.equal(uno.equipos[0].completo, false);
  const raro = balancearEquipos([{ id: 'a', poder: 'x' }, { id: 'b', poder: 5 }]);
  assert.equal(raro.metricas.jugadores, 2);
  assert.throws(() => balancearEquipos([{ id: 'a', poder: 1 }, { id: 'a', poder: 2 }]), /repetido/);
  assert.throws(() => balancearEquipos(jugadores(8), { fijados: { j00: 5 } }), /inválido/);
});

test('rendimiento: 52 jugadores en menos de 1 s', () => {
  const t = performance.now();
  balancearEquipos(jugadores(52, 3), { composicion: true });
  assert.ok(performance.now() - t < 1000);
});
