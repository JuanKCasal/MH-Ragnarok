/**
 * Datos de ejemplo para ver la web sin backend (config.js sin API_URL).
 * Nombres y poderes inventados. Imita las respuestas de la API (SPEC.md §6).
 */
import { balancearEquipos } from './clash-balance.js';
import { semanaClashId } from './time.js';
import { ErrorApi } from './api.js';
import { errorNick, errorPin, NICK_RE } from './validar.js';

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

// ---------- Tu perfil de ejemplo ("Midori") ----------

const YO = {
  id: 'demo-yo', nick: 'Midori', nick_juego: 'Midori', uid_juego: '', pais: 'CL', rol: 'oficial',
  bio: 'Ballesta pesada de fuego. Si el monstruo arde, fui yo.', avatar_id: '', adventurer_principal_id: 'demo-yo-a', creado: hace(25),
};
let advsYo = [
  { id: 'demo-yo-a', miembro_id: 'demo-yo', adventurer: 'Personaje de ejemplo', arma: 'heavy_bowgun', elemento: 'fire', tipo: 'assault',
    nivel: 70, poder_total: 16851, poder_equipo: 6736, poder_rostros: 2099, poder_camarada: 1998, loadout: 'Fire Heavy', notas: '', capturas: [], actualizado: hace(2) },
  { id: 'demo-yo-b', miembro_id: 'demo-yo', adventurer: 'Segundo personaje', arma: 'long_sword', elemento: 'thunder', tipo: 'disruptor',
    nivel: 55, poder_total: 12040, poder_equipo: '', poder_rostros: '', poder_camarada: '', loadout: 'Trueno', notas: '', capturas: [], actualizado: hace(6) },
];
let cambiosNick = 0;
let idDemo = 0;

const falla = (codigo, mensaje) => { throw new ErrorApi(codigo, mensaje); };
const privado = () => ({ ...YO, pin_temporal: false, whatsapp_invitacion: '', nick_cambios_restantes: Math.max(0, 2 - cambiosNick) });

/** Mantiene a Midori al día en el directorio y en el Clash de ejemplo. */
function sincronizar() {
  const m = MIEMBROS[0];
  m.nick = YO.nick;
  m.pais = YO.pais;
  const p = advsYo.find((a) => a.id === YO.adventurer_principal_id);
  if (p) {
    m.poder = p.poder_total;
    m.adventurer = { arma: p.arma, elemento: p.elemento, tipo: p.tipo, adventurer: p.adventurer };
  }
}

const nickOcupado = (nick) => MIEMBROS.slice(1).some((m) => m.nick.toLowerCase() === nick.trim().toLowerCase());

