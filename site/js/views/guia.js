/** Una guía: índice de secciones y cuerpo en Markdown seguro. Ver SPEC.md §2 (#/guias/:slug). */
import { leer } from '../api.js';
import { tieneRol } from '../auth.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { CATEGORIAS_GUIA } from '../etiquetas.js';
import { renderMarkdown } from '../markdown.js';
import { incrustarBuilds } from '../ui/tarjeta-build.js';
import { fechaLarga, tiempo, activarAnclas, compartir, portada } from '../ui/contenido.js';
import { insigniaNivel } from './guias.js';

export default async function vistaGuia(el, { params, recargar }) {
  pintar(el, cargando());
  let g;
  try {
    g = await leer('guia', { slug: params.slug });
  } catch (e) {
    if (e.codigo === 'NO_EXISTE') {
      pintar(el, html`<a class="volver" href="#/guias">Guías</a>
        <div class="vacio"><p>Esta guía ya no está publicada o el enlace está mal escrito.</p>
          <a class="boton boton--chico" href="#/guias">Ver guías</a></div>`);
      return { titulo: 'Guía' };
    }
    fallo(el, e, recargar);
    return { titulo: 'Guía' };
  }
  const { html: cuerpo, titulos } = renderMarkdown(g.cuerpo_md);
  const secciones = titulos.filter((t) => t.nivel === 2);

  pintar(el, html`
    ${avisoDemo()}
    <a class="volver" href="#/guias">Guías</a>
    <article class="articulo">
      <header class="articulo__cabeza">
        <p class="articulo__meta">
          <span class="rotulo">${CATEGORIAS_GUIA[g.categoria] || 'Guía'}</span>
          ${insigniaNivel(g.nivel)}
        </p>
        <h1 class="titulo titulo--pagina">${g.titulo}</h1>
        ${g.resumen ? html`<p class="articulo__entrada">${g.resumen}</p>` : ''}
        <p class="nota">${[g.autor ? `Por ${g.autor}` : '', g.actualizado ? 'actualizada el ' : ''].filter(Boolean).join(' · ')}${g.actualizado ? tiempo(g.actualizado, fechaLarga(g.actualizado)) : ''}</p>
      </header>
      ${portada(g.portada_id, '')}
      ${secciones.length >= 3
        ? html`<nav class="indice" aria-labelledby="t-indice">
            <p class="rotulo" id="t-indice">En esta guía</p>
            <ol>${secciones.map((t) => html`<li><a href="#${t.id}" data-ancla="${t.id}">${t.texto}</a></li>`)}</ol>
          </nav>`
        : ''}
      ${cuerpo ? html`<div class="prosa">${crudo(cuerpo)}</div>` : ''}
      <footer class="articulo__pie">
        <button type="button" class="boton boton--chico" data-compartir>${crudo(ICONOS.compartir)}Compartir</button>
        <a class="boton boton--chico boton--tenue" href="#/guias">Todas las guías</a>
        ${tieneRol('oficial') && g.id ? html`<a class="boton boton--chico boton--tenue" href="#/editor/guia/${encodeURIComponent(g.id)}">Editar</a>` : ''}
      </footer>
    </article>`);

  activarAnclas(el);
  incrustarBuilds(el);
  el.querySelector('[data-compartir]').addEventListener('click', () => compartir(g.titulo));
  return { titulo: g.titulo };
}
