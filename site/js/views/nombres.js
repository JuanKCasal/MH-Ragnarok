/**
 * Nombres del juego (E6): los nombres en español del catálogo del builder.
 * Cualquiera la ve; los oficiales corrigen o confirman mirando el juego en español (hoja Catalogo).
 * #/nombres[?tipo=arma|pieza|habilidad|set|monstruo&q=texto]   Ver docs/BUILDER.md §12.
 */
import { escribir, ErrorApi } from '../api.js';
import { sesion, tieneRol, olvidarSesion, esSesionCaida } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { toast } from '../ui/toast.js';
import { ARMAS } from '../etiquetas.js';
import { cargarCatalogo, olvidarCatalogo } from '../catalogo.js';
import { NOMBRE_PARTE } from '../build-calc.js';
import { entradasNombres, aplicarNombres, TIPOS_NOMBRE } from '../nombres.js';

const TIPOS = { arma: 'Armas', pieza: 'Armaduras', habilidad: 'Habilidades', set: 'Sets', monstruo: 'Monstruos' };
const ESTADOS = [['en', 'En inglés'], ['gw', 'Por confirmar'], ['ok', 'Confirmados'], ['todos', 'Todos']];
const POR_PAGINA = 30;
const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default async function vistaNombres(el, { query, recargar }) {
  pintar(el, cargando());
  let cat;
  try {
    cat = await cargarCatalogo();
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Nombres del juego' };
  }
  // El contenedor de la vista es el mismo para todas las rutas: los eventos van en una raíz propia.
  const contenedor = el;
  el = document.createElement('div');
  contenedor.replaceChildren(el);
  const s = sesion();
  const puedeEditar = tieneRol('oficial');
  const f = { tipo: TIPOS_NOMBRE.includes(query.tipo) ? query.tipo : 'arma', estado: '', q: query.q || '' };
  let mostrar = POR_PAGINA;
  let entradas = [];

  const opciones = { detalleArma: (w) => ARMAS[w.arma]?.es || '', detallePieza: (p) => NOMBRE_PARTE[p.parte]?.es || '' };
  function cargarEntradas() {
    entradas = entradasNombres(cat, f.tipo, opciones).sort((a, b) => a.en.localeCompare(b.en, 'es'));
  }
  cargarEntradas();
  const cuenta = (e) => (e === 'todos' ? entradas.length : entradas.filter((x) => x.estado === e).length);
  if (!f.estado) f.estado = f.q ? 'todos' : cuenta('en') ? 'en' : 'gw';

  pintar(el, html`
    ${avisoDemo()}
    <a class="volver" href="${s ? '#/yo' : '#/'}">${s ? 'Mi perfil' : 'Inicio'}</a>
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Nombres del juego</h1>
      <p class="apoyo">Los nombres en español del builder vienen de GameWith y están <strong>por confirmar</strong>.
        ${puedeEditar ? 'Corrígelos o confírmalos mirando el juego en español: quedan con ✓ para todo el clan.'
          : 'Los oficiales los corrigen mirando el juego en español; los confirmados llevan ✓.'}</p>
    </header>
    <div class="segmentos nom-tipos" role="group" aria-label="Qué nombres" data-tipos></div>
    <section class="directorio" aria-label="Buscar nombre">
      <div class="buscador">
        <label class="oculto-visual" for="buscar-nombre">Buscar nombre</label>
        <input id="buscar-nombre" type="search" class="entrada buscador__entrada" placeholder="En español o en inglés"
          value="${f.q}" autocomplete="off" spellcheck="false" enterkeyhint="search">
      </div>
      <div class="segmentos nom-tipos" role="group" aria-label="Mostrar" data-estados></div>
    </section>
    <ul class="nom-lista" data-lista aria-live="polite"></ul>`);

  const ul = el.querySelector('[data-lista]');

  function fila(x) {
    const marca = x.estado === 'ok' ? html`<span class="nom-estado nom-estado--ok">✓ Confirmado</span>`
      : x.estado === 'gw' ? html`<span class="nom-estado">Por confirmar</span>` : html`<span class="nom-estado nom-estado--en">Solo inglés</span>`;
    return html`
      <li class="nom-fila" data-id="${x.id}">
        <div class="nom-fila__cabeza">
          <p class="nom-fila__en" lang="en">${x.en}</p>
          ${marca}
        </div>
        ${x.detalle ? html`<p class="nota">${x.detalle}</p>` : ''}
        ${puedeEditar
          ? html`<form class="nom-form" data-form="${x.id}">
              <label class="oculto-visual" for="nom-${x.id}">Nombre en español de ${x.en}</label>
              <input id="nom-${x.id}" class="entrada" name="es" value="${x.es}" maxlength="80" placeholder="Como sale en el juego en español" spellcheck="false" autocomplete="off">
              <div class="nom-form__acciones">
                <button type="submit" class="boton boton--chico">${x.estado === 'gw' ? 'Confirmar' : 'Guardar'}</button>
                ${x.estado === 'ok' ? html`<button type="button" class="boton boton--chico boton--tenue" data-quitar="${x.id}">Volver al de GameWith</button>` : ''}
              </div>
            </form>`
          : html`<p class="nom-fila__es">${x.es || html`<span class="nota">Sin nombre en español todavía</span>`}</p>`}
      </li>`;
  }

  function pintarLista() {
    const q = normal(f.q).trim();
    const visibles = entradas.filter((x) => (f.estado === 'todos' || x.estado === f.estado)
      && (!q || normal(`${x.en} ${x.es} ${x.detalle}`).includes(q)));
    pintar(el.querySelector('[data-tipos]'), html`${Object.entries(TIPOS).map(([t, n]) => html`
      <button type="button" data-tipo="${t}" aria-pressed="${String(f.tipo === t)}">${n}</button>`)}`);
    pintar(el.querySelector('[data-estados]'), html`${ESTADOS.map(([v, t]) => html`
      <button type="button" data-estado="${v}" aria-pressed="${String(f.estado === v)}">${t} <span class="nota">${cuenta(v)}</span></button>`)}`);
    pintar(ul, html`
      ${visibles.slice(0, mostrar).map(fila)}
      ${!visibles.length ? html`<li class="vacio"><p>${q ? 'Nada coincide con esa búsqueda.' : f.estado === 'en' ? 'Todo tiene nombre en español.' : 'No hay nombres en este filtro.'}</p></li>` : ''}
      ${visibles.length > mostrar ? html`<li><button type="button" class="boton boton--ancho boton--tenue" data-mas>Mostrar más (${visibles.length - mostrar})</button></li>` : ''}`);
  }
  pintarLista();

  function manejar(e) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir(`/entrar?volver=${encodeURIComponent(`nombres?tipo=${f.tipo}`)}`);
      return;
    }
    toast(e instanceof ErrorApi ? e.message : 'No se pudo guardar. Inténtalo de nuevo.', { error: true });
  }

  async function guardar(x, es, boton) {
    boton.disabled = true;
    try {
      const r = await escribir('catalogo.nombre', { tipo: x.tipo, id: x.id, en: x.en, es }, s.token);
      if (r.quitado) {
        // Para volver al nombre de GameWith hay que releer el catálogo sin la corrección.
        olvidarCatalogo();
        cat = await cargarCatalogo();
        toast(`${x.en}: vuelve el nombre de GameWith.`);
      } else {
        aplicarNombres(cat, [...(cat.nombresAplicados || []).filter((y) => !(y.tipo === r.tipo && y.id === r.id)), r]);
        toast(`${r.es}: confirmado.`);
      }
      cargarEntradas();
      pintarLista();
    } catch (e) {
      boton.disabled = false;
      manejar(e);
    }
  }

  el.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-tipo]');
    if (t) { f.tipo = t.dataset.tipo; mostrar = POR_PAGINA; cargarEntradas(); f.estado = f.q ? 'todos' : cuenta('en') ? 'en' : 'gw'; pintarLista(); return; }
    const e = ev.target.closest('[data-estado]');
    if (e) { f.estado = e.dataset.estado; mostrar = POR_PAGINA; pintarLista(); return; }
    if (ev.target.closest('[data-mas]')) { mostrar += POR_PAGINA; pintarLista(); return; }
    const q = ev.target.closest('[data-quitar]');
    if (q) {
      const x = entradas.find((y) => y.id === q.dataset.quitar);
      if (x) guardar(x, '', q);
    }
  });
  el.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-form]');
    if (!form) return;
    ev.preventDefault();
    const x = entradas.find((y) => y.id === form.dataset.form);
    const es = form.elements.es.value.trim().replace(/\s+/g, ' ');
    if (!x) return;
    if (!es) { toast('Escribe el nombre en español (o usa "Volver al de GameWith").', { error: true }); form.elements.es.focus(); return; }
    guardar(x, es, form.querySelector('[type="submit"]'));
  });
  let espera = 0;
  el.querySelector('#buscar-nombre').addEventListener('input', (ev) => {
    f.q = ev.target.value;
    mostrar = POR_PAGINA;
    clearTimeout(espera);
    espera = setTimeout(pintarLista, 160);
  });

  return { titulo: 'Nombres del juego' };
}
