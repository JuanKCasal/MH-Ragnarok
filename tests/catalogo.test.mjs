import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { construirCatalogo, leerFuentes, aTexto, ARCHIVOS, SALIDA, ORDEN_PARTES, slug } from '../scripts/catalogo.mjs';

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
