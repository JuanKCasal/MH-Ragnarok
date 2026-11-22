/**
 * Hash router (#/ruta): GitHub Pages no reescribe rutas de una SPA. Ver SPEC.md §2.
 * Cada vista es un módulo con `export default async function (el, ctx)` que pinta en `el`
 * y puede devolver { titulo, limpiar }.
 */
import { detenerRelojes } from './ui/reloj.js';

const rutas = [];
let contenedor = null;
let limpiarActual = null;
let alNavegar = () => {};
let turno = 0;

/**
 * @param {string} patron   p. ej. '/', '/eventos', '/noticias/:id'
 * @param {() => Promise<{default: Function}>} cargar
 * @param {{seccion?: string}} [op] sección de la barra que queda marcada
 */
export function ruta(patron, cargar, op = {}) {
  const claves = [];
  const re = new RegExp('^' + patron.replace(/\/:([a-z_]+)/gi, (_, k) => { claves.push(k); return '/([^/]+)'; }) + '/?$');
  rutas.push({ re, claves, cargar, seccion: op.seccion ?? null });
}

export function rutaActual() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [camino, consulta = ''] = h.split('?');
  return { camino: camino.startsWith('/') ? camino : `/${camino}`, query: Object.fromEntries(new URLSearchParams(consulta)) };
}

export const ir = (camino) => { location.hash = `#${camino}`; };

export async function resolver({ conservarScroll = false } = {}) {
  const yo = ++turno;
  const { camino, query } = rutaActual();
  let r = null;
  let params = {};
  for (const x of rutas) {
    const m = camino.match(x.re);
    if (m) {
      r = x;
      x.claves.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      break;
    }
  }
  if (!r) r = rutas.find((x) => x.re.test('/404'));

  detenerRelojes();
  if (limpiarActual) { try { limpiarActual(); } catch { /* nada */ } limpiarActual = null; }
  alNavegar(r?.seccion ?? null);

  const mod = await r.cargar();
  if (yo !== turno) return; // el usuario ya navegó a otra parte

  contenedor.classList.remove('vista--entra');
  void contenedor.offsetWidth; // reinicia la animación de entrada
  contenedor.classList.add('vista--entra');
  if (!conservarScroll) window.scrollTo(0, 0);

  const res = (await mod.default(contenedor, { params, query, recargar: () => resolver({ conservarScroll: true }) })) || {};
  if (yo !== turno) return;
  limpiarActual = res.limpiar || null;
  document.title = res.titulo ? `${res.titulo} · Ragnarok` : 'Ragnarok · Gremio de Monster Hunter Outlanders';
  if (!conservarScroll) contenedor.focus({ preventScroll: true });
}

export function iniciarRouter(el, { onNavegar } = {}) {
  contenedor = el;
  if (onNavegar) alNavegar = onNavegar;
  window.addEventListener('hashchange', () => resolver());
  resolver();
}
