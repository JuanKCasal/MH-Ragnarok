/**
 * Selector de Camarada (Buddy). Buscador + filtros (tipo, rareza). Primero los del mismo tipo
 * que el adventurer (el tipo del camarada depende del tipo de Definitiva; por confirmar con el juego).
 * No hay "si la cambias…": las fuentes no publican stats por nivel; el miembro escribe nivel, estrellas y poder.
 */
import { html, pintar } from './dom.js';
import { ordenarCamaradas } from '../build-calc.js';
import { bilingue, textoAumento, tipoCamarada, TIPOS_CAMARADA } from './build-textos.js';
import { abrirCapa } from './capa.js';

const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * @param {object} cat catálogo indexado
 * @param {object} build composición actual
 * @param {{tipo?: string, alElegir: (id: string) => void}} op  tipo = del adventurer (si se conoce); id vacío = quitar
 */
export function abrirSelectorCamarada(cat, build, { tipo = '', alElegir }) {
  const actual = build.camarada?.id || '';
  const f = { texto: '', tipo: tipo || '', rareza: '' };

  const { capa, cerrar } = abrirCapa('Elegir camarada');
  const select = (nombre, etiqueta, opciones) => html`
    <label class="bld-filtro">
      <span class="rotulo">${etiqueta}</span>
      <select class="entrada" data-f="${nombre}">${opciones.map(([v, t]) => html`<option value="${v}" ${v === f[nombre] ? 'selected' : ''}>${t}</option>`)}</select>
    </label>`;

  pintar(capa, html`
    <div class="bld-capa__marco">
      <header class="bld-capa__cabeza">
        <button type="button" class="bld-atras" data-cerrar aria-label="Volver a la build"></button>
        <div>
          <h2 class="titulo">Elegir camarada</h2>
          <p class="nota">${tipo ? `Tu adventurer es de tipo ${TIPOS_CAMARADA[tipo].es}: esos van primero` : 'Uno por adventurer'} · ${cat.lista.camaradas.length} en el catálogo</p>
        </div>
      </header>
      <div class="bld-capa__filtros">
        <label class="campo">
          <span class="campo__etiqueta">Buscar</span>
          <input class="entrada buscador__entrada" type="search" data-f="texto" placeholder="Nombre o aumento (afinidad, fuego…)" autocomplete="off" spellcheck="false" enterkeyhint="search">
        </label>
        <div class="bld-filtros">
          ${select('tipo', 'Tipo', [['', 'Todos'], ...Object.entries(TIPOS_CAMARADA).map(([k, t]) => [k, t.es])])}
          ${select('rareza', 'Rareza', [['', 'Todas'], ['SSR', 'SSR'], ['SR', 'SR'], ['R', 'R']])}
        </div>
        ${actual ? html`<button type="button" class="boton boton--chico boton--tenue" data-quitar>Quitar el camarada</button>` : ''}
      </div>
      <p class="nota bld-capa__cuenta" aria-live="polite" data-cuenta></p>
      <ul class="bld-candidatas" data-lista></ul>
    </div>`);

  const lista = capa.querySelector('[data-lista]');
  const cuenta = capa.querySelector('[data-cuenta]');

  function tarjeta(x, puesto) {
    const otroTipo = tipo && x.tipo !== tipo;
    return html`
      <li class="bld-candidata ${puesto ? 'bld-candidata--puesta' : ''}">
        <div class="bld-candidata__cabeza">
          <h3 class="bld-candidata__nombre">${bilingue(x)}</h3>
          <span class="bld-rareza-cam bld-rareza-cam--${x.rareza.toLowerCase()}">${x.rareza}</span>
          ${puesto ? html`<span class="insignia insignia--curso">Puesto</span>` : ''}
        </div>
        <p class="nota">${tipoCamarada(x.tipo)}</p>
        <p class="nota"><span class="rotulo">Aumento</span> ${textoAumento(x)}</p>
        ${otroTipo ? html`<p class="nota bld-aviso-cam">Es de otro tipo que tu adventurer: en el juego quizá no puedas ponérselo.</p>` : ''}
        ${puesto ? '' : html`<button type="button" class="boton boton--ancho ${otroTipo ? 'boton--tenue' : ''}" data-usar="${x.id}">Usar este</button>`}
      </li>`;
  }

  function filtrar() {
    const t = normal(f.texto);
    return ordenarCamaradas(cat.lista.camaradas.filter((x) => {
      if (f.tipo && x.tipo !== f.tipo) return false;
      if (f.rareza && x.rareza !== f.rareza) return false;
      if (!t) return true;
      return normal(`${x.es} ${x.en} ${textoAumento(x)} ${x.aumento.map(([k]) => k).join(' ')} ${tipoCamarada(x.tipo)}`).includes(t);
    }), tipo);
  }

  function pintarLista() {
    const todos = filtrar();
    const vaActual = actual && todos.some((x) => x.id === actual);
    cuenta.textContent = todos.length === 1 ? '1 resultado' : `${todos.length} resultados`;
    pintar(lista, html`
      ${vaActual ? tarjeta(cat.camaradas.get(actual), true) : ''}
      ${todos.filter((x) => x.id !== actual).map((x) => tarjeta(x, false))}
      ${!todos.length ? html`<li class="vacio"><p>Nada coincide. Prueba con menos filtros.</p></li>` : ''}`);
  }
  pintarLista();

  let espera = 0;
  capa.addEventListener('input', (ev) => {
    const k = ev.target.dataset.f;
    if (!k) return;
    f[k] = ev.target.value;
    clearTimeout(espera);
    espera = setTimeout(pintarLista, k === 'texto' ? 160 : 0);
  });
  capa.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-cerrar]')) { cerrar(); return; }
    if (ev.target.closest('[data-quitar]')) { cerrar(); alElegir(''); return; }
    const usar = ev.target.closest('[data-usar]');
    if (usar) { cerrar(); alElegir(usar.dataset.usar); }
  });
  capa.querySelector('[data-cerrar]').focus();
  return { cerrar };
}
