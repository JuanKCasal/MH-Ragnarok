/** Íconos de línea propios (trazo 1,8, 24×24) y el emblema del gremio. */

const linea = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const ICONOS = {
  inicio: linea('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  noticias: linea('<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
  guias: linea('<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>'),
  miembros: linea('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.8 0 5 2 5 5"/>'),
  eventos: linea('<path d="M5 4l14 16M19 4L5 20"/><path d="M4 7l3-3M17 20l3-3M20 7l-3-3M7 20l-3-3"/>'),
  info: linea('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  fijar: linea('<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/>'),
  whatsapp: linea('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 2 1-.6 1.6c-3.4.4-7.7-3.9-7.3-7.3L10.2 7l1 2z"/>'),
};

let n = 0;
/** Emblema propio: escudo con alas y cuernos + "R". Sin arte de Capcom. */
export function emblema({ titulo = 'Emblema del gremio Ragnarok', decorativo = false } = {}) {
  const id = `oroEmb${++n}`;
  const a11y = decorativo ? 'aria-hidden="true"' : `role="img" aria-label="${titulo}"`;
  return `<svg viewBox="0 0 120 120" ${a11y}>
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#8f6420"/></linearGradient></defs>
  <g fill="none" stroke="url(#${id})" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 30 C4 24 2 12 4 4 C10 14 18 18 30 20" stroke-width="5"/>
    <path d="M106 30 C116 24 118 12 116 4 C110 14 102 18 90 20" stroke-width="5"/>
    <path d="M60 14 L94 26 V58 C94 82 79 98 60 108 C41 98 26 82 26 58 V26 Z" fill="rgba(0,0,0,.25)" stroke-width="5"/>
    <path d="M26 40 C14 44 8 56 6 70 C14 62 20 60 27 62" stroke-width="5"/>
    <path d="M94 40 C106 44 112 56 114 70 C106 62 100 60 93 62" stroke-width="5"/>
    <path d="M48 40 V84 M48 40 H63 C73 40 77 46 77 52 C77 59 72 64 63 64 H48 M61 64 L77 84" stroke-width="7"/>
  </g>
</svg>`;
}
