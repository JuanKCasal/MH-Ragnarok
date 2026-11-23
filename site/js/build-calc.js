/**
 * Cálculo de una build (módulo puro, sin DOM). Ver docs/BUILDER.md §3–§4.
 *
 * El catálogo (site/data/catalogo/*.json) guarda los stats por rareza alineados desde `rmin`
 * (índice = rareza − rmin). Las habilidades de armadura son acumulativas por umbral de rareza:
 * se toma el último umbral ≤ la rareza elegida.
 */

export const PARTES = ['head', 'chest', 'arms', 'waist', 'legs'];
export const NOMBRE_PARTE = {
  head: { es: 'Cabeza', corto: 'Cab', en: 'Head' },
  chest: { es: 'Pecho', corto: 'Pec', en: 'Chest' },
  arms: { es: 'Brazos', corto: 'Bra', en: 'Arms' },
  waist: { es: 'Cintura', corto: 'Cin', en: 'Waist' },
  legs: { es: 'Piernas', corto: 'Pie', en: 'Legs' },
};
export const RAREZA_MAX = 14;
const ELEMENTOS_HAB = ['fire', 'water', 'thunder', 'ice', 'dragon'];

/** Arma el índice del catálogo a partir de los JSON tal como vienen de site/data/catalogo/. */
export function indexarCatalogo(raw) {
  const porId = (arr = []) => new Map(arr.map((x) => [x.id, x]));
  return {
    meta: raw.meta || {},
    armaduras: porId(raw.armaduras),
    armas: porId(raw.armas),
    sets: porId(raw.sets),
    habilidades: porId(raw.habilidades),
    monstruos: porId(raw.monstruos),
    adventurers: porId(raw.adventurers),
    lista: {
      armaduras: raw.armaduras || [],
      armas: raw.armas || [],
      adventurers: raw.adventurers || [],
      monstruos: raw.monstruos || [],
      habilidades: raw.habilidades || [],
    },
  };
}

/** Rareza dentro del rango de la pieza (sin dato: la máxima). */
export function rarezaDe(item, r) {
  const n = Math.round(Number(r));
  if (!item) return Number.isFinite(n) ? n : RAREZA_MAX;
  if (!Number.isFinite(n) || r === '' || r === null || r === undefined) return item.rmax;
  return Math.min(item.rmax, Math.max(item.rmin, n));
}

/** Valor de un arreglo alineado desde rmin. */
export function enRareza(arr, item, r) {
  if (!Array.isArray(arr) || !item) return 0;
  return arr[rarezaDe(item, r) - item.rmin] ?? 0;
}

/** Último elemento [umbral, …] con umbral ≤ r. */
function porUmbral(lista, r) {
  let out = null;
  for (const x of lista || []) if (x[0] <= r) out = x;
  return out;
}

export function nombreEn(item, r) {
  if (!item) return '';
  const x = porUmbral(item.nombres, rarezaDe(item, r));
  return x ? x[1] : item.nombres?.[0]?.[1] ?? item.id;
}

/** Habilidades de una pieza de armadura en la rareza dada: [[hab, nivel], …]. */
export function habilidadesDePieza(pieza, r) {
  if (!pieza) return [];
  const x = porUmbral(pieza.hab, rarezaDe(pieza, r));
  return x ? x[1] : [];
}

/** Composición vacía (formato `datos` v1). */
export const buildVacia = () => ({ v: 1, adv: null, arma: null, piezas: {} });

/** Copia de la build con una pieza (o el arma, con parte = 'arma') cambiada. id vacío = quitarla. */
export function conPieza(build, parte, id, r) {
  const b = { ...build, piezas: { ...(build?.piezas || {}) } };
  const valor = id ? { id, r: Number(r) || RAREZA_MAX } : null;
  if (parte === 'arma') b.arma = valor;
  else if (valor) b.piezas[parte] = valor;
  else delete b.piezas[parte];
  return b;
}

/** Estado de una habilidad según la suma de niveles y su máximo. */
export function estadoHab(suma, max) {
  if (suma > max) return 'sobra';
  if (suma === max) return 'tope';
  return 'falta';
}

/**
 * Calcula todo lo que muestra el builder.
 * @returns {{
 *   adv: object|null, arma: object|null, piezas: Record<string, object>,
 *   def: number, atk: number, afi: number, ele: {tipo:string,v:number}|null, estado: {tipo:string,v:number}|null,
 *   habilidades: Array<{id,en,max,suma,nivel,sobra,estado,aportes:Record<string,number>,porConfirmar?:boolean}>,
 *   sets: Array<{id,en,monstruo,puestas,necesarias,activo,faltan,hab,nv}>,
 *   resumen: {habilidades:number, sobran:number, setsListos:number, setsAUna:number},
 *   avisos: string[]
 * }}
 */
