import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { construirCatalogo, leerFuentes, aTexto, ARCHIVOS, SALIDA, ORDEN_PARTES, slug, crearTraductor } from '../scripts/catalogo.mjs';

const fuentes = await leerFuentes();
const cat = construirCatalogo(fuentes);
const porId = (lista) => new Map(lista.map((x) => [x.id, x]));

test('slug: minúsculas, sin tildes ni posesivos', () => {
  assert.equal(slug("Rathalos's Weakness"), 'rathalos-weakness');
  assert.equal(slug('Ammo Enhancement - Normal'), 'ammo-enhancement-normal');
  assert.equal(slug('Pokémon  Ñandú'), 'pokemon-nandu');
});

test('descarta el ruido del datamine y deja 245 armaduras y 291 armas', () => {
  assert.equal(cat.armaduras.length, 245);
  assert.equal(cat.armas.length, 291);
  const ids = new Set([...cat.armaduras, ...cat.armas].map((x) => x.id));
  for (const malo of ['damaged-long-sword', 'iron-katana-i-100000011']) assert.ok(!ids.has(malo), malo);
  assert.ok(![...ids].some((id) => /test|itemweapon/.test(id)), 'quedan piezas de prueba');
  assert.equal(ids.size, cat.armaduras.length + cat.armas.length, 'ids repetidos');
  assert.deepEqual(cat.avisos, []);
});

test('la afinidad se pasa a % (confirmado con GameWith: Radiant Archer\'s Dance r12 = +2.7 %)', () => {
  const a = porId(cat.armas).get('radiant-kulu-arrow-ii');
  const i = 12 - a.rmin;
  assert.equal(a.atk[i], 1057);
  assert.equal(a.afi[i], 2.7);
  assert.equal(a.radiante, true);
  assert.equal(a.monstruo, 'kulu-ya-ku');
});

test('cada arma tiene stats para todas sus rarezas', () => {
  for (const a of cat.armas) {
    const n = a.rmax - a.rmin + 1;
    assert.equal(a.atk.length, n, a.id);
    if (a.afi) assert.equal(a.afi.length, n, a.id);
    if (a.ele) assert.equal(a.ele.v.length, n, a.id);
    assert.ok(!(a.ele && a.estado), `${a.id}: elemento y estado a la vez`);
    assert.ok(a.rmax <= 14 && a.rmin >= 1, a.id);
  }
});

test('armaduras: un set de 5 piezas (una por parte), monstruo sacado del set', () => {
  const sets = porId(cat.sets);
  assert.equal(cat.sets.length, 49);
  for (const s of cat.sets) {
    assert.equal(s.piezas.length, 5, s.id);
    assert.ok(s.piezas.every(Boolean), `${s.id}: faltan piezas`);
    assert.equal(s.bonos.length, 1, s.id);
    assert.ok([2, 3].includes(s.bonos[0].piezas), s.id);
  }
  const arm = porId(cat.armaduras);
  for (const p of cat.armaduras) {
    assert.ok(ORDEN_PARTES.includes(p.parte), p.id);
    assert.equal(sets.get(p.set).piezas[ORDEN_PARTES.indexOf(p.parte)], p.id);
    assert.equal(p.def.length, p.rmax - p.rmin + 1, p.id);
  }
  assert.equal(arm.get('rathalos-helm-ii').monstruo, 'rathalos');
  assert.equal(arm.get('rath-heart-helm-iv').monstruo, 'pink-rathian');
  assert.equal(arm.get('radiant-diablos-nero-helm-vi').monstruo, 'black-diablos');
  assert.equal(arm.get('radiant-diablos-nero-helm-vi').radiante, true);
  assert.equal(arm.get('chainmail-headgear-i').monstruo, null);
  assert.equal(sets.get('insulation-of-the-summit').monstruo, 'vespoid');
  assert.equal(sets.get('rathalos-fervor').bonos[0].hab, 'critical-element');
});

