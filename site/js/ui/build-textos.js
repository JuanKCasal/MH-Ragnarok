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

/**
 * Nombre del juego en español con el inglés debajo, más chico: "Yelmo de Rathalos V" / "Rathalos Helm V".
 * Los ES son de GameWith es-MX (por confirmar). Sin ES, solo el inglés.
 * num: lo que va pegado al ES (nivel de la habilidad); numEn: lo que va pegado al EN (por defecto, nada).
 */
export function bil(es, en, { num = '', numEn = '', ok = false } = {}) {
  const marca = ok ? html`<span class="bld-ok" title="Confirmado en el juego por un oficial"><span aria-hidden="true">✓</span><span class="oculto-visual"> (confirmado)</span></span>` : '';
  if (!es || es === en) return html`<span class="bld-bil">${es || en}${num}${marca}</span>`;
  return html`<span class="bld-bil">${es}${num}${marca}<span class="bld-en" lang="en"><span class="bld-sep"> · </span>${en}${numEn}</span></span>`;
}
/** bil() para una ficha del catálogo con {es, en} (habilidad, set, monstruo). */
export const bilFicha = (x, op) => (x ? bil(x.es, x.en, { ok: x.esOk, ...op }) : '');

/** Chips de habilidades de una pieza: [[id, nivel]] → "Mejora de daño de fuego 2 · Fire Damage Up". */
export function chipsHab(cat, habs, { resaltar } = {}) {
  if (!habs.length) return html`<span class="nota">Sin habilidades en esta rareza</span>`;
  return html`<ul class="bld-chips">${habs.map(([h, nv]) => {
    const f = cat.habilidades.get(h);
    return html`<li class="bld-chip ${h === resaltar ? 'bld-chip--resalta' : ''}">${f ? bil(f.es, f.en, { num: ` ${nv}` }) : `${h} ${nv}`}</li>`;
  })}</ul>`;
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
    lineas.push(html`<li class="bld-dif bld-dif--${h.efecto}">${h.es || h.en} ${h.antes} → ${h.despues}${h.efecto !== 'pierde' ? tope : ''}</li>`);
  }
  for (const s of d.sets) {
    const a = Math.min(s.antes, s.necesarias);
    const b = Math.min(s.despues, s.necesarias);
    if (a === b) continue; // sigue completo: no cambia nada que importe
    lineas.push(html`<li class="bld-dif bld-dif--${b > a ? 'gana' : 'pierde'}">${s.es || s.en} ${a}/${s.necesarias} → ${b}/${s.necesarias}${s.efecto === 'gana' ? ' · listo' : ''}</li>`);
  }
  if (d.def) lineas.push(html`<li class="bld-dif">Defensa ${signo(d.def)}</li>`);
  if (d.atk) lineas.push(html`<li class="bld-dif">Ataque ${signo(d.atk)}</li>`);
  if (d.afi) lineas.push(html`<li class="bld-dif">Afinidad ${afinidad(d.afi)}</li>`);
  if (d.ele) lineas.push(html`<li class="bld-dif">Elemento ${signo(d.ele)}</li>`);
  if (!lineas.length) return html`<p class="nota">No cambia nada.</p>`;
  return html`<ul class="bld-difs">${lineas}</ul>`;
}

/* ---------- Rostros ---------- */

/** "Rathalos radiante · Radiant Rathalos" (nombres ES de GameWith es-MX, por confirmar). */
export const bilingue = (x) => (x?.es && x.es !== x.en ? `${x.es} · ${x.en}` : x?.en || '');

/** Chips de sets de una carta: "Tinta de llamas". */
export function chipsSetsRostro(cat, ids, { resaltar } = {}) {
  return html`<ul class="bld-chips">${ids.map((id) => html`
    <li class="bld-chip ${id === resaltar ? 'bld-chip--resalta' : ''}">${cat.rostrosSets.get(id)?.es || id}</li>`)}</ul>`;
}

/** Lista de sets de Rostros con sus bonos (✓ activo), como en la pantalla del juego. */
export function listaSetsRostros(sets) {
  if (!sets.length) return '';
  return html`<ul class="bld-rsets">${sets.map((st) => html`
    <li class="bld-rset ${st.activo ? 'bld-rset--activo' : ''}">
      <p class="bld-rset__cabeza"><span class="bld-pieza__nombre">${bilingue(st)}</span>
        <span class="bld-cuenta-set ${st.activo ? 'bld-cuenta-set--listo' : ''}">${st.puestas}/${st.max}</span></p>
      <ul class="bld-rset__bonos">${st.bonos.map((b) => html`
        <li class="${b.activo ? 'bld-rset__bono--activo' : ''}"><span aria-hidden="true">${b.activo ? '✓' : '·'}</span>
          <span><strong>${b.n} ${b.n === 1 ? 'carta' : 'cartas'}:</strong> ${b.es}</span></li>`)}</ul>
      ${st.maestria ? html`<p class="nota">Incluye +1 del núcleo (Proof of Mastery).</p>` : ''}
    </li>`)}</ul>`;
}

/** "Si la cambias…" del selector de Rostros. */
export function siLaCambiasRostro(d) {
  const lineas = d.sets.map((s) => html`<li class="bld-dif bld-dif--${s.efecto}">${s.es} ${s.antes}/${s.max} → ${s.despues}/${s.max}</li>`);
  if (d.costo) lineas.push(html`<li class="bld-dif ${d.costoFinal > 12 ? 'bld-dif--pierde' : ''}">Costo ${signo(d.costo)} (queda ${d.costoFinal}/12)</li>`);
  if (!lineas.length) return html`<p class="nota">No cambia ningún set ni el costo.</p>`;
  return html`<ul class="bld-difs">${lineas}</ul>`;
}

/* ---------- Camarada ---------- */

/** Tipo de camarada = tipo de Definitiva (GameWith es-MX): Asalto/Palico, Alterador/Rutaco, Apoyo/Trillan. */
export const TIPOS_CAMARADA = {
  assault: { es: 'Asalto', en: 'Assault', especie: 'Palico' },
  disruptor: { es: 'Alterador', en: 'Disruptor', especie: 'Rutaco' },
  support: { es: 'Apoyo', en: 'Support', especie: 'Trillan' },
};
const STATS_CAMARADA = {
  ataque_elemental: ['Ataque elemental', ''], afinidad: ['Afinidad', ' %'], carga_definitiva: ['Carga de la definitiva', ' %'],
  fire: ['Fuego', ' %'], water: ['Agua', ' %'], thunder: ['Trueno', ' %'], ice: ['Hielo', ' %'], dragon: ['Dragón', ' %'],
};

/** "Ataque elemental +350 · Afinidad +9 %" (Aumento de aventurero según GameWith). */
export function textoAumento(item) {
  return (item?.aumento || []).map(([k, v]) => {
    const [n, u] = STATS_CAMARADA[k] || [k, ''];
    return `${n} +${Number(v).toLocaleString('es-CL', { maximumFractionDigits: 1 })}${u}`;
  }).join(' · ');
}

/** "Alterador · Rutaco" */
export const tipoCamarada = (t) => (TIPOS_CAMARADA[t] ? `${TIPOS_CAMARADA[t].es} · ${TIPOS_CAMARADA[t].especie}` : '');
