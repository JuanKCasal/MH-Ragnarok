/** Guías agrupadas por categoría. Ver SPEC.md §2 (#/guias). */
import { leer } from '../api.js';
import { html, pintar } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { CATEGORIAS_GUIA, NIVELES_GUIA } from '../etiquetas.js';
import { activarAnclas } from '../ui/contenido.js';

export const insigniaNivel = (nivel) => (NIVELES_GUIA[nivel]
  ? html`<span class="nivel nivel--${nivel}">${NIVELES_GUIA[nivel]}</span>` : '');

export default async function vistaGuias(el, { recargar }) {
  pintar(el, cargando());
  let grupos;
  try {
    grupos = await leer('guias');
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Guías' };
  }
  grupos = (grupos || []).filter((g) => g.guias?.length);
  const total = grupos.reduce((s, g) => s + g.guias.length, 0);

  pintar(el, html`
    ${avisoDemo()}
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Guías</h1>
      <p class="apoyo">${total ? 'Lo básico para empezar y lo que el clan va aprendiendo.' : ''}</p>
    </header>
    ${grupos.length > 1
      ? html`<nav class="saltos" aria-label="Categorías">${grupos.map((g) => html`
          <a href="#cat-${g.categoria}" data-ancla="cat-${g.categoria}">${CATEGORIAS_GUIA[g.categoria] || g.categoria}</a>`)}</nav>`
      : ''}
    ${grupos.length
      ? grupos.map((g, gi) => html`
        <section class="seccion grupo-guias" id="cat-${g.categoria}" aria-labelledby="t-cat-${g.categoria}">
          <div class="encabezado">
            <h2 class="titulo" id="t-cat-${g.categoria}">${CATEGORIAS_GUIA[g.categoria] || g.categoria}</h2>
            <span class="nota">${g.guias.length}</span>
          </div>
          <ul class="guias">${g.guias.map((x, i) => html`
            <li style="--i:${Math.min(gi * 2 + i, 12)}"><a class="guia-tarjeta" href="#/guias/${encodeURIComponent(x.slug)}">
              <span class="guia-tarjeta__cabeza"><span class="guia-tarjeta__titulo">${x.titulo}</span>${insigniaNivel(x.nivel)}</span>
              ${x.resumen ? html`<span class="guia-tarjeta__resumen">${x.resumen}</span>` : ''}
            </a></li>`)}</ul>
        </section>`)
      : html`<div class="vacio"><p>Todavía no hay guías publicadas. Si sabes algo que a los nuevos les sirva, cuéntaselo a un oficial.</p></div>`}`);

  activarAnclas(el);
  return { titulo: 'Guías' };
}
