/** Directorio de miembros: buscador, filtros por arma/elemento/tipo y orden por poder. Ver SPEC.md §2. */
import { leer } from '../api.js';
import { sesion } from '../auth.js';
import { html, pintar, numero } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ARMAS, ELEMENTOS, TIPOS, arma, tipo } from '../etiquetas.js';
import { bandera, nombrePais } from '../validar.js';
import { filtrarMiembros, puestos } from '../miembros-filtro.js';
import { avatar, elemDot } from './yo.js';

const ROL = { admin: 'Admin', oficial: 'Oficial' };
const ORDENES = [['poder', 'Más poder'], ['poder_asc', 'Menos poder'], ['nick', 'Nick A–Z']];

// Se conserva mientras la pestaña esté abierta: al volver de un perfil, los filtros siguen igual.
const estado = { q: '', armas: new Set(), elementos: new Set(), tipos: new Set(), orden: 'poder', abierto: false };

const chips = (grupo, opciones, set, punto = false) => html`
  <div class="opciones">${opciones.map(([v, t]) => html`
    <label class="opcion"><input type="checkbox" name="${grupo}" value="${v}" ${set.has(v) ? 'checked' : ''}>
      <span>${punto ? elemDot(v) : ''}${t}</span></label>`)}</div>`;

function fila(m, puesto, yoId, i) {
  const p = m.principal;
  const tuyo = m.id === yoId;
  const datos = p ? [arma(p.arma), tipo(p.tipo)].filter(Boolean).join(' · ') : 'Aún no carga su adventurer';
  return html`
    <li class="fila-miembro ${tuyo ? 'fila-miembro--tuya' : ''} ${puesto && puesto <= 3 ? 'fila-miembro--podio' : ''}" style="--i:${Math.min(i, 14)}">
      <a href="#/miembros/${encodeURIComponent(m.id)}">
        <span class="fila-miembro__puesto" ${puesto ? html`aria-label="Puesto ${puesto}"` : 'aria-hidden="true"'}>${puesto || '–'}</span>
        ${avatar(m, 44)}
        <span class="fila-miembro__texto">
          <span class="fila-miembro__nick">
            <span>${m.nick}</span>
            ${m.pais ? html`<span class="fila-miembro__pais" title="${nombrePais(m.pais)}">${bandera(m.pais)}</span>` : ''}
            ${tuyo ? html`<span class="insignia insignia--oro">Tú</span>` : ROL[m.rol] ? html`<span class="insignia insignia--rol">${ROL[m.rol]}</span>` : ''}
          </span>
          <span class="fila-miembro__datos">${p ? elemDot(p.elemento) : ''}${datos}</span>
        </span>
        <span class="fila-miembro__poder">
          ${p ? html`<span class="num">${numero(p.poder_total)}</span><span class="rotulo">poder</span>` : html`<span class="rotulo">sin datos</span>`}
        </span>
      </a>
    </li>`;
}

export default async function vistaMiembros(el, { recargar }) {
  pintar(el, cargando());
  let lista;
  let pintarLista = () => {};
  try {
    lista = await leer('miembros', {}, { alRefrescar: (d) => { lista = d; pintarLista(); } });
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Miembros' };
  }
  const yoId = sesion()?.miembro?.id;

  pintar(el, html`
    ${avisoDemo()}
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Miembros</h1>
      <p class="apoyo" data-total></p>
    </header>

    <section class="directorio" aria-label="Buscar y filtrar">
      <div class="buscador">
        <label class="oculto-visual" for="buscar-miembro">Buscar cazador</label>
        <input id="buscar-miembro" type="search" class="entrada buscador__entrada" placeholder="Nick, adventurer o arma"
          autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" value="${estado.q}">
      </div>
      <div class="directorio__controles">
        <button type="button" class="boton boton--chico boton--tenue" data-filtros aria-controls="filtros-miembros" aria-expanded="${estado.abierto}">
          Filtros<span class="contador-filtros" data-cuenta></span>
        </button>
        <label class="directorio__orden">
          <span class="oculto-visual">Ordenar</span>
          <select class="entrada" data-orden>${ORDENES.map(([v, t]) => html`<option value="${v}" ${estado.orden === v ? 'selected' : ''}>${t}</option>`)}</select>
        </label>
      </div>
      <div class="filtros" id="filtros-miembros" ${estado.abierto ? '' : 'hidden'}>
        <fieldset class="filtros__grupo"><legend class="rotulo">Arma</legend>
          ${chips('armas', Object.entries(ARMAS).map(([k, v]) => [k, v.es]), estado.armas)}</fieldset>
        <fieldset class="filtros__grupo"><legend class="rotulo">Elemento</legend>
          ${chips('elementos', Object.entries(ELEMENTOS), estado.elementos, true)}</fieldset>
        <fieldset class="filtros__grupo"><legend class="rotulo">Tipo</legend>
          ${chips('tipos', Object.entries(TIPOS), estado.tipos)}</fieldset>
        <button type="button" class="boton boton--chico boton--tenue" data-limpiar>Quitar filtros</button>
      </div>
    </section>

    <p class="nota directorio__resultado" aria-live="polite" data-resultado></p>
    <ol class="lista-miembros" data-lista></ol>`);

  const $ = (s) => el.querySelector(s);
  const btnFiltros = $('[data-filtros]');
  const panel = $('#filtros-miembros');
  let primera = true;

  pintarLista = () => {
    const pos = puestos(lista);
    const r = filtrarMiembros(lista, estado);
    const activos = estado.armas.size + estado.elementos.size + estado.tipos.size;
    $('[data-total]').textContent = `${lista.length} cazadores en el salón. Toca uno para ver sus adventurers.`;
    $('[data-cuenta]').textContent = activos ? ` · ${activos}` : '';
    const lst = $('[data-lista]');
    lst.classList.toggle('lista-miembros--entra', primera);
    primera = false;
    $('[data-resultado]').textContent = r.length === lista.length ? '' : `${r.length} de ${lista.length} cazadores`;
    pintar(lst, r.length
      ? html`${r.map((m, i) => fila(m, pos.get(m.id), yoId, i))}`
      : html`<li class="vacio"><p>Nadie coincide con esa búsqueda.</p>
          <button type="button" class="boton boton--chico" data-limpiar>Quitar búsqueda y filtros</button></li>`);
  };
  pintarLista();

  const limpiar = () => {
    estado.q = '';
    estado.armas.clear(); estado.elementos.clear(); estado.tipos.clear();
    $('#buscar-miembro').value = '';
    el.querySelectorAll('.filtros input:checked').forEach((i) => { i.checked = false; });
    pintarLista();
  };

  $('#buscar-miembro').addEventListener('input', (ev) => { estado.q = ev.target.value; pintarLista(); });
  $('[data-orden]').addEventListener('change', (ev) => { estado.orden = ev.target.value; pintarLista(); });
  btnFiltros.addEventListener('click', () => {
    estado.abierto = !estado.abierto;
    panel.hidden = !estado.abierto;
    btnFiltros.setAttribute('aria-expanded', String(estado.abierto));
  });
  panel.addEventListener('change', (ev) => {
    const i = ev.target;
    if (!(i instanceof HTMLInputElement) || !estado[i.name]) return;
    if (i.checked) estado[i.name].add(i.value); else estado[i.name].delete(i.value);
    pintarLista();
  });
  el.addEventListener('click', (ev) => { if (ev.target.closest('[data-limpiar]')) limpiar(); });

  return { titulo: 'Miembros' };
}
