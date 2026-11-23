import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  indexarCatalogo, calcular, diferencia, conPieza, buscarPiezas, rarezaDe, enRareza, nombreEn,
  habilidadesDePieza, limpiarBuild, resumenParaGuardar, buildVacia, PARTES,
  calcularRostros, conRostro, diferenciaRostros, limpiarRostros,
  calcularCamarada, conCamarada, limpiarCamarada, ordenarCamaradas, conAdventurer, camaradasPara,
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

/* ---------- Rostros (capturas de Juan, 2026-11-23: núcleo Kushala Daora + 4 de Ink of Flames, costo 12/12) ---------- */

const carta = (id, nv = 10, cal = 'superior') => ({ id, cal, nv });
const ROSTROS_JUAN = { nucleo: carta('kushala-daora'), cartas: ['barnos', 'kestodon', 'rathian', 'radiant-rathian'].map((id) => carta(id)), maestria: true };
const setDe = (r, id) => r.sets.find((s) => s.id === id);

test('rostros: el núcleo cuenta en el costo (3+1+1+3+4 = 12/12) y Ink of Flames queda 4/4', () => {
  const r = calcularRostros(cat, ROSTROS_JUAN);
  assert.equal(r.costo, 12);
  assert.equal(r.costoMax, 12);
  const f = setDe(r, 'ink-of-flames');
  assert.equal(f.puestas, 4);
  assert.equal(f.max, 4);
  assert.deepEqual(f.bonos.map((b) => b.activo), [true, true]);
  assert.equal(f.siguiente, null);
  // Los sets con una sola carta aparecen, pero sin bono activo.
  assert.equal(setDe(r, 'ink-of-dragon').activo, false);
});

test('rostros: con Proof of Mastery el núcleo suma +1 a su set (Kushala Daora 2/2 con una sola carta)', () => {
  const con = setDe(calcularRostros(cat, ROSTROS_JUAN), 'kushala-daora-tempest');
  assert.equal(con.puestas, 2);
  assert.equal(con.maestria, true);
  assert.deepEqual(con.bonos.map((b) => b.activo), [true, true]);
  const sin = setDe(calcularRostros(cat, { ...ROSTROS_JUAN, maestria: false }), 'kushala-daora-tempest');
  assert.equal(sin.puestas, 1);
  assert.deepEqual(sin.bonos.map((b) => b.activo), [true, false]);
});

test('rostros: dos copias del mismo monstruo cuentan una vez (Ink of Flames 3/4)', () => {
  const r = calcularRostros(cat, { ...ROSTROS_JUAN, cartas: [carta('barnos'), carta('barnos', 1), carta('rathian'), carta('radiant-rathian')] });
  assert.equal(r.costo, 12);
  const f = setDe(r, 'ink-of-flames');
  assert.equal(f.puestas, 3);
  assert.deepEqual(f.bonos.map((b) => b.activo), [true, false]);
  assert.deepEqual(f.siguiente, { n: 4, faltan: 1 });
});

test('rostros: pasar de 12 avisa; el núcleo que da habilidad entra en la matriz', () => {
  const avisos = [];
  const r = calcularRostros(cat, { nucleo: carta('kulu-ya-ku'), cartas: [carta('pink-rathian'), carta('diablos'), carta('barroth'), null] }, avisos);
  assert.equal(r.costo, 15);
  assert.equal(avisos.length, 1);
  const c = calcular(cat, { v: 1, piezas: {}, rostros: { nucleo: carta('kulu-ya-ku'), cartas: [] } });
  const h = c.habilidades.find((x) => x.id === 'instinct');
  assert.deepEqual(h.aportes, { rostro: 1 });
  assert.ok(c.rostros);
});