test('todas las habilidades citadas existen; ids únicos; Season 0 separada', () => {
  const hab = porId(cat.habilidades);
  assert.equal(hab.size, cat.habilidades.length);
  for (const p of cat.armaduras) {
    for (const [r, lista] of p.hab) {
      assert.ok(r >= p.rmin && r <= p.rmax, `${p.id}: umbral ${r} fuera de rango`);
      for (const [h, nv] of lista) {
        assert.ok(hab.has(h), `${p.id}: ${h}`);
        assert.ok(nv >= 1 && nv <= hab.get(h).max, `${p.id}: ${h} ${nv}`);
      }
    }
  }
  for (const s of cat.sets) assert.ok(hab.has(s.bonos[0].hab), s.id);
  for (const a of cat.armas) if (a.innato) assert.ok(hab.has(a.innato.hab), a.id);
  assert.ok(hab.get('critical-element').porConfirmar, 'Critical Element debe quedar por confirmar');
  assert.ok(cat.habilidades.every((h) => h.niveles.length <= h.max));
});

test('adventurers y monstruos con claves de la web', () => {
  const ARMAS = ['great_sword', 'long_sword', 'dual_blades', 'hammer', 'charge_blade', 'lance', 'heavy_bowgun', 'bow'];
  for (const a of cat.adventurers) {
    assert.ok(ARMAS.includes(a.arma), a.id);
    assert.ok(a.elemento === null || ['fire', 'water', 'thunder', 'ice', 'dragon'].includes(a.elemento), a.id);
    assert.ok(a.tipo === null || ['assault', 'disruptor', 'support'].includes(a.tipo), a.id);
  }
  assert.equal(cat.adventurers.filter((a) => a.id.startsWith('fated-adventurer')).length, 8);
  const usados = new Set([...cat.armaduras, ...cat.armas].map((x) => x.monstruo).filter(Boolean));
  assert.deepEqual(new Set(cat.monstruos.map((m) => m.id)), usados);
});

