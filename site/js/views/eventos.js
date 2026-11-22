/** Eventos: Guild Clash (asistencia y brigadas de la semana) y Guild Carnival. Ver SPEC.md §2 y §9. */
import { leer, escribir, MODO_DEMO, ErrorApi } from '../api.js';
import { sesion, tieneRol } from '../auth.js';
import { html, pintar, numero, romano } from '../ui/dom.js';
import { avisoDemo, cargando, fallo, cfgEventos, horaLocal, duracion, fechaSemana } from '../ui/comun.js';
import { iniciarRelojes } from '../ui/reloj.js';
import { toast } from '../ui/toast.js';
import { proximoClash, proximoCarnival, formatoLocal } from '../time.js';
import { arma, elemento } from '../etiquetas.js';

const RESPUESTAS = [
  { id: 'voy', texto: 'Voy' },
  { id: 'quiza', texto: 'Quizá' },
  { id: 'no', texto: 'No' },
];

const CONFIRMACION = {
  voy: 'Listo: cuentas para el Clash del sábado.',
  quiza: 'Anotado como “quizá”. Confirma cuando sepas.',
  no: 'Anotado: esta vez no vas.',
};

function celda(j, yoId) {
  const tuyo = j.miembro_id === yoId;
  const a = j.adventurer || {};
  return html`
    <li class="cazador ${tuyo ? 'cazador--tuyo' : ''}">
      <span class="cazador__nick">${tuyo ? `${j.nick} (tú)` : j.nick}</span>
      <span class="cazador__dato">${[numero(j.poder), arma(a.arma)].filter(Boolean).join(' · ')}</span>
    </li>`;
}

const esTuya = (eq, yoId) => (yoId && eq.jugadores.some((j) => j.miembro_id === yoId) ? 1 : 0);

export function tarjetaBrigada(eq, yoId) {
  const tuya = !!esTuya(eq, yoId);
  const huecos = Math.max(0, 4 - eq.jugadores.length);
  return html`
    <article class="brigada ${tuya ? 'brigada--tuya' : ''}" aria-label="Brigada ${romano(eq.numero)}${tuya ? ', la tuya' : ''}">
      <div class="brigada__cabeza">
        <h3 class="brigada__nombre">Brigada ${romano(eq.numero)}${tuya ? html` <span class="insignia insignia--oro">La tuya</span>` : ''}</h3>
        <span class="brigada__suma">${numero(eq.suma)}</span>
      </div>
      <ul class="brigada__miembros">
        ${eq.jugadores.map((j) => celda(j, yoId))}
        ${Array.from({ length: huecos }, () => html`<li class="cazador cazador--hueco">Brigada de ${eq.jugadores.length}</li>`)}
      </ul>
    </article>`;
}

function chips(lista) {
  return html`<ul class="asistentes">${lista.map((a) => html`<li>${a.nick}<span>${numero(a.poder)}</span></li>`)}</ul>`;
}

