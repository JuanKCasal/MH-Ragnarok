/**
 * Cliente de la API (Apps Script). Ver SPEC.md §6.
 * - Lecturas: GET ?accion=… con copia local (stale-while-revalidate).
 * - Escrituras: POST con cuerpo text/plain (sin preflight de CORS).
 * - Sin API_URL en config.js, la web funciona con datos de ejemplo (modo demostración).
 */
import { CONFIG } from '../config.js';

export const MODO_DEMO = !CONFIG.API_URL;

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

const PREFIJO = 'mhr:v1:';
const VIGENCIA_MS = (CONFIG.CACHE_LOCAL_MIN ?? 10) * 60_000;

function leerCache(clave) {
  try {
    const r = localStorage.getItem(PREFIJO + clave);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function guardarCache(clave, data) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* almacenamiento lleno o bloqueado: seguimos sin copia local */
  }
}

export function limpiarCache() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO)).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin acceso a localStorage */
  }
}

async function pedir(url, opciones) {
  let r;
  try {
    r = await fetch(url, opciones);
  } catch {
    throw new ErrorApi('RED', 'No hay conexión con el servidor del gremio. Revisa tu internet e inténtalo de nuevo.');
  }
  let j;
  try {
    j = await r.json();
  } catch {
    throw new ErrorApi('RESPUESTA', 'El servidor respondió algo inesperado. Inténtalo en unos minutos.');
  }
  if (!j || !j.ok) throw new ErrorApi(j?.error?.codigo || 'ERROR', j?.error?.mensaje || 'Algo falló. Inténtalo de nuevo.');
  return j.data;
}

let demo = null;
const cargarDemo = async () => (demo ??= await import('./demo-data.js'));

/**
 * @param {string} accion
 * @param {Record<string,string>} [params]
 * @param {{alRefrescar?: (data:any) => void}} [op] se llama si llega una versión más nueva que la copia local mostrada
 */
export async function leer(accion, params = {}, { alRefrescar } = {}) {
  if (MODO_DEMO) return (await cargarDemo()).leerDemo(accion, params);

  const qs = new URLSearchParams({ accion, ...params });
  const clave = qs.toString();
  const copia = leerCache(clave);
  const traer = () => pedir(`${CONFIG.API_URL}?${qs}`).then((d) => { guardarCache(clave, d); return d; });

  if (copia && Date.now() - copia.t < VIGENCIA_MS) return copia.data;
  if (copia) {
    traer().then((d) => alRefrescar?.(d)).catch(() => {});
    return copia.data;
  }
  return traer();
}

export async function escribir(accion, datos = {}, token) {
  if (MODO_DEMO) return (await cargarDemo()).escribirDemo(accion, datos);
  const d = await pedir(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, token, datos }),
  });
  limpiarCache();
  return d;
}