test('rostros: conRostro conserva calidad/nivel de la ranura y Fine queda en nivel 1', () => {
  let b = conRostro(buildVacia(), 'nucleo', 'kushala-daora');
  assert.deepEqual(b.rostros.nucleo, { id: 'kushala-daora', cal: 'superior', nv: 10 });
  assert.equal(b.rostros.maestria, true);
  b = conRostro(b, 2, 'rathian', { cal: 'fine', nv: 7 });
  assert.deepEqual(b.rostros.cartas[2], { id: 'rathian', cal: 'fine', nv: 1 });
  b = conRostro(b, 2, 'radiant-rathian');
  assert.equal(b.rostros.cartas[2].cal, 'fine');
  b = conRostro(conRostro(b, 2, ''), 'nucleo', '');
  assert.equal(b.rostros, undefined);
});

test('rostros: limpiar descarta cartas desconocidas y normaliza calidad y nivel', () => {
  const r = limpiarRostros(cat, { nucleo: { id: 'no-existe' }, cartas: [{ id: 'rathian', cal: 'mala', nv: 99 }, { id: 'kelbi', cal: 'fine', nv: 5 }] });
  assert.equal(r.nucleo, null);
  assert.deepEqual(r.cartas, [{ id: 'rathian', cal: 'superior', nv: 10 }, { id: 'kelbi', cal: 'fine', nv: 1 }, null, null]);
  assert.equal(limpiarRostros(cat, { cartas: [] }), null);
  assert.deepEqual(limpiarBuild(cat, { v: 1, piezas: {}, rostros: ROSTROS_JUAN }).rostros, ROSTROS_JUAN);
});

test('rostros: "si la cambias…" dice qué set gana o pierde y el costo', () => {
  const antes = calcularRostros(cat, ROSTROS_JUAN);
  const despues = calcularRostros(cat, { ...ROSTROS_JUAN, cartas: [carta('barnos'), carta('barnos'), carta('rathian'), carta('radiant-rathian')] });
  const d = diferenciaRostros(antes, despues);
  assert.equal(d.costo, 0);
  const f = d.sets.find((s) => s.id === 'ink-of-flames');
  assert.deepEqual([f.antes, f.despues, f.efecto], [4, 3, 'pierde']);
});

/* ---------- Camarada (E4) ---------- */

test('camarada: limpiar conserva id + nivel/estrellas/poder válidos y descarta lo desconocido', () => {
  assert.deepEqual(limpiarCamarada(cat, { id: 'devu', nv: 60, estrellas: 3, poder: 1998 }), { id: 'devu', nv: 60, estrellas: 3, poder: 1998 });
  assert.deepEqual(limpiarCamarada(cat, { id: 'devu', nv: 99, estrellas: 7, poder: -1 }), { id: 'devu' });
  assert.deepEqual(limpiarCamarada(cat, { id: 'kojiro', nv: 80, estrellas: 6, poder: 1998 }), { id: 'kojiro', nv: 80, estrellas: 6, poder: 1998 });
  assert.deepEqual(limpiarCamarada(cat, { id: 'devu', nv: '', estrellas: 0 }), { id: 'devu', estrellas: 0 });
  assert.equal(limpiarCamarada(cat, { id: 'no-existe', nv: 10 }), null);
  assert.equal(limpiarCamarada(cat, null), null);
  const b = limpiarBuild(cat, { v: 1, piezas: {}, camarada: { id: 'nailu', nv: 80 } });
  assert.deepEqual(b.camarada, { id: 'nailu', nv: 80 });
});

test('camarada: calcular devuelve la ficha y avisa si el tipo no coincide con el del adventurer', () => {
  const pepper = calcular(cat, { v: 1, piezas: {}, adv: { id: 'pepper' }, camarada: { id: 'devu', nv: 60 } });
  assert.equal(pepper.camarada.item.en, 'Devu');
  assert.equal(pepper.camarada.item.tipo, 'disruptor');
  assert.equal(pepper.camarada.compatible, true);
  assert.equal(pepper.camarada.nv, 60);
  assert.equal(pepper.camarada.estrellas, null);
  const midori = calcular(cat, { v: 1, piezas: {}, adv: { id: 'midori' }, camarada: { id: 'devu' } });
  assert.equal(midori.camarada.compatible, false);
  // El Fated Adventurer no tiene tipo en el catálogo: cualquiera sirve.
  assert.equal(calcularCamarada(cat, { id: 'devu' }, cat.adventurers.get('fated-adventurer-bow')).compatible, true);
  const avisos = [];
  assert.equal(calcularCamarada(cat, { id: 'nada' }, null, avisos), null);
  assert.equal(avisos.length, 1);
  assert.equal(calcular(cat, buildVacia()).camarada, null);
});

