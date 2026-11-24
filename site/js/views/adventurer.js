/** Crear o editar un adventurer propio (build resumen, Fase 1). Ver SPEC.md §5.4 y §8. */
import { leer, escribir, ErrorApi } from '../api.js';
import { sesion, olvidarSesion, esSesionCaida } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, esc, numero } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { campo, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe } from '../ui/form.js';
import { toast } from '../ui/toast.js';
import { ARMAS, ELEMENTOS, TIPOS } from '../etiquetas.js';
import { validarAdventurer } from '../validar.js';
import { comprimir, urlImagen } from '../image.js';

const MAX_CAPTURAS = 5;
/** 16851 → "16.851" (como lo muestra el juego); vacío queda vacío. */
const miles = (v) => (v === '' || v === null || v === undefined ? '' : numero(v));

function opcionesRadio(nombre, opciones, actual, leyenda, { opcional = false } = {}) {
  return html`
    <fieldset class="campo campo--grupo" data-campo="${nombre}">
      <legend class="campo__etiqueta">${leyenda}${opcional ? html` <span class="campo__opcional">opcional</span>` : ''}</legend>
      <div class="opciones">
        ${opciones.map(([v, t]) => html`
          <label class="opcion">
            <input type="radio" name="${nombre}" value="${v}" ${String(actual ?? '') === v ? 'checked' : ''}>
            <span>${v && nombre === 'elemento' ? html`<span class="elem elem--${v}" aria-hidden="true"></span>` : ''}${t}</span>
          </label>`)}
      </div>
      <p class="campo__error" hidden></p>
    </fieldset>`;
}