test('los JSON de site/data/catalogo están al día con el script (no se editan a mano)', async () => {
  for (const nombre of ARCHIVOS) {
    const enDisco = (await readFile(join(SALIDA, `${nombre}.json`), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(enDisco, aTexto(cat[nombre]), `${nombre}.json desactualizado: corre npm run catalogo`);
  }
});

test('camaradas: 38 de GameWith con rareza, tipo y aumento; ids únicos y estables', () => {
  assert.equal(cat.camaradas.length, 38);
  assert.equal(cat.meta.conteos.camaradas, 38);
  const conteo = (k, v) => cat.camaradas.filter((c) => c[k] === v).length;
  assert.deepEqual([conteo('rareza', 'SSR'), conteo('rareza', 'SR'), conteo('rareza', 'R')], [8, 15, 15]);
  assert.deepEqual([conteo('tipo', 'assault'), conteo('tipo', 'disruptor'), conteo('tipo', 'support')], [14, 12, 12]);
  assert.equal(new Set(cat.camaradas.map((c) => c.id)).size, 38);
  const devu = cat.camaradas.find((c) => c.id === 'devu');
  assert.deepEqual(devu, { id: 'devu', en: 'Devu', es: 'Devu', rareza: 'SSR', tipo: 'disruptor', aumento: [['ataque_elemental', 350], ['afinidad', 9]] });
  assert.ok(cat.camaradas.every((c) => c.aumento.length >= 1 && c.es));
});

test('rostros: 56 cartas y 12 sets de GameWith, con nombre ES y efecto núcleo en las de costo 3 y 4', () => {
  assert.equal(cat.rostros.length, 56);
  assert.equal(cat['rostros-sets'].length, 12);
  const sets = porId(cat['rostros-sets']);
  const cuenta = {};
  for (const r of cat.rostros) {
    assert.ok(r.es && r.en, r.id);
    assert.ok([1, 3, 4].includes(r.costo), r.id);
    assert.equal(Boolean(r.nucleo), r.costo > 1, `${r.id}: núcleo solo en costo 3/4`);
    for (const s of r.sets) { assert.ok(sets.has(s), `${r.id}: set ${s}`); cuenta[s] = (cuenta[s] || 0) + 1; }
  }
  // Tamaños de set que publica GameWith.
  assert.deepEqual(cuenta, {
    'ink-of-flames': 9, 'ink-of-combat': 7, 'ink-of-guidance': 8, 'ink-of-protection': 8, 'ink-of-might': 9,
    'ink-of-resonance': 9, 'ink-of-dragon': 7, 'ink-of-water': 8, 'ink-of-grace': 9, 'ink-of-frost': 9,
    'ink-of-thunder': 8, 'kushala-daora-tempest': 1,
  });
  const k = sets.get('kushala-daora-tempest');
  assert.deepEqual(k.bonos.map((b) => b.n), [1, 2]);
  assert.equal(k.temporada0, true);
  assert.deepEqual(sets.get('ink-of-flames').bonos.map((b) => b.n), [2, 4]);
  assert.equal(porId(cat.rostros).get('radiant-rathalos').radiante, true);
  // Núcleos que dan una habilidad del juego (van a la matriz de Habilidades).
  const conHab = cat.rostros.filter((r) => r.nucleo?.hab).map((r) => `${r.id}:${r.nucleo.hab.join('+')}`);
  assert.deepEqual(conHab.sort(), ['great-girros:paralysis-resistance+3', 'great-jagras:quick-bite+3', 'kulu-ya-ku:instinct+1',
    'odogaron:bleeding-resistance+3', 'radobaan:sleep-resistance+3']);
});

test('nombres ES (GameWith es-MX): número romano, elemento y radiante se arman desde el EN', () => {
  const tr = crearTraductor({ armaduras: { 'Rathalos Helm': 'Yelmo de Rathalos' },
    armas: { 'Guild Crimson Crest Great Sword': 'Gran espada de cresta carmesí de gremio', 'Radiant Flammenzahn+': 'Flammenzahn radiante+' } });
  assert.equal(tr.armadura('Rathalos Helm II'), 'Yelmo de Rathalos II');
  assert.equal(tr.armadura('Radiant Rathalos Helm V'), 'Yelmo de Rathalos radiante V');
  assert.equal(tr.armadura('Odogaron Helm'), null);
  assert.equal(tr.arma('Guild Crimson Crest Great Sword (Fire) III'), 'Gran espada de cresta carmesí de gremio (fuego) III');
  assert.equal(tr.arma('Radiant Flammenzahn+ IV'), 'Flammenzahn radiante+ IV');
});

test('catálogo con nombres ES: piezas [r, en, es], habilidades/sets/monstruos con es', () => {
  const arm = porId(cat.armaduras);
  const casco = arm.get('rathalos-helm-ii');
  assert.ok(casco.nombres.every((n) => n.length === 3 && /^Yelmo de Rathalos [IVX]+$/.test(n[2])), JSON.stringify(casco.nombres));
  assert.equal(porId(cat.habilidades).get('fire-damage-up').es, 'Mejora de daño de fuego');
  assert.equal(porId(cat.sets).get('rathalos-weakness').es, 'Debilidad de Rathalos');
  assert.equal(porId(cat.monstruos).get('pink-rathian').es, 'Rathian Rosa');
  // Lo que GameWith no trae queda en inglés y se informa aparte, sin romper nada.
  const bayard = porId(cat.armas).get('scintillant-bayard');
  assert.ok(bayard.nombres.every((n) => n.length === 2));
  assert.ok(cat.faltanEs.some((t) => t.includes('Scintillant Bayard')));
  for (const x of [...cat.armaduras, ...cat.armas]) for (const n of x.nombres) assert.ok(n.length === 2 || (typeof n[2] === 'string' && n[2]), x.id);
});

test('reflexiones: una fila por adventurer; Fated 4 + 4 + 6, el resto 6 + 4; Haze solo comunes', () => {
  assert.equal(cat.reflexiones.length, cat.adventurers.length);
  const fila = porId(cat.reflexiones.map((r) => ({ ...r, id: r.adv })));
  const hbg = fila.get('fated-adventurer-heavy-bowgun');
  assert.equal(hbg.nodos.length, 14);
  assert.deepEqual(['arma', 'clase', 'comun'].map((g) => hbg.nodos.filter((n) => n.grupo === g).length), [4, 6, 4]);
  assert.equal(hbg.nodos.find((n) => n.id === 'internal-ammo').es, 'Munición interna');
  const pepper = fila.get('pepper');
  assert.equal(pepper.nodos.length, 10);
  assert.equal(pepper.nodos.reduce((t, n) => t + n.pts, 0), 210);
  assert.equal(fila.get('haze').incompleto, true);
  assert.equal(fila.get('haze').nodos.length, 4);
  for (const r of cat.reflexiones) {
    assert.equal(new Set(r.nodos.map((n) => n.id)).size, r.nodos.length, r.adv);
    assert.ok(r.nodos.every((n) => [5, 10, 30].includes(n.pts) && n.efecto && n.es), r.adv);
  }
  assert.equal(cat.meta.conteos.reflexiones, cat.reflexiones.reduce((t, r) => t + r.nodos.length, 0));
});
