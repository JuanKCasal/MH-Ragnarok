/**
 * Genera el catálogo del builder (site/data/catalogo/*.json) a partir de los datos descargados
 * de gacha.gg (datos/gacha-gg/mho-equipo.json), los Rostros y camaradas de GameWith (datos/gamewith/rostros.json, camaradas.json),
 * los nombres en español de GameWith es-MX (datos/gamewith/nombres-es.json) y las tablas manuales de scripts/catalogo/.
 * Los JSON generados NO se editan a mano: se corrige la tabla y se vuelve a correr.
 *
 * Uso: node scripts/catalogo.mjs   (npm run catalogo)
 * Detalle de las reglas de limpieza: docs/BUILDER.md §1.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SALIDA = join(RAIZ, 'site', 'data', 'catalogo');

export const TIPOS_ARMA = {
  'Great Sword': 'great_sword', 'Long Sword': 'long_sword', 'Dual Blades': 'dual_blades', Hammer: 'hammer',
  'Charge Blade': 'charge_blade', Lance: 'lance', 'Heavy Bowgun': 'heavy_bowgun', Bow: 'bow',
};
export const PARTES = { 'Head Armor': 'head', 'Chest Armor': 'chest', Armguards: 'arms', 'Waist Armor': 'waist', 'Leg Armor': 'legs' };
export const ORDEN_PARTES = ['head', 'chest', 'arms', 'waist', 'legs'];
const ELEMENTOS = { 'Fire Attack': 'fire', 'Water Attack': 'water', 'Thunder Attack': 'thunder', 'Ice Attack': 'ice', 'Dragon Attack': 'dragon' };
const ESTADOS = { Poison: 'poison', Paralysis: 'paralysis', Sleep: 'sleep', Blast: 'blast' };

export function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]s\b/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const esTemporada0 = (texto) => /season 0 only/i.test(texto || '');
const sinNota = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith('_')));

/** Asigna un id propio a cada ficha de habilidad (hay nombres repetidos con distinto efecto). */
function armarHabilidades(fuente, corr, avisos) {
  const porNombre = new Map();
  for (const s of fuente) {
    if (!porNombre.has(s.name)) porNombre.set(s.name, []);
    const lista = porNombre.get(s.name);
    // Copias exactas (mismo texto y máximo) cuentan una sola vez.
    if (!lista.some((x) => x.text === s.text && x.max === s.max && JSON.stringify(x.levels) === JSON.stringify(s.levels))) lista.push(s);
  }
  const dupIds = sinNota(corr.habilidades_ids_duplicados);
  const porConfirmar = corr.habilidades_por_confirmar || {};
  const habilidades = [];
  const idPorNombre = new Map();    // nombre → id de la ficha "normal" (la que usan las piezas)
  const idTemporada0 = new Map();   // nombre → id de la variante Season 0
  for (const [nombre, fichas] of porNombre) {
    const base = slug(nombre);
    let normales = 0; let t0 = 0;
    for (const f of fichas) {
      let id;
      if (esTemporada0(f.text) && fichas.length > 1) {
        t0 += 1;
        id = t0 === 1 ? `${base}-s0` : `${base}-s0-${t0}`;
        if (!idTemporada0.has(nombre)) idTemporada0.set(nombre, id);
      } else {
        normales += 1;
        id = normales === 1 ? base : (normales === 2 && dupIds[nombre]) || `${base}-${normales}`;
        if (normales === 1) idPorNombre.set(nombre, id);
        if (normales === 2 && !dupIds[nombre]) avisos.push(`Habilidad "${nombre}" con dos fichas distintas: la 2.ª queda como ${id}`);
      }
      if (!idPorNombre.has(nombre) && fichas.length === 1) idPorNombre.set(nombre, id);
      const h = { id, en: nombre, max: f.max, texto: f.text, niveles: f.levels || [] };
      if (esTemporada0(f.text)) h.temporada0 = true;
      if (porConfirmar[id]) h.porConfirmar = porConfirmar[id];
      habilidades.push(h);
    }
    if (!idPorNombre.has(nombre)) idPorNombre.set(nombre, idTemporada0.get(nombre));
  }
  const ids = new Set();
  for (const h of habilidades) {
    if (ids.has(h.id)) throw new Error(`Id de habilidad repetido: ${h.id}`);
    ids.add(h.id);
  }
  return { habilidades, idPorNombre, idTemporada0 };
}

