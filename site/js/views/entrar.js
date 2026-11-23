/** Entrar con nick + PIN. Ver SPEC.md §7. */
import { escribir, MODO_DEMO, ErrorApi } from '../api.js';
import { sesion, guardarSesion, salir } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar } from '../ui/dom.js';
import { avisoDemo } from '../ui/comun.js';
import { campo, campoPin, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe } from '../ui/form.js';
import { toast } from '../ui/toast.js';

/** Solo rutas internas sencillas ("eventos", "clash/armar", "editor?tipo=guia"): nada de URLs externas. */
export function destino(volver) {
  const v = String(volver || '').replace(/^\/+/, '');
  return /^[a-z][a-z0-9/-]{0,60}(\?[a-z]+=[a-z0-9-]{1,40})?$/.test(v) ? `/${v}` : '/';
}

export default function vistaEntrar(el, { query }) {
  const s = sesion();
  const volver = query.volver || '';

  if (s) {
    pintar(el, html`
      <section class="acceso">
        <h1 class="titulo titulo--pagina">Ya estás dentro</h1>
        <p class="apoyo">Entraste como <strong class="resalta">${s.miembro.nick}</strong>.</p>
        <a class="boton boton--oro boton--ancho" href="#${destino(volver || 'yo')}">${volver ? 'Continuar' : 'Ir a mi perfil'}</a>
        <button type="button" class="boton boton--ancho" data-salir>Cerrar sesión</button>
      </section>`);
    el.querySelector('[data-salir]').addEventListener('click', async () => {
      await salir();
      toast('Cerraste sesión.');
    });
    return { titulo: 'Entrar' };
  }

  pintar(el, html`
    ${avisoDemo('Modo demostración: cualquier nick y cualquier PIN de 6 dígitos te dejan entrar como “Midori”, admin de prueba.')}
    <section class="acceso">
      <header class="cabeza-pagina">
        <h1 class="titulo titulo--pagina">Entrar</h1>
        <p class="apoyo">Con tu nick del gremio y tu PIN de 6 dígitos.</p>
      </header>
      <form class="formulario" novalidate>
        ${campo({ nombre: 'nick', etiqueta: 'Nick', attrs: { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, maxlength: 24, autofocus: !matchMedia('(pointer: coarse)').matches } })}
        ${campoPin('pin', 'PIN')}
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--oro boton--ancho">Entrar</button>
      </form>
      <p class="acceso__pie">¿Aún no tienes cuenta? <a href="#/registro${volver ? `?volver=${encodeURIComponent(volver)}` : ''}">Regístrate con el código del clan</a></p>
      <p class="nota">¿Olvidaste tu PIN? Pídele a un oficial que lo resetee: te dará un PIN temporal y al entrar eliges uno nuevo.</p>
    </section>`);

  const form = el.querySelector('form');
  activarCampos(form);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    const d = datosDe(form);
    const errores = {
      nick: d.nick.trim() ? '' : 'Escribe tu nick.',
      pin: /^\d{6}$/.test(d.pin) ? '' : 'El PIN son exactamente 6 dígitos.',
    };
    if (mostrarErrores(form, errores)) return;

    const boton = form.querySelector('[type=submit]');
    ocupado(boton, true, 'Entrando…');
    try {
      const r = await escribir('login', { nick: d.nick.trim(), pin: d.pin });
      guardarSesion(r.token, r.miembro);
      if (r.miembro.pin_temporal) {
        toast('Tu PIN es temporal: elige uno nuevo para seguir.');
        ir('/yo?pin=1');
      } else {
        toast(`Bienvenido de vuelta, ${r.miembro.nick}.`);
        ir(destino(volver || (MODO_DEMO ? 'yo' : '')));
      }
    } catch (e) {
      ocupado(boton, false);
      const msg = e instanceof ErrorApi ? e.message : 'No se pudo entrar. Inténtalo de nuevo.';
      errorGeneral(form, msg);
      if (e?.codigo === 'LOGIN_INVALIDO') {
        form.querySelector('[name=pin]').value = '';
        form.querySelector('[name=pin]').focus();
      }
    }
  });
  return { titulo: 'Entrar' };
}
