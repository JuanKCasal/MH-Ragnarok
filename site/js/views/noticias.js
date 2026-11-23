/** Noticias: lista con filtro por tipo y "Cargar más". Ver SPEC.md §2 (#/noticias). */
import { leer } from '../api.js';
import { tieneRol } from '../auth.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { TIPOS_NOTICIA } from '../etiquetas.js';
import { fechaRelativa, tiempo, portada } from '../ui/contenido.js';

const FILTROS = [['', 'Todas'], ['juego', 'Juego'], ['gremio', 'Gremio'], ['evento', 'Eventos']];

export const tarjetaNoticia = (n, i = 0) => html`
  <li class="noticia-item" style="--i:${Math.min(i, 10)}">
    <a class="noticia-tarjeta ${n.fijada ? 'noticia-tarjeta--fijada' : ''} noticia-tarjeta--${n.tipo}" href="#/noticias/${encodeURIComponent(n.id)}">
      ${portada(n.portada_id)}
      <span class="noticia-tarjeta__meta">
        <span class="noticia-tarjeta__tipo">${TIPOS_NOTICIA[n.tipo] || 'Gremio'}</span>
        <span aria-hidden="true">·</span>
        ${tiempo(n.fecha_pub, fechaRelativa(n.fecha_pub))}
        ${n.fijada ? html`<span class="noticia-tarjeta__fijada">${crudo(ICONOS.fijar)}Fijada</span>` : ''}
      </span>
      <span class="noticia-tarjeta__titulo">${n.titulo}</span>
      ${n.resumen ? html`<span class="noticia-tarjeta__resumen">${n.resumen}</span>` : ''}
    </a>
  </li>`;

export default async function vistaNoticias(el, { query, recargar }) {
  const tipo = TIPOS_NOTICIA[query.tipo] ? query.tipo : '';
  pintar(el, cargando());
  let d;
  try {
    d = await leer('noticias', tipo ? { tipo } : {});
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Noticias' };
  }
  let items = [...(d.items || [])];
  let pagina = d.pagina || 1;

  pintar(el, html`
    ${avisoDemo()}
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Noticias</h1>
      <p class="apoyo">Novedades del juego y avisos del gremio.</p>
      ${tieneRol('oficial') ? html`<a class="boton boton--chico boton--tenue cabeza-pagina__accion" href="#/editor">Escribir o editar · oficiales</a>` : ''}
    </header>
    <nav class="segmentos" aria-label="Filtrar noticias">
      ${FILTROS.map(([v, t]) => html`<a href="#/noticias${v ? `?tipo=${v}` : ''}" ${v === tipo ? crudo('aria-current="page"') : ''}>${t}</a>`)}
    </nav>
    <ul class="noticias noticias--entra" data-lista></ul>
    <div class="noticias__mas" data-mas></div>`);

  const lista = el.querySelector('[data-lista]');
  const mas = el.querySelector('[data-mas]');

  const pintarTodo = () => {
    pintar(lista, items.length
      ? html`${items.map((n, i) => tarjetaNoticia(n, i))}`
      : html`<li class="vacio"><p>${tipo ? 'No hay noticias de este tipo todavía.' : 'Todavía no hay noticias. Los oficiales publicarán aquí las novedades.'}</p></li>`);
    pintar(mas, items.length < (d.total || 0)
      ? html`<button type="button" class="boton boton--ancho" data-cargar>Cargar más <span class="nota">(${items.length} de ${d.total})</span></button>`
      : items.length > 3 ? html`<p class="nota">No hay más noticias${tipo ? ' de este tipo' : ''}.</p>` : '');
  };
  pintarTodo();

  mas.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-cargar]');
    if (!b) return;
    b.disabled = true;
    b.textContent = 'Cargando…';
    try {
      const sig = await leer('noticias', { ...(tipo ? { tipo } : {}), pagina: String(pagina + 1) });
      pagina = sig.pagina;
      d = sig;
      const antes = items.length;
      items = items.concat(sig.items || []);
      lista.classList.remove('noticias--entra');
      pintarTodo();
      lista.children[antes]?.querySelector('a')?.focus();
    } catch {
      b.disabled = false;
      b.textContent = 'Reintentar';
    }
  });

  return { titulo: tipo ? `Noticias · ${FILTROS.find(([v]) => v === tipo)[1]}` : 'Noticias' };
}
