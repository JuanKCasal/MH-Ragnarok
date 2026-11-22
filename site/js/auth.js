/**
 * Sesión del miembro en este dispositivo. Ver SPEC.md §7.
 * El token vive en localStorage; el backend solo guarda su hash.
 */
import { MODO_DEMO, escribir, ErrorApi } from './api.js';

const CLAVE = 'mhr:sesion';
const NIVEL = { miembro: 1, oficial: 2, admin: 3 };

/** En modo demostración se navega como "Midori", oficial de ejemplo. */
const SESION_DEMO = Object.freeze({ token: 'demo', miembro: { id: 'demo-yo', nick: 'Midori', rol: 'oficial' } });

export function sesion() {
  if (MODO_DEMO) return SESION_DEMO;
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return s && s.token && s.miembro ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(token, miembro) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ token, miembro }));
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
  avisar();
}

export function olvidarSesion() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  avisar();
}

export function tieneRol(minimo) {
  const s = sesion();
  return !!s && (NIVEL[s.miembro.rol] || 0) >= (NIVEL[minimo] || 99);
}

/** Revalida el token con el backend (extiende su vencimiento). Si venció, lo olvida. */
export async function revalidar() {
  const s = sesion();
  if (!s || MODO_DEMO) return;
  try {
    const { miembro } = await escribir('sesion', {}, s.token);
    guardarSesion(s.token, miembro);
  } catch (e) {
    if (e instanceof ErrorApi && e.codigo === 'SIN_SESION') olvidarSesion();
  }
}

const oyentes = new Set();
export const alCambiarSesion = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
function avisar() { oyentes.forEach((f) => f(sesion())); }
