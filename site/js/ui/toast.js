/** Aviso breve y no bloqueante, anunciado a lectores de pantalla. */

let el = null;
let t = null;

export function toast(mensaje, { error = false, ms = 3200 } = {}) {
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = mensaje;
  el.classList.toggle('toast--error', error);
  requestAnimationFrame(() => el.classList.add('visible'));
  clearTimeout(t);
  t = setTimeout(() => el.classList.remove('visible'), ms);
}