test('camarada: conCamarada cambia, conserva datos solo del mismo camarada y quita', () => {
  let b = conCamarada(buildVacia(), 'devu', { nv: 60, estrellas: 3, poder: 1998 });
  assert.deepEqual(b.camarada, { id: 'devu', nv: 60, estrellas: 3, poder: 1998 });
  b = conCamarada(b, 'devu');
  assert.deepEqual(b.camarada, { id: 'devu', nv: 60, estrellas: 3, poder: 1998 });
  b = conCamarada(b, 'nailu');
  assert.deepEqual(b.camarada, { id: 'nailu' });
  b = conCamarada(b, '');
  assert.equal(b.camarada, undefined);
});

test('camarada: 38 de GameWith; los del tipo del adventurer van primero, luego por rareza', () => {
  assert.equal(cat.lista.camaradas.length, 38);
  const orden = ordenarCamaradas(cat.lista.camaradas, 'support');
  assert.ok(orden.slice(0, 12).every((c) => c.tipo === 'support'));
  assert.equal(orden[0].rareza, 'SSR');
  assert.equal(orden[12].tipo === 'support', false);
  assert.equal(cat.camaradas.get('shadow').es, 'Sombra');
});

test('camarada: solo los del tipo del adventurer; sin tipo, todos', () => {
  const apoyo = camaradasPara(cat.lista.camaradas, 'support');
  assert.equal(apoyo.length, 12);
  assert.ok(apoyo.every((c) => c.tipo === 'support'));
  assert.equal(camaradasPara(cat.lista.camaradas, 'assault').length, 14);
  assert.equal(camaradasPara(cat.lista.camaradas, '').length, 38);
});

test('conAdventurer: quita el arma y el camarada que el juego no deja llevar', () => {
  assert.equal(cat.camaradas.get('kojiro').tipo, 'assault');
  const base = { v: 1, piezas: {}, adv: { id: 'pepper', nivel: 50 }, arma: { id: 'blooming-shooter-i', r: 14 }, camarada: { id: 'devu', nv: 80 } };
  // Pepper (Alterador, ballesta pesada) → Fated de ballesta pesada: sin tipo → se conserva todo.
  let r = conAdventurer(cat, base, 'fated-adventurer-heavy-bowgun');
  assert.deepEqual(r.quitados, []);
  assert.deepEqual(r.build.adv, { id: 'fated-adventurer-heavy-bowgun', nivel: 50 });
  assert.deepEqual(r.build.camarada, { id: 'devu', nv: 80 });
  assert.deepEqual(base.camarada, { id: 'devu', nv: 80 }); // no muta
  // → Midori (Asalto, espada larga): otra arma y otro tipo.
  r = conAdventurer(cat, base, 'midori');
  assert.deepEqual(r.quitados, ['arma', 'camarada']);
  assert.equal(r.build.arma, null);
  assert.equal(r.build.camarada, undefined);
  // Midori con Kojiro (Asalto) → Ryunosuke (Apoyo, espada larga): se queda el arma, se va el camarada.
  r = conAdventurer(cat, { ...base, adv: { id: 'midori' }, arma: { id: 'first-dance-i', r: 14 }, camarada: { id: 'kojiro' } }, 'ryunosuke');
  assert.deepEqual(r.quitados, ['camarada']);
  assert.equal(r.build.arma.id, 'first-dance-i');
  // Mismo tipo: se conserva. Sin adventurer: no se quita nada.
  assert.deepEqual(conAdventurer(cat, { ...base, adv: { id: 'pepper' } }, 'pepper').quitados, []);
  r = conAdventurer(cat, base, '');
  assert.equal(r.build.adv, null);
  assert.deepEqual(r.quitados, []);
});
