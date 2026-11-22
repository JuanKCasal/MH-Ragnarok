/**
 * Cuentas regresivas: un único temporizador por segundo para todos los elementos
 * [data-hasta] de la vista. Se pausa con la pestaña oculta.
 */
import { cuentaRegresiva } from '../time.js';

let timer = null;
let alVencer = null;

function tic() {
  const ahora = Date.now();
  let vencido = false;
  document.querySelectorAll('[data-hasta]').forEach((el) => {
    const ms = Number(el.dataset.hasta) - ahora;
    if (ms <= 0) vencido = true;
    const texto = cuentaRegresiva(ms);
    if (el.textContent !== texto) el.textContent = texto;
  });
  if (vencido && alVencer) {
    const f = alVencer;
    alVencer = null;
    f();
  }
}

/** Arranca el reloj de la vista actual. onVence: se llama una vez cuando alguna cuenta llega a cero. */
export function iniciarRelojes(onVence) {
  detenerRelojes();
  alVencer = onVence || null;
  tic();
  timer = setInterval(() => { if (!document.hidden) tic(); }, 1000);
}

export function detenerRelojes() {
  if (timer) clearInterval(timer);
  timer = null;
  alVencer = null;
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) tic(); });
