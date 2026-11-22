/** Registro con el código del clan: el miembro queda activo de inmediato (SPEC.md §7 y §12.4). */
import { escribir, ErrorApi } from '../api.js';
import { sesion, guardarSesion } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar } from '../ui/dom.js';
import { avisoDemo } from '../ui/comun.js';
import { campo, campoPin, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe, CAMPO_DE_ERROR } from '../ui/form.js';
import { toast } from '../ui/toast.js';
import { errorNick, errorPin, PAISES } from '../validar.js';

export default function vistaRegistro(el, { query }) {
  if (sesion()) {
    ir('/entrar');
    return { titulo: 'Registro' };
  }
  const volver = query.volver || '';

  pintar(el, html`
    ${avisoDemo('Modo demostración: cualquier código sirve y nada se guarda. Prueba un nick como “Kaelith” para ver el aviso de nick ocupado.')}
    <section class="acceso">
      <header class="cabeza-pagina">
        <h1 class="titulo titulo--pagina">Únete al salón</h1>
        <p class="apoyo">Para miembros de Ragnarok. El código del clan está en el grupo de WhatsApp; si no lo tienes, pídeselo a un oficial.</p>
      </header>
      <form class="formulario" novalidate>
        ${campo({ nombre: 'codigo_clan', etiqueta: 'Código del clan', attrs: { autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', required: true, maxlength: 64 } })}
        ${campo({ nombre: 'nick', etiqueta: 'Tu nick en la web', ayuda: 'Con este nick entras. De 3 a 24 caracteres; puedes cambiarlo hasta 2 veces por semana.', attrs: { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, maxlength: 24 } })}
        ${campo({ nombre: 'nick_juego', etiqueta: 'Tu nombre en el juego', opcional: true, ayuda: 'Si es distinto de tu nick.', attrs: { maxlength: 32, autocapitalize: 'none', spellcheck: 'false' } })}
        ${campo({ nombre: 'pais', etiqueta: 'País', tipo: 'select', opcional: true, opciones: [['', 'Elige tu país'], ...PAISES] })}
        ${campoPin('pin', 'Elige un PIN de 6 dígitos', { nuevo: true, ayuda: 'Nada de 123456 ni números repetidos. No lo compartas: los oficiales nunca te lo van a pedir.' })}
        ${campoPin('pin2', 'Repite el PIN', { nuevo: true })}
        <p class="error-form" role="alert" hidden></p>
        <button type="submit" class="boton boton--oro boton--ancho">Registrarme</button>
      </form>
      <p class="acceso__pie">¿Ya tienes cuenta? <a href="#/entrar${volver ? `?volver=${encodeURIComponent(volver)}` : ''}">Entra aquí</a></p>
    </section>`);

  const form = el.querySelector('form');
  activarCampos(form);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    const d = datosDe(form);
    const errores = {
      codigo_clan: d.codigo_clan.trim() ? '' : 'Escribe el código del clan.',
      nick: errorNick(d.nick),
      pin: errorPin(d.pin),
      pin2: !errorPin(d.pin) && d.pin2 !== d.pin ? 'Los dos PIN no coinciden.' : '',
    };
    if (mostrarErrores(form, errores)) return;

    const boton = form.querySelector('[type=submit]');
    ocupado(boton, true, 'Registrando…');
    try {
      const r = await escribir('registro', {
        codigo_clan: d.codigo_clan.trim(), nick: d.nick.trim(), nick_juego: d.nick_juego.trim(), pais: d.pais, pin: d.pin,
      });
      guardarSesion(r.token, r.miembro);
      toast(`¡Bienvenido al gremio, ${r.miembro.nick}!`);
      ir('/yo?nuevo=1');
    } catch (e) {
      ocupado(boton, false);
      const msg = e instanceof ErrorApi ? e.message : 'No se pudo completar el registro. Inténtalo de nuevo.';
      const nombre = CAMPO_DE_ERROR[e?.codigo];
      if (!nombre || !mostrarErrores(form, { [nombre]: msg })) errorGeneral(form, msg);
    }
  });
  return { titulo: 'Registro' };
}
