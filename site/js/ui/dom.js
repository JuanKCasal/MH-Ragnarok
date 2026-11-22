/**
 * Plantillas HTML con escape automático: todo valor interpolado se escapa,
 * salvo lo que ya viene de otra plantilla html`` (marcado como Seguro).
 */

export class Seguro {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function valor(v) {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(valor).join('');
  if (v instanceof Seguro) return v.s;
  return esc(v);
}

export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) out += valor(vals[i]);
  });
  return new Seguro(out);
}

/** Inserta una cadena ya confiable (SVG propios). No usar con datos de usuario. */
export const crudo = (s) => new Seguro(s);

export function pintar(el, plantilla) {
  el.innerHTML = String(plantilla);
}

const NF = new Intl.NumberFormat('es-CL');
export const numero = (n) => NF.format(Math.round(Number(n) || 0));

const ROMANOS = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function romano(n) {
  let x = Math.max(0, Math.floor(Number(n) || 0));
  if (!x || x > 39) return String(n ?? '');
  let out = '';
  for (const [v, s] of ROMANOS) while (x >= v) { out += s; x -= v; }
  return out;
}
