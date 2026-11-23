/** Textos y piezas de interfaz compartidos por el builder (hoja, selector y, más adelante, la tarjeta). */
import { html } from './dom.js';
import { numero } from './dom.js';
import { ELEMENTOS } from '../etiquetas.js';

export const ESTADOS = { poison: 'Veneno', paralysis: 'Parálisis', sleep: 'Sueño', blast: 'Nitro' };
export const nombreElemento = (t) => ELEMENTOS[t] || ESTADOS[t] || t;

/** "+2.7 %" / "−3 %" */
export function afinidad(v) {
  if (!v) return '0 %';
  const s = Math.abs(v).toLocaleString('es-CL', { maximumFractionDigits: 2 });
  return `${v > 0 ? '+' : '−'}${s} %`;
}

export const signo = (n) => (n > 0 ? `+${numero(n)}` : n < 0 ? `−${numero(-n)}` : '0');

/** Chips de habilidades de una pieza: [[id, nivel]] → "Fire Damage Up 2". */
export function chipsHab(cat, habs, { resaltar } = {}) {
  if (!habs.length) return html`<span class="nota">Sin habilidades en esta rareza</span>`;
  return html`<ul class="bld-chips">${habs.map(([h, nv]) => html`
    <li class="bld-chip ${h === resaltar ? 'bld-chip--resalta' : ''}">${cat.habilidades.get(h)?.en || h} ${nv}</li>`)}</ul>`;
}

/** Línea de stats de un arma en su rareza. */
export function statsArma(c) {
  return [
    `Ataque ${numero(c.atk)}`,
    c.afi ? `Afinidad ${afinidad(c.afi)}` : '',
    c.ele ? `${nombreElemento(c.ele.tipo)} ${numero(c.ele.v)}` : '',
    c.estado ? `${nombreElemento(c.estado.tipo)} ${numero(c.estado.v)}` : '',
  ].filter(Boolean).join(' · ');
}

/** Lista "si la cambias…" a partir de diferencia(). */
export function siLaCambias(d) {
  const lineas = [];
  for (const h of d.habilidades) {
    const tope = h.alTope ? (h.efecto === 'gana' ? ' · al tope' : ' · sigue al tope') : '';
    lineas.push(html`<li class="bld-dif bld-dif--${h.efecto}">${h.en} ${h.antes} → ${h.despues}${h.efecto !== 'pierde' ? tope : ''}</li>`);
  }
  for (const s of d.sets) {
    const a = Math.min(s.antes, s.necesarias);
    const b = Math.min(s.despues, s.necesarias);
    if (a === b) continue; // sigue completo: no cambia nada que importe
    lineas.push(html`<li class="bld-dif bld-dif--${b > a ? 'gana' : 'pierde'}">${s.en} ${a}/${s.necesarias} → ${b}/${s.necesarias}${s.efecto === 'gana' ? ' · listo' : ''}</li>`);
  }
  if (d.def) lineas.push(html`<li class="bld-dif">Defensa ${signo(d.def)}</li>`);
  if (d.atk) lineas.push(html`<li class="bld-dif">Ataque ${signo(d.atk)}</li>`);
  if (d.afi) lineas.push(html`<li class="bld-dif">Afinidad ${afinidad(d.afi)}</li>`);
  if (d.ele) lineas.push(html`<li class="bld-dif">Elemento ${signo(d.ele)}</li>`);
  if (!lineas.length) return html`<p class="nota">No cambia nada.</p>`;
  return html`<ul class="bld-difs">${lineas}</ul>`;
}
