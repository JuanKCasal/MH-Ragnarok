/** Mi perfil: adventurers, enlace del grupo, datos, PIN y salir. Ver SPEC.md §2 (#/yo). */
import { leer, escribir, MODO_DEMO, ErrorApi } from '../api.js';
import { sesion, actualizarMiembro, olvidarSesion, salir, esSesionCaida, tieneRol } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, numero, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { campo, campoPin, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe, CAMPO_DE_ERROR } from '../ui/form.js';
import { toast } from '../ui/toast.js';
import { armaBilingue, elemento, tipo } from '../etiquetas.js';
import { errorNick, errorPin, PAISES, bandera, nombrePais, esInvitacionWhatsapp } from '../validar.js';
import { comprimir, urlImagen } from '../image.js';

const ROLES = { admin: 'Admin', oficial: 'Oficial', miembro: 'Miembro' };
const MAX_ADVENTURERS = 30;

export function avatar(m, tam = 88) {
  const src = urlImagen(m.avatar_id, tam * 2);
  return src
    ? html`<img class="avatar" src="${src}" alt="" width="${tam}" height="${tam}" style="--tam:${tam}px" loading="lazy" decoding="async">`
    : html`<span class="avatar avatar--inicial" style="--tam:${tam}px" aria-hidden="true">${[...String(m.nick || '?')][0].toUpperCase()}</span>`;
}

export const elemDot = (k) => html`<span class="elem elem--${k || 'none'}" aria-hidden="true"></span>`;

const PARTES = [['poder_equipo', 'Equipamiento', 'equipo'], ['poder_rostros', 'Rostros', 'rostros'], ['poder_camarada', 'Camarada', 'camarada']];

/** Barra con el poder por componente (Equipamiento, Rostros, Camarada, Otros). Vacío si no lo cargó. */
export function desglosePoder(a) {
  const total = Number(a.poder_total) || 0;
  const partes = PARTES.map(([k, t, c]) => ({ t, c, v: Number(a[k]) || 0 })).filter((p) => p.v > 0);
  if (!total || !partes.length) return '';
  const otros = total - partes.reduce((s, p) => s + p.v, 0);
  if (otros > 0) partes.push({ t: 'Otros', c: 'otros', v: otros });
  return html`
    <div class="desglose">
      <div class="desglose__barra" aria-hidden="true">${partes.map((p) => html`<span class="desglose--${p.c}" style="flex-grow:${p.v}"></span>`)}</div>
      <dl class="desglose__leyenda">${partes.map((p) => html`
        <div><dt><span class="desglose__punto desglose--${p.c}" aria-hidden="true"></span>${p.t}</dt><dd>${numero(p.v)}</dd></div>`)}</dl>
    </div>`;
}

export function tarjetaAdventurer(a, { principal = false, editable = false, desglose = false } = {}) {
  const datos = [armaBilingue(a.arma), a.tipo ? tipo(a.tipo) : '', a.nivel ? `Nv. ${a.nivel}` : ''].filter(Boolean).join(' · ');
  return html`
    <article class="adv ${principal ? 'adv--principal' : ''}">
      <div class="adv__cabeza">
        <h3 class="adv__nombre">${a.adventurer}</h3>
        ${principal ? html`<span class="insignia insignia--oro">Principal</span>` : ''}
      </div>
      <p class="adv__poder"><span class="num">${numero(a.poder_total)}</span> <span class="rotulo">poder</span></p>
      <p class="adv__datos">${elemDot(a.elemento)}${elemento(a.elemento || 'none')}${datos ? ` · ${datos}` : ''}</p>
      ${desglose ? desglosePoder(a) : ''}
      ${a.loadout ? html`<p class="adv__loadout">Loadout “${a.loadout}”</p>` : ''}
      ${a.notas ? html`<p class="adv__notas">${a.notas}</p>` : ''}
      ${a.capturas?.length
        ? html`<ul class="adv__capturas" aria-label="Capturas">${a.capturas.map((id, i) => html`
            <li><a href="${urlImagen(id, 1600)}" target="_blank" rel="noopener noreferrer"><img src="${urlImagen(id, 400)}" alt="Captura ${i + 1} de ${a.adventurer}" loading="lazy" decoding="async"></a></li>`)}</ul>`
        : ''}
      ${editable
        ? html`<div class="adv__acciones">
            <a class="boton boton--chico" href="#/yo/adventurer/${a.id}">Editar</a>
            ${principal
              ? html`<span class="nota">Su poder cuenta para el Clash</span>`
              : html`<button type="button" class="boton boton--chico" data-principal="${a.id}">Hacer principal</button>`}
          </div>`
        : ''}
    </article>`;
}

