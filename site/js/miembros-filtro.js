/** Búsqueda, filtros y orden del directorio de miembros (sin DOM, para poder probarlo). */
import { ARMAS, ELEMENTOS, TIPOS } from './etiquetas.js';

/** Minúsculas y sin tildes: "Halcón" coincide con "halcon". */
export const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const poder = (m) => Number(m.principal?.poder_total) || 0;

/** Puesto por poder en todo el gremio (1 = el más fuerte). Sin adventurer principal: sin puesto. */
export function puestos(lista) {
  const map = new Map();
  [...lista].filter((m) => poder(m) > 0).sort((a, b) => poder(b) - poder(a)).forEach((m, i) => map.set(m.id, i + 1));
  return map;
}

function texto(m) {
  const p = m.principal || {};
  return normalizar([m.nick, m.nick_juego, p.adventurer, ARMAS[p.arma]?.es, ARMAS[p.arma]?.en,
    ELEMENTOS[p.elemento], TIPOS[p.tipo]].filter(Boolean).join(' '));
}

/**
 * @param {object[]} lista  respuesta de GET miembros
 * @param {{q?: string, armas?: Set<string>, elementos?: Set<string>, tipos?: Set<string>, orden?: 'poder'|'poder_asc'|'nick'}} f
 */
export function filtrarMiembros(lista, f = {}) {
  const palabras = normalizar(f.q).split(/\s+/).filter(Boolean);
  const hay = (set, v) => !set || set.size === 0 || set.has(v);
  const r = lista.filter((m) => {
    const p = m.principal;
    const conFiltro = (f.armas?.size || f.elementos?.size || f.tipos?.size);
    if (conFiltro && !p) return false;
    if (p && !(hay(f.armas, p.arma) && hay(f.elementos, p.elemento || 'none') && hay(f.tipos, p.tipo))) return false;
    if (palabras.length) {
      const t = texto(m);
      if (!palabras.every((w) => t.includes(w))) return false;
    }
    return true;
  });
  const porNick = (a, b) => a.nick.localeCompare(b.nick, 'es', { sensitivity: 'base' });
  const orden = f.orden || 'poder';
  if (orden === 'nick') return r.sort(porNick);
  // Sin adventurer cargado: siempre al final.
  return r.sort((a, b) => {
    const pa = poder(a); const pb = poder(b);
    if (!pa || !pb) return (pb ? 1 : 0) - (pa ? 1 : 0) || porNick(a, b);
    return (orden === 'poder_asc' ? pa - pb : pb - pa) || porNick(a, b);
  });
}
