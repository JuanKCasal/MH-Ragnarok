/**
 * Datos de ejemplo para ver la web sin backend (config.js sin API_URL).
 * Nombres y poderes inventados. Imita las respuestas de la API (SPEC.md §6).
 */
import { balancearEquipos } from './clash-balance.js';
import { semanaClashId } from './time.js';

const GREMIO = {
  gremio_nombre: 'Ragnarok',
  gremio_rango: '8',
  gremio_etiqueta: 'Veterans',
  gremio_declaracion: 'El inicio 28-10-26',
  lider_juego: 'wos',
  max_miembros: '52',
  clash_dia: '6',
  clash_hora: '20:15',
  clash_duracion_min: '60',
  carnival_horas: '12:00,18:00',
  carnival_duracion_min: '130',
  zona_juego_offset_min: '-360',
  nick_cambios_semana: '2',
};

const NICKS = ['Midori', 'Kaelith', 'Nyx', 'Brasa', 'Mito', 'Tormenta', 'Akane', 'Rook', 'Velka', 'Lunaris', 'Ferro',
  'Zorro', 'Ceniza', 'Halcón', 'Yara', 'Tizón', 'Quimera', 'Sable', 'Ónix', 'Runa', 'Garra', 'Ventisca', 'Bruma',
  'Escarcha', 'Fénix', 'Kato', 'Nebla', 'Ámbar', 'Trueno', 'Sombra', 'Draco', 'Ivy', 'Coral', 'Pampa', 'Tano', 'Lince',
  'Marea', 'Cobre', 'Jaguar', 'Selva', 'Ruda', 'Vito', 'Nieve', 'Azor', 'Púa', 'Corsario', 'Brisa', 'Magma', 'Orca',
  'Toro', 'Kira', 'Sauce'];
const ARMAS = ['great_sword', 'long_sword', 'dual_blades', 'hammer', 'charge_blade', 'lance', 'heavy_bowgun', 'bow'];
const ELEMENTOS = ['fire', 'water', 'thunder', 'ice', 'dragon'];
const TIPOS = ['assault', 'assault', 'disruptor', 'support'];
const PAISES = ['CL', 'CO', 'BR', 'MX', 'AR', 'PE', 'VE', 'EC'];

// PRNG determinista (mulberry32) para que el ejemplo sea siempre igual.
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const azar = prng(2026);
const MIEMBROS = NICKS.map((nick, i) => {
  const poder = i === 0 ? 16851 : Math.round(9000 + azar() * 10000);
  return {
    id: i === 0 ? 'demo-yo' : `demo-${i}`,
    nick,
    pais: PAISES[Math.floor(azar() * PAISES.length)],
    rol: i === 0 || i === 5 ? 'oficial' : 'miembro',
    adventurer: {
      arma: i === 0 ? 'heavy_bowgun' : ARMAS[Math.floor(azar() * ARMAS.length)],
      elemento: i === 0 ? 'fire' : ELEMENTOS[Math.floor(azar() * ELEMENTOS.length)],
      tipo: TIPOS[Math.floor(azar() * TIPOS.length)],
      adventurer: i === 0 ? 'Adventurer de ejemplo' : 'Adventurer',
    },
    poder,
  };
});

const semanaId = semanaClashId(new Date(), {
  offsetJuegoMin: -360,
  clash: { dia: 6, hora: '20:15', duracionMin: 60 },
  carnival: { horas: ['12:00', '18:00'], duracionMin: 130 },
});

// 44 "voy", 3 "quizá", 2 "no" y 3 sin responder.
const asistencia = new Map(MIEMBROS.map((m, i) => [m.id, i < 44 ? 'voy' : i < 47 ? 'quiza' : i < 49 ? 'no' : null]));

const ficha = (m) => ({
  miembro_id: m.id, nick: m.nick, pais: m.pais, poder: m.poder, avatar_id: '',
  adventurer: { ...m.adventurer },
});

function armar() {
  const van = MIEMBROS.filter((m) => asistencia.get(m.id) === 'voy');
  const r = balancearEquipos(van.map((m) => ({ id: m.id, poder: m.poder })));
  return r.equipos.map((e) => e.jugadores.map((j) => ({ miembro_id: j.id, fijado: false })));
}

let equipos = armar();
let estado = 'armada';

function respuestaClash() {
  const porId = Object.fromEntries(MIEMBROS.map((m) => [m.id, m]));
  return {
    semana: { id: semanaId, estado, tam_equipo: 4, publicado_en: new Date().toISOString(), puesto: '', puntos: '', notas: '' },
    asistencia: MIEMBROS.filter((m) => asistencia.get(m.id)).map((m) => ({ ...ficha(m), respuesta: asistencia.get(m.id) })),
    equipos: equipos.map((eq, i) => {
      const jugadores = eq.map((j) => ({ ...ficha(porId[j.miembro_id]), fijado: !!j.fijado }));
      return { numero: i + 1, jugadores, suma: jugadores.reduce((t, j) => t + j.poder, 0) };
    }),
  };
}

const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString();
const NOTICIAS = [
  { id: 'n1', tipo: 'gremio', titulo: 'Las brigadas del Clash ahora se arman en la web', resumen: 'Confirma tu asistencia antes del sábado y los oficiales reparten 2 fuertes + 2 normales por brigada.', fecha_pub: hace(0), fijada: true },
  { id: 'n2', tipo: 'evento', titulo: 'Puesto 29 en el último Clash: vamos por el top 20', resumen: 'Cuatro rondas por brigada; cada victoria suma.', fecha_pub: hace(1), fijada: false },
  { id: 'n3', tipo: 'juego', titulo: 'Cómo armar tus Rostros con costo 12', resumen: '1 carta núcleo + 4 de monstruo, sin pasarte del costo.', fecha_pub: hace(3), fijada: false },
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function leerDemo(accion, params = {}) {
  await espera(120);
  switch (accion) {
    case 'inicio':
      return {
        gremio: { ...GREMIO },
        miembros: MIEMBROS.length,
        noticias: NOTICIAS.slice(0, 3),
        clash: { semana_id: semanaId, estado, confirmados: [...asistencia.values()].filter((r) => r === 'voy').length },
      };
    case 'clash':
      return respuestaClash();
    case 'clash_historial':
      return [{ id: '2026-11-21', estado: 'cerrada', puesto: 29, puntos: 18240, notas: '' }];
    case 'miembro': {
      const m = MIEMBROS.find((x) => x.id === params.id);
      if (!m) throw Object.assign(new Error('Miembro no encontrado.'), { codigo: 'NO_EXISTE' });
      return { id: m.id, nick: m.nick, pais: m.pais, rol: m.rol, adventurers: [{ id: `${m.id}-a`, ...m.adventurer, poder_total: m.poder }] };
    }
    default:
      return null;
  }
}

export async function escribirDemo(accion, datos = {}) {
  await espera(250);
  switch (accion) {
    case 'clash.asistencia':
      asistencia.set('demo-yo', datos.respuesta);
      if (datos.respuesta !== 'voy') equipos = equipos.map((eq) => eq.filter((j) => j.miembro_id !== 'demo-yo')).filter((eq) => eq.length);
      return { semana_id: semanaId, respuesta: datos.respuesta, poder: MIEMBROS[0].poder };
    case 'clash.guardarEquipos':
      equipos = datos.equipos.map((eq) => eq.map((j) => ({ miembro_id: j.miembro_id, fijado: !!j.fijado })));
      estado = 'armada';
      return respuestaClash();
    default:
      return null;
  }
}