function crearBuscadorMonstruos(tabla) {
  const lista = tabla.lista;
  // Nombres más largos primero: "Pink Rathian" antes que "Rathian", "Black Diablos" antes que "Diablos".
  const claves = lista.flatMap((m) => [m.en, ...(m.cortos || [])].map((t) => ({ t, id: m.id })))
    .sort((a, b) => b.t.length - a.t.length);
  return (texto) => {
    if (!texto) return null;
    for (const { t, id } of claves) {
      const re = new RegExp(`(^|[^A-Za-z])${t.replace(/[-]/g, '\\-')}($|[^A-Za-z])`);
      if (re.test(texto)) return id;
    }
    return null;
  };
}

/** Pasos de rareza ordenados y sin huecos. */
function pasos(item, avisos) {
  const st = [...item.steps].sort((a, b) => a.r - b.r);
  for (let i = 1; i < st.length; i++) {
    if (st[i].r !== st[i - 1].r + 1) avisos.push(`${item.id}: falta la rareza ${st[i - 1].r + 1}`);
  }
  return st;
}

const nombres = (st) => st.filter((s) => s.n).map((s) => [s.r, s.n.trim()]);

const ELEMENTO_ES = { Fire: 'fuego', Water: 'agua', Ice: 'hielo', Thunder: 'rayo', Dragon: 'draco' };
const RE_NUMERO = /(\s+(?:I|II|III|IV|V|VI|VII|VIII|IX|X))$/;

/**
 * Traduce nombres EN de armas y armaduras con datos/gamewith/nombres-es.json (ver su _nota):
 * la tabla trae el nombre sin número romano (ni elemento); aquí se añaden, y "Radiant X" sin
 * entrada propia pasa a "<ES de X> radiante". Devuelve null si no hay traducción.
 */
export function crearTraductor(fuente) {
  const buscar = (tabla, b) => {
    if (tabla[b]) return tabla[b];
    const m = /^Radiant (.+)$/.exec(b);
    return m && tabla[m[1]] ? `${tabla[m[1]]} radiante` : null;
  };
  const partir = (n) => {
    const num = RE_NUMERO.exec(n);
    return { base: num ? n.slice(0, num.index) : n, num: num ? num[1] : '' };
  };
  return {
    armadura(n) {
      const { base, num } = partir(n);
      const es = buscar(fuente?.armaduras || {}, base);
      return es ? es + num : null;
    },
    arma(n) {
      const { base, num } = partir(n);
      const el = /\s*\((Fire|Water|Ice|Thunder|Dragon)\)$/.exec(base);
      const es = buscar(fuente?.armas || {}, el ? base.slice(0, el.index) : base);
      return es ? `${es}${el ? ` (${ELEMENTO_ES[el[1]]})` : ''}${num}` : null;
    },
  };
}

/** [[r, en]] → [[r, en, es]] cuando hay traducción (el tercer elemento solo si existe). */
const conEs = (lista, traducir, sinEs) => lista.map(([r, en]) => {
  const es = traducir(en);
  if (!es) { sinEs.add(en.replace(RE_NUMERO, '')); return [r, en]; }
  return [r, en, es];
});
const redondear = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Rostros (Visage) desde datos/gamewith/rostros.json. Cada carta es un monstruo: para los sets
 * cuentan monstruos distintos, así que el id de la carta sirve también de "monstruo".
 */
