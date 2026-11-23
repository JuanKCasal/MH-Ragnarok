/**
 * Genera el catálogo del builder (site/data/catalogo/*.json) a partir de los datos descargados
 * de gacha.gg (datos/gacha-gg/mho-equipo.json) y las tablas manuales de scripts/catalogo/.
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
const redondear = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function construirCatalogo({ equipo, correcciones, monstruos, adventurers }) {
  const avisos = [];
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
      nombres: n,
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
    return { ...s, piezas: ORDEN_PARTES.map((p) => piezas[p] || null) };
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
      nombres: n,
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

  // ---- Monstruos: solo los que aparecen
  const usados = new Set([...armaduras, ...armas].map((x) => x.monstruo).filter(Boolean));
  for (const m of usados) if (!monstruos.lista.some((x) => x.id === m)) avisos.push(`Monstruo sin ficha: ${m}`);
  const listaMonstruos = monstruos.lista.filter((m) => usados.has(m.id)).map(({ id, en, es }) => (es ? { id, en, es } : { id, en }));

  // Solo las habilidades que usa algo del catálogo (las demás son de joyas, que no existen en el juego).
  const habUsadas = new Set();
  armaduras.forEach((x) => x.hab.forEach(([, k]) => k.forEach(([h]) => habUsadas.add(h))));
  listaSets.forEach((s) => s.bonos.forEach((b) => habUsadas.add(b.hab)));
  armas.forEach((x) => x.innato && habUsadas.add(x.innato.hab));
  const listaHab = habilidades.filter((h) => habUsadas.has(h.id));

  const listaAdv = adventurers.lista.map((x) => ({ ...x }));
  const meta = {
    version: equipo.fetched,
    fuentes: [
      { nombre: equipo.source, que: 'armas, armaduras, habilidades y sets', fecha: equipo.fetched },
      { nombre: adventurers.fuente, que: 'adventurers', fecha: adventurers.revisado },
    ],
    conteos: {
      armaduras: armaduras.length, armas: armas.length, sets: listaSets.length,
      habilidades: listaHab.length, monstruos: listaMonstruos.length, adventurers: listaAdv.length,
      descartados,
    },
  };
  return { meta, armaduras, armas, sets: listaSets, habilidades: listaHab, monstruos: listaMonstruos, adventurers: listaAdv, avisos };
}

/** JSON con un elemento por línea: diffs legibles en git y archivo compacto. */
export function aTexto(valor) {
  if (Array.isArray(valor)) return `[\n${valor.map((v) => JSON.stringify(v)).join(',\n')}\n]\n`;
  return `${JSON.stringify(valor, null, 2)}\n`;
}

export const ARCHIVOS = ['meta', 'armaduras', 'armas', 'sets', 'habilidades', 'monstruos', 'adventurers'];

export async function leerFuentes(raiz = RAIZ) {
  const leer = async (...p) => JSON.parse(await readFile(join(raiz, ...p), 'utf8'));
  return {
    equipo: await leer('datos', 'gacha-gg', 'mho-equipo.json'),
    correcciones: await leer('scripts', 'catalogo', 'correcciones.json'),
    monstruos: await leer('scripts', 'catalogo', 'monstruos.json'),
    adventurers: await leer('scripts', 'catalogo', 'adventurers.json'),
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
  if (cat.avisos.length) console.log(`Avisos (${cat.avisos.length}):\n- ${cat.avisos.join('\n- ')}`);
}