export default async function vistaYo(el, { query, recargar }) {
  const s = sesion();
  if (!s) {
    ir('/entrar?volver=yo');
    return { titulo: 'Mi perfil' };
  }
  pintar(el, cargando());

  let perfil;
  try {
    perfil = await leer('miembro', { id: s.miembro.id });
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Mi perfil' };
  }

  const yo = s.miembro;
  const pinTemporal = !!yo.pin_temporal || query.pin === '1';
  const advs = perfil.adventurers || [];
  const principalId = perfil.adventurer_principal_id;
  const restantes = yo.nick_cambios_restantes ?? 2;
  const wa = yo.whatsapp_invitacion;
  const lugar = [bandera(perfil.pais), nombrePais(perfil.pais)].filter(Boolean).join(' ');

  const seccionPin = html`
    <section class="seccion" aria-labelledby="t-pin" id="pin">
      <details class="desplegable desplegable--panel" ${pinTemporal ? 'open' : ''}>
        <summary id="t-pin">Cambiar PIN</summary>
        <form class="formulario" data-form="pin" novalidate>
          ${campoPin('pin_actual', pinTemporal ? 'PIN temporal (el que te dio el oficial)' : 'PIN actual')}
          ${campoPin('pin_nuevo', 'PIN nuevo', { nuevo: true, ayuda: 'Nada de 123456 ni números repetidos.' })}
          ${campoPin('pin_nuevo2', 'Repite el PIN nuevo', { nuevo: true })}
          <p class="error-form" role="alert" hidden></p>
          <button type="submit" class="boton boton--oro boton--ancho">Cambiar PIN</button>
          <p class="nota">Al cambiarlo se cierran tus sesiones en otros dispositivos.</p>
        </form>
      </details>
    </section>`;

  pintar(el, html`
    ${avisoDemo()}
    ${pinTemporal ? html`<p class="alerta" role="alert">${crudo(ICONOS.info)}<span><strong>Tu PIN es temporal.</strong> Elige uno nuevo abajo antes de seguir.</span></p>` : ''}

    <header class="perfil-cabeza">
      <label class="perfil-cabeza__avatar" title="Cambiar foto">
        ${avatar(perfil, 88)}
        <span class="perfil-cabeza__cambiar">Cambiar foto</span>
        <input type="file" accept="image/*" class="oculto-visual" data-avatar aria-label="Cambiar foto de perfil">
      </label>
      <div class="perfil-cabeza__texto">
        <h1 class="titulo titulo--pagina">${perfil.nick}</h1>
        <p class="apoyo">${[ROLES[perfil.rol], lugar, perfil.nick_juego && perfil.nick_juego !== perfil.nick ? `en el juego: ${perfil.nick_juego}` : ''].filter(Boolean).join(' · ')}</p>
      </div>
    </header>

    ${query.nuevo === '1' && !advs.length
      ? html`<section class="panel bienvenida">
          <h2 class="titulo titulo--menor">Ya eres parte del salón</h2>
          <p class="apoyo">Siguiente paso: agrega tu adventurer principal. Su poder es el que usamos para armar las brigadas del Guild Clash.</p>
        </section>`
      : ''}

    ${pinTemporal ? seccionPin : ''}

    <section class="seccion" aria-labelledby="t-advs">
      <div class="encabezado">
        <h2 class="titulo" id="t-advs">Mis adventurers</h2>
        ${advs.length ? html`<span class="nota">${advs.length} de ${MAX_ADVENTURERS}</span>` : ''}
      </div>
      ${advs.length
        ? html`<div class="advs">${advs.map((a) => tarjetaAdventurer(a, { principal: a.id === principalId, editable: true, desglose: a.id === principalId }))}</div>`
        : query.nuevo === '1' ? '' : html`<div class="vacio"><p>Todavía no cargas ninguno. Con tu adventurer principal y su poder ya puedes confirmar el Clash del sábado.</p></div>`}
      ${advs.length < MAX_ADVENTURERS
        ? html`<a class="boton boton--ancho ${advs.length ? '' : 'boton--oro latido'}" href="#/yo/adventurer">Agregar adventurer</a>`
        : ''}
    </section>

    ${tieneRol('oficial')
      ? html`<section class="seccion" aria-labelledby="t-oficial">
          <h2 class="titulo titulo--menor" id="t-oficial">Herramientas de oficial</h2>
          <nav class="atajos" aria-labelledby="t-oficial">
            <a class="atajo" href="#/editor"><strong>Noticias</strong><span>Escribir, borradores y fijar</span></a>
            <a class="atajo" href="#/editor?tipo=guia"><strong>Guías</strong><span>Escribir y ordenar</span></a>
            <a class="atajo" href="#/clash/armar"><strong>Brigadas</strong><span>Armar el Clash del sábado</span></a>
          </nav>
        </section>`
      : ''}

    ${esInvitacionWhatsapp(wa)
      ? html`<section class="panel-sencillo grupo" aria-label="Grupo de WhatsApp">
          <span class="grupo__texto">${crudo(ICONOS.whatsapp)}<span>Grupo de WhatsApp del clan</span></span>
          <a class="boton boton--chico" href="${wa}" target="_blank" rel="noopener noreferrer">Abrir</a>
        </section>`
      : MODO_DEMO
        ? html`<p class="nota">Aquí aparece el enlace al grupo de WhatsApp cuando el admin lo configura. Solo lo ven los miembros con sesión.</p>`
        : ''}

    <section class="seccion" aria-labelledby="t-datos">
      <h2 class="titulo" id="t-datos">Mis datos</h2>
      <form class="formulario" data-form="datos" novalidate>
        ${campo({ nombre: 'nick', etiqueta: 'Nick', valor: perfil.nick,
          ayuda: restantes > 0 ? `Con él entras. Te ${restantes === 1 ? 'queda 1 cambio' : `quedan ${restantes} cambios`} esta semana.` : 'Ya usaste los cambios de nick de esta semana.',
          attrs: { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, maxlength: 24, readonly: restantes <= 0 } })}
        ${campo({ nombre: 'nick_juego', etiqueta: 'Nombre en el juego', opcional: true, valor: perfil.nick_juego, attrs: { maxlength: 32, autocapitalize: 'none', spellcheck: 'false' } })}
        ${campo({ nombre: 'uid_juego', etiqueta: 'ID de jugador', opcional: true, valor: perfil.uid_juego, ayuda: 'Lo ves en tu perfil del juego. Sirve para que te agreguen como amigo.', attrs: { maxlength: 32, inputmode: 'numeric', autocapitalize: 'none', spellcheck: 'false' } })}
        ${campo({ nombre: 'pais', etiqueta: 'País', tipo: 'select', opcional: true, valor: perfil.pais, opciones: [['', 'Sin indicar'], ...PAISES] })}
        ${campo({ nombre: 'bio', etiqueta: 'Sobre ti', tipo: 'textarea', opcional: true, valor: perfil.bio, ayuda: 'Tu arma favorita, tu horario de caza, lo que quieras contarle al clan.', attrs: { maxlength: 280, rows: 3, 'data-contador': true } })}
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--ancho">Guardar datos</button>
      </form>
    </section>

    ${pinTemporal ? '' : seccionPin}

    <button type="button" class="boton boton--ancho boton--tenue" data-salir>Cerrar sesión</button>`);

  /** Si la sesión venció a mitad de camino, a Entrar. Si no, devuelve el mensaje para mostrar. */
  function manejar(e, porDefecto) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir('/entrar?volver=yo');
      return null;
    }
    return e instanceof ErrorApi ? e.message : porDefecto;
  }

  el.querySelectorAll('form').forEach(activarCampos);

  // Foto de perfil
  el.querySelector('[data-avatar]').addEventListener('change', async (ev) => {
    const archivo = ev.target.files?.[0];
    ev.target.value = '';
    if (!archivo) return;
    toast('Subiendo tu foto…', { ms: 8000 });
    try {
      const img = await comprimir(archivo, { lado: 512, cuadrado: true });
      const { id } = await escribir('imagen.subir', { ...img, tipo: 'avatar' }, s.token);
      const m = await escribir('perfil.guardar', { avatar_id: id }, s.token);
      actualizarMiembro(m);
      toast('Foto actualizada.');
      recargar();
    } catch (e) {
      const msg = e instanceof ErrorApi ? manejar(e, '') : e.message;
      if (msg) toast(msg || 'No se pudo subir la foto.', { error: true });
    }
  });

  // Adventurer principal
  el.querySelector('.advs')?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-principal]');
    if (!b) return;
    ocupado(b, true, 'Guardando…');
    try {
      await escribir('adventurer.principal', { id: b.dataset.principal }, s.token);
      toast('Listo: ese es tu adventurer principal para el Clash.');
      recargar();
    } catch (e) {
      ocupado(b, false);
      const msg = manejar(e, 'No se pudo guardar. Inténtalo de nuevo.');
      if (msg) toast(msg, { error: true });
    }
  });

  // Mis datos
  const formDatos = el.querySelector('[data-form=datos]');
  formDatos.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores(formDatos);
    const d = datosDe(formDatos);
    if (mostrarErrores(formDatos, { nick: errorNick(d.nick) })) return;
    const boton = formDatos.querySelector('[type=submit]');
    ocupado(boton, true);
    try {
      const m = await escribir('perfil.guardar', {
        nick: d.nick.trim(), nick_juego: d.nick_juego.trim(), uid_juego: d.uid_juego.trim(), pais: d.pais, bio: d.bio.trim(),
      }, s.token);
      actualizarMiembro(m);
      toast('Datos guardados.');
      recargar();
    } catch (e) {
      ocupado(boton, false);
      const msg = manejar(e, 'No se pudo guardar. Inténtalo de nuevo.');
      if (!msg) return;
      const nombre = CAMPO_DE_ERROR[e?.codigo];
      if (!nombre || !mostrarErrores(formDatos, { [nombre]: msg })) errorGeneral(formDatos, msg);
    }
  });

  // Cambiar PIN
  const formPin = el.querySelector('[data-form=pin]');
  formPin.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores(formPin);
    const d = datosDe(formPin);
    const errores = {
      pin_actual: /^\d{6}$/.test(d.pin_actual) ? '' : 'El PIN son exactamente 6 dígitos.',
      pin_nuevo: errorPin(d.pin_nuevo) || (d.pin_nuevo === d.pin_actual ? 'El PIN nuevo tiene que ser distinto del actual.' : ''),
      pin_nuevo2: !errorPin(d.pin_nuevo) && d.pin_nuevo2 !== d.pin_nuevo ? 'Los dos PIN no coinciden.' : '',
    };
    if (mostrarErrores(formPin, errores)) return;
    const boton = formPin.querySelector('[type=submit]');
    ocupado(boton, true, 'Cambiando…');
    try {
      await escribir('pin.cambiar', { pin_actual: d.pin_actual, pin_nuevo: d.pin_nuevo }, s.token);
      actualizarMiembro({ pin_temporal: false });
      toast('PIN cambiado. Cerramos tus sesiones en otros dispositivos.');
      if (query.pin) ir('/yo'); else recargar();
    } catch (e) {
      ocupado(boton, false);
      const msg = manejar(e, 'No se pudo cambiar el PIN. Inténtalo de nuevo.');
      if (!msg) return;
      // En pin.cambiar, los errores de formato/debilidad son del PIN nuevo.
      const nombre = { PIN_INVALIDO: 'pin_actual', PIN_FORMATO: 'pin_nuevo', PIN_DEBIL: 'pin_nuevo' }[e?.codigo];
      if (!nombre || !mostrarErrores(formPin, { [nombre]: msg })) errorGeneral(formPin, msg);
    }
  });

  el.querySelector('[data-salir]').addEventListener('click', async () => {
    await salir();
    toast('Cerraste sesión. ¡Buena caza!');
    ir('/');
  });

  if (pinTemporal) setTimeout(() => formPin.querySelector('input')?.focus(), 50);
  return { titulo: 'Mi perfil' };
}
