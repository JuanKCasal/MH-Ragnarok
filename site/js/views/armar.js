/** Armado de brigadas del Guild Clash (oficiales). Ver SPEC.md §10. */
import { leer, escribir, MODO_DEMO, ErrorApi } from '../api.js';
import { sesion, tieneRol } from '../auth.js';
import { html, crudo, pintar, numero, romano } from '../ui/dom.js';
import { ICONOS } from '../ui/iconos.js';
import { avisoDemo, cargando, fallo, fechaSemana } from '../ui/comun.js';
import { toast } from '../ui/toast.js';
import { balancearEquipos } from '../clash-balance.js';
import { ir } from '../router.js';
import { arma, tipo } from '../etiquetas.js';

const sumar = (eq) => eq.reduce((t, j) => t + j.poder, 0);

function metricas(equipos) {
  const sumas = equipos.map(sumar);
  const n = equipos.reduce((t, e) => t + e.length, 0);
  return {
    brigadas: equipos.length,
    cazadores: n,
    diferencia: sumas.length > 1 ? Math.max(...sumas) - Math.min(...sumas) : 0,
    promedio: sumas.length ? sumas.reduce((a, b) => a + b, 0) / sumas.length : 0,
  };
}

export default async function vistaArmar(el, { recargar }) {
  if (!tieneRol('oficial')) {
    pintar(el, html`
      <section class="pronto">
        <h1 class="titulo titulo--pagina">Armar brigadas</h1>
        <p>Solo los oficiales arman las brigadas del Clash. Si eres oficial, entra con tu nick y PIN.</p>
        <a class="boton" href="#/entrar?volver=clash/armar">Entrar</a>
        <a href="#/eventos">Volver a Eventos</a>
      </section>`);
    return { titulo: 'Armar brigadas' };
  }

  pintar(el, cargando());
  let clash;
  try {
    clash = await leer('clash', {});
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Armar brigadas' };
  }

  const semana = clash.semana || {};
  const aJugador = (a) => ({ id: a.miembro_id, nick: a.nick, poder: Number(a.poder) || 0, arma: a.adventurer?.arma, tipo: a.adventurer?.tipo, respuesta: a.respuesta });
  const asistentes = (clash.asistencia || []).map(aJugador);

  const estado = {
    incluirQuiza: false,
    composicion: false,
    fijados: {},          // id → índice de brigada
    equipos: [],          // arrays de jugadores
    seleccionado: null,   // id del cazador elegido para intercambiar
    cambios: false,
  };

  const candidatos = () => asistentes.filter((j) => j.respuesta === 'voy' || (estado.incluirQuiza && j.respuesta === 'quiza'));

  function repartir() {
    const lista = candidatos();
    const ids = new Set(lista.map((j) => j.id));
    const k = Math.ceil(lista.length / 4);
    const fijados = Object.fromEntries(Object.entries(estado.fijados).filter(([id, e]) => ids.has(id) && e < k));
    try {
      const r = balancearEquipos(lista.map(({ id, poder, tipo: t, arma: a }) => ({ id, poder, tipo: t, arma: a })), { fijados, composicion: estado.composicion });
      const porId = Object.fromEntries(lista.map((j) => [j.id, j]));
      estado.equipos = r.equipos.map((e) => e.jugadores.map((j) => porId[j.id]));
      estado.fijados = fijados;
    } catch (e) {
      toast(e.message, { error: true });
    }
    estado.seleccionado = null;
    estado.cambios = true;
  }

  // Punto de partida: lo ya publicado, o un reparto nuevo.
  if (clash.equipos?.length) {
    const porId = Object.fromEntries(asistentes.map((j) => [j.id, j]));
    estado.equipos = clash.equipos.map((e, i) => e.jugadores.map((j) => {
      if (j.fijado) estado.fijados[j.miembro_id] = i;
      return porId[j.miembro_id] || aJugador({ ...j, respuesta: 'voy' });
    }));
  } else {
    repartir();
    estado.cambios = false;
  }

  function ubicar(id) {
    for (let e = 0; e < estado.equipos.length; e++) {
      const p = estado.equipos[e].findIndex((j) => j.id === id);
      if (p !== -1) return [e, p];
    }
    return null;
  }

  function celda(j, e) {
    const fijo = estado.fijados[j.id] === e;
    const sel = estado.seleccionado === j.id;
    return html`
      <li><button type="button" class="cazador" data-id="${j.id}" aria-pressed="${sel}"
        aria-label="${j.nick}, ${numero(j.poder)}${fijo ? ', fijado' : ''}">
        <span>
          <span class="cazador__nick">${j.nick}</span>
          <span class="cazador__dato">${[numero(j.poder), arma(j.arma), estado.composicion ? tipo(j.tipo) : ''].filter(Boolean).join(' · ')}</span>
        </span>
        ${fijo ? html`<span class="cazador__fijo" title="Fijado">${crudo(ICONOS.fijar)}</span>` : ''}
      </button></li>`;
  }

  function ayuda() {
    const sel = estado.seleccionado && ubicar(estado.seleccionado);
    if (!sel) return html`<p class="ayuda-intercambio">Toca un cazador y luego otro de otra brigada para intercambiarlos.</p>`;
    const j = estado.equipos[sel[0]][sel[1]];
    const fijo = estado.fijados[j.id] === sel[0];
    return html`
      <div class="ayuda-intercambio ayuda-intercambio--activa">
        <span><strong>${j.nick}</strong> elegido: toca a otro para intercambiar.</span>
        <button type="button" class="boton boton--chico" data-accion="fijar">${fijo ? 'Soltar' : `Fijar en Brigada ${romano(sel[0] + 1)}`}</button>
        <button type="button" class="boton boton--chico" data-accion="cancelar">Cancelar</button>
      </div>`;
  }

  function render() {
    const m = metricas(estado.equipos);
    const nVoy = asistentes.filter((j) => j.respuesta === 'voy').length;
    const nQuiza = asistentes.filter((j) => j.respuesta === 'quiza').length;
    const hayFijados = Object.keys(estado.fijados).length > 0;
    pintar(el, html`
      ${avisoDemo('Modo demostración: puedes probar el armado con los datos de ejemplo; publicar no guarda nada.')}
      <header class="cabeza-pagina">
        <h1 class="titulo titulo--pagina">Armar brigadas</h1>
        <p class="apoyo">Semana del ${fechaSemana(semana.id)} · ${nVoy} van${nQuiza ? ` · ${nQuiza} quizá` : ''}</p>
      </header>

      <section class="panel armado-controles" aria-label="Opciones del reparto">
        <label class="interruptor"><input type="checkbox" data-opcion="incluirQuiza" ${estado.incluirQuiza ? 'checked' : ''}> Incluir a los “quizá”</label>
        <label class="interruptor"><input type="checkbox" data-opcion="composicion" ${estado.composicion ? 'checked' : ''}> Cuidar la composición (al menos un Apoyo, sin 3 armas iguales)</label>
        <div class="armado-acciones">
          <button type="button" class="boton boton--oro" data-accion="repartir">Repartir de nuevo</button>
          ${hayFijados ? html`<button type="button" class="boton" data-accion="soltar-todos">Soltar fijados</button>` : ''}
        </div>
        <p class="nota">Reparte por suma de poder del adventurer principal: tiende a juntar 2 fuertes con 2 de poder normal. Los cazadores fijados no se mueven al repartir.</p>
      </section>

      <section class="cuenta-clash" aria-label="Resultado">
        <div><p class="cifra num">${m.brigadas}</p><p class="rotulo">Brigadas</p></div>
        <div><p class="cifra num">${numero(m.promedio)}</p><p class="rotulo">Promedio</p></div>
        <div><p class="cifra num cifra--bien">±${numero(m.diferencia)}</p><p class="rotulo">Diferencia</p></div>
      </section>

      <section class="seccion" aria-label="Brigadas">
        <div aria-live="polite">${ayuda()}</div>
        ${estado.equipos.length
          ? html`<div class="brigadas">
              ${estado.equipos.map((eq, e) => html`
                <article class="brigada" aria-label="Brigada ${romano(e + 1)}">
                  <div class="brigada__cabeza">
                    <h2 class="brigada__nombre">Brigada ${romano(e + 1)}</h2>
                    <span class="brigada__suma">${numero(sumar(eq))}</span>
                  </div>
                  <ul class="brigada__miembros">
                    ${eq.map((j) => celda(j, e))}
                    ${eq.length < 4 ? html`<li class="cazador cazador--hueco">Brigada de ${eq.length}</li>` : ''}
                  </ul>
                </article>`)}
            </div>`
          : html`<div class="vacio"><p>Nadie ha confirmado todavía. Cuando haya cazadores con “voy”, aparecerán aquí.</p></div>`}
      </section>

      <div class="franja-acciones">
        <a class="boton" href="#/eventos">Volver</a>
        <button type="button" class="boton boton--oro" data-accion="publicar" ${estado.equipos.length ? '' : 'disabled'}>Publicar brigadas</button>
      </div>`);
  }

  async function publicar(boton) {
    boton.disabled = true;
    boton.textContent = 'Publicando…';
    try {
      await escribir('clash.guardarEquipos', {
        semana_id: semana.id,
        equipos: estado.equipos.map((eq, e) => eq.map((j) => ({ miembro_id: j.id, fijado: estado.fijados[j.id] === e }))),
      }, sesion().token);
      estado.cambios = false;
      toast(MODO_DEMO ? 'Brigadas publicadas (ejemplo: solo en esta pestaña).' : 'Brigadas publicadas. Ya las ve todo el clan.');
      ir('/eventos');
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'Publicar brigadas';
      toast(e instanceof ErrorApi ? e.message : 'No se pudo publicar. Inténtalo de nuevo.', { error: true });
    }
  }

  const alCambiar = (ev) => {
    const op = ev.target.dataset?.opcion;
    if (!op) return;
    estado[op] = ev.target.checked;
    repartir();
    render();
  };

  const alTocar = (ev) => {
    const accion = ev.target.closest('[data-accion]')?.dataset.accion;
    if (accion === 'repartir') { repartir(); render(); toast('Brigadas repartidas.'); return; }
    if (accion === 'soltar-todos') { estado.fijados = {}; render(); return; }
    if (accion === 'cancelar') { estado.seleccionado = null; render(); return; }
    if (accion === 'publicar') { publicar(ev.target.closest('button')); return; }
    if (accion === 'fijar') {
      const [e] = ubicar(estado.seleccionado);
      if (estado.fijados[estado.seleccionado] === e) delete estado.fijados[estado.seleccionado];
      else estado.fijados[estado.seleccionado] = e;
      estado.seleccionado = null;
      estado.cambios = true;
      render();
      return;
    }

    const id = ev.target.closest('button.cazador')?.dataset.id;
    if (!id) return;
    if (!estado.seleccionado || estado.seleccionado === id) {
      estado.seleccionado = estado.seleccionado === id ? null : id;
      render();
      el.querySelector(`button.cazador[data-id="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    const a = ubicar(estado.seleccionado);
    const b = ubicar(id);
    if (a[0] === b[0]) { estado.seleccionado = id; render(); return; }
    const ja = estado.equipos[a[0]][a[1]];
    const jb = estado.equipos[b[0]][b[1]];
    estado.equipos[a[0]][a[1]] = jb;
    estado.equipos[b[0]][b[1]] = ja;
    delete estado.fijados[ja.id];
    delete estado.fijados[jb.id];
    estado.seleccionado = null;
    estado.cambios = true;
    render();
    toast(`${ja.nick} ↔ ${jb.nick}`);
  };

  el.addEventListener('change', alCambiar);
  el.addEventListener('click', alTocar);

  const avisarSalida = (ev) => { if (estado.cambios) { ev.preventDefault(); ev.returnValue = ''; } };
  window.addEventListener('beforeunload', avisarSalida);

  render();
  return { titulo: 'Armar brigadas', limpiar: () => {
    window.removeEventListener('beforeunload', avisarSalida);
    el.removeEventListener('change', alCambiar);
    el.removeEventListener('click', alTocar);
  } };
}
