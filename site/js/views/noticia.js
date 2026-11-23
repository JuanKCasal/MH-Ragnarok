/** Detalle de una noticia con su cuerpo en Markdown seguro. Ver SPEC.md §2 (#/noticias/:id). */
import { leer } from '../api.js';
import { tieneRol } from '../auth.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { TIPOS_NOTICIA } from '../etiquetas.js';
import { renderMarkdown } from '../markdown.js';
import { fechaLarga, tiempo, activarAnclas, compartir, portada } from '../ui/contenido.js';

export default async function vistaNoticia(el, { params, recargar }) {
  pintar(el, cargando());
  let n;
  try {
    n = await leer('noticia', { id: params.id });
  } catch (e) {
    if (e.codigo === 'NO_EXISTE') {
      pintar(el, html`<a class="volver" href="#/noticias">Noticias</a>
        <div class="vacio"><p>Esta noticia ya no está publicada o el enlace está mal escrito.</p>
          <a class="boton boton--chico" href="#/noticias">Ver noticias</a></div>`);
      return { titulo: 'Noticia' };
    }
    fallo(el, e, recargar);
    return { titulo: 'Noticia' };
  }
  const cuerpo = renderMarkdown(n.cuerpo_md).html;

  pintar(el, html`
    ${avisoDemo()}
    <a class="volver" href="#/noticias">Noticias</a>
    <article class="articulo">
      <header class="articulo__cabeza">
        <p class="articulo__meta">
          <span class="noticia-tarjeta__tipo noticia-tarjeta__tipo--${n.tipo}">${TIPOS_NOTICIA[n.tipo] || 'Gremio'}</span>
          <span aria-hidden="true">·</span> ${tiempo(n.fecha_pub, fechaLarga(n.fecha_pub))}
        </p>
        <h1 class="titulo titulo--pagina">${n.titulo}</h1>
        ${n.resumen ? html`<p class="articulo__entrada">${n.resumen}</p>` : ''}
        ${n.autor ? html`<p class="nota">Por ${n.autor}</p>` : ''}
      </header>
      ${portada(n.portada_id, '')}
      ${cuerpo ? html`<div class="prosa">${crudo(cuerpo)}</div>` : ''}
      <footer class="articulo__pie">
        <button type="button" class="boton boton--chico" data-compartir>${crudo(ICONOS.compartir)}Compartir</button>
        <a class="boton boton--chico boton--tenue" href="#/noticias">Más noticias</a>
        ${tieneRol('oficial') ? html`<a class="boton boton--chico boton--tenue" href="#/editor/noticia/${encodeURIComponent(n.id)}">Editar</a>` : ''}
      </footer>
    </article>`);

  activarAnclas(el);
  el.querySelector('[data-compartir]').addEventListener('click', () => compartir(n.titulo));
  return { titulo: n.titulo };
}