export function calcular(cat, build) {
  const b = build || buildVacia();
  const avisos = [];
  const aportes = new Map();
  const sumar = (hab, origen, nv) => {
    if (!nv) return;
    if (!cat.habilidades.has(hab)) { avisos.push(`Habilidad desconocida: ${hab}`); return; }
    const a = aportes.get(hab) || {};
    a[origen] = (a[origen] || 0) + nv;
    aportes.set(hab, a);
  };

  const adv = b.adv?.id ? cat.adventurers.get(b.adv.id) || null : null;
  if (b.adv?.id && !adv) avisos.push(`Adventurer desconocido: ${b.adv.id}`);

  let arma = null;
  let atk = 0;
  let afi = 0;
  let ele = null;
  let estado = null;
  if (b.arma?.id) {
    const w = cat.armas.get(b.arma.id);
    if (!w) avisos.push(`Arma desconocida: ${b.arma.id}`);
    else {
      const r = rarezaDe(w, b.arma.r);
      if (adv && adv.arma !== w.arma) avisos.push('El arma no es del tipo que usa el adventurer.');
      atk = enRareza(w.atk, w, r);
      afi = enRareza(w.afi, w, r);
      if (w.ele) ele = { tipo: w.ele.tipo, v: enRareza(w.ele.v, w, r) };
      if (w.estado) estado = { tipo: w.estado.tipo, v: enRareza(w.estado.v, w, r) };
      if (w.innato) sumar(w.innato.hab, 'arma', w.innato.nv);
      arma = { item: w, r, nombre: nombreEn(w, r) };
    }
  }

  let def = 0;
  const piezas = {};
  const conteoSets = new Map();
  for (const parte of PARTES) {
    const sel = b.piezas?.[parte];
    if (!sel?.id) continue;
    const p = cat.armaduras.get(sel.id);
    if (!p) { avisos.push(`Pieza desconocida: ${sel.id}`); continue; }
    if (p.parte !== parte) { avisos.push(`${p.id} no es de ${NOMBRE_PARTE[parte].es.toLowerCase()}.`); continue; }
    const r = rarezaDe(p, sel.r);
    const d = enRareza(p.def, p, r);
    const habs = habilidadesDePieza(p, r);
    def += d;
    habs.forEach(([h, nv]) => sumar(h, parte, nv));
    if (p.set) conteoSets.set(p.set, (conteoSets.get(p.set) || 0) + 1);
    piezas[parte] = { item: p, r, nombre: nombreEn(p, r), def: d, habs };
  }

  const sets = [];
  for (const [id, puestas] of conteoSets) {
    const s = cat.sets.get(id);
    if (!s) continue;
    const bono = s.bonos?.[0];
    if (!bono) continue;
    const activo = puestas >= bono.piezas;
    if (activo) sumar(bono.hab, 'set', bono.nv);
    sets.push({ id, en: s.en, monstruo: s.monstruo, puestas, necesarias: bono.piezas, activo,
      faltan: Math.max(0, bono.piezas - puestas), hab: bono.hab, nv: bono.nv, texto: bono.texto });
  }
  sets.sort((x, y) => Number(y.activo) - Number(x.activo) || x.faltan - y.faltan || x.en.localeCompare(y.en));

  const habilidades = [...aportes].map(([id, a]) => {
    const h = cat.habilidades.get(id);
    const suma = Object.values(a).reduce((s, n) => s + n, 0);
    return { id, en: h.en, max: h.max, suma, nivel: Math.min(suma, h.max), sobra: Math.max(0, suma - h.max),
      estado: estadoHab(suma, h.max), aportes: a, ...(h.porConfirmar ? { porConfirmar: true } : {}) };
  }).sort((x, y) => y.nivel - x.nivel || y.suma - x.suma || x.en.localeCompare(y.en));

  return {
    adv, arma, piezas, def, atk, afi, ele, estado, habilidades, sets,
    resumen: {
      habilidades: habilidades.length,
      sobran: habilidades.filter((h) => h.sobra > 0).length,
      setsListos: sets.filter((s) => s.activo).length,
      setsAUna: sets.filter((s) => s.faltan === 1).length,
    },
    avisos,
  };
}

/**
 * Qué cambia entre dos cálculos ("si la cambias…" y Comparar).
 * efecto: 'gana' / 'pierde' según el nivel efectivo (tope incluido); 'igual' si solo cambia lo que sobra.
 */
