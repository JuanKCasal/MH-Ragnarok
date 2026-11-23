/**
 * Administración del gremio. Ver SPEC.md §2 (#/admin) y §6.
 * - Oficiales: miembros (activar/desactivar, resetear PIN).
 * - Admin: además roles, datos y horarios del gremio (Config) y el código del clan.
 */
import { leer, escribir, ErrorApi } from '../api.js';
import { sesion, tieneRol, olvidarSesion, esSesionCaida, actualizarMiembro } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo, cfgEventos } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { campo, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe } from '../ui/form.js';
import { bandera, nombrePais, validarConfig } from '../validar.js';
import { normalizar } from '../miembros-filtro.js';
import { fechaLarga } from '../ui/contenido.js';
import { proximoClash, formatoLocal } from '../time.js';
import { avatar } from './yo.js';

const ROLES = { admin: 'Admin', oficial: 'Oficial', miembro: 'Miembro' };
const ORDEN_ROL = { admin: 0, oficial: 1, miembro: 2 };
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const FILTROS = [['activos', 'Activos'], ['atencion', 'Bloqueados o PIN temporal'], ['inactivos', 'Inactivos']];

/** "-360" → "UTC−6", "-330" → "UTC−5:30". */
function zona(min) {
  const n = Number(min) || 0;
  const h = Math.floor(Math.abs(n) / 60);
  const m = Math.abs(n) % 60;
  return `UTC${n < 0 ? '−' : '+'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Botón que pide un segundo toque antes de actuar (sin diálogos del navegador). Devuelve true si ya estaba armado. */
function confirmar(b, texto) {
  if (b.dataset.armado) {
    clearTimeout(Number(b.dataset.armado));
    delete b.dataset.armado;
    return true;
  }
  const original = b.textContent;
  b.textContent = texto;
  b.classList.add('boton--peligro-armado');
  b.dataset.armado = String(setTimeout(() => {
    delete b.dataset.armado;
    b.textContent = original;
    b.classList.remove('boton--peligro-armado');
  }, 4000));
  return false;
}

export default async function vistaAdmin(el, { query, recargar }) {
  if (!tieneRol('oficial')) {
    pintar(el, html`
      <section class="pronto">
        <h1 class="titulo titulo--pagina">Administración</h1>
        <p>Esta sección es para los oficiales y el admin del gremio.</p>
        ${sesion() ? '' : html`<a class="boton" href="#/entrar?volver=admin">Entrar</a>`}
        <a href="#/">Volver al inicio</a>
      </section>`);
    return { titulo: 'Administración' };
  }
  const s = sesion();
  const esAdmin = tieneRol('admin');
  const ver = esAdmin && ['gremio', 'codigo'].includes(query.ver) ? query.ver : 'miembros';

  /** Si la sesión venció, a Entrar. Si no, devuelve el mensaje del error. */
  function manejar(e, porDefecto) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir(`/entrar?volver=${encodeURIComponent(ver === 'miembros' ? 'admin' : `admin?ver=${ver}`)}`);
      return null;
    }
    return e instanceof ErrorApi ? e.message : (e?.message || porDefecto);
  }

  const cabeza = html`
    ${avisoDemo('Modo demostración: navegas como admin de prueba. Los cambios se ven mientras no recargues la página; nada se guarda de verdad.')}
    <a class="volver" href="#/yo">Mi perfil</a>
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">Administración</h1>
      <p class="apoyo">${esAdmin ? 'Miembros, datos del gremio y código del clan.' : 'Miembros del gremio: activar, desactivar y resetear PIN. Los datos del gremio los cambia el admin.'}</p>
    </header>
    ${esAdmin
      ? html`<nav class="segmentos" aria-label="Secciones de administración">
          <a href="#/admin" ${ver === 'miembros' ? crudo('aria-current="page"') : ''}>Miembros</a>
          <a href="#/admin?ver=gremio" ${ver === 'gremio' ? crudo('aria-current="page"') : ''}>Gremio</a>
          <a href="#/admin?ver=codigo" ${ver === 'codigo' ? crudo('aria-current="page"') : ''}>Código</a>
        </nav>`
      : ''}`;

  if (ver === 'codigo') return vistaCodigo(el, cabeza, s, manejar);
  if (ver === 'gremio') return vistaGremio(el, cabeza, s, manejar, recargar);
  return vistaMiembros(el, cabeza, s, esAdmin, manejar, recargar);
}

// ---------------------------------------------------------------- Miembros

async function vistaMiembros(el, cabeza, s, esAdmin, manejar, recargar) {
  pintar(el, cargando());
  let lista;
  try {
    lista = await escribir('admin.miembros', {}, s.token);
  } catch (e) {
    if (manejar(e) === null) return { titulo: 'Administración' };
    fallo(el, e, recargar);
    return { titulo: 'Administración' };
  }
  lista = [...(lista || [])].sort((a, b) => (ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol]) || a.nick.localeCompare(b.nick, 'es'));
  const estado = { q: '', filtro: 'activos', abiertos: new Set(), pines: new Map() };
  const yoId = s.miembro.id;

  const atencion = (m) => m.estado === 'activo' && (m.bloqueado || m.pin_temporal);
  const enFiltro = (m) => (estado.filtro === 'inactivos' ? m.estado !== 'activo'
    : estado.filtro === 'atencion' ? atencion(m) : m.estado === 'activo');
  const cuenta = (f) => lista.filter((m) => (f === 'inactivos' ? m.estado !== 'activo' : f === 'atencion' ? atencion(m) : m.estado === 'activo')).length;

  const permisos = (m) => {
    const esYo = m.id === yoId;
    return {
      esYo,
      reset: !esYo && m.estado === 'activo' && (m.rol !== 'admin' || esAdmin),
      estado: !esYo && m.rol !== 'admin' && (m.rol !== 'oficial' || esAdmin),
      rol: esAdmin && !esYo && m.rol !== 'admin' && m.estado === 'activo',
    };
  };

  const fila = (m) => {
    const p = permisos(m);
    const pin = estado.pines.get(m.id);
    return html`
      <li><details class="admin-fila ${m.estado !== 'activo' ? 'admin-fila--inactiva' : ''}" data-id="${m.id}" ${estado.abiertos.has(m.id) ? 'open' : ''}>
        <summary>
          ${avatar(m, 40)}
          <span class="admin-fila__texto">
            <span class="admin-fila__nick">${m.nick}${m.rol !== 'miembro' ? html` <span class="insignia insignia--rol">${ROLES[m.rol]}</span>` : ''}${p.esYo ? html` <span class="nota">(tú)</span>` : ''}</span>
            <span class="admin-fila__marcas">
              ${m.pais ? html`<span title="${nombrePais(m.pais)}">${bandera(m.pais)}</span>` : ''}
              ${m.estado !== 'activo' ? html`<span class="marca-admin marca-admin--inactivo">Inactivo</span>` : ''}
              ${m.bloqueado ? html`<span class="marca-admin marca-admin--alerta">Bloqueado</span>` : ''}
              ${m.pin_temporal ? html`<span class="marca-admin">PIN temporal</span>` : ''}
            </span>
          </span>
        </summary>
        <div class="admin-fila__cuerpo">
          <p class="nota">${[m.nick_juego && m.nick_juego !== m.nick ? `En el juego: ${m.nick_juego}` : '', m.creado ? `En el gremio desde el ${fechaLarga(m.creado)}` : ''].filter(Boolean).join(' · ')}</p>
          ${m.bloqueado ? html`<p class="nota nota--icono">${crudo(ICONOS.info)}<span>Se equivocó de PIN 5 veces. Puede volver a intentarlo en 15 minutos, o resetéale el PIN si no lo recuerda.</span></p>` : ''}
          ${m.pin_temporal && !pin ? html`<p class="nota nota--icono">${crudo(ICONOS.info)}<span>Tiene un PIN temporal que aún no cambia. Si lo perdió, genera otro.</span></p>` : ''}
          ${pin
            ? html`<div class="pin-temporal" role="status" tabindex="-1" data-pin-caja>
                <p class="rotulo">PIN temporal de ${m.nick}</p>
                <p class="pin-temporal__cifra">${pin.slice(0, 3)} ${pin.slice(3)}</p>
                <p>Envíaselo por privado, no en el grupo. <strong>Solo se muestra ahora:</strong> al entrar tendrá que elegir uno nuevo. Sus sesiones abiertas se cerraron.</p>
                <button type="button" class="boton boton--chico" data-copiar="${pin}">Copiar PIN</button>
              </div>`
            : ''}
          ${p.esYo ? html`<p class="nota">Tu PIN lo cambias en <a href="#/yo">Mi perfil</a>.</p>` : ''}
          ${p.reset || p.estado || p.rol
            ? html`<div class="admin-fila__acciones">
                ${p.reset ? html`<button type="button" class="boton boton--chico" data-accion="pin">Resetear PIN</button>` : ''}
                ${p.rol ? html`<button type="button" class="boton boton--chico boton--tenue" data-accion="rol">${m.rol === 'oficial' ? 'Quitar oficial' : 'Nombrar oficial'}</button>` : ''}
                ${p.estado
                  ? m.estado === 'activo'
                    ? html`<button type="button" class="boton boton--chico boton--peligro" data-accion="desactivar">Desactivar</button>`
                    : html`<button type="button" class="boton boton--chico" data-accion="activar">Reactivar</button>`
                  : ''}
              </div>`
            : ''}
          ${p.estado && m.estado === 'activo' ? html`<p class="nota">Desactivar: deja de aparecer en la web y no puede entrar. Sus datos quedan guardados por si vuelve.</p>` : ''}
          ${m.estado === 'activo' ? html`<a class="admin-fila__perfil" href="#/miembros/${encodeURIComponent(m.id)}">Ver perfil</a>` : ''}
        </div>
      </details></li>`;
  };

  pintar(el, html`
    ${cabeza}
    <section class="directorio" aria-label="Buscar miembro">
      <div class="buscador">
        <label class="oculto-visual" for="buscar-admin">Buscar miembro</label>
        <input id="buscar-admin" type="search" class="entrada buscador__entrada" placeholder="Nick o nombre en el juego"
          autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">
      </div>
      <div class="segmentos" role="group" aria-label="Mostrar" data-filtros></div>
    </section>
    <ul class="admin-lista" data-lista aria-live="polite"></ul>`);

  const ul = el.querySelector('[data-lista]');
  const filtros = el.querySelector('[data-filtros]');

  function pintarLista() {
    const q = normalizar(estado.q);
    const visibles = lista.filter((m) => enFiltro(m) && (!q || normalizar(`${m.nick} ${m.nick_juego || ''}`).includes(q)));
    pintar(filtros, html`${FILTROS.map(([v, t]) => html`
      <button type="button" data-filtro="${v}" aria-pressed="${String(estado.filtro === v)}">${t} <span class="nota">${cuenta(v)}</span></button>`)}`);
    pintar(ul, visibles.length
      ? html`${visibles.map(fila)}`
      : html`<li class="vacio"><p>${q ? 'Nadie coincide con esa búsqueda.' : estado.filtro === 'inactivos' ? 'No hay miembros inactivos.' : estado.filtro === 'atencion' ? 'Nadie está bloqueado ni con PIN temporal.' : 'No hay miembros.'}</p></li>`);
  }
  pintarLista();

  function repintarFila(id) {
    const li = ul.querySelector(`[data-id="${CSS.escape(id)}"]`)?.closest('li');
    const m = lista.find((x) => x.id === id);
    if (!li || !m) return pintarLista();
    li.outerHTML = String(fila(m));
  }

  el.querySelector('#buscar-admin').addEventListener('input', (ev) => { estado.q = ev.target.value; pintarLista(); });
  filtros.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-filtro]');
    if (!b) return;
    estado.filtro = b.dataset.filtro;
    pintarLista();
  });
  // Recordar qué filas están abiertas para no cerrarlas al repintar.
  ul.addEventListener('toggle', (ev) => {
    const d = ev.target.closest?.('details[data-id]');
    if (!d) return;
    if (d.open) estado.abiertos.add(d.dataset.id); else estado.abiertos.delete(d.dataset.id);
  }, true);

  ul.addEventListener('click', async (ev) => {
    const copiar = ev.target.closest('[data-copiar]');
    if (copiar) {
      try { await navigator.clipboard.writeText(copiar.dataset.copiar); toast('PIN copiado.'); } catch { toast('No se pudo copiar: anótalo a mano.', { error: true }); }
      return;
    }
    const b = ev.target.closest('[data-accion]');
    if (!b || b.disabled) return;
    const id = b.closest('[data-id]').dataset.id;
    const m = lista.find((x) => x.id === id);
    const accion = b.dataset.accion;
    const textos = {
      pin: 'Toca otra vez para generar el PIN',
      rol: m.rol === 'oficial' ? `Toca otra vez: ${m.nick} deja de ser oficial` : `Toca otra vez: ${m.nick} será oficial`,
      desactivar: 'Toca otra vez para desactivar',
    };
    if (textos[accion] && !confirmar(b, textos[accion])) return;

    ocupado(b, true, 'Un momento…');
    try {
      if (accion === 'pin') {
        const r = await escribir('miembro.resetPin', { miembro_id: id }, s.token);
        Object.assign(m, { pin_temporal: true, bloqueado: false });
        estado.pines.set(id, r.pin_temporal);
        estado.abiertos.add(id);
        repintarFila(id);
        ul.querySelector(`[data-id="${CSS.escape(id)}"] [data-pin-caja]`)?.focus();
        return;
      }
      if (accion === 'rol') {
        const r = await escribir('miembro.rol', { miembro_id: id, rol: m.rol === 'oficial' ? 'miembro' : 'oficial' }, s.token);
        m.rol = r.rol;
        toast(m.rol === 'oficial' ? `${m.nick} ahora es oficial.` : `${m.nick} ya no es oficial.`);
      } else {
        const r = await escribir('miembro.estado', { miembro_id: id, estado: accion === 'activar' ? 'activo' : 'inactivo' }, s.token);
        m.estado = r.estado;
        toast(m.estado === 'activo' ? `${m.nick} volvió al gremio. Lo encuentras en "Activos".` : `${m.nick} quedó inactivo. Lo encuentras en "Inactivos".`);
        pintarLista(); // cambia de grupo: sale de la lista que se está viendo
        return;
      }
      repintarFila(id);
    } catch (e) {
      ocupado(b, false);
      const msg = manejar(e, 'No se pudo hacer el cambio. Inténtalo de nuevo.');
      if (msg) toast(msg, { error: true });
    }
  });

  return { titulo: 'Administración' };
}

// ---------------------------------------------------------------- Gremio y horarios

async function vistaGremio(el, cabeza, s, manejar, recargar) {
  pintar(el, cargando());
  let g;
  let wa = '';
  try {
    const [inicio, ses] = await Promise.all([leer('inicio'), escribir('sesion', {}, s.token)]);
    g = inicio.gremio || {};
    wa = ses?.miembro?.whatsapp_invitacion || '';
  } catch (e) {
    if (manejar(e) === null) return { titulo: 'Gremio y horarios' };
    fallo(el, e, recargar);
    return { titulo: 'Gremio y horarios' };
  }

  const offset = Number(g.zona_juego_offset_min ?? -360);
  const zonas = Array.from({ length: 27 }, (_, i) => (i - 12) * 60);
  if (!zonas.includes(offset)) zonas.push(offset);
  zonas.sort((a, b) => a - b);

  pintar(el, html`
    ${cabeza}
    <section class="seccion" aria-labelledby="t-gremio">
      <h2 class="titulo" id="t-gremio">Datos del gremio</h2>
      <form class="formulario" data-form="gremio" novalidate>
        ${campo({ nombre: 'gremio_nombre', etiqueta: 'Nombre', valor: g.gremio_nombre, attrs: { required: true, maxlength: 40 } })}
        <div class="campos-dos">
          ${campo({ nombre: 'gremio_rango', etiqueta: 'Rango', valor: g.gremio_rango, attrs: { maxlength: 10, inputmode: 'numeric' } })}
          ${campo({ nombre: 'max_miembros', etiqueta: 'Cupo de miembros', valor: g.max_miembros, attrs: { maxlength: 3, inputmode: 'numeric' } })}
        </div>
        ${campo({ nombre: 'gremio_etiqueta', etiqueta: 'Etiqueta', opcional: true, valor: g.gremio_etiqueta, ayuda: 'Como en el juego, por ejemplo “Veterans”.', attrs: { maxlength: 30 } })}
        ${campo({ nombre: 'gremio_declaracion', etiqueta: 'Declaración', opcional: true, valor: g.gremio_declaracion, attrs: { maxlength: 120 } })}
        ${campo({ nombre: 'lider_juego', etiqueta: 'Líder en el juego', opcional: true, valor: g.lider_juego, attrs: { maxlength: 32, autocapitalize: 'none', spellcheck: 'false' } })}
        ${campo({ nombre: 'whatsapp_invitacion', etiqueta: 'Enlace de invitación al WhatsApp', opcional: true, valor: wa,
          ayuda: 'https://chat.whatsapp.com/… Solo lo ven los miembros con sesión, en Mi perfil. Vacío: no se muestra.',
          tipo: 'url', attrs: { inputmode: 'url', autocapitalize: 'none', spellcheck: 'false', maxlength: 80 } })}
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--ancho">Guardar datos del gremio</button>
      </form>
    </section>

    <section class="seccion" aria-labelledby="t-horarios">
      <h2 class="titulo" id="t-horarios">Horarios y reglas</h2>
      <p class="apoyo">Escríbelos en la hora <strong class="resalta">del juego</strong>: la web los pasa a la hora de cada visitante.</p>
      <form class="formulario" data-form="horarios" novalidate>
        ${campo({ nombre: 'zona_juego_offset_min', etiqueta: 'Zona horaria del juego', tipo: 'select', valor: offset,
          opciones: zonas.map((z) => [z, zona(z)]), ayuda: 'Hoy el juego usa UTC−6. Cámbiala solo si el juego la cambia.' })}
        <fieldset class="campo campo--grupo">
          <legend class="campo__etiqueta">Guild Clash</legend>
          <div class="campos-dos">
            ${campo({ nombre: 'clash_dia', etiqueta: 'Día', tipo: 'select', valor: g.clash_dia ?? 6, opciones: DIAS.map((d, i) => [i, d]) })}
            ${campo({ nombre: 'clash_hora', etiqueta: 'Hora', tipo: 'time', valor: g.clash_hora, attrs: { required: true } })}
          </div>
          ${campo({ nombre: 'clash_duracion_min', etiqueta: 'Duración (minutos)', valor: g.clash_duracion_min, attrs: { inputmode: 'numeric', maxlength: 3 } })}
        </fieldset>
        <fieldset class="campo campo--grupo">
          <legend class="campo__etiqueta">Guild Carnival</legend>
          ${campo({ nombre: 'carnival_horas', etiqueta: 'Horas de inicio', valor: String(g.carnival_horas || '').split(',').join(', '),
            ayuda: 'Separadas por coma, por ejemplo 12:00, 18:00.', attrs: { inputmode: 'numeric', maxlength: 60, autocomplete: 'off' } })}
          ${campo({ nombre: 'carnival_duracion_min', etiqueta: 'Duración de cada sesión (minutos)', valor: g.carnival_duracion_min, attrs: { inputmode: 'numeric', maxlength: 3 } })}
        </fieldset>
        ${campo({ nombre: 'nick_cambios_semana', etiqueta: 'Cambios de nick por semana', valor: g.nick_cambios_semana ?? 2,
          ayuda: 'Cuántas veces puede cada miembro cambiar su nick en 7 días.', attrs: { inputmode: 'numeric', maxlength: 2 } })}
        <p class="nota nota--icono" data-previa-hora aria-live="polite"></p>
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--ancho">Guardar horarios y reglas</button>
      </form>
    </section>`);

  const previa = el.querySelector('[data-previa-hora]');
  const fHoras = el.querySelector('[data-form="horarios"]');
  function previaHora() {
    const { datos, errores } = validarConfig(datosDe(fHoras));
    if (errores.clash_hora || errores.clash_duracion_min || errores.zona_juego_offset_min) { previa.textContent = ''; return; }
    const cfg = cfgEventos({ ...g, ...datos });
    const p = proximoClash(new Date(), cfg);
    pintar(previa, html`${crudo(ICONOS.info)}<span>Con esto, el próximo Clash en tu hora es el <strong class="resalta">${formatoLocal(p.inicio)}</strong>.</span>`);
  }
  previaHora();
  fHoras.addEventListener('input', previaHora);
  fHoras.addEventListener('change', previaHora);

  el.querySelectorAll('form').forEach((form) => {
    activarCampos(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(form);
      const { datos, errores } = validarConfig(datosDe(form));
      if (mostrarErrores(form, errores)) return;
      const b = form.querySelector('[type=submit]');
      ocupado(b, true);
      try {
        await escribir('config.guardar', datos, s.token);
        Object.assign(g, datos);
        // El enlace de WhatsApp viaja con la sesión: se actualiza la copia de este dispositivo.
        if ('whatsapp_invitacion' in datos) actualizarMiembro({ whatsapp_invitacion: datos.whatsapp_invitacion });
        toast(form.dataset.form === 'gremio' ? 'Datos del gremio guardados.' : 'Horarios guardados. Todos los ven en su hora.');
      } catch (e) {
        const msg = manejar(e, 'No se pudo guardar. Inténtalo de nuevo.');
        if (msg) errorGeneral(form, msg);
      } finally {
        ocupado(b, false);
      }
    });
  });

  return { titulo: 'Gremio y horarios' };
}

// ---------------------------------------------------------------- Código del clan

function vistaCodigo(el, cabeza, s, manejar) {
  pintar(el, html`
    ${cabeza}
    <section class="seccion" aria-labelledby="t-codigo">
      <h2 class="titulo" id="t-codigo">Código del clan</h2>
      <p class="apoyo">Es la clave que piden para registrarse. Se guarda cifrado: nadie puede verlo, ni siquiera el admin, así que si lo olvidaste pon uno nuevo.</p>
      <form class="formulario" novalidate>
        ${campo({ nombre: 'codigo', etiqueta: 'Nuevo código', ayuda: 'Al menos 6 caracteres. Fácil de dictar, difícil de adivinar.',
          attrs: { required: true, minlength: 6, maxlength: 64, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' } })}
        ${campo({ nombre: 'codigo2', etiqueta: 'Repite el código',
          attrs: { required: true, maxlength: 64, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' } })}
        <p class="nota">Desde ese momento el código anterior deja de servir. Los que ya están registrados no se ven afectados.</p>
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--oro boton--ancho">Cambiar código</button>
      </form>
    </section>`);

  const form = el.querySelector('form');
  activarCampos(form);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    const { codigo = '', codigo2 = '' } = datosDe(form);
    const c = codigo.trim();
    const errores = {};
    if (c.length < 6) errores.codigo = 'Al menos 6 caracteres.';
    else if (c !== codigo2.trim()) errores.codigo2 = 'No coincide con el de arriba.';
    if (mostrarErrores(form, errores)) return;
    const b = form.querySelector('[type=submit]');
    ocupado(b, true);
    try {
      await escribir('config.codigoClan', { codigo: c }, s.token);
      form.reset();
      toast('Código cambiado. Compártelo solo con quien vaya a entrar al clan.', { ms: 5000 });
    } catch (e) {
      const msg = manejar(e, 'No se pudo cambiar. Inténtalo de nuevo.');
      if (msg) errorGeneral(form, msg);
    } finally {
      ocupado(b, false);
    }
  });
  return { titulo: 'Código del clan' };
}
