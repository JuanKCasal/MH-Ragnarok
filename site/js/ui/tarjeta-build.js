/**
 * Tarjeta compacta de una build (E3): en el perfil del miembro, debajo de cada adventurer, y en guías
 * y noticias con [[build:ID]]. Toda la tarjeta abre la build; Compartir y "Usar de base" van aparte.
 * Ver docs/BUILDER.md §17.
 */
import { html, numero } from './dom.js';
import { leer } from '../api.js';
import { ARMAS } from '../etiquetas.js';
import { nombreElemento } from './build-textos.js';
import { compartir } from './contenido.js';
import { resumenTarjeta } from '../build-calc.js';
import { cargarCatalogo } from '../catalogo.js';
import { guardarBorrador } from '../borradores.js';
import { ir } from '../router.js';

const elemDot = (k) => html`<span class="elem elem--${k || 'none'}" aria-hidden="true"></span>`;
const pips = (nivel, max) => html`<span class="pips" style="--n:${max};--v:${nivel}" aria-hidden="true"></span>`;
const enlaceBuild = (id) => `${location.origin}${location.pathname}#/build/${encodeURIComponent(id)}`;
const lista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0] || '');

/**
 * @param {object} cat catálogo indexado
 * @param {object} b build tal como la devuelve el backend (con autor.maestria desde la v10)
 * @param {{modo?: 'perfil'|'guia'}} op
 */
export function tarjetaBuild(cat, b, { modo = 'perfil' } = {}) {
  const r = resumenTarjeta(cat, b.datos, b.autor?.maestria ?? null);
  const tipoArma = r.armaTipo || b.arma_tipo;
  const ele = r.ele?.tipo || (b.elemento && b.elemento !== 'none' ? b.elemento : '');
  const armaTxt = [ele ? nombreElemento(ele) : '', ARMAS[tipoArma] ? `${ARMAS[tipoArma].es} · ${ARMAS[tipoArma].en}` : ''].filter(Boolean).join(' · ');
  const completo = r.poder.completo;
  const guia = modo === 'guia';
  const etiquetaPoder = `Poder ${completo ? numero(r.poder.total) : `escrito ${r.poder.escritos} de ${r.poder.partes.length}`}`;

  return html`
    <article class="btar ${completo ? '' : 'btar--incompleta'} ${guia ? 'btar--guia' : ''}" data-build-id="${b.id}">
      ${guia && b.autor ? html`<p class="btar__autor">Build de <strong>${b.autor.nick}</strong></p>` : ''}
      <div class="btar__cabeza">
        <div class="btar__id">
          <h3 class="btar__nombre"><a class="btar__enlace" href="#/build/${encodeURIComponent(b.id)}">${b.nombre}</a></h3>
          ${armaTxt ? html`<p class="btar__arma">${elemDot(ele)}${armaTxt}</p>` : ''}
        </div>
        <p class="btar__poder ${completo ? '' : 'btar__poder--parcial'}" aria-label="${etiquetaPoder}">
          ${completo
            ? html`<span class="num">${numero(r.poder.total)}</span><span class="rotulo">poder</span>`
            : html`<span class="num">${r.poder.escritos}<small> de ${r.poder.partes.length}</small></span><span class="rotulo">poder escrito</span>`}
        </p>
      </div>
      ${r.arma
        ? html`<p class="btar__equipo"><span class="btar__ico" aria-hidden="true">⚔</span>${r.arma.es || r.arma.en}${r.arma.es && r.arma.es !== r.arma.en ? html` <em class="btar__en" lang="en">${r.arma.en}</em>` : ''}
            <span class="btar__r" title="Rareza ${r.arma.r}">R${r.arma.r}</span>
            ${r.ele ? html`<span class="btar__ele btar__ele--${r.ele.tipo}">${nombreElemento(r.ele.tipo)} ${numero(r.ele.v)}</span>` : ''}</p>`
        : ''}
      ${r.habilidades.length
        ? html`<ul class="btar__habs" aria-label="Habilidades principales">${r.habilidades.map((h) => html`
            <li><span class="btar__hab">${h.es || h.en}${h.es && h.es !== h.en ? html` <em lang="en">${h.en}</em>` : ''}</span>${pips(h.nivel, h.max)}<b class="btar__nv ${h.nivel >= h.max ? 'btar__nv--max' : ''}">${h.nivel}/${h.max}</b></li>`)}</ul>`
        : ''}
      <ul class="btar__chips">
        ${r.nucleo ? html`<li class="chip-b chip-b--nucleo" title="Núcleo de Rostros"><span aria-hidden="true">◆</span>${r.nucleo.es || r.nucleo.en}</li>` : html`<li class="chip-b chip-b--falta">Sin Rostros</li>`}
        ${r.setsRostros.map((s) => html`<li class="chip-b">${s.es || s.en} ${s.puestas}/${s.max}</li>`)}
        ${r.camarada ? html`<li class="chip-b ${r.camarada.rareza === 'SSR' ? 'chip-b--ssr' : ''}">${r.camarada.rareza ? html`<b>${r.camarada.rareza}</b>` : ''}${r.camarada.es || r.camarada.en}</li>` : ''}
      </ul>
      ${!completo && !guia && b.adventurer_id && r.faltan.length
        ? html`<p class="btar__aviso">Falta${r.faltan.length > 1 ? 'n' : ''} ${lista(r.faltan.map((x) => (x === 'Proof of Mastery' ? x : x.toLowerCase())))}: mientras no esté 5 de 5 no cambia el poder del adventurer.</p>`
        : ''}
      ${guia
        ? html`<div class="btar__pie btar__pie--botones">
            <button type="button" class="boton boton--chico boton--tenue" data-btar-compartir>Compartir</button>
            <button type="button" class="boton boton--chico boton--oro" data-btar-base>Usar de base</button>
          </div>`
        : html`<div class="btar__pie">
            <button type="button" class="btar__accion" data-btar-compartir>Compartir</button>
            <button type="button" class="btar__accion" data-btar-base>Usar de base</button>
            <span class="btar__ver" aria-hidden="true">Ver build ›</span>
          </div>`}
    </article>`;
}

