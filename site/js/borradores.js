/**
 * Copia local de lo que un oficial está escribiendo en el editor, por si cierra la pestaña,
 * toca "atrás" o se le corta la sesión. Vive solo en este dispositivo (localStorage).
 */
const PREFIJO = 'mhr:borrador:';
const VIGENCIA_MS = 30 * 864e5;

const clave = (tipo, id) => `${PREFIJO}${tipo}:${id || 'nuevo'}`;

/** @returns {{t: number, datos: Record<string, string>} | null} */
export function leerBorrador(tipo, id) {
  try {
    const b = JSON.parse(localStorage.getItem(clave(tipo, id)) || 'null');
    if (b && b.datos && Date.now() - b.t < VIGENCIA_MS) return b;
    if (b) localStorage.removeItem(clave(tipo, id));
  } catch { /* sin almacenamiento */ }
  return null;
}

export function guardarBorrador(tipo, id, datos) {
  try { localStorage.setItem(clave(tipo, id), JSON.stringify({ t: Date.now(), datos })); } catch { /* lleno o bloqueado */ }
}

export function borrarBorrador(tipo, id) {
  try { localStorage.removeItem(clave(tipo, id)); } catch { /* nada */ }
}

/** Qué hay a medio escribir en este dispositivo: una nueva y/o cambios en existentes. */
export function borradoresLocales(tipo) {
  const ids = new Set();
  let nuevo = false;
  try {
    const p = `${PREFIJO}${tipo}:`;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(p)) continue;
      const id = k.slice(p.length);
      if (!leerBorrador(tipo, id === 'nuevo' ? '' : id)) continue;
      if (id === 'nuevo') nuevo = true; else ids.add(id);
    }
  } catch { /* sin almacenamiento */ }
  return { nuevo, ids };
}