export function armarRostros(fuente, avisos, idPorNombre = new Map()) {
  const sets = fuente.sets.map((x) => {
    const s = { id: slug(x.en), en: x.en, es: x.es, bonos: x.bonos.map((b) => ({ n: b.piezas, en: b.en, es: b.es })) };
    if (x.bonos.some((b) => esTemporada0(b.en))) s.temporada0 = true;
    return s;
  });
  const setPorNombre = new Map(fuente.sets.map((x, i) => [x.en, sets[i].id]));
  const rostros = fuente.rostros.map((x) => {
    const r = { id: slug(x.en), en: x.en, es: x.es, costo: x.costo, sets: x.sets.map((n) => {
      const id = setPorNombre.get(n);
      if (!id) throw new Error(`Rostro ${x.en}: set desconocido "${n}"`);
      return id;
    }) };
    if (/^Radiant /.test(x.en)) r.radiante = true;
    if (x.nucleo) {
      r.nucleo = { en: x.nucleo.en, es: x.nucleo.es };
      // "Instinct +1. …", "Paralysis Resistance +3. …": el núcleo da una habilidad del juego.
      const m = /^([A-Z][A-Za-z' -]+?) \+(\d+)\./.exec(x.nucleo.en);
      if (m && idPorNombre.has(m[1])) r.nucleo.hab = [idPorNombre.get(m[1]), Number(m[2])];
      if (esTemporada0(x.nucleo.en)) r.temporada0 = true;
    } else if (x.costo > 1) avisos.push(`Rostro ${x.en} (costo ${x.costo}) sin efecto núcleo`);
    if (![1, 3, 4].includes(x.costo)) avisos.push(`Rostro ${x.en}: costo raro ${x.costo}`);
    return r;
  });
  const ids = new Set();
  for (const r of rostros) {
    if (ids.has(r.id)) throw new Error(`Id de rostro repetido: ${r.id}`);
    ids.add(r.id);
  }
  for (const s of sets) if (!rostros.some((r) => r.sets.includes(s.id))) avisos.push(`Set de rostros sin cartas: ${s.en}`);
  return { rostros, sets };
}

/** Camaradas (Buddy) desde datos/gamewith/camaradas.json: nombre EN/ES, rareza, tipo y Aumento de aventurero. */
export const RAREZAS_CAMARADA = ['SSR', 'SR', 'R'];
export const TIPOS_CAMARADA = ['assault', 'disruptor', 'support'];
export function armarCamaradas(fuente, avisos) {
  const stats = new Set(Object.keys(fuente.stats || {}));
  const ids = new Set();
  const lista = fuente.camaradas.map((x) => {
    const c = { id: slug(x.en), en: x.en, es: x.es || x.en, rareza: x.rareza, tipo: x.tipo, aumento: x.aumento };
    if (ids.has(c.id)) throw new Error(`Id de camarada repetido: ${c.id}`);
    ids.add(c.id);
    if (!RAREZAS_CAMARADA.includes(c.rareza)) throw new Error(`Camarada ${x.en}: rareza desconocida "${c.rareza}"`);
    if (!TIPOS_CAMARADA.includes(c.tipo)) throw new Error(`Camarada ${x.en}: tipo desconocido "${c.tipo}"`);
    for (const [k] of c.aumento) if (!stats.has(k)) throw new Error(`Camarada ${x.en}: stat desconocido "${k}"`);
    return c;
  });
  const orden = (c) => RAREZAS_CAMARADA.indexOf(c.rareza);
  lista.sort((a, b) => orden(a) - orden(b) || TIPOS_CAMARADA.indexOf(a.tipo) - TIPOS_CAMARADA.indexOf(b.tipo) || a.en.localeCompare(b.en));
  if (!lista.length) avisos.push('Sin camaradas');
  return lista;
}

export function construirCatalogo({ equipo, correcciones, monstruos, adventurers, rostros: fuenteRostros, camaradas: fuenteCamaradas, nombresEs = null }) {
  const avisos = [];
  const tr = crearTraductor(nombresEs);
  const sinEs = { armaduras: new Set(), armas: new Set() };
  const corr = correcciones;
  const descartar = new Set(corr.descartar || []);
  const descartarCat = new Set(corr.descartar_categorias || []);
  const items = equipo.items.filter((i) => !i.test && !descartar.has(i.id) && !descartarCat.has(i.cat));
  const descartados = equipo.items.length - items.length;

  const { habilidades, idPorNombre, idTemporada0 } = armarHabilidades(equipo.skills, corr, avisos);
  const hab = (nombre, ctx) => {
    const id = idPorNombre.get(nombre);
    if (!id) throw new Error(`${ctx}: habilidad desconocida "${nombre}"`);
    return id;
  };
  const buscarMonstruo = crearBuscadorMonstruos(monstruos);
  const monstruoPorSet = sinNota(corr.monstruos_por_set);

  // ---- Armaduras y sets
  const armaduras = [];
  const sets = new Map();
  for (const i of items.filter((x) => x.kind === 'armor')) {
    const parte = PARTES[i.cat];
    if (!parte) throw new Error(`${i.id}: parte desconocida ${i.cat}`);
    if (!i.sets || i.sets.length !== 1) throw new Error(`${i.id}: se esperaba un set y vienen ${i.sets?.length}`);
    const st = pasos(i, avisos);
    const n = nombres(st);
    const set = i.sets[0];
    const setId = slug(set.name);
    const monstruo = set.name in monstruoPorSet ? monstruoPorSet[set.name] : buscarMonstruo(set.name);
    const radiante = /^Radiant /.test(n[0]?.[1] || '');
    armaduras.push({
      id: i.id, parte, set: setId, monstruo, radiante,
      rmin: st[0].r, rmax: st[st.length - 1].r,
      nombres: nombresEs ? conEs(n, tr.armadura, sinEs.armaduras) : n,
      def: st.map((s) => s.s.Defense ?? 0),
      hab: (i.skills || []).map(({ r, k }) => [r, k.map(([nom, nv]) => [hab(nom, i.id), nv])]),
    });
    if (!sets.has(setId)) {
      if (set.stages.length !== 1) avisos.push(`Set ${set.name}: ${set.stages.length} bonos (se esperaba 1)`);
      const bonos = set.stages.map((sg) => {
        const m = /^(.+) \+(\d+)$/.exec(sg.name);
        if (!m) throw new Error(`Set ${set.name}: bono sin formato "Habilidad +N": ${sg.name}`);
        return { piezas: sg.n, hab: hab(m[1], `set ${set.name}`), nv: Number(m[2]), texto: sg.text };
      });
      sets.set(setId, { id: setId, en: set.name, monstruo, radiante, piezas: {}, bonos, _firma: JSON.stringify(set.stages) });
    } else if (sets.get(setId)._firma !== JSON.stringify(set.stages)) {
      avisos.push(`Set ${set.name}: bonos distintos entre piezas (${i.id})`);
    }
    const s = sets.get(setId);
    if (s.piezas[parte]) throw new Error(`Set ${set.name}: dos piezas de ${parte}`);
    s.piezas[parte] = i.id;
  }
  const listaSets = [...sets.values()].map(({ _firma, piezas, ...s }) => {
    const faltan = ORDEN_PARTES.filter((p) => !piezas[p]);
    if (faltan.length) avisos.push(`Set ${s.en}: faltan piezas (${faltan.join(', ')})`);
    const es = nombresEs?.sets?.[s.id];
    return { id: s.id, en: s.en, ...(es ? { es } : {}), ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'id' && k !== 'en')),
      piezas: ORDEN_PARTES.map((p) => piezas[p] || null) };
  });

  // ---- Armas
  const armas = [];
  for (const i of items.filter((x) => x.kind === 'weapon')) {
    const arma = TIPOS_ARMA[i.cat];
    if (!arma) throw new Error(`${i.id}: tipo de arma desconocido ${i.cat}`);
    const st = pasos(i, avisos);
    const n = nombres(st);
    const claves = new Set(st.flatMap((s) => Object.keys(s.s)));
    const elems = [...claves].filter((k) => ELEMENTOS[k] || ESTADOS[k]);
    if (elems.length > 1) avisos.push(`${i.id}: más de un elemento/estado (${elems.join(', ')})`);
    const radiante = /^Radiant /.test(i.monster || '') || /^Radiant /.test(n[0]?.[1] || '') || i.id.startsWith('radiant-');
    const monstruo = buscarMonstruo((i.monster || '').replace(/^Radiant /, '')) || buscarMonstruo(i.series || '');
    const a = {
      id: i.id, arma, monstruo, radiante,
      rmin: st[0].r, rmax: st[st.length - 1].r,
      nombres: nombresEs ? conEs(n, tr.arma, sinEs.armas) : n,
      atk: st.map((s) => s.s['Physical Attack'] ?? 0),
    };
    if (claves.has('Affinity')) a.afi = st.map((s) => redondear((s.s.Affinity ?? 0) / 100)); // viene ×100 (270 = 2,7 %)
    if (elems.length) {
      const k = elems[0];
      a[ELEMENTOS[k] ? 'ele' : 'estado'] = { tipo: ELEMENTOS[k] || ESTADOS[k], v: st.map((s) => s.s[k] ?? 0) };
    }
    if (i.sharp != null) a.filo = i.sharp;
    if (i.intr) {
      const t0 = esTemporada0(i.intr.text);
      a.innato = { hab: (t0 && idTemporada0.get(i.intr.skill)) || hab(i.intr.skill, i.id), nv: i.intr.level, texto: i.intr.text };
      if (t0) a.innato.temporada0 = true;
    }
    armas.push(a);
  }

  const visage = armarRostros(fuenteRostros, avisos, idPorNombre);
  const camaradas = fuenteCamaradas ? armarCamaradas(fuenteCamaradas, avisos) : [];

  // ---- Monstruos: solo los que aparecen
  const usados = new Set([...armaduras, ...armas].map((x) => x.monstruo).filter(Boolean));
  for (const m of usados) if (!monstruos.lista.some((x) => x.id === m)) avisos.push(`Monstruo sin ficha: ${m}`);
  const listaMonstruos = monstruos.lista.filter((m) => usados.has(m.id)).map(({ id, en, es }) => {
    const esFinal = es || nombresEs?.monstruos?.[id] || (nombresEs ? en : null); // la mayoría se llama igual en español
    return esFinal ? { id, en, es: esFinal } : { id, en };
  });

  // Solo las habilidades que usa algo del catálogo (las demás son de joyas, que no existen en el juego).
  const habUsadas = new Set();
  armaduras.forEach((x) => x.hab.forEach(([, k]) => k.forEach(([h]) => habUsadas.add(h))));
  listaSets.forEach((s) => s.bonos.forEach((b) => habUsadas.add(b.hab)));
  armas.forEach((x) => x.innato && habUsadas.add(x.innato.hab));
  visage.rostros.forEach((x) => x.nucleo?.hab && habUsadas.add(x.nucleo.hab[0]));
  // Nombre ES por id; las variantes (-s0, -control…) toman el de su habilidad base.
  const habEs = (id) => nombresEs?.habilidades?.[id] || nombresEs?.habilidades?.[id.replace(/-(s0(-\d+)?|\d+|control)$/, '')] || null;
  const listaHab = habilidades.filter((h) => habUsadas.has(h.id)).map((h) => {
    const es = habEs(h.id);
    return es ? { id: h.id, en: h.en, es, ...Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'id' && k !== 'en')) } : h;
  });
  // Lo que queda en inglés por falta de datos en GameWith: se informa aparte (no es un error del catálogo).
  const faltanEs = [];
  if (nombresEs) {
    const faltanHab = listaHab.filter((h) => !h.es).map((h) => h.en);
    const faltanSets = listaSets.filter((s) => !s.es).map((s) => s.en);
    if (faltanHab.length) faltanEs.push(`Habilidades sin nombre ES (${faltanHab.length}): ${faltanHab.join(', ')}`);
    if (faltanSets.length) faltanEs.push(`Sets sin nombre ES (${faltanSets.length}): ${faltanSets.join(', ')}`);
    for (const k of ['armaduras', 'armas']) {
      if (sinEs[k].size) faltanEs.push(`${k === 'armas' ? 'Armas' : 'Armaduras'} sin nombre ES (${sinEs[k].size}): ${[...sinEs[k]].sort().join(', ')}`);
    }
  }

  const listaAdv = adventurers.lista.map((x) => ({ ...x }));
  const meta = {
    version: equipo.fetched,
    fuentes: [
      { nombre: equipo.source, que: 'armas, armaduras, habilidades y sets', fecha: equipo.fetched },
      { nombre: adventurers.fuente, que: 'adventurers', fecha: adventurers.revisado },
      { nombre: fuenteRostros.source, que: 'rostros (Visage) y sus sets', fecha: fuenteRostros.fetched },
      ...(fuenteCamaradas ? [{ nombre: fuenteCamaradas.source, que: 'camaradas (Buddy)', fecha: fuenteCamaradas.fetched }] : []),
      ...(nombresEs ? [{ nombre: nombresEs.source, que: 'nombres en español (por confirmar)', fecha: nombresEs.fetched }] : []),
    ],
    conteos: {
      armaduras: armaduras.length, armas: armas.length, sets: listaSets.length,
      habilidades: listaHab.length, monstruos: listaMonstruos.length, adventurers: listaAdv.length,
      rostros: visage.rostros.length, rostros_sets: visage.sets.length, camaradas: camaradas.length,
      descartados,
    },
  };
  return { meta, armaduras, armas, sets: listaSets, habilidades: listaHab, monstruos: listaMonstruos, adventurers: listaAdv, rostros: visage.rostros, 'rostros-sets': visage.sets, camaradas, avisos, faltanEs };
}