function numeroDemo(v, min, max, campo, opcional) {
  if (v === '' || v === null || v === undefined) return opcional ? '' : falla('DATO_INVALIDO', `Indica el ${campo}.`);
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) falla('DATO_INVALIDO', `El ${campo} debe estar entre ${min} y ${max}.`);
  return Math.round(n);
}

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
      if (params.id === 'demo-yo') {
        return { ...YO, adventurers: advsYo.map((a) => ({ ...a, capturas: [...a.capturas] })).sort((a, b) => b.poder_total - a.poder_total) };
      }
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
    case 'login':
      if (!String(datos.nick || '').trim() || !/^\d{6}$/.test(String(datos.pin || ''))) falla('LOGIN_INVALIDO', 'Nick o PIN incorrectos.');
      return { token: 'demo', miembro: privado() };
    case 'registro': {
      if (!String(datos.codigo_clan || '').trim()) falla('CODIGO_INVALIDO', 'El código del clan no es correcto.');
      if (errorNick(datos.nick)) falla('NICK_FORMATO', errorNick(datos.nick));
      if (nickOcupado(datos.nick)) falla('NICK_OCUPADO', 'Ese nick ya está registrado.');
      if (errorPin(datos.pin)) falla('PIN_DEBIL', errorPin(datos.pin));
      Object.assign(YO, { nick: datos.nick.trim(), nick_juego: (datos.nick_juego || '').trim() || datos.nick.trim(), pais: datos.pais || '', bio: '', avatar_id: '', adventurer_principal_id: '' });
      advsYo = [];
      cambiosNick = 0;
      sincronizar();
      return { token: 'demo', miembro: privado() };
    }
    case 'sesion':
      return { miembro: privado() };
    case 'logout':
      return { cerrada: true };
    case 'pin.cambiar':
      if (!/^\d{6}$/.test(String(datos.pin_actual || ''))) falla('PIN_INVALIDO', 'El PIN actual no es correcto.');
      if (errorPin(datos.pin_nuevo)) falla('PIN_DEBIL', errorPin(datos.pin_nuevo));
      return { cambiado: true };
    case 'perfil.guardar': {
      if (datos.nick !== undefined && datos.nick.trim() !== YO.nick) {
        const nick = datos.nick.trim();
        if (!NICK_RE.test(nick)) falla('NICK_FORMATO', errorNick(nick));
        if (nickOcupado(nick)) falla('NICK_OCUPADO', 'Ese nick ya está registrado.');
        if (cambiosNick >= 2) falla('NICK_LIMITE', 'Ya cambiaste tu nick el máximo de veces esta semana. Prueba en unos días.');
        cambiosNick++;
        YO.nick = nick;
      }
      for (const k of ['nick_juego', 'uid_juego', 'bio', 'avatar_id']) if (datos[k] !== undefined) YO[k] = String(datos[k]).trim();
      if (datos.pais !== undefined) YO.pais = String(datos.pais).toUpperCase().slice(0, 2);
      sincronizar();
      return privado();
    }
    case 'adventurer.guardar': {
      let a = datos.id ? advsYo.find((x) => x.id === datos.id) : null;
      if (datos.id && !a) falla('NO_EXISTE', 'Adventurer no encontrado.');
      const nombre = String(datos.adventurer || '').trim().slice(0, 40);
      if (!nombre) falla('DATO_INVALIDO', 'Indica el nombre del adventurer.');
      if (!ARMAS.includes(datos.arma)) falla('DATO_INVALIDO', 'Elige el arma.');
      const nuevo = {
        adventurer: nombre, arma: datos.arma, elemento: datos.elemento || 'none', tipo: datos.tipo || '',
        nivel: numeroDemo(datos.nivel, 1, 80, 'nivel', true),
        poder_total: numeroDemo(datos.poder_total, 0, 999999, 'poder total', false),
        poder_equipo: numeroDemo(datos.poder_equipo, 0, 999999, 'poder de equipo', true),
        poder_rostros: numeroDemo(datos.poder_rostros, 0, 999999, 'poder de Rostros', true),
        poder_camarada: numeroDemo(datos.poder_camarada, 0, 999999, 'poder de camarada', true),
        loadout: String(datos.loadout || '').trim().slice(0, 40), notas: String(datos.notas || '').trim().slice(0, 500),
        capturas: (datos.capturas || []).slice(0, 5), actualizado: new Date().toISOString(),
      };
      if (a) Object.assign(a, nuevo);
      else advsYo.push(a = { id: `demo-adv-${++idDemo}`, miembro_id: 'demo-yo', ...nuevo });
      if (!YO.adventurer_principal_id) YO.adventurer_principal_id = a.id;
      sincronizar();
      return { ...a };
    }
    case 'adventurer.eliminar':
      advsYo = advsYo.filter((x) => x.id !== datos.id);
      if (YO.adventurer_principal_id === datos.id) YO.adventurer_principal_id = [...advsYo].sort((x, y) => y.poder_total - x.poder_total)[0]?.id || '';
      sincronizar();
      return { eliminado: true };
    case 'adventurer.principal':
      if (!advsYo.some((x) => x.id === datos.id)) falla('NO_EXISTE', 'Adventurer no encontrado.');
      YO.adventurer_principal_id = datos.id;
      sincronizar();
      return { principal: datos.id };
    case 'imagen.subir':
      // Sin Drive: la imagen comprimida se guarda en memoria como data: URL.
      return { id: `data:${datos.mime};base64,${datos.base64}` };
    default:
      return null;
  }
}
