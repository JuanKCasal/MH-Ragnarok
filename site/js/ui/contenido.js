/** Piezas compartidas por Noticias y Guías: fechas, anclas, compartir y portada. */
import { html } from './dom.js';
import { toast } from './toast.js';
import { urlImagen } from '../image.js';

const DIA = 864e5;
const FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
const FECHA_LARGA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

const valida = (iso) => { const f = new Date(iso); return Number.isNaN(f.getTime()) ? null : f; };

/** "hace 3 h", "ayer", "hace 4 días" o "22 nov 2026". */
export function fechaRelativa(iso, ahora = new Date()) {
  const f = valida(iso);
  if (!f) return '';
  const ms = ahora - f;
  if (ms < 60 * 60e3) return 'hace un rato';
  if (ms < DIA && f.getDate() === ahora.getDate()) return `hace ${Math.floor(ms / 36e5)} h`;
  const dias = Math.round((new Date(ahora).setHours(0, 0, 0, 0) - new Date(f).setHours(0, 0, 0, 0)) / DIA);
  if (dias <= 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return FECHA.format(f).replace('.', '');
}

export const fechaLarga = (iso) => { const f = valida(iso); return f ? FECHA_LARGA.format(f) : ''; };

export const tiempo = (iso, texto) => html`<time datetime="${iso}">${texto}</time>`;

/**
 * Las anclas (#seccion) no pueden usar el hash: el router lo usa para las páginas.
 * Este manejador hace el salto con scrollIntoView y deja la dirección como está.
 */
export function activarAnclas(el) {
  el.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-ancla]');
    if (!a) return;
    const destino = document.getElementById(a.dataset.ancla);
    if (!destino) return;
    ev.preventDefault();
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
    destino.setAttribute('tabindex', '-1');
    destino.focus({ preventScroll: true });
  });
}

/** Compartir por el menú del teléfono (WhatsApp, etc.) o copiar el enlace. */
export async function compartir(titulo, url = location.href) {
  if (navigator.share) {
    try { await navigator.share({ title: titulo, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado. Pégalo en el grupo.');
  } catch {
    toast('No se pudo copiar el enlace.', { error: true });
  }
}

export function portada(id, alt = '') {
  const src = urlImagen(id, 1200);
  return src ? html`<img class="portada" src="${src}" alt="${alt}" loading="lazy" decoding="async">` : '';
}
