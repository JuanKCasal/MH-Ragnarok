/** Campos de formulario y manejo de errores, compartidos por Entrar, Registro, Mi perfil y Adventurer. */
import { html, esc, crudo } from './dom.js';

let n = 0;

function atributos(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

/**
 * @param {object} c
 * @param {string} c.nombre               name del control (y clave de error)
 * @param {string} c.etiqueta
 * @param {'text'|'password'|'number'|'select'|'textarea'} [c.tipo]
 * @param {string|number} [c.valor]
 * @param {boolean} [c.opcional]
 * @param {string} [c.ayuda]
 * @param {[string,string][]} [c.opciones] para select: [valor, texto]
 * @param {Record<string, any>} [c.attrs]
 * @param {string} [c.clase] clase extra del control
 * @param {boolean} [c.verPin] agrega el botón "Ver" (campos de PIN)
 */
export function campo(c) {
  const id = `c-${c.nombre}-${++n}`;
  const desc = [c.ayuda ? `${id}-ayuda` : '', `${id}-error`].filter(Boolean).join(' ');
  const base = { id, name: c.nombre, 'aria-describedby': desc, ...c.attrs };
  const clase = `entrada ${c.clase || ''}`.trim();
  let control;
  if (c.tipo === 'select') {
    control = `<select class="${clase}"${atributos(base)}>${(c.opciones || [])
      .map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(c.valor ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  } else if (c.tipo === 'textarea') {
    control = `<textarea class="${clase}"${atributos(base)}>${esc(c.valor ?? '')}</textarea>`;
  } else {
    control = `<input class="${clase}" type="${c.tipo || 'text'}" value="${esc(c.valor ?? '')}"${atributos(base)}>`;
  }
  return html`
    <div class="campo" data-campo="${c.nombre}">
      <label class="campo__etiqueta" for="${id}">${c.etiqueta}${c.opcional ? html` <span class="campo__opcional">opcional</span>` : ''}</label>
      ${c.verPin
        ? html`<div class="campo__fila">${crudo(control)}<button type="button" class="campo__ver" data-ver-pin aria-controls="${id}" aria-pressed="false">Ver</button></div>`
        : crudo(control)}
      ${c.ayuda ? html`<p class="campo__ayuda" id="${id}-ayuda">${c.ayuda}</p>` : ''}
      <p class="campo__error" id="${id}-error" hidden></p>
    </div>`;
}

/** Campo de PIN de 6 dígitos. `nuevo` cambia el autocompletado (para que el gestor de contraseñas lo guarde). */
export const campoPin = (nombre, etiqueta, { nuevo = false, ayuda } = {}) => campo({
  nombre, etiqueta, tipo: 'password', ayuda, verPin: true, clase: 'entrada--pin',
  attrs: { inputmode: 'numeric', pattern: '\\d{6}', autocomplete: nuevo ? 'new-password' : 'current-password', required: true, spellcheck: 'false' },
});

/** Conecta los botones "Ver"/"Ocultar" de los PIN y los contadores de caracteres. */
export function activarCampos(raiz) {
  raiz.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ver-pin]');
    if (!b) return;
    const input = raiz.querySelector(`#${CSS.escape(b.getAttribute('aria-controls'))}`);
    const ver = input.type === 'password';
    input.type = ver ? 'text' : 'password';
    b.textContent = ver ? 'Ocultar' : 'Ver';
    b.setAttribute('aria-pressed', String(ver));
  });
  // Los PIN solo aceptan dígitos (pegar "12 34 56" también sirve).
  raiz.querySelectorAll('.entrada--pin').forEach((i) => i.addEventListener('input', () => {
    const d = i.value.replace(/\D/g, '').slice(0, 6);
    if (d !== i.value) i.value = d;
  }));
  raiz.querySelectorAll('[maxlength][data-contador]').forEach((i) => {
    const p = document.createElement('p');
    p.className = 'campo__contador';
    p.setAttribute('aria-hidden', 'true');
    i.closest('.campo').querySelector('.campo__error').before(p);
    const act = () => { p.textContent = `${i.value.length}/${i.maxLength}`; };
    i.addEventListener('input', act);
    act();
  });
  // Al corregir un campo se borra su error.
  raiz.addEventListener('input', (ev) => {
    const c = ev.target.closest?.('.campo');
    if (c) marcar(c, '');
  });
}

function marcar(c, msg) {
  const p = c.querySelector('.campo__error');
  const ctrl = c.querySelector('input, select, textarea');
  if (p) {
    p.textContent = msg;
    p.hidden = !msg;
  }
  if (ctrl) {
    if (msg) ctrl.setAttribute('aria-invalid', 'true');
    else ctrl.removeAttribute('aria-invalid');
  }
}

/** Muestra errores por campo ({nombre: mensaje}) y lleva el foco al primero. Devuelve true si hubo errores. */
export function mostrarErrores(form, errores) {
  let primero = null;
  for (const [nombre, msg] of Object.entries(errores)) {
    const c = form.querySelector(`[data-campo="${CSS.escape(nombre)}"]`);
    if (!c || !msg) continue;
    marcar(c, msg);
    primero ??= c.querySelector('input, select, textarea');
  }
  primero?.focus();
  return !!primero;
}

export function limpiarErrores(form) {
  form.querySelectorAll('.campo').forEach((c) => marcar(c, ''));
  errorGeneral(form, '');
}

/** Error que no es de un campo (red, bloqueo…). Necesita un <p class="error-form" role="alert"> en el form. */
export function errorGeneral(form, msg) {
  const p = form.querySelector('.error-form');
  if (!p) return;
  p.textContent = msg;
  p.hidden = !msg;
}

/** Botón en estado "trabajando" (deshabilitado y con texto de espera). */
export function ocupado(boton, si, texto = 'Guardando…') {
  if (!boton) return;
  if (si) {
    boton.dataset.texto ??= boton.textContent;
    boton.textContent = texto;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
  } else {
    if (boton.dataset.texto) boton.textContent = boton.dataset.texto;
    delete boton.dataset.texto;
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
  }
}

/** Códigos de error del backend que corresponden a un campo concreto. */
export const CAMPO_DE_ERROR = {
  NICK_FORMATO: 'nick', NICK_OCUPADO: 'nick', NICK_LIMITE: 'nick',
  PIN_FORMATO: 'pin', PIN_DEBIL: 'pin', PIN_INVALIDO: 'pin_actual',
  CODIGO_INVALIDO: 'codigo_clan',
};

export const datosDe = (form) => Object.fromEntries(new FormData(form).entries());