/** Usar de base: la build pasa al borrador de "Nueva build" (como el botón de la barra del builder). */
export function usarDeBase(b) {
  guardarBorrador('build', '', {
    b: b.datos,
    meta: { nombre: `${b.nombre} (copia)`.slice(0, 40), clase: 'perfil', adventurer_id: '', notas: '' },
  });
  ir('/build/nueva');
}

/** Activa Compartir y "Usar de base" de las tarjetas dentro de `el`. `builds`: Map id → build. */
export function activarTarjetas(el, builds) {
  el.btarBuilds = new Map([...(el.btarBuilds || []), ...builds]);
  if (el.dataset.btarActivo) return;
  el.dataset.btarActivo = '1';
  el.addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-btar-compartir], [data-btar-base]');
    if (!boton) return;
    const b = el.btarBuilds.get(boton.closest('[data-build-id]')?.dataset.buildId);
    if (!b) return;
    if (boton.hasAttribute('data-btar-compartir')) compartir(`Build ${b.nombre}`, enlaceBuild(b.id));
    else usarDeBase(b);
  });
}

// Las guías se vuelven a pintar (y la vista previa del editor, a cada tecla): las builds leídas se recuerdan.
const memo = new Map();
const leerBuild = (id) => {
  if (!memo.has(id)) memo.set(id, leer('build', { id }).catch((e) => { memo.delete(id); throw e; }));
  return memo.get(id);
};

/** Rellena los [[build:ID]] de un texto ya pintado (renderMarkdown deja un div data-build-incrustada). */
export async function incrustarBuilds(el, { acciones = true } = {}) {
  const huecos = [...el.querySelectorAll('[data-build-incrustada]')];
  if (!huecos.length) return;
  const builds = new Map();
  let cat;
  try { cat = await cargarCatalogo(); } catch { cat = null; }
  await Promise.all(huecos.map(async (h) => {
    const id = h.dataset.buildIncrustada;
    try {
      if (!cat) throw new Error('sin catálogo');
      const b = await leerBuild(id);
      builds.set(b.id, b);
      h.innerHTML = String(tarjetaBuild(cat, b, { modo: 'guia' }));
    } catch (e) {
      h.innerHTML = String(html`<p class="nota build-incrustada__falla">${e?.codigo === 'NO_EXISTE' ? 'Esta build ya no existe.' : 'No se pudo cargar la build.'} <a href="#/build/${encodeURIComponent(id)}">Abrirla</a></p>`);
    }
  }));
  // En la vista previa del editor los botones no hacen nada (se perdería lo escrito).
  if (acciones) activarTarjetas(el, builds);
}
