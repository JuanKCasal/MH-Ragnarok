/**
 * Horarios de eventos (MH-Ragnarok). Módulo puro, ver SPEC.md §9.
 * El juego usa una hora fija UTC−6; la web muestra todo en la zona del visitante.
 */

export const CONFIG_EVENTOS = {
  offsetJuegoMin: -360,                  // UTC−6
  clash: { dia: 6, hora: '20:15', duracionMin: 60 },   // sábado (0 = domingo)
  carnival: { horas: ['12:00', '18:00'], duracionMin: 130 },
};

const MIN = 60_000;
const DIA = 24 * 60 * MIN;

function hm(s) {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
}

/** "Fecha de pared" del juego: un Date cuyo valor UTC representa la hora local del juego. */
function aJuego(fecha, offsetMin) { return new Date(fecha.getTime() + offsetMin * MIN); }
function desdeJuego(fechaJuego, offsetMin) { return new Date(fechaJuego.getTime() - offsetMin * MIN); }
function medianocheJuego(fechaJuego) {
  return new Date(Date.UTC(fechaJuego.getUTCFullYear(), fechaJuego.getUTCMonth(), fechaJuego.getUTCDate()));
}

/**
 * Próxima ocurrencia (o la que está en curso) de un evento semanal o diario.
 * @returns {{inicio: Date, fin: Date, enCurso: boolean}}
 */
export function proximoClash(ahora = new Date(), cfg = CONFIG_EVENTOS) {
  const { dia, hora, duracionMin } = cfg.clash;
  const j = aJuego(ahora, cfg.offsetJuegoMin);
  const base = medianocheJuego(j);
  const delta = (dia - base.getUTCDay() + 7) % 7;
  for (const semanas of [-1, 0, 1]) {
    const inicioJ = new Date(base.getTime() + (delta + semanas * 7) * DIA + hm(hora) * MIN);
    const inicio = desdeJuego(inicioJ, cfg.offsetJuegoMin);
    const fin = new Date(inicio.getTime() + duracionMin * MIN);
    if (fin > ahora) return { inicio, fin, enCurso: inicio <= ahora };
  }
  throw new Error('No se pudo calcular el Clash');
}

export function proximoCarnival(ahora = new Date(), cfg = CONFIG_EVENTOS) {
  const { horas, duracionMin } = cfg.carnival;
  const base = medianocheJuego(aJuego(ahora, cfg.offsetJuegoMin));
  const candidatos = [];
  for (const d of [-1, 0, 1]) {
    for (const h of horas) {
      const inicio = desdeJuego(new Date(base.getTime() + d * DIA + hm(h) * MIN), cfg.offsetJuegoMin);
      candidatos.push({ inicio, fin: new Date(inicio.getTime() + duracionMin * MIN) });
    }
  }
  candidatos.sort((a, b) => a.inicio - b.inicio);
  const e = candidatos.find((c) => c.fin > ahora);
  return { ...e, enCurso: e.inicio <= ahora };
}

/**
 * ID de la semana de Clash vigente: fecha (AAAA-MM-DD) del sábado del próximo Clash
 * o del que está en curso, en hora del juego. Cambia cuando termina el Clash.
 */
export function semanaClashId(ahora = new Date(), cfg = CONFIG_EVENTOS) {
  const { inicio } = proximoClash(ahora, cfg);
  return aJuego(inicio, cfg.offsetJuegoMin).toISOString().slice(0, 10);
}

/** "2 d 4 h", "3 h 12 min", "12:05" (bajo 1 hora, mm:ss). */
export function cuentaRegresiva(ms) {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m}:${String(seg).padStart(2, '0')}`;
}

/** "sáb 28 nov · 23:15" en la zona del visitante (o en la que se indique). */
export function formatoLocal(fecha, { timeZone, locale = 'es' } = {}) {
  const f = new Intl.DateTimeFormat(locale, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  }).formatToParts(fecha);
  const p = Object.fromEntries(f.map((x) => [x.type, x.value]));
  return `${p.weekday.replace('.', '')} ${p.day} ${p.month.replace('.', '')} · ${p.hour}:${p.minute}`;
}
