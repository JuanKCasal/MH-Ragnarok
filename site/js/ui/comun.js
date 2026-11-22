/** Piezas comunes de las vistas. */
import { html, crudo } from './dom.js';
import { ICONOS } from './iconos.js';
import { MODO_DEMO } from '../api.js';
import { CONFIG_EVENTOS } from '../time.js';

export function avisoDemo(texto = 'Datos de ejemplo: la web aún no está conectada al backend del gremio. Navegas como oficial de prueba y nada se guarda al recargar.') {
  if (!MODO_DEMO) return '';
  return html`<p class="aviso">${crudo(ICONOS.info)}<span>${texto}</span></p>`;
}

export const cargando = () => html`<div class="cargando" aria-busy="true" aria-label="Cargando"><span></span><span></span><span></span></div>`;

export function fallo(el, error, reintentar) {
  el.innerHTML = String(html`
    <div class="fallo" role="alert">
      <strong>No pudimos cargar esta sección.</strong>
      <p>${error?.message || 'Algo falló.'}</p>
      <button type="button" class="boton boton--chico" data-reintentar>Reintentar</button>
    </div>`);
  el.querySelector('[data-reintentar]')?.addEventListener('click', reintentar);
}

/** Configuración de horarios a partir de la hoja Config del gremio (con los valores por defecto de time.js). */
export function cfgEventos(g = {}) {
  const def = CONFIG_EVENTOS;
  const n = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
  return {
    offsetJuegoMin: n(g.zona_juego_offset_min, def.offsetJuegoMin),
    clash: {
      dia: n(g.clash_dia, def.clash.dia),
      hora: g.clash_hora || def.clash.hora,
      duracionMin: n(g.clash_duracion_min, def.clash.duracionMin),
    },
    carnival: {
      horas: g.carnival_horas ? String(g.carnival_horas).split(',').map((s) => s.trim()).filter(Boolean) : def.carnival.horas,
      duracionMin: n(g.carnival_duracion_min, def.carnival.duracionMin),
    },
  };
}

const HORA = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });
export const horaLocal = (fecha) => HORA.format(fecha);

/** "28 nov" en la zona del visitante. */
export const diaMes = (fecha) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(fecha).replace('.', '');

/** "28 nov" de un ID de semana (AAAA-MM-DD, fecha del juego). */
export function fechaSemana(id) {
  const [a, m, d] = String(id).split('-').map(Number);
  if (!a) return '';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, d))).replace('.', '');
}

/** Duración legible: 130 → "2 h 10 min". */
export function duracion(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min';
}
