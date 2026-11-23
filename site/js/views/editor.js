/** Editor de oficiales: lista de noticias y guías, con borradores. Ver SPEC.md §2 (#/editor). */
import { escribir } from '../api.js';
import { sesion, tieneRol, olvidarSesion, esSesionCaida } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { TIPOS_NOTICIA, CATEGORIAS_GUIA } from '../etiquetas.js';
import { fechaRelativa, tiempo } from '../ui/contenido.js';
import { borradoresLocales } from '../borradores.js';

/** Pantalla para quien no es oficial (o no entró). */
export function soloOficiales(el, volver, titulo) {
  pintar(el, html`
    <section class="pronto">
      <h1 class="titulo titulo--pagina">${titulo}</h1>
      <p>Las noticias y guías las escriben los oficiales del gremio. Si eres oficial, entra con tu nick y PIN.</p>
      ${sesion() ? '' : html`<a class="boton" href="#/entrar?volver=${volver}">Entrar</a>`}
      <a href="#/noticias">Ver las noticias</a>
    </section>`);
  return { titulo };
}

export default async function vistaEditor(el, { query, recargar }) {
  if (!tieneRol('oficial')) return soloOficiales(el, 'editor', 'Editor');
  const tipo = query.tipo === 'guia' ? 'guia' : 'noticia';
  const s = sesion();

  pintar(el, cargando());
  let items;
  try {
    items = await escribir('editor.contenido', { tipo }, s.token);
  } catch (e) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir(`/entrar?volver=${encodeURIComponent(`editor?tipo=${tipo}`)}`);
      return { titulo: 'Editor' };
    }
    fallo(el, e, recargar);
    return { titulo: 'Editor' };
  }

  // Borradores primero; después lo último que se tocó.
  const fecha = (x) => x.actualizado || x.fecha_pub || '';
  items = [...(items || [])].sort((a, b) => (a.publicado - b.publicado) || (fecha(a) < fecha(b) ? 1 : -1));
  const borradores = items.filter((x) => !x.publicado).length;
  const locales = borradoresLocales(tipo);
  const esGuia = tipo === 'guia';
  const nombre = esGuia ? 'guía' : 'noticia';

  const etiqueta = (x) => (esGuia ? CATEGORIAS_GUIA[x.categoria] || 'Guía' : TIPOS_NOTICIA[x.tipo] || 'Gremio');

  pintar(el, html`
    ${avisoDemo('Modo demostración: lo que escribas se ve en la web mientras no recargues la página, pero no se guarda de verdad.')}
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Editor</h1>
      <p class="apoyo">Escribe noticias y guías para el clan. Lo que guardes como borrador solo lo ven los oficiales.</p>
    </header>
    <nav class="segmentos" aria-label="Qué editar">
      <a href="#/editor" ${esGuia ? '' : crudo('aria-current="page"')}>Noticias</a>
      <a href="#/editor?tipo=guia" ${esGuia ? crudo('aria-current="page"') : ''}>Guías</a>
    </nav>
    <a class="boton boton--oro boton--ancho" href="#/editor/${tipo}">${esGuia ? 'Nueva guía' : 'Nueva noticia'}</a>
    ${locales.nuevo
      ? html`<p class="alerta">${crudo(ICONOS.info)}<span>Tienes una ${nombre} nueva a medio escribir en este dispositivo. <a href="#/editor/${tipo}">Seguir escribiéndola</a></span></p>`
      : ''}
    <section class="seccion" aria-labelledby="t-lista">
      <div class="encabezado">
        <h2 class="titulo titulo--menor" id="t-lista">${esGuia ? 'Guías' : 'Noticias'}</h2>
        <span class="nota">${items.length}${borradores ? ` · ${borradores} ${borradores === 1 ? 'borrador' : 'borradores'}` : ''}</span>
      </div>
      ${items.length
        ? html`<ul class="editor-lista">${items.map((x) => html`
            <li><a class="editor-item ${x.publicado ? '' : 'editor-item--borrador'}" href="#/editor/${tipo}/${encodeURIComponent(x.id)}">
              <span class="editor-item__meta">
                <span class="estado-pub estado-pub--${x.publicado ? 'publicada' : 'borrador'}">${x.publicado ? 'Publicada' : 'Borrador'}</span>
                <span>${etiqueta(x)}</span>
                ${x.fijada ? html`<span class="editor-item__fijada">${crudo(ICONOS.fijar)}Fijada</span>` : ''}
                ${locales.ids.has(x.id) ? html`<span class="editor-item__local">Cambios sin guardar</span>` : ''}
              </span>
              <span class="editor-item__titulo">${x.titulo || 'Sin título'}</span>
              ${fecha(x) ? html`<span class="nota">Editada ${tiempo(fecha(x), fechaRelativa(fecha(x)))}</span>` : ''}
            </a></li>`)}</ul>`
        : html`<div class="vacio"><p>${esGuia ? 'Todavía no hay guías. La primera puede ser cómo se arman las brigadas del Clash.' : 'Todavía no hay noticias. Cuéntale al clan qué pasa esta semana.'}</p></div>`}
    </section>`);

  return { titulo: esGuia ? 'Editor · Guías' : 'Editor · Noticias' };
}
