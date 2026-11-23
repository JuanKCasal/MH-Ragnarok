/**
 * Selector de pieza o arma del builder (pantalla completa encima de la hoja).
 * Buscador + filtros (monstruo, elemento, habilidad, rareza) y "si la cambias…" en cada candidata.
 * La capa y el "atrás" del celular: ui/capa.js.
 */
import { html, pintar, numero } from './dom.js';
import { calcular, diferencia, conPieza, buscarPiezas, rarezaDe, nombreEn, nombreEs, nombreOk, nombreDe, habilidadesDePieza, NOMBRE_PARTE,
  ELEMENTOS_FILTRO, RAREZA_MAX } from '../build-calc.js';
import { ARMAS, ELEMENTOS } from '../etiquetas.js';
import { chipsHab, statsArma, siLaCambias, bil } from './build-textos.js';
import { abrirCapa } from './capa.js';
import { escribir, ErrorApi } from '../api.js';
import { sesion, tieneRol } from '../auth.js';
import { toast } from './toast.js';
import { partirNombre, claveNombre, baseEs, aplicarNombres } from '../nombres.js';

const POR_PAGINA = 30;

/**
 * @param {object} cat catálogo indexado
 * @param {object} build composición actual
 * @param {string} parte 'arma' o una de PARTES
 * @param {{armaTipo?: string, alElegir: (id: string, r: number) => void, alCambiarNombre?: () => void}} op
 */