export default async function vistaEventos(el, { recargar }) {
  pintar(el, cargando());
  let inicio, clash, historial;
  try {
    [inicio, clash, historial] = await Promise.all([
      leer('inicio', {}),
      leer('clash', {}, { alRefrescar: recargar }),
      leer('clash_historial', {}).catch(() => []),
    ]);
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Eventos' };
  }

  const cfg = cfgEventos(inicio.gremio);
  const ahora = new Date();
  const proximo = proximoClash(ahora, cfg);
  const carnival = proximoCarnival(ahora, cfg);
  const s = sesion();
  const yoId = s?.miembro.id;
  const semana = clash.semana || {};
  const cerrada = semana.estado === 'cerrada';
  const asistencia = clash.asistencia || [];
  const mia = asistencia.find((a) => a.miembro_id === yoId);
  const van = asistencia.filter((a) => a.respuesta === 'voy').sort((a, b) => b.poder - a.poder);
  const quiza = asistencia.filter((a) => a.respuesta === 'quiza');
  const equipos = clash.equipos || [];
  const sumas = equipos.map((e) => e.suma);
  const diferencia = sumas.length > 1 ? Math.max(...sumas) - Math.min(...sumas) : 0;
  const ultimo = historial?.[0];
  const advMio = mia?.adventurer;
  const horasCarnival = cfg.carnival.horas.map((h) => {
    const [hh, mm] = h.split(':').map(Number);
    return { juego: h, local: horaLocal(new Date(Date.UTC(2026, 0, 15, hh, (mm || 0) - cfg.offsetJuegoMin))) };
  });
  const siguienteCarnival = horaLocal(carnival.inicio);

  pintar(el, html`
    ${avisoDemo()}
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Guild Clash</h1>
      <p class="apoyo">${formatoLocal(proximo.inicio)} en tu hora · dura ~${duracion(cfg.clash.duracionMin)}</p>
    </header>

    <section class="panel" aria-labelledby="t-asistencia">
      <div class="clash-reloj">
        <h2 class="titulo titulo--menor" id="t-asistencia">Tu asistencia</h2>
        ${proximo.enCurso
          ? html`<span class="insignia insignia--curso">En curso · <span data-hasta="${proximo.fin.getTime()}"></span></span>`
          : html`<span class="insignia">Empieza en <span data-hasta="${proximo.inicio.getTime()}"></span></span>`}
      </div>
      ${cerrada
        ? html`<p class="apoyo">Esta semana ya cerró. La asistencia del próximo Clash se abre al terminar el actual.</p>`
        : s
          ? html`
            <div class="respuestas" role="group" aria-label="¿Vas al Clash?">
              ${RESPUESTAS.map((r) => html`<button type="button" class="boton" data-respuesta="${r.id}" aria-pressed="${mia?.respuesta === r.id}">${r.texto}</button>`)}
            </div>
            ${advMio
              ? html`<p class="mi-adventurer">Con tu adventurer principal: <strong>${[arma(advMio.arma), elemento(advMio.elemento)].filter(Boolean).join(' · ')}</strong> · <strong class="poder">${numero(mia.poder)}</strong></p>`
              : html`<p class="mi-adventurer">Para confirmar “voy” necesitas tu adventurer principal en tu perfil: su poder es el que se usa para armar las brigadas.</p>`}`
          : html`
            <p class="apoyo">Entra con tu nick y PIN para confirmar si vas este sábado.</p>
            <a class="boton boton--oro boton--ancho" href="#/entrar?volver=eventos">Entrar para confirmar</a>`}
    </section>

    <section class="cuenta-clash" aria-label="Resumen de la semana">
      <div><p class="cifra num">${equipos.length || Math.ceil(van.length / 4)}</p><p class="rotulo">Brigadas</p></div>
      <div><p class="cifra num">${van.length}</p><p class="rotulo">Van</p></div>
      ${equipos.length
        ? html`<div><p class="cifra num cifra--bien">±${numero(diferencia)}</p><p class="rotulo">Diferencia</p></div>`
        : html`<div><p class="cifra num">${quiza.length}</p><p class="rotulo">Quizá</p></div>`}
    </section>

    <section class="seccion" aria-labelledby="t-brigadas">
      <div class="encabezado">
        <h2 class="titulo" id="t-brigadas">Brigadas</h2>
        ${equipos.length && !proximo.enCurso ? html`<span class="nota">Publicadas</span>` : ''}
      </div>
      ${equipos.length
        ? html`<div class="brigadas">${[...equipos].sort((a, b) => esTuya(b, yoId) - esTuya(a, yoId) || a.numero - b.numero).map((eq) => tarjetaBrigada(eq, yoId))}</div>
               ${MODO_DEMO ? html`<p class="nota">Nombres y poderes de ejemplo.</p>` : ''}`
        : html`<div class="vacio"><p>Las brigadas se publican cuando un oficial las arma. Confirma antes del sábado para entrar en el reparto.</p></div>`}
      ${tieneRol('oficial') && !cerrada
        ? html`<a class="boton boton--ancho" href="#/clash/armar">${equipos.length ? 'Rearmar brigadas · oficiales' : 'Armar brigadas · oficiales'}</a>`
        : ''}
    </section>

    ${van.length || quiza.length
      ? html`<section class="seccion" aria-labelledby="t-confirmados">
          <h2 class="titulo titulo--menor" id="t-confirmados">Confirmados</h2>
          ${van.length ? html`<details class="desplegable"><summary>Van ${van.length} cazadores</summary>${chips(van)}</details>` : ''}
          ${quiza.length ? html`<p class="rotulo">Quizá</p>${chips(quiza)}` : ''}
        </section>`
      : ''}

    ${ultimo
      ? html`<section class="panel-sencillo" aria-label="Último Clash">
          <span class="apoyo">Último Clash · ${fechaSemana(ultimo.id)}${ultimo.puntos ? ` · ${numero(ultimo.puntos)} pts` : ''}</span>
          <span class="puesto">Puesto ${ultimo.puesto}</span>
        </section>`
      : ''}

    <section class="seccion como-funciona" aria-labelledby="t-como">
      <h2 class="titulo titulo--menor" id="t-como">Cómo se juega el Clash</h2>
      <p>Cada <strong>brigada son 4 cazadores del clan</strong>, cada uno con un adventurer. La brigada se enfrenta a brigadas de otros clanes en <strong>4 rondas</strong> (4 monstruos): gana la ronda quien caza antes, y cada victoria suma puntos al clan. Dura más o menos ${duracion(cfg.clash.duracionMin)}.</p>
      <p>Por eso repartimos: <strong>2 fuertes y 2 de poder normal</strong> por brigada. Juntar a los más fuertes asegura una brigada, pero deja a las demás sin opciones.</p>
    </section>

    <section class="seccion" aria-labelledby="t-carnival">
      <div class="encabezado">
        <h2 class="titulo" id="t-carnival">Guild Carnival</h2>
        <span class="nota">Diario · dura ${duracion(cfg.carnival.duracionMin)}</span>
      </div>
      <ul class="carnival-sesiones">
        ${horasCarnival.map((h) => {
          const esta = h.local === siguienteCarnival;
          return html`<li class="panel-sencillo">
            <div>
              <p class="evento-linea__nombre num">${h.local} <span class="nota">tu hora</span></p>
              <p class="evento-linea__hora">${h.juego} en hora del juego (UTC−6)</p>
            </div>
            ${esta
              ? carnival.enCurso
                ? html`<span class="insignia insignia--curso">En curso · <span data-hasta="${carnival.fin.getTime()}"></span></span>`
                : html`<span class="insignia">En <span data-hasta="${carnival.inicio.getTime()}"></span></span>`
              : ''}
          </li>`;
        })}
      </ul>
    </section>`);

  const grupo = el.querySelector('.respuestas');
  grupo?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-respuesta]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    const botones = [...grupo.querySelectorAll('button')];
    const antes = botones.map((x) => x.getAttribute('aria-pressed'));
    botones.forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.disabled = true; });
    try {
      await escribir('clash.asistencia', { respuesta: b.dataset.respuesta }, s.token);
      toast(CONFIRMACION[b.dataset.respuesta]);
      recargar();
    } catch (e) {
      botones.forEach((x, i) => { x.setAttribute('aria-pressed', antes[i]); x.disabled = false; });
      toast(e instanceof ErrorApi ? e.message : 'No se pudo guardar. Inténtalo de nuevo.', { error: true });
    }
  });

  iniciarRelojes(recargar);
  return { titulo: 'Eventos' };
}