/** JSON con un elemento por línea: diffs legibles en git y archivo compacto. */
export function aTexto(valor) {
  if (Array.isArray(valor)) return `[\n${valor.map((v) => JSON.stringify(v)).join(',\n')}\n]\n`;
  return `${JSON.stringify(valor, null, 2)}\n`;
}

export const ARCHIVOS = ['meta', 'armaduras', 'armas', 'sets', 'habilidades', 'monstruos', 'adventurers', 'rostros', 'rostros-sets', 'camaradas'];

export async function leerFuentes(raiz = RAIZ) {
  const leer = async (...p) => JSON.parse(await readFile(join(raiz, ...p), 'utf8'));
  return {
    equipo: await leer('datos', 'gacha-gg', 'mho-equipo.json'),
    correcciones: await leer('scripts', 'catalogo', 'correcciones.json'),
    monstruos: await leer('scripts', 'catalogo', 'monstruos.json'),
    adventurers: await leer('scripts', 'catalogo', 'adventurers.json'),
    rostros: await leer('datos', 'gamewith', 'rostros.json'),
    camaradas: await leer('datos', 'gamewith', 'camaradas.json'),
    nombresEs: await leer('datos', 'gamewith', 'nombres-es.json'),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cat = construirCatalogo(await leerFuentes());
  await mkdir(SALIDA, { recursive: true });
  let total = 0;
  for (const nombre of ARCHIVOS) {
    const texto = aTexto(cat[nombre]);
    total += Buffer.byteLength(texto);
    await writeFile(join(SALIDA, `${nombre}.json`), texto);
  }
  console.log('Catálogo generado en site/data/catalogo/:', JSON.stringify(cat.meta.conteos), `${Math.round(total / 1024)} KB`);
  if (cat.faltanEs.length) console.log(`Quedan en inglés (sin dato en GameWith es-MX):\n- ${cat.faltanEs.join('\n- ')}`);
  if (cat.avisos.length) console.log(`Avisos (${cat.avisos.length}):\n- ${cat.avisos.join('\n- ')}`);
}
