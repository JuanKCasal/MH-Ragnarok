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
    rostros: porId(raw.rostros),
    rostrosSets: porId(raw['rostros-sets']),
    camaradas: porId(raw.camaradas),
    reflexiones: new Map((raw.reflexiones || []).map((r) => [r.adv, r])),
    lista: {
      armaduras: raw.armaduras || [],
      armas: raw.armas || [],
      adventurers: raw.adventurers || [],
      monstruos: raw.monstruos || [],
      habilidades: raw.habilidades || [],
      rostros: raw.rostros || [],
      camaradas: raw.camaradas || [],
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

/** Nombre ES de GameWith es-MX (por confirmar) o '' si no hay: nombres = [[r, en, es?], …]. */
export function nombreEs(item, r) {
  if (!item) return '';
  const x = porUmbral(item.nombres, rarezaDe(item, r)) || item.nombres?.[0];
  return x?.[2] || '';
}

/** ¿El nombre ES de esa rareza lo confirmó un oficial (E6)? */
export function nombreOk(item, r) {
  if (!item) return false;
  const x = porUmbral(item.nombres, rarezaDe(item, r)) || item.nombres?.[0];
  return Boolean(x?.[3]);
}

/** Para ordenar y mostrar en una sola línea: el ES si existe, si no el EN. */
export const nombreDe = (x) => x?.es || x?.en || '';
const porNombre = (x, y) => nombreDe(x).localeCompare(nombreDe(y), 'es');

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
 *   habilidades: Array<{id,en,es?,max,suma,nivel,sobra,estado,aportes:Record<string,number>,porConfirmar?:boolean}>,
 *   sets: Array<{id,en,es?,monstruo,puestas,necesarias,activo,faltan,hab,nv}>,
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
      arma = { item: w, r, nombre: nombreEn(w, r), nombreEs: nombreEs(w, r), esOk: nombreOk(w, r) };
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
    piezas[parte] = { item: p, r, nombre: nombreEn(p, r), nombreEs: nombreEs(p, r), esOk: nombreOk(p, r), def: d, habs };
  }

  const rostros = calcularRostros(cat, b.rostros, avisos);
  const camarada = calcularCamarada(cat, b.camarada, adv, avisos);
  const reflexiones = calcularReflexiones(cat, b.reflexiones, adv, camarada?.item?.tipo || '');
  const keepsake = calcularKeepsake(b.keepsake);
  const habNucleo = rostros?.nucleo?.item.nucleo?.hab;
  if (habNucleo) sumar(habNucleo[0], 'rostro', habNucleo[1]);

  const sets = [];
  for (const [id, puestas] of conteoSets) {
    const s = cat.sets.get(id);
    if (!s) continue;
    const bono = s.bonos?.[0];
    if (!bono) continue;
    const activo = puestas >= bono.piezas;
    if (activo) sumar(bono.hab, 'set', bono.nv);
    sets.push({ id, en: s.en, es: s.es, esOk: s.esOk, monstruo: s.monstruo, puestas, necesarias: bono.piezas, activo,
      faltan: Math.max(0, bono.piezas - puestas), hab: bono.hab, nv: bono.nv, texto: bono.texto });
  }
  sets.sort((x, y) => Number(y.activo) - Number(x.activo) || x.faltan - y.faltan || porNombre(x, y));

  const habilidades = [...aportes].map(([id, a]) => {
    const h = cat.habilidades.get(id);
    const suma = Object.values(a).reduce((s, n) => s + n, 0);
    return { id, en: h.en, es: h.es, esOk: h.esOk, max: h.max, suma, nivel: Math.min(suma, h.max), sobra: Math.max(0, suma - h.max),
      estado: estadoHab(suma, h.max), aportes: a, ...(h.porConfirmar ? { porConfirmar: true } : {}) };
  }).sort((x, y) => y.nivel - x.nivel || y.suma - x.suma || porNombre(x, y));

  return {
    adv, arma, piezas, def, atk, afi, ele, estado, habilidades, sets, rostros, camarada, reflexiones, keepsake,
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
    habilidades.push({ id, en: (a || d).en, es: (a || d).es, max, antes: sa, despues: sd,
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
    sets.push({ id, en: ref.en, es: ref.es, necesarias: ref.necesarias, antes: a?.puestas || 0, despues: d?.puestas || 0,
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
      // Se busca en inglés y en español (Juan juega en inglés; la mayoría del clan, en español).
      const ficha = (m, id) => [m.get(id)?.en, m.get(id)?.es];
      const textos = [...(x.nombres || []).flatMap((n) => [n[1], n[2]]), x.id,
        ...ficha(cat.monstruos, x.monstruo), ...ficha(cat.sets, x.set),
        ...habsDe(x).flatMap(([h]) => ficha(cat.habilidades, h))];
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
  const ros = limpiarRostros(cat, build?.rostros);
  if (ros) b.rostros = ros;
  const cam = limpiarCamarada(cat, build?.camarada);
  if (cam) b.camarada = cam;
  const ref = limpiarReflexiones(cat, build?.reflexiones, b.adv?.id);
  if (ref) b.reflexiones = ref;
  const kee = limpiarKeepsake(build?.keepsake);
  if (kee) b.keepsake = kee;
  return b;
}

/* ---------------- Rostros (Visage) ---------------- */

export const COSTO_ROSTROS = 12;
export const CARTAS_ROSTROS = 4; // además del núcleo
/** Calidades de un Rostro (mhohub): Fine solo nivel 1; las demás hasta nivel 10. */
export const CALIDADES = [
  { id: 'fine', en: 'Fine', nvMax: 1 },
  { id: 'rare', en: 'Rare', nvMax: 10 },
  { id: 'epic', en: 'Epic', nvMax: 10 },
  { id: 'superior', en: 'Superior', nvMax: 10 },
];
const CALIDAD = new Map(CALIDADES.map((c) => [c.id, c]));

function limpiarCarta(cat, c) {
  if (!c?.id || !cat.rostros.has(c.id)) return null;
  const cal = CALIDAD.has(c.cal) ? c.cal : 'superior';
  const nv = Math.round(Number(c.nv));
  return { id: c.id, cal, nv: nv >= 1 ? Math.min(nv, CALIDAD.get(cal).nvMax) : CALIDAD.get(cal).nvMax };
}

/** Normaliza el bloque `rostros` de la composición; null si no hay ninguna carta. */
export function limpiarRostros(cat, r) {
  if (!r || typeof r !== 'object') return null;
  const nucleo = limpiarCarta(cat, r.nucleo);
  const cartas = Array.from({ length: CARTAS_ROSTROS }, (_, i) => limpiarCarta(cat, r.cartas?.[i]));
  if (!nucleo && !cartas.some(Boolean)) return null;
  return { nucleo, cartas, maestria: r.maestria !== false };
}

/**
 * Cálculo de los Rostros: costo (núcleo incluido, tope 12), sets y efecto núcleo.
 * Reglas (capturas de Juan, 2026-11-23): para los sets cuentan monstruos distintos (dos copias de la
 * misma carta = 1); con "Proof of Mastery" el núcleo suma +1 a su set. Normal y radiante cuentan
 * como monstruos distintos (por confirmar).
 * @returns {null | {nucleo, cartas, costo, costoMax, maestria, sets: Array<{id,en,es,puestas,max,bonos,activo,siguiente,temporada0?}>, setsActivos:number}}
 */
export function calcularRostros(cat, r, avisos = []) {
  if (!r) return null;
  const ficha = (c, donde) => {
    if (!c?.id) return null;
    const item = cat.rostros.get(c.id);
    if (!item) { avisos.push(`Rostro desconocido: ${c.id}`); return null; }
    const cal = CALIDAD.get(c.cal) || CALIDAD.get('superior');
    return { item, cal: cal.id, nv: Math.min(Math.max(1, Math.round(Number(c.nv)) || cal.nvMax), cal.nvMax), donde };
  };
  const nucleo = ficha(r.nucleo, 'nucleo');
  const cartas = Array.from({ length: CARTAS_ROSTROS }, (_, i) => ficha(r.cartas?.[i], i));
  const puestas = [nucleo, ...cartas].filter(Boolean);
  if (!puestas.length) return null;
  const maestria = r.maestria !== false;
  const costo = puestas.reduce((t, c) => t + c.item.costo, 0);
  if (costo > COSTO_ROSTROS) avisos.push(`Los Rostros cuestan ${costo}: el máximo es ${COSTO_ROSTROS}.`);

  const monstruosPorSet = new Map();
  for (const c of puestas) {
    for (const s of c.item.sets) {
      if (!monstruosPorSet.has(s)) monstruosPorSet.set(s, new Set());
      monstruosPorSet.get(s).add(c.item.id);
    }
  }
  const sets = [];
  for (const [id, monstruos] of monstruosPorSet) {
    const s = cat.rostrosSets.get(id);
    if (!s) continue;
    const extra = maestria && nucleo?.item.sets.includes(id) ? 1 : 0;
    const max = Math.max(...s.bonos.map((b) => b.n));
    const n = Math.min(monstruos.size + extra, max);
    const bonos = s.bonos.map((b) => ({ ...b, activo: n >= b.n }));
    const sig = s.bonos.find((b) => b.n > n);
    sets.push({ id, en: s.en, es: s.es, puestas: n, max, bonos, activo: bonos.some((b) => b.activo),
      siguiente: sig ? { n: sig.n, faltan: sig.n - n } : null, maestria: extra > 0,
      ...(s.temporada0 ? { temporada0: true } : {}) });
  }
  sets.sort((x, y) => Number(y.activo) - Number(x.activo) || y.puestas - x.puestas || x.en.localeCompare(y.en));
  return { nucleo, cartas, costo, costoMax: COSTO_ROSTROS, maestria, sets, setsActivos: sets.filter((s) => s.activo).length };
}

/** Pone (o quita, con id vacío) un Rostro en una ranura: 'nucleo' o 0..3. Conserva calidad y nivel de la ranura. */
export function conRostro(build, ranura, id, extra = {}) {
  const b = structuredClone(build || buildVacia());
  const r = b.rostros || { nucleo: null, cartas: Array(CARTAS_ROSTROS).fill(null), maestria: true };
  r.cartas = Array.from({ length: CARTAS_ROSTROS }, (_, i) => r.cartas?.[i] || null);
  const previa = ranura === 'nucleo' ? r.nucleo : r.cartas[ranura];
  const nueva = id ? { id, cal: extra.cal || previa?.cal || 'superior', nv: extra.nv || previa?.nv || 10 } : null;
  if (nueva && CALIDAD.get(nueva.cal)) nueva.nv = Math.min(nueva.nv, CALIDAD.get(nueva.cal).nvMax);
  if (ranura === 'nucleo') r.nucleo = nueva; else r.cartas[ranura] = nueva;
  b.rostros = r;
  if (!r.nucleo && !r.cartas.some(Boolean)) delete b.rostros;
  return b;
}

/** Qué cambia en los sets de Rostros y en el costo ("si la cambias…" del selector de Rostros). */
export function diferenciaRostros(antes, despues) {
  const mapa = (x) => new Map((x?.sets || []).map((s) => [s.id, s]));
  const sa = mapa(antes);
  const sd = mapa(despues);
  const sets = [];
  for (const id of new Set([...sa.keys(), ...sd.keys()])) {
    const a = sa.get(id)?.puestas || 0;
    const d = sd.get(id)?.puestas || 0;
    if (a === d) continue;
    const ref = sd.get(id) || sa.get(id);
    const activos = (n) => ref.bonos.filter((b) => n >= b.n).length;
    sets.push({ id, en: ref.en, es: ref.es, max: ref.max, antes: a, despues: d,
      efecto: activos(d) > activos(a) ? 'gana' : activos(d) < activos(a) ? 'pierde' : 'igual' });
  }
  const orden = { gana: 0, igual: 1, pierde: 2 };
  sets.sort((x, y) => orden[x.efecto] - orden[y.efecto]);
  return { sets, costo: (despues?.costo || 0) - (antes?.costo || 0), costoFinal: despues?.costo || 0 };
}

/* ---------------- Camarada (Buddy) ---------------- */

export const CAMARADA_NV_MAX = 80;
export const ESTRELLAS_MAX = 6; // capturas de Juan (2026-11-23): Kojiro e Icarus Lv 80/80 con 6 estrellas
export const PODER_MAX = 999999;

/** Entero en [min, max]; fuera de rango o vacío → null. */
function entero(v, min, max) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/**
 * Normaliza el bloque `camarada`: { id, nv?, estrellas?, poder? }. Nivel, estrellas y poder los
 * escribe el miembro desde su captura (no hay tablas públicas de stats por nivel). Sin camarada → null.
 */
export function limpiarCamarada(cat, c) {
  if (!c?.id || !cat.camaradas?.has(c.id)) return null;
  const out = { id: c.id };
  const nv = entero(c.nv, 1, CAMARADA_NV_MAX);
  const estrellas = entero(c.estrellas, 0, ESTRELLAS_MAX);
  const poder = entero(c.poder, 0, PODER_MAX);
  if (nv !== null) out.nv = nv;
  if (estrellas !== null) out.estrellas = estrellas;
  if (poder !== null) out.poder = poder;
  return out;
}

/**
 * Ficha del camarada para la hoja: el del catálogo + lo que escribió el miembro.
 * `compatible`: false si el adventurer tiene tipo conocido y no coincide con el del camarada
 * (el juego no deja equiparlo: confirmado con capturas de Juan, 2026-11-23). Solo pasa con builds
 * viejas; la web ya no deja elegirlo ni lo conserva al cambiar de adventurer (`conAdventurer`).
 */
export function calcularCamarada(cat, c, adv = null, avisos = []) {
  if (!c?.id) return null;
  const item = cat.camaradas?.get(c.id);
  if (!item) { avisos.push(`Camarada desconocido: ${c.id}`); return null; }
  const compatible = !adv?.tipo || adv.tipo === item.tipo;
  return { item, nv: c.nv ?? null, estrellas: c.estrellas ?? null, poder: c.poder ?? null, compatible };
}

/** Pone, cambia o quita (id vacío) el camarada. Al cambiarlo se conservan nivel, estrellas y poder solo si se pide. */
export function conCamarada(build, id, datos = null) {
  const b = structuredClone(build || buildVacia());
  if (!id) { delete b.camarada; return b; }
  const previo = b.camarada || {};
  const base = datos || (previo.id === id ? previo : {});
  b.camarada = { id };
  for (const k of ['nv', 'estrellas', 'poder']) if (base[k] !== undefined && base[k] !== null && base[k] !== '') b.camarada[k] = base[k];
  return b;
}

/**
 * Cambia el adventurer (id vacío = ninguno) y quita lo que el juego no deja llevar: el arma si es de
 * otro tipo, el camarada si es de otro tipo (Asalto / Alterador / Apoyo) y las Reflexiones que el nuevo
 * no tiene. El Fated Adventurer no tiene tipo en el catálogo → su camarada se conserva.
 * Devuelve { build, quitados: ['arma'|'camarada'|'reflexiones'] }.
 */
export function conAdventurer(cat, build, id) {
  const b = structuredClone(build || buildVacia());
  const nuevo = id ? cat.adventurers?.get(id) : null;
  b.adv = nuevo ? { id: nuevo.id, ...(b.adv?.nivel ? { nivel: b.adv.nivel } : {}) } : null;
  const quitados = [];
  const w = b.arma?.id ? cat.armas?.get(b.arma.id) : null;
  if (w && nuevo && w.arma !== nuevo.arma) { b.arma = null; quitados.push('arma'); }
  const cam = b.camarada?.id ? cat.camaradas?.get(b.camarada.id) : null;
  if (cam && nuevo?.tipo && cam.tipo !== nuevo.tipo) { delete b.camarada; quitados.push('camarada'); }
  // Las Reflexiones son de cada adventurer: se quedan solo las que también tiene el nuevo (p. ej. las comunes).
  if (b.reflexiones?.activas?.length) {
    const r = limpiarReflexiones(cat, b.reflexiones, nuevo?.id);
    if ((r?.activas.length || 0) < b.reflexiones.activas.length) quitados.push('reflexiones');
    if (r) b.reflexiones = r; else delete b.reflexiones;
  }
  return { build: b, quitados };
}

/** Los que puede llevar el adventurer: si su tipo se conoce, solo ese tipo (el juego no deja otros). */
export function camaradasPara(lista, tipo = '') {
  return tipo ? lista.filter((x) => x.tipo === tipo) : [...lista];
}

/** Camaradas que encajan con el adventurer primero (mismo tipo), luego por rareza y nombre. */
export function ordenarCamaradas(lista, tipo = '') {
  const RAREZA = { SSR: 0, SR: 1, R: 2 };
  return [...lista].sort((a, b) => (tipo ? Number(b.tipo === tipo) - Number(a.tipo === tipo) : 0)
    || RAREZA[a.rareza] - RAREZA[b.rareza] || (a.es || a.en).localeCompare(b.es || b.en));
}

/* ---------------- Reflexiones (Insights) ---------------- */

export const REFLEXION_CAP_MAX = 300; // con todo: 30 + 6 × 30 = 210 (GameWith); margen por si suben

/**
 * Normaliza { cap?, activas: [ids] }: solo ids que tiene ese adventurer, en el orden del catálogo,
 * sin repetir. Sin adventurer no hay nodos (se conserva la capacidad). Vacío → null.
 */
export function limpiarReflexiones(cat, r, advId) {
  if (!r || typeof r !== 'object') return null;
  const out = {};
  const cap = entero(r.cap, 0, REFLEXION_CAP_MAX);
  if (cap !== null) out.cap = cap;
  const fila = advId ? cat.reflexiones?.get(advId) : null;
  const pedidas = new Set(Array.isArray(r.activas) ? r.activas : []);
  out.activas = fila ? fila.nodos.filter((n) => pedidas.has(n.id)).map((n) => n.id) : [];
  return out.cap === undefined && !out.activas.length ? null : out;
}

/**
 * Reflexiones del adventurer para la hoja. Cada nodo: { ...catálogo, activa, cabe, bloqueada }.
 * - cabe: false si, con capacidad conocida, activarlo pasaría de la capacidad.
 * - bloqueada: nodo de clase de otro tipo. Para el Fated (sin tipo en el catálogo) la clase sale del
 *   camarada (su tipo depende de la clase); sin camarada no se bloquea nada, solo se avisa si se mezclan.
 */
export function calcularReflexiones(cat, r, adv, tipoCamarada = '') {
  if (!adv) return null;
  const fila = cat.reflexiones?.get(adv.id);
  if (!fila) return null;
  const activas = new Set(r?.activas || []);
  const cap = r?.cap ?? null;
  const clase = adv.tipo || tipoCamarada || '';
  const esClase = (n) => n.grupo === 'clase';
  const usados = fila.nodos.filter((n) => activas.has(n.id)).reduce((t, n) => t + n.pts, 0);
  const nodos = fila.nodos.map((n) => {
    const activa = activas.has(n.id);
    const bloqueada = esClase(n) && !!clase && n.tipo !== clase;
    return { ...n, activa, bloqueada, cabe: activa || cap === null || usados + n.pts <= cap };
  });
  const avisos = [];
  if (cap !== null && usados > cap) avisos.push(`Usas ${usados} puntos y tienes ${cap}: quita alguna.`);
  const clasesActivas = new Set(nodos.filter((n) => n.activa && esClase(n)).map((n) => n.tipo));
  if (clasesActivas.size > 1) avisos.push('Mezclas Reflexiones de clases distintas: el Fated solo usa las de su clase.');
  else if (clase && nodos.some((n) => n.activa && n.bloqueada)) avisos.push('Hay una Reflexión de otra clase: el Fated solo usa las de su clase.');
  // Lo máximo que se puede equipar a la vez: todo menos las de otras clases (el Fated usa las 2 de una sola).
  const deClase = nodos.filter(esClase);
  const maximo = nodos.filter((n) => !esClase(n)).reduce((t, n) => t + n.pts, 0)
    + (deClase.length ? Math.max(...['assault', 'disruptor', 'support'].map((t) => deClase.filter((n) => n.tipo === t).reduce((x, n) => x + n.pts, 0))) : 0);
  return { nodos, usados, cap, activas: activas.size, libres: cap === null ? null : cap - usados, maximo, clase,
    incompleto: !!fila.incompleto, avisos };
}

/** Activa o desactiva un nodo. */
export function conReflexion(build, id, activa) {
  const b = structuredClone(build || buildVacia());
  const r = b.reflexiones || { activas: [] };
  const lista = new Set(r.activas || []);
  if (activa) lista.add(id); else lista.delete(id);
  b.reflexiones = { ...r, activas: [...lista] };
  if (b.reflexiones.cap === undefined && !b.reflexiones.activas.length) delete b.reflexiones;
  return b;
}

/** Cambia la capacidad (null = sin dato). */
export function conCapReflexiones(build, cap) {
  const b = structuredClone(build || buildVacia());
  const r = { activas: [], ...(b.reflexiones || {}) };
  const n = entero(cap, 0, REFLEXION_CAP_MAX);
  if (n === null) delete r.cap; else r.cap = n;
  if (r.cap === undefined && !r.activas.length) delete b.reflexiones; else b.reflexiones = r;
  return b;
}

/* ---------------- Recuerdo (Keepsake) y Grabados (Engravings) ---------------- */

export const KEEPSAKE_NV_MAX = 80;
/**
 * Pantalla Engrave del juego (capturas de Juan, 2026-11-23, Fated de ballesta pesada; reemplaza la matriz de
 * GameWith de la v7): filas de nivel 1, 30, 40, 50, 60, 70, 80 y 80 (dos de Nv 80). Cada grabado es un nodo;
 * los del final de Mejora de habilidades y de Atributo principal tienen 3 y 4 rangos (cada rango es un paso).
 * 31 pasos; el "Engrave %" del juego = pasos hechos / 31 (Juan: 27 de 31 = 87 %).
 */
export const FILAS_GRABADO = [
  { id: '1', nv: 1 }, { id: '30', nv: 30 }, { id: '40', nv: 40 }, { id: '50', nv: 50 },
  { id: '60', nv: 60 }, { id: '70', nv: 70 }, { id: '80', nv: 80 }, { id: '80b', nv: 80 },
];
const nodos_ = (filas, final) => filas.map((fila) => ({ fila })).concat(final ? [{ fila: '80b', rangos: final }] : []);
export const GRABADOS = [
  { id: 'sb', es: 'Mejora de habilidades', en: 'Skill Boost', nodos: nodos_(['1', '40', '60', '70', '80'], 3) },
  { id: 'ul', es: 'Definitiva', en: 'Ultimate', nodos: nodos_(['1', '30', '40', '50', '60', '70', '80']) },
  { id: 'el', es: 'Especialización elemental', en: 'Elemental Specialization', nodos: nodos_(['1', '30', '40', '50', '60', '70', '80']) },
  { id: 'cp', es: 'Pasiva principal', en: 'Core Passive', nodos: nodos_(['50', '60', '70', '80']) },
  { id: 'ca', es: 'Atributo principal', en: 'Core Attribute', nodos: nodos_(['80'], 4) },
];
const NV_FILA = new Map(FILAS_GRABADO.map((f) => [f.id, f.nv]));
/** Id de un nodo: columna + fila (sb1, ul30, …, sb80b). Un nodo con rangos tiene un paso por rango (sb80b1 … sb80b3). */
export const idNodoGrabado = (col, fila) => `${col}${fila}`;
const pasosNodo_ = (col, n) => (n.rangos
  ? Array.from({ length: n.rangos }, (_, k) => `${idNodoGrabado(col, n.fila)}${k + 1}`)
  : [idNodoGrabado(col, n.fila)]);
/** Pasos en el orden de la matriz (columna por columna): id → { col, orden, nv }. */
const PASOS = new Map(GRABADOS.flatMap((g) => g.nodos.flatMap((n) => pasosNodo_(g.id, n)).map((id, orden) =>
  [id, { col: g.id, orden, nv: NV_FILA.get(g.nodos.find((n) => pasosNodo_(g.id, n).includes(id)).fila) }])));
export const TOTAL_GRABADOS = PASOS.size;

/** Normaliza { nv?, poder?, grabados: [ids de paso] } (ids conocidos, en el orden de la matriz; los de la v7 se descartan). Vacío → null. */
export function limpiarKeepsake(k) {
  if (!k || typeof k !== 'object') return null;
  const out = {};
  const nv = entero(k.nv, 1, KEEPSAKE_NV_MAX);
  const poder = entero(k.poder, 0, PODER_MAX);
  if (nv !== null) out.nv = nv;
  if (poder !== null) out.poder = poder;
  const pedidos = new Set(Array.isArray(k.grabados) ? k.grabados : []);
  out.grabados = [...PASOS.keys()].filter((id) => pedidos.has(id));
  return out.nv === undefined && out.poder === undefined && !out.grabados.length ? null : out;
}

/**
 * Ficha para la hoja: por columna, nodos { id, fila, nv, rangos, hechos, hecho, abierto } (abierto = el nivel del
 * Recuerdo lo permite; sin nivel, todo abierto); pasos hechos / 31, % como el juego y avisos si hay grabados por
 * encima del nivel.
 */
export function calcularKeepsake(k) {
  const hechos = new Set((k?.grabados || []).filter((id) => PASOS.has(id)));
  const nv = k?.nv ?? null;
  const columnas = GRABADOS.map((g) => ({
    id: g.id, es: g.es, en: g.en,
    nodos: g.nodos.map((n) => {
      const pasos = pasosNodo_(g.id, n);
      const h = pasos.filter((id) => hechos.has(id)).length;
      const nvf = NV_FILA.get(n.fila);
      return { id: idNodoGrabado(g.id, n.fila), fila: n.fila, nv: nvf, rangos: n.rangos || 1, hechos: h,
        hecho: h === pasos.length, abierto: nv === null || nvf <= nv };
    }),
  }));
  const fuera = columnas.flatMap((c) => c.nodos).filter((n) => n.hechos && !n.abierto).length;
  return { nv, poder: k?.poder ?? null, columnas, hechos: hechos.size, total: TOTAL_GRABADOS,
    pct: Math.floor((hechos.size * 100) / TOTAL_GRABADOS),
    avisos: fuera ? [`${fuera === 1 ? 'Un grabado pide' : `${fuera} grabados piden`} más nivel del Recuerdo.`] : [] };
}

/**
 * Marca o desmarca un paso (un grabado o un rango). Como el juego pide hacerlos en orden dentro de la columna,
 * marcar uno marca los anteriores y desmarcar uno desmarca los siguientes.
 */
export function conGrabado(build, id, hecho) {
  const b = structuredClone(build || buildVacia());
  const p = PASOS.get(id);
  if (!p) return b;
  const k = { grabados: [], ...(b.keepsake || {}) };
  const set = new Set(k.grabados.filter((x) => PASOS.has(x)));
  for (const [x, q] of PASOS) {
    if (q.col !== p.col) continue;
    if (hecho && q.orden <= p.orden) set.add(x);
    if (!hecho && q.orden >= p.orden) set.delete(x);
  }
  k.grabados = [...PASOS.keys()].filter((x) => set.has(x));
  b.keepsake = k;
  if (k.nv === undefined && k.poder === undefined && !k.grabados.length) delete b.keepsake;
  return b;
}

/** Nodo con rangos (sb80b, ca80b): cada toque sube un rango; desde el último vuelve a 0. */
export function conRangoGrabado(build, nodo) {
  const g = GRABADOS.find((x) => nodo.startsWith(x.id));
  const n = g?.nodos.find((x) => x.rangos && idNodoGrabado(g.id, x.fila) === nodo);
  if (!n) return structuredClone(build || buildVacia());
  const hechos = new Set(build?.keepsake?.grabados || []);
  const pasos = pasosNodo_(g.id, n);
  const r = pasos.filter((id) => hechos.has(id)).length;
  return r < pasos.length ? conGrabado(build, pasos[r], true) : conGrabado(build, pasos[0], false);
}

/** Cambia nivel o poder del Recuerdo (valor null o fuera de rango = sin dato). */
export function conDatoKeepsake(build, campo, valor) {
  const b = structuredClone(build || buildVacia());
  const k = { grabados: [], ...(b.keepsake || {}) };
  const n = campo === 'nv' ? entero(valor, 1, KEEPSAKE_NV_MAX) : entero(valor, 0, PODER_MAX);
  if (n === null) delete k[campo]; else k[campo] = n;
  b.keepsake = k;
  if (k.nv === undefined && k.poder === undefined && !k.grabados.length) delete b.keepsake;
  return b;
}
