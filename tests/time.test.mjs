import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximoClash, proximoCarnival, semanaClashId, cuentaRegresiva, formatoLocal } from '../site/js/time.js';

const iso = (d) => d.toISOString();

test('Clash: sábado 20:15 UTC−6 = domingo 02:15 UTC', () => {
  // Domingo 22-11-2026 12:00 UTC → próximo Clash: sáb 28-11 20:15 UTC−6 = dom 29-11 02:15 UTC
  const c = proximoClash(new Date('2026-11-22T12:00:00Z'));
  assert.equal(iso(c.inicio), '2026-11-29T02:15:00.000Z');
  assert.equal(c.enCurso, false);
});

test('Clash en curso se reporta como en curso, y al terminar salta a la semana siguiente', () => {
  const enCurso = proximoClash(new Date('2026-11-29T03:00:00Z'));
  assert.equal(iso(enCurso.inicio), '2026-11-29T02:15:00.000Z');
  assert.equal(enCurso.enCurso, true);
  const despues = proximoClash(new Date('2026-11-29T04:16:00Z'));
  assert.equal(iso(despues.inicio), '2026-12-06T02:15:00.000Z');
});

test('Semana de Clash = fecha del sábado en hora del juego', () => {
  assert.equal(semanaClashId(new Date('2026-11-22T12:00:00Z')), '2026-11-28');
  assert.equal(semanaClashId(new Date('2026-11-29T03:00:00Z')), '2026-11-28');
  assert.equal(semanaClashId(new Date('2026-11-29T05:00:00Z')), '2026-12-05');
});

test('Carnival: 12:00 y 18:00 UTC−6, dura 2 h 10 min', () => {
  // 17:00 UTC = 11:00 juego → próximo 12:00 juego = 18:00 UTC
  const a = proximoCarnival(new Date('2026-11-22T17:00:00Z'));
  assert.equal(iso(a.inicio), '2026-11-22T18:00:00.000Z');
  assert.equal(iso(a.fin), '2026-11-22T20:10:00.000Z');
  // 19:00 UTC → en curso
  assert.equal(proximoCarnival(new Date('2026-11-22T19:00:00Z')).enCurso, true);
  // 21:00 UTC (15:00 juego) → 18:00 juego = 00:00 UTC del día siguiente
  assert.equal(iso(proximoCarnival(new Date('2026-11-22T21:00:00Z')).inicio), '2026-11-23T00:00:00.000Z');
  // 01:00 UTC del 23 = 19:00 juego del 22 → el de 18:00 sigue en curso hasta 02:10 UTC
  const c = proximoCarnival(new Date('2026-11-23T01:00:00Z'));
  assert.equal(c.enCurso, true);
  assert.equal(iso(c.inicio), '2026-11-23T00:00:00.000Z');
});

test('cuenta regresiva', () => {
  assert.equal(cuentaRegresiva(0), '0:00');
  assert.equal(cuentaRegresiva(65_000), '1:05');
  assert.equal(cuentaRegresiva((3 * 3600 + 12 * 60) * 1000), '3 h 12 min');
  assert.equal(cuentaRegresiva((2 * 86400 + 4 * 3600) * 1000), '2 d 4 h');
});

test('formato local en distintas zonas', () => {
  const d = new Date('2026-11-29T02:15:00Z');
  assert.match(formatoLocal(d, { timeZone: 'America/Santiago' }), /sáb 28 nov · 23:15/); // Chile UTC−3 en verano
  assert.match(formatoLocal(d, { timeZone: 'America/Bogota' }), /28 nov · 21:15/);
  assert.match(formatoLocal(d, { timeZone: 'America/Mexico_City' }), /28 nov · 20:15/);
});
