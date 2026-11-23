/**
 * Nombres en español del catálogo (E6). Ver docs/BUILDER.md §12. Módulo puro (sin DOM).
 *
 * El catálogo estático trae el ES de GameWith es-MX ("por confirmar"). Los oficiales corrigen o
 * confirman desde la web (hoja Catalogo): esas filas se aplican encima al cargar el catálogo.
 * Armas y armaduras se corrigen por nombre base EN (sin número romano ni elemento); la clave es
 * el slug de ese nombre ("Rathalos Helm" → rathalos-helm, "Flammenzahn+" → flammenzahn-plus).
 * Las tuplas de nombres quedan [rareza, en, es?, confirmado?].
 */

export const TIPOS_NOMBRE = ['arma', 'pieza', 'habilidad', 'set', 'monstruo'];
const RE_NUMERO = /\s+(?:I|II|III|IV|V|VI|VII|VIII|IX|X)$/;
const RE_ELEMENTO = /\s*\((Fire|Water|Ice|Thunder|Dragon)\)$/;
const RE_ELEMENTO_ES = /\s*\((fuego|agua|hielo|rayo|draco)\)$/;
export const ELEMENTO_ES = { Fire: 'fuego', Water: 'agua', Ice: 'hielo', Thunder: 'rayo', Dragon: 'draco' };
/** Variantes de una habilidad que comparten nombre: fire-damage-up-s0, critical-element-control… */
const RE_VARIANTE = /-(s0(-\d+)?|\d+|control)$/;

export function claveNombre(base) {
  return String(base).replace(/\+/g, ' plus').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]s\b/g, '').replace(/['’"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** "Guild Crimson Crest Great Sword (Fire) III" → { base: 'Guild Crimson Crest Great Sword', el: 'Fire', num: ' III' } */
export function partirNombre(en, esArma) {
  let base = String(en || '');
  const m = RE_NUMERO.exec(base);
  const num = m ? m[0] : '';
  if (m) base = base.slice(0, m.index);
  let el = '';
  if (esArma) {
    const e = RE_ELEMENTO.exec(base);
    if (e) { el = e[1]; base = base.slice(0, e.index); }
  }
  return { base, el, num };
}

/** Quita número romano y elemento de un nombre ES para volver a su base. */
export function baseEs(es) {
  return String(es || '').replace(RE_NUMERO, '').replace(RE_ELEMENTO_ES, '').trim();
}

const armar = (esBase, el, num) => `${esBase}${el ? ` (${ELEMENTO_ES[el]})` : ''}${num}`;

/**
 * Aplica las correcciones de los oficiales (GET catalogo_nombres) sobre el catálogo indexado (lo modifica).
 * @param {object} cat catálogo de indexarCatalogo()
 * @param {Array<{tipo,id,es}>} filas
 */
export function aplicarNombres(cat, filas = []) {
  const por = Object.fromEntries(TIPOS_NOMBRE.map((t) => [t, new Map()]));
  for (const f of filas || []) if (por[f?.tipo] && f.id && f.es) por[f.tipo].set(f.id, f.es);

  for (const [k, mapa] of [['habilidades', por.habilidad], ['sets', por.set], ['monstruos', por.monstruo]]) {
    for (const x of cat[k].values()) {
      const es = mapa.get(x.id) ?? (k === 'habilidades' ? mapa.get(x.id.replace(RE_VARIANTE, '')) : undefined);
      if (es) { x.es = es; x.esOk = true; }
    }
  }
  for (const [lista, mapa, esArma] of [[cat.lista.armas, por.arma, true], [cat.lista.armaduras, por.pieza, false]]) {
    if (!mapa.size) continue;
    for (const item of lista) {
      for (const t of item.nombres || []) {
        const { base, el, num } = partirNombre(t[1], esArma);
        const es = mapa.get(claveNombre(base));
        if (es) { t[2] = armar(es, el, num); t[3] = true; continue; }
        // Radiante sin nombre propio: sale de la corrección de la normal ("… radiante").
        const m = /^Radiant (.+)$/.exec(base);
        const esNormal = m && !t[2] ? mapa.get(claveNombre(m[1])) : null;
        if (esNormal) t[2] = armar(`${esNormal} radiante`, el, num);
      }
    }
  }
  cat.nombresAplicados = filas || [];
  return cat;
}

/** Estado de un nombre: 'ok' (confirmado por un oficial), 'gw' (GameWith, por confirmar) o 'en' (solo inglés). */
export const estadoNombre = (es, en, ok) => (ok ? 'ok' : es && es !== en ? 'gw' : 'en');

/**
 * Lista para la página "Nombres del juego": una entrada por nombre corregible.
 * Armas y armaduras: una por nombre base EN (vale para todas sus rarezas y para el elemento).
 * @returns {Array<{tipo,id,en,es,estado,detalle}>}
 */
export function entradasNombres(cat, tipo, { detalleArma = (w) => w.arma, detallePieza = (p) => p.parte } = {}) {
  if (tipo === 'arma' || tipo === 'pieza') {
    const esArma = tipo === 'arma';
    const vistos = new Map();
    for (const item of esArma ? cat.lista.armas : cat.lista.armaduras) {
      for (const t of item.nombres || []) {
        const { base } = partirNombre(t[1], esArma);
        const id = claveNombre(base);
        if (vistos.has(id)) continue;
        vistos.set(id, { tipo, id, en: base, es: t[2] ? baseEs(t[2]) : '', estado: estadoNombre(t[2], t[1], t[3]),
          detalle: esArma ? detalleArma(item) : detallePieza(item) });
      }
    }
    return [...vistos.values()];
  }
  const fuente = tipo === 'habilidad' ? cat.lista.habilidades.filter((h) => !(RE_VARIANTE.test(h.id) && cat.habilidades.has(h.id.replace(RE_VARIANTE, ''))))
    : tipo === 'set' ? [...cat.sets.values()] : cat.lista.monstruos;
  return fuente.map((x) => ({ tipo, id: x.id, en: x.en, es: x.es && x.es !== x.en ? x.es : (x.esOk ? x.es : ''),
    estado: estadoNombre(x.es, x.en, x.esOk), detalle: '' }));
}