export function diferencia(antes, despues) {
  const mapa = (lista) => new Map(lista.map((x) => [x.id, x]));
  const ha = mapa(antes.habilidades);
  const hd = mapa(despues.habilidades);
  const habilidades = [];
  for (const id of new Set([...ha.keys(), ...hd.keys()])) {
    const a = ha.get(id);
    const d = hd.get(id);
    const sa = a?.suma || 0;
    const sd = d?.suma || 0;
    if (sa === sd) continue;
    const max = (a || d).max;
    const ea = Math.min(sa, max);
    const ed = Math.min(sd, max);
    habilidades.push({ id, en: (a || d).en, max, antes: sa, despues: sd,
      efecto: ed > ea ? 'gana' : ed < ea ? 'pierde' : 'igual', alTope: sd >= max });
  }
  const orden = { gana: 0, igual: 1, pierde: 2 };
  habilidades.sort((x, y) => orden[x.efecto] - orden[y.efecto] || Math.abs(y.despues - y.antes) - Math.abs(x.despues - x.antes));

  const sa = mapa(antes.sets);
  const sd = mapa(despues.sets);
  const sets = [];
  for (const id of new Set([...sa.keys(), ...sd.keys()])) {
    const a = sa.get(id);
    const d = sd.get(id);
    if ((a?.puestas || 0) === (d?.puestas || 0)) continue;
    const ref = a || d;
    sets.push({ id, en: ref.en, necesarias: ref.necesarias, antes: a?.puestas || 0, despues: d?.puestas || 0,
      efecto: (d?.activo && !a?.activo) ? 'gana' : (a?.activo && !d?.activo) ? 'pierde' : 'igual' });
  }
  const redondeo = (n) => Math.round(n * 100) / 100;
  return {
    habilidades,
    sets,
    def: despues.def - antes.def,
    atk: despues.atk - antes.atk,
    afi: redondeo(despues.afi - antes.afi),
    ele: (despues.ele?.v || 0) - (antes.ele?.v || 0),
  };
}

const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Filtra piezas para el selector.
 * @param {object} cat catálogo indexado
 * @param {{parte: string, texto?: string, monstruo?: string, elemento?: string, hab?: string, arma?: string, r?: number}} f
 *   parte = 'arma' para armas (arma = tipo de arma del adventurer).
 */
export function buscarPiezas(cat, f) {
  const esArma = f.parte === 'arma';
  let lista = esArma ? cat.lista.armas.filter((w) => !f.arma || w.arma === f.arma)
    : cat.lista.armaduras.filter((p) => p.parte === f.parte);
  if (f.monstruo) lista = lista.filter((x) => (f.monstruo === 'otros' ? !x.monstruo : x.monstruo === f.monstruo));
  const r = (x) => rarezaDe(x, f.r);
  const habsDe = (x) => (esArma ? (x.innato ? [[x.innato.hab, x.innato.nv]] : []) : habilidadesDePieza(x, r(x)));
  if (f.hab) lista = lista.filter((x) => habsDe(x).some(([h]) => h === f.hab));
  if (f.elemento) {
    lista = esArma
      ? lista.filter((w) => (f.elemento === 'none' ? !w.ele : w.ele?.tipo === f.elemento))
      : lista.filter((p) => habsDe(p).some(([h]) => h.startsWith(`${f.elemento}-`)));
  }
  const q = normal(f.texto).trim();
  if (q) {
    lista = lista.filter((x) => {
      const textos = [...(x.nombres || []).map((n) => n[1]), x.id,
        cat.monstruos.get(x.monstruo)?.en, cat.sets.get(x.set)?.en,
        ...habsDe(x).map(([h]) => cat.habilidades.get(h)?.en)];
      return textos.some((t) => normal(t).includes(q));
    });
  }
  return lista;
}

/** Elementos que pueden filtrar armaduras (por habilidades "fire-…"). */
export const ELEMENTOS_FILTRO = ELEMENTOS_HAB;

/** Columnas de listado para guardar (hoja Builds): tipo de arma y elemento. */
export function resumenParaGuardar(cat, build) {
  const w = build?.arma?.id ? cat.armas.get(build.arma.id) : null;
  const adv = build?.adv?.id ? cat.adventurers.get(build.adv.id) : null;
  return {
    arma_tipo: w?.arma || adv?.arma || '',
    elemento: w?.ele?.tipo || 'none',
  };
}

/** Quita de la composición lo que no está en el catálogo (piezas retiradas) y normaliza rarezas. */
export function limpiarBuild(cat, build) {
  const b = buildVacia();
  if (build?.adv?.id && cat.adventurers.has(build.adv.id)) {
    b.adv = { id: build.adv.id };
    const nv = Math.round(Number(build.adv.nivel));
    if (nv >= 1 && nv <= 80) b.adv.nivel = nv;
  }
  if (build?.arma?.id && cat.armas.has(build.arma.id)) {
    const w = cat.armas.get(build.arma.id);
    b.arma = { id: w.id, r: rarezaDe(w, build.arma.r) };
  }
  for (const parte of PARTES) {
    const sel = build?.piezas?.[parte];
    const p = sel?.id ? cat.armaduras.get(sel.id) : null;
    if (p && p.parte === parte) b.piezas[parte] = { id: p.id, r: rarezaDe(p, sel.r) };
  }
  return b;
}
