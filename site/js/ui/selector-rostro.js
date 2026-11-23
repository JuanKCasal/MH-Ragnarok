/**
 * Selector de Rostro (Visage) para una ranura: núcleo o carta 1–4.
 * Buscador + filtros (set, costo) y "si la cambias…" (sets que gana o pierde y costo).
 */
import { html, pintar } from './dom.js';
import { calcularRostros, conRostro, diferenciaRostros, COSTO_ROSTROS } from '../build-calc.js';
import { bilingue, chipsSetsRostro, siLaCambiasRostro } from './build-textos.js';
import { abrirCapa } from './capa.js';

const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * @param {object} cat catálogo indexado
 * @param {object} build composición actual
 * @param {'nucleo'|number} ranura
 * @param {{alElegir: (id: string) => void}} op  id vacío = quitar la carta de la ranura
 */
export function abrirSelectorRostro(cat, build, ranura, { alElegir }) {
  const esNucleo = ranura === 'nucleo';
  const actual = esNucleo ? build.rostros?.nucleo : build.rostros?.cartas?.[ranura];
  const titulo = esNucleo ? 'Elegir núcleo' : `Elegir Rostro ${ranura + 1}`;
  const base = calcularRostros(cat, build.rostros);
  const costoSin = (base?.costo || 0) - (actual?.id ? cat.rostros.get(actual.id)?.costo || 0 : 0);
  const f = { texto: '', set: '', costo: '' };
  const sets = [...cat.rostrosSets.values()];

  const { capa, cerrar } = abrirCapa(titulo);
  const select = (nombre, etiqueta, opciones) => html`
    <label class="bld-filtro">
      <span class="rotulo">${etiqueta}</span>
      <select class="entrada" data-f="${nombre}">${opciones.map(([v, t]) => html`<option value="${v}">${t}</option>`)}</select>
    </label>`;

  pintar(capa, html`
    <div class="bld-capa__marco">
      <header class="bld-capa__cabeza">
        <button type="button" class="bld-atras" data-cerrar aria-label="Volver a la build"></button>
        <div>
          <h2 class="titulo">${titulo}</h2>
          <p class="nota">${esNucleo ? 'Su efecto núcleo se activa solo en esta ranura' : 'Costo total máximo 12, núcleo incluido'} · ${cat.lista.rostros.length} en el catálogo</p>
        </div>
      </header>
      <div class="bld-capa__filtros">
        <label class="campo">
          <span class="campo__etiqueta">Buscar</span>
          <input class="entrada buscador__entrada" type="search" data-f="texto" placeholder="Monstruo, set o efecto" autocomplete="off" spellcheck="false" enterkeyhint="search">
        </label>
        <div class="bld-filtros">
          ${select('set', 'Set', [['', 'Todos'], ...sets.map((s) => [s.id, s.es])])}
          ${select('costo', 'Costo', [['', 'Todos'], ['4', '4'], ['3', '3'], ['1', '1 (sin núcleo)']])}
        </div>
        ${actual?.id ? html`<button type="button" class="boton boton--chico boton--tenue" data-quitar>Dejar la ranura vacía</button>` : ''}
      </div>
      <p class="nota bld-capa__cuenta" aria-live="polite" data-cuenta></p>
      <ul class="bld-candidatas" data-lista></ul>
    </div>`);

  const lista = capa.querySelector('[data-lista]');
  const cuenta = capa.querySelector('[data-cuenta]');

  function tarjeta(x, puesta) {
    const queda = costoSin + x.costo;
    const dif = puesta ? '' : html`
      <div class="bld-candidata__dif">
        <p class="rotulo">Si la cambias</p>
        ${siLaCambiasRostro(diferenciaRostros(base, calcularRostros(cat, conRostro(build, ranura, x.id).rostros)))}
      </div>`;
    return html`
      <li class="bld-candidata ${puesta ? 'bld-candidata--puesta' : ''}">
        <div class="bld-candidata__cabeza">
          <h3 class="bld-candidata__nombre">${bilingue(x)}</h3>
          <span class="bld-costo" title="Costo">${x.costo}</span>
          ${puesta ? html`<span class="insignia insignia--curso">Puesta</span>` : ''}
        </div>
        ${chipsSetsRostro(cat, x.sets, { resaltar: f.set })}
        ${x.nucleo ? html`<p class="nota bld-nucleo-texto"><span class="rotulo">Núcleo</span> ${x.nucleo.es}${esNucleo ? '' : ' (solo si va de núcleo)'}</p>` : html`<p class="nota">Sin efecto núcleo (costo 1).</p>`}
        ${dif}
        ${puesta ? '' : queda > COSTO_ROSTROS
          ? html`<p class="alerta">Pasa del costo: quedaría ${queda}/${COSTO_ROSTROS}.</p>
              <button type="button" class="boton boton--ancho boton--tenue" data-usar="${x.id}">Usar igual</button>`
          : html`<button type="button" class="boton boton--ancho" data-usar="${x.id}">Usar este</button>`}
      </li>`;
  }

  function filtrar() {
    const t = normal(f.texto);
    return cat.lista.rostros.filter((x) => {
      if (f.set && !x.sets.includes(f.set)) return false;
      if (f.costo && x.costo !== Number(f.costo)) return false;
      if (!t) return true;
      const sets = x.sets.map((s) => cat.rostrosSets.get(s)).map((s) => `${s?.es} ${s?.en}`).join(' ');
      return normal(`${x.es} ${x.en} ${sets} ${x.nucleo?.es || ''} ${x.nucleo?.en || ''}`).includes(t);
    }).sort((a, b) => (esNucleo ? b.costo - a.costo : 0) || a.en.localeCompare(b.en));
  }

  function pintarLista() {
    const todas = filtrar();
    const vaActual = actual?.id && todas.some((x) => x.id === actual.id);
    cuenta.textContent = todas.length === 1 ? '1 resultado' : `${todas.length} resultados`;
    pintar(lista, html`
      ${vaActual ? tarjeta(cat.rostros.get(actual.id), true) : ''}
      ${todas.filter((x) => x.id !== actual?.id).map((x) => tarjeta(x, false))}
      ${!todas.length ? html`<li class="vacio"><p>Nada coincide. Prueba con menos filtros.</p></li>` : ''}`);
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
