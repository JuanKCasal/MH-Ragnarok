/**
 * Sesión del miembro en este dispositivo. Ver SPEC.md §7.
 * El token vive en localStorage; el backend solo guarda su hash.
 */
import { MODO_DEMO, escribir, ErrorApi } from './api.js';

const CLAVE = 'mhr:sesion';
const NIVEL = { miembro: 1, oficial: 2, admin: 3 };
/** Errores del backend que significan que el token ya no sirve (Auth.gs › requerir_). */
const SESION_CAIDA = new Set(['SIN_SESION', 'SESION_VENCIDA', 'SIN_ACCESO']);

/**
 * En modo demostración se navega como "Midori", admin de ejemplo (ve también lo de oficial). La sesión vive solo en
 * memoria: se puede cerrar y volver a entrar para probar el flujo, y se reinicia al recargar.
 */
let miembroDemo = { id: 'demo-yo', nick: 'Midori', rol: 'admin', pin_temporal: false };
let demoFuera = false;

export function sesion() {
  if (MODO_DEMO) return demoFuera ? null : { token: 'demo', miembro: miembroDemo };
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return s && s.token && s.miembro ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(token, miembro) {
  if (MODO_DEMO) {
    miembroDemo = { ...miembroDemo, ...miembro };
    demoFuera = false;
    avisar();
    return;
  }
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ token, miembro }));
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
  avisar();
}

/** Actualiza los datos del miembro guardados (tras editar el perfil), sin tocar el token. */
export function actualizarMiembro(cambios) {
  const s = sesion();
  if (s) guardarSesion(s.token, { ...s.miembro, ...cambios });
}

export function olvidarSesion() {
  if (MODO_DEMO) {
    demoFuera = true;
    avisar();
    return;
  }
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
    if (e instanceof ErrorApi && SESION_CAIDA.has(e.codigo)) olvidarSesion();
  }
}

const oyentes = new Set();
export const alCambiarSesion = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
function avisar() { oyentes.forEach((f) => f(sesion())); }

/** Cierra la sesión en el backend (si se puede) y en este dispositivo. */
export async function salir() {
  const s = sesion();
  if (s && !MODO_DEMO) await escribir('logout', {}, s.token).catch(() => {});
  olvidarSesion();
}

/** ¿El error dice que la sesión ya no vale? (para mandar a Entrar desde cualquier pantalla) */
export const esSesionCaida = (e) => e instanceof ErrorApi && SESION_CAIDA.has(e.codigo);