export default async function vistaAdventurer(el, { params, recargar }) {
  const s = sesion();
  if (!s) {
    ir('/entrar?volver=yo');
    return { titulo: 'Adventurer' };
  }
  const editando = !!params.id;
  let a = { elemento: 'none', capturas: [] };
  if (editando) {
    pintar(el, cargando());
    try {
      const perfil = await leer('miembro', { id: s.miembro.id });
      a = (perfil.adventurers || []).find((x) => x.id === params.id);
    } catch (e) {
      fallo(el, e, recargar);
      return { titulo: 'Editar adventurer' };
    }
    if (!a) {
      pintar(el, html`<div class="vacio"><p>No encontramos ese adventurer entre los tuyos.</p><a class="boton boton--chico" href="#/yo">Volver a mi perfil</a></div>`);
      return { titulo: 'Editar adventurer' };
    }
  }
  let capturas = [...(a.capturas || [])];
  // v10: si el poder sale de una build (5 de 5), aquí solo se muestra; el backend no deja pisarlo.
  const deBuild = !!a.poder_build_id;
  const soloLectura = deBuild ? { readonly: true } : {};
  let subiendo = 0;
  const titulo = editando ? 'Editar adventurer' : 'Nuevo adventurer';

  pintar(el, html`
    ${avisoDemo()}
    <a class="volver" href="#/yo">Mi perfil</a>
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">${editando ? a.adventurer : titulo}</h1>
      <p class="apoyo">Copia los datos de la pantalla del adventurer en el juego. El <strong class="resalta">poder total</strong> del principal es el que se usa para armar las brigadas.</p>
    </header>
    <form class="formulario" novalidate>
      ${campo({ nombre: 'adventurer', etiqueta: 'Nombre del adventurer', valor: a.adventurer, ayuda: 'Como aparece en el juego.', attrs: { required: true, maxlength: 40, autocapitalize: 'words', spellcheck: 'false' } })}
      ${campo({ nombre: 'arma', etiqueta: 'Arma', tipo: 'select', valor: a.arma, opciones: [['', 'Elige el arma'], ...Object.entries(ARMAS).map(([k, v]) => [k, `${v.es} · ${v.en}`])], attrs: { required: true } })}
      ${opcionesRadio('elemento', Object.entries(ELEMENTOS).map(([k, v]) => [k, v]), a.elemento || 'none', 'Elemento')}
      ${opcionesRadio('tipo', [...Object.entries(TIPOS), ['', 'Sin indicar']], a.tipo || '', 'Tipo', { opcional: true })}
      <div class="campos-dos">
        ${campo({ nombre: 'poder_total', etiqueta: 'Poder total', valor: miles(a.poder_total), ayuda: deBuild ? 'Sale de su build más fuerte con el poder completo (5 de 5). Para cambiarlo, edita la build.' : 'Adventurer Power. Con o sin punto de miles.', attrs: { inputmode: 'numeric', required: true, maxlength: 7, autocomplete: 'off', ...soloLectura } })}
        ${campo({ nombre: 'nivel', etiqueta: 'Nivel', opcional: true, valor: a.nivel, ayuda: 'De 1 a 80.', attrs: { inputmode: 'numeric', maxlength: 2, autocomplete: 'off' } })}
      </div>
      <details class="desplegable" ${a.poder_equipo || a.poder_rostros || a.poder_camarada ? 'open' : ''}>
        <summary>Desglose del poder (opcional)</summary>
        <div class="formulario formulario--anidado">
          ${campo({ nombre: 'poder_equipo', etiqueta: 'Equipamiento · Equipment', valor: miles(a.poder_equipo), attrs: { inputmode: 'numeric', maxlength: 7, autocomplete: 'off', ...soloLectura } })}
          ${campo({ nombre: 'poder_rostros', etiqueta: 'Rostros · Visage', valor: miles(a.poder_rostros), attrs: { inputmode: 'numeric', maxlength: 7, autocomplete: 'off', ...soloLectura } })}
          ${campo({ nombre: 'poder_camarada', etiqueta: 'Camarada · Buddy', valor: miles(a.poder_camarada), attrs: { inputmode: 'numeric', maxlength: 7, autocomplete: 'off', ...soloLectura } })}
        </div>
      </details>
      ${campo({ nombre: 'loadout', etiqueta: 'Nombre del loadout', opcional: true, valor: a.loadout, ayuda: 'Como lo guardaste en el juego, por ejemplo “Fire Heavy”.', attrs: { maxlength: 40, spellcheck: 'false' } })}
      ${campo({ nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea', opcional: true, valor: a.notas, ayuda: 'Habilidades clave, set de Rostros, para qué monstruos lo usas…', attrs: { maxlength: 500, rows: 4, 'data-contador': true } })}

      <fieldset class="campo campo--grupo">
        <legend class="campo__etiqueta">Capturas <span class="campo__opcional">hasta ${MAX_CAPTURAS}</span></legend>
        <p class="campo__ayuda">Equipamiento, Rostros, Camarada, Weapon Insight… Se comprimen en tu celular antes de subir.</p>
        <ul class="capturas" data-capturas></ul>
        <label class="boton boton--chico capturas__agregar" data-agregar>
          Agregar capturas
          <input type="file" accept="image/*" multiple class="oculto-visual">
        </label>
        <p class="nota" data-estado aria-live="polite"></p>
      </fieldset>

      <p class="error-form" role="alert" hidden></p>
      <div class="formulario__acciones">
        <button type="submit" class="boton boton--oro boton--ancho">${editando ? 'Guardar cambios' : 'Guardar adventurer'}</button>
        <a class="boton boton--ancho boton--tenue" href="#/yo">Cancelar</a>
      </div>
      ${editando ? html`<button type="button" class="boton boton--ancho boton--peligro" data-eliminar>Eliminar adventurer</button>` : ''}
    </form>`);

  const form = el.querySelector('form');
  const lista = form.querySelector('[data-capturas]');
  const agregar = form.querySelector('[data-agregar]');
  const estado = form.querySelector('[data-estado]');
  const enviar = form.querySelector('[type=submit]');
  activarCampos(form);

  function pintarCapturas() {
    lista.innerHTML = capturas.map((id, i) => `
      <li class="captura">
        <img src="${esc(urlImagen(id, 400))}" alt="Captura ${i + 1}" loading="lazy" decoding="async">
        <button type="button" class="captura__quitar" data-quitar="${i}" aria-label="Quitar captura ${i + 1}">×</button>
      </li>`).join('') + Array.from({ length: subiendo }, () => '<li class="captura captura--subiendo" aria-hidden="true"><span></span></li>').join('');
    const lleno = capturas.length + subiendo >= MAX_CAPTURAS;
    agregar.hidden = lleno;
    estado.textContent = subiendo ? `Subiendo ${subiendo === 1 ? '1 captura' : `${subiendo} capturas`}…` : lleno ? 'Llegaste al máximo de capturas.' : '';
    enviar.disabled = subiendo > 0;
  }
  pintarCapturas();

  function manejar(e, porDefecto) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir('/entrar?volver=yo');
      return null;
    }
    return e instanceof ErrorApi ? e.message : (e?.message || porDefecto);
  }

  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-quitar]');
    if (!b) return;
    capturas.splice(Number(b.dataset.quitar), 1);
    pintarCapturas();
    toast('Captura quitada. Se borra al guardar.');
  });

  agregar.querySelector('input').addEventListener('change', async (ev) => {
    const archivos = [...(ev.target.files || [])].slice(0, MAX_CAPTURAS - capturas.length - subiendo);
    ev.target.value = '';
    if (!archivos.length) return;
    subiendo += archivos.length;
    pintarCapturas();
    for (const archivo of archivos) {
      try {
        const img = await comprimir(archivo, { lado: 1600 });
        const { id } = await escribir('imagen.subir', { ...img, tipo: 'captura' }, s.token);
        capturas.push(id);
      } catch (e) {
        const msg = manejar(e, 'No se pudo subir una captura.');
        if (msg === null) return;
        toast(msg, { error: true });
      } finally {
        subiendo--;
        pintarCapturas();
      }
    }
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (subiendo) return;
    limpiarErrores(form);
    const { datos, errores } = validarAdventurer(datosDe(form));
    if (mostrarErrores(form, errores)) return;
    ocupado(enviar, true);
    try {
      await escribir('adventurer.guardar', { ...(editando ? { id: a.id } : {}), ...datos, capturas }, s.token);
      toast(editando ? 'Cambios guardados.' : `${datos.adventurer} quedó en tu perfil.`);
      ir('/yo');
    } catch (e) {
      ocupado(enviar, false);
      const msg = manejar(e, 'No se pudo guardar. Inténtalo de nuevo.');
      if (msg) errorGeneral(form, msg);
    }
  });

  // Eliminar: dos toques (sin diálogos del navegador).
  const borrar = form.querySelector('[data-eliminar]');
  let armado = 0;
  borrar?.addEventListener('click', async () => {
    if (!armado) {
      borrar.textContent = 'Toca otra vez para eliminar';
      borrar.classList.add('boton--peligro-armado');
      armado = setTimeout(() => {
        armado = 0;
        borrar.textContent = 'Eliminar adventurer';
        borrar.classList.remove('boton--peligro-armado');
      }, 4000);
      return;
    }
    clearTimeout(armado);
    ocupado(borrar, true, 'Eliminando…');
    try {
      await escribir('adventurer.eliminar', { id: a.id }, s.token);
      toast(`${a.adventurer} se eliminó.`);
      ir('/yo');
    } catch (e) {
      ocupado(borrar, false);
      const msg = manejar(e, 'No se pudo eliminar. Inténtalo de nuevo.');
      if (msg) toast(msg, { error: true });
    }
  });

  return { titulo };
}