export function abrirSelector(cat, build, parte, { armaTipo = '', alElegir, alCambiarNombre }) {
  const corrige = tieneRol('oficial'); // E6: los oficiales corrigen el nombre ES desde aquí
  const esArma = parte === 'arma';
  const actual = esArma ? build.arma : build.piezas?.[parte];
  const itemActual = actual?.id ? (esArma ? cat.armas.get(actual.id) : cat.armaduras.get(actual.id)) : null;
  const f = { parte, arma: armaTipo, texto: '', monstruo: '', elemento: '', hab: '', r: actual?.r || (esArma ? RAREZA_MAX : 13) };
  let mostrar = POR_PAGINA;
  const base = calcular(cat, build);
  const titulo = esArma ? 'Elegir arma' : `Elegir ${NOMBRE_PARTE[parte].es.toLowerCase()}`;

  const universo = esArma ? cat.lista.armas.filter((w) => !armaTipo || w.arma === armaTipo)
    : cat.lista.armaduras.filter((p) => p.parte === parte);
  const monstruos = cat.lista.monstruos.filter((m) => universo.some((x) => x.monstruo === m.id));
  const habIds = new Set();
  universo.forEach((x) => (esArma ? (x.innato ? [[x.innato.hab]] : []) : x.hab.flatMap((u) => u[1])).forEach(([h]) => habIds.add(h)));
  const habs = [...habIds].map((h) => cat.habilidades.get(h)).filter(Boolean).sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es'));
  const elementos = esArma ? [...Object.keys(ELEMENTOS)] : ELEMENTOS_FILTRO;

  const { capa, cerrar } = abrirCapa(titulo);

  const select = (nombre, etiqueta, opciones, valor) => html`
    <label class="bld-filtro">
      <span class="rotulo">${etiqueta}</span>
      <select class="entrada" data-f="${nombre}">${opciones.map(([v, t]) => html`<option value="${v}" ${String(v) === String(valor) ? 'selected' : ''}>${t}</option>`)}</select>
    </label>`;

  pintar(capa, html`
    <div class="bld-capa__marco">
      <header class="bld-capa__cabeza">
        <button type="button" class="bld-atras" data-cerrar aria-label="Volver a la build"></button>
        <div>
          <h2 class="titulo">${titulo}</h2>
          <p class="nota">${esArma ? (ARMAS[armaTipo]?.es || 'Todas las armas') : NOMBRE_PARTE[parte].en} · ${universo.length} en el catálogo</p>
        </div>
      </header>
      <div class="bld-capa__filtros">
        <label class="campo">
          <span class="campo__etiqueta">Buscar</span>
          <input class="entrada buscador__entrada" type="search" data-f="texto" placeholder="Pieza, monstruo o habilidad (español o inglés)" autocomplete="off" spellcheck="false" enterkeyhint="search">
        </label>
        <div class="bld-filtros">
          ${select('monstruo', 'Monstruo', [['', 'Todos'], ...monstruos.map((m) => [m.id, nombreDe(m)]), ['otros', 'Sin monstruo']], '')}
          ${select('elemento', 'Elemento', [['', 'Todos'], ...elementos.map((e) => [e, ELEMENTOS[e]])], '')}
          ${habs.length ? select('hab', 'Habilidad', [['', 'Todas'], ...habs.map((h) => [h.id, h.es && h.es !== h.en ? `${h.es} · ${h.en}` : h.en])], '') : ''}
          ${select('r', 'Rareza', Array.from({ length: RAREZA_MAX }, (_, i) => [RAREZA_MAX - i, `${RAREZA_MAX - i}`]), f.r)}
        </div>
      </div>
      <p class="nota bld-capa__cuenta" aria-live="polite" data-cuenta></p>
      <ul class="bld-candidatas" data-lista></ul>
    </div>`);

  const lista = capa.querySelector('[data-lista]');
  const cuenta = capa.querySelector('[data-cuenta]');

  function tarjeta(x, puesta) {
    const r = rarezaDe(x, f.r);
    const fuera = r !== Number(f.r);
    let cuerpo;
    if (esArma) {
      const c = calcular(cat, { v: 1, arma: { id: x.id, r }, piezas: {} });
      cuerpo = html`
        <p class="nota">${[nombreDe(cat.monstruos.get(x.monstruo)), ARMAS[x.arma]?.es].filter(Boolean).join(' · ')}</p>
        <p class="bld-candidata__stats">${statsArma(c)}</p>
        ${x.innato ? chipsHab(cat, [[x.innato.hab, x.innato.nv]], { resaltar: f.hab }) : ''}`;
    } else {
      const set = cat.sets.get(x.set);
      cuerpo = html`
        <p class="nota">${[nombreDe(set), `Def. ${numero(x.def[r - x.rmin])} en ${r}`].filter(Boolean).join(' · ')}</p>
        ${chipsHab(cat, habilidadesDePieza(x, r), { resaltar: f.hab })}`;
    }
    const dif = puesta ? '' : html`
      <div class="bld-candidata__dif">
        <p class="rotulo">Si la cambias</p>
        ${siLaCambias(diferencia(base, calcular(cat, conPieza(build, parte, x.id, r))))}
      </div>`;
    return html`
      <li class="bld-candidata ${puesta ? 'bld-candidata--puesta' : ''}">
        <div class="bld-candidata__cabeza">
          <h3 class="bld-candidata__nombre">${bil(nombreEs(x, r), nombreEn(x, r), { ok: nombreOk(x, r) })}</h3>
          ${puesta ? html`<span class="insignia insignia--curso">Puesta</span>` : ''}
        </div>
        ${fuera ? html`<p class="nota">Esta pieza va de ${x.rmin} a ${x.rmax}: se muestra en ${r}.</p>` : ''}
        ${cuerpo}
        ${corrige ? atajoNombre(x, r) : ''}
        ${dif}
        ${puesta ? '' : html`<button type="button" class="boton boton--ancho" data-usar="${x.id}" data-r="${r}">Usar esta</button>`}
      </li>`;
  }

  /** E6: "Corregir nombre" (oficiales). Vale para todas las rarezas de ese nombre base. */
  function atajoNombre(x, r) {
    const en = nombreEn(x, r);
    const { base } = partirNombre(en, esArma);
    const id = claveNombre(base);
    return html`
      <details class="nom-atajo">
        <summary>Corregir nombre en español</summary>
        <form class="nom-form" data-nombre="${id}" data-en="${base}">
          <label class="oculto-visual" for="atajo-${x.id}">Nombre en español de ${base}</label>
          <input id="atajo-${x.id}" class="entrada" name="es" value="${baseEs(nombreEs(x, r))}" maxlength="80"
            placeholder="Como sale en el juego, sin el número" spellcheck="false" autocomplete="off">
          <p class="nota">Sin el número (I, II…) ni el elemento: se agregan solos. Vale para todas sus rarezas.</p>
          <div class="nom-form__acciones"><button type="submit" class="boton boton--chico">Guardar y confirmar</button></div>
        </form>
      </details>`;
  }

  function pintarLista() {
    const todas = buscarPiezas(cat, f);
    const sinActual = todas.filter((x) => x.id !== itemActual?.id);
    const vaActual = itemActual && todas.some((x) => x.id === itemActual.id);
    const visibles = sinActual.slice(0, mostrar);
    cuenta.textContent = todas.length === 1 ? '1 resultado' : `${todas.length} resultados`;
    pintar(lista, html`
      ${vaActual ? tarjeta(itemActual, true) : ''}
      ${visibles.map((x) => tarjeta(x, false))}
      ${!todas.length ? html`<li class="vacio"><p>Nada coincide. Prueba con menos filtros.</p></li>` : ''}
      ${sinActual.length > mostrar ? html`<li><button type="button" class="boton boton--ancho boton--tenue" data-mas>Mostrar más (${sinActual.length - mostrar})</button></li>` : ''}`);
  }
  pintarLista();

  let espera = 0;
  capa.addEventListener('input', (ev) => {
    const k = ev.target.dataset.f;
    if (!k) return;
    f[k] = ev.target.value;
    mostrar = POR_PAGINA;
    clearTimeout(espera);
    espera = setTimeout(pintarLista, k === 'texto' ? 160 : 0);
  });

  capa.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('[data-nombre]');
    if (!form) return;
    ev.preventDefault();
    const es = form.elements.es.value.trim().replace(/\s+/g, ' ');
    if (!es) { form.elements.es.focus(); return; }
    const boton = form.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      const r = await escribir('catalogo.nombre', { tipo: esArma ? 'arma' : 'pieza', id: form.dataset.nombre, en: form.dataset.en, es }, sesion()?.token);
      aplicarNombres(cat, [...(cat.nombresAplicados || []).filter((y) => !(y.tipo === r.tipo && y.id === r.id)), r]);
      toast(`${r.es}: confirmado.`);
      pintarLista();
      alCambiarNombre?.();
    } catch (e) {
      boton.disabled = false;
      toast(e instanceof ErrorApi ? e.message : 'No se pudo guardar. Inténtalo de nuevo.', { error: true });
    }
  });

  capa.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-cerrar]')) { cerrar(); return; }
    if (ev.target.closest('[data-mas]')) { mostrar += POR_PAGINA; pintarLista(); return; }
    const usar = ev.target.closest('[data-usar]');
    if (usar) {
      cerrar();
      alElegir(usar.dataset.usar, Number(usar.dataset.r));
    }
  });

  capa.querySelector('[data-cerrar]').focus();
  return { cerrar };
}
