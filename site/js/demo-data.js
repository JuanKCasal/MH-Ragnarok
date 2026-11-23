/**
 * Datos de ejemplo para ver la web sin backend (config.js sin API_URL).
 * Nombres y poderes inventados. Imita las respuestas de la API (SPEC.md §6).
 */
import { balancearEquipos } from './clash-balance.js';
import { semanaClashId } from './time.js';
import { ErrorApi } from './api.js';
import { errorNick, errorPin, NICK_RE, validarConfig } from './validar.js';
import { NOTICIAS, GUIAS, CATEGORIAS_ORDEN } from './demo-contenido.js';
import { slug as slugDe } from './markdown.js';

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
    rol: i === 0 ? 'admin' : i === 5 || i === 11 ? 'oficial' : 'miembro',
    estado: 'activo',
    adventurer: {
      arma: i === 0 ? 'heavy_bowgun' : ARMAS[Math.floor(azar() * ARMAS.length)],
      elemento: i === 0 ? 'fire' : ELEMENTOS[Math.floor(azar() * ELEMENTOS.length)],
      tipo: TIPOS[Math.floor(azar() * TIPOS.length)],
      adventurer: i === 0 ? 'Adventurer de ejemplo' : 'Adventurer',
    },
    poder,
  };
});

// Datos extra del directorio con otra semilla, para no alterar los poderes de arriba.
const azar2 = prng(77);
const NOMBRES_ADV = ['Kestrel', 'Aldra', 'Bram', 'Senna', 'Iko', 'Varo', 'Liesel', 'Toma', 'Oriel', 'Maeve', 'Dov', 'Yuna'];
const LOADOUTS = ['Principal', 'Clash', 'Fuego total', 'Rompe-cuernos', 'Cazar rápido', 'Hielo', ''];
const BIOS = ['Juego de noche, después del trabajo.', 'Siempre listo para el Clash del sábado.', 'Aprendiendo a usar el arco, paciencia.',
  'Si necesitas ayuda con un monstruo, avísame.', '', '', ''];
const elegir = (lista) => lista[Math.floor(azar2() * lista.length)];
MIEMBROS.forEach((m, i) => {
  if (i === 0) return;
  m.adventurer.adventurer = elegir(NOMBRES_ADV);
  m.nivel = Math.min(80, Math.round(40 + (m.poder - 9000) / 300 + azar2() * 8));
  m.loadout = elegir(LOADOUTS);
  m.bio = elegir(BIOS);
  m.nick_juego = azar2() < 0.3 ? `${m.nick}_${Math.floor(azar2() * 90 + 10)}` : m.nick;
  m.uid_juego = azar2() < 0.5 ? String(Math.floor(1e8 + azar2() * 9e8)) : '';
  m.creado = new Date(Date.UTC(2026, 9, 28 + Math.floor(azar2() * 24))).toISOString();
  m.desglose = i % 2 === 0;
  m.extra = i % 3 === 0;
  m.sinAdv = i >= 50; // los dos últimos aún no cargan su adventurer
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


const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Tu perfil de ejemplo ("Midori") ----------

const YO = {
  id: 'demo-yo', nick: 'Midori', nick_juego: 'Midori', uid_juego: '', pais: 'CL', rol: 'admin',
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

// ---------- Administración (oficiales y admin) ----------
let whatsappDemo = '';
let codigoClanDemo = ''; // vacío: en el ejemplo cualquier código sirve hasta que el admin ponga uno
// Dos cuentas que dejaron el clan (inactivas): solo se ven en Admin.
const RETIRADOS = [
  { id: 'demo-r1', nick: 'Grieta', pais: 'AR', rol: 'miembro', estado: 'inactivo', adventurer: {}, poder: 0, sinAdv: true, nick_juego: 'Grieta', uid_juego: '', bio: '', creado: hace(20) },
  { id: 'demo-r2', nick: 'Pólvora', pais: 'MX', rol: 'miembro', estado: 'inactivo', adventurer: {}, poder: 0, sinAdv: true, nick_juego: 'Polvora', uid_juego: '', bio: '', creado: hace(22) },
];
const todos = () => [...MIEMBROS, ...RETIRADOS];
const activos = () => todos().filter((m) => m.estado === 'activo');
// Estado del PIN de ejemplo: uno bloqueado por intentos fallidos y uno con PIN temporal sin cambiar.
const credDemo = new Map([['demo-7', { bloqueado: true, pin_temporal: false }], ['demo-12', { bloqueado: false, pin_temporal: true }]]);

function pinTemporalDemo() {
  let p;
  do { p = String(100000 + Math.floor(Math.random() * 900000)); } while (/^(\d)\1{5}$/.test(p) || p === '123456' || p === '654321');
  return p;
}
const miembroAdmin = (id) => todos().find((m) => m.id === id) || falla('NO_EXISTE', 'Miembro no encontrado.');

const falla = (codigo, mensaje) => { throw new ErrorApi(codigo, mensaje); };
const privado = () => ({ ...YO, pin_temporal: false, whatsapp_invitacion: whatsappDemo, nick_cambios_restantes: Math.max(0, 2 - cambiosNick) });

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

/** Perfil público de ejemplo (forma de GET miembro). */
function perfilDemo(m) {
  if (m.id === 'demo-yo') {
    return { ...YO, adventurers: advsYo.map((a) => ({ ...a, capturas: [...a.capturas] })).sort((a, b) => b.poder_total - a.poder_total) };
  }
  const base = {
    id: m.id, nick: m.nick, nick_juego: m.nick_juego, uid_juego: m.uid_juego, pais: m.pais, rol: m.rol, bio: m.bio,
    avatar_id: '', adventurer_principal_id: m.sinAdv ? '' : `${m.id}-a`, creado: m.creado,
  };
  if (m.sinAdv) return { ...base, adventurers: [] };
  const parte = (f) => (m.desglose ? Math.round(m.poder * f) : '');
  const advs = [{
    id: `${m.id}-a`, miembro_id: m.id, ...m.adventurer, nivel: m.nivel, poder_total: m.poder,
    poder_equipo: parte(0.4), poder_rostros: parte(0.125), poder_camarada: parte(0.118),
    loadout: m.loadout, notas: '', capturas: [], actualizado: hace(3),
  }];
  if (m.extra) {
    advs.push({
      id: `${m.id}-b`, miembro_id: m.id, adventurer: 'Suplente', arma: m.adventurer.arma === 'bow' ? 'lance' : 'bow',
      elemento: m.adventurer.elemento === 'ice' ? 'water' : 'ice', tipo: 'support', nivel: Math.max(1, m.nivel - 12),
      poder_total: Math.round(m.poder * 0.72), poder_equipo: '', poder_rostros: '', poder_camarada: '',
      loadout: '', notas: 'Para cuando la brigada necesita apoyo.', capturas: [], actualizado: hace(9),
    });
  }
  return { ...base, adventurers: advs };
}

const nickOcupado = (nick) => MIEMBROS.slice(1).some((m) => m.nick.toLowerCase() === nick.trim().toLowerCase());

function numeroDemo(v, min, max, campo, opcional) {
  if (v === '' || v === null || v === undefined) return opcional ? '' : falla('DATO_INVALIDO', `Indica el ${campo}.`);
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) falla('DATO_INVALIDO', `El ${campo} debe estar entre ${min} y ${max}.`);
  return Math.round(n);
}

// ---------- Noticias y guías (editor de oficiales) ----------
// Las de ejemplo vienen sin "publicado": cuentan como publicadas.
const publicada = (x) => x.publicado !== false;
const TIPOS_N = ['juego', 'gremio', 'evento'];
const CATS_G = CATEGORIAS_ORDEN;
const NIVELES_G = ['basico', 'intermedio', 'avanzado'];
const recortar = (v, max) => String(v ?? '').trim().slice(0, max);

function guardarContenido(lista, d, guia) {
  const ahora = new Date().toISOString();
  let x = d.id ? lista.find((r) => r.id === d.id) : null;
  if (d.id && !x) falla('NO_EXISTE', guia ? 'Guía no encontrada.' : 'Noticia no encontrada.');
  const titulo = recortar(d.titulo, 120);
  if (!titulo) falla('DATO_INVALIDO', guia ? 'La guía necesita un título.' : 'La noticia necesita un título.');
  if (!x) {
    x = { id: `demo-${guia ? 'g' : 'n'}-${++idDemo}`, autor: YO.nick, portada_id: '', publicado: false, fecha_pub: '', creado: ahora };
    lista.unshift(x);
  }
  Object.assign(x, { titulo, resumen: recortar(d.resumen, 280), cuerpo_md: recortar(d.cuerpo_md, 40000) });
  if (d.portada_id !== undefined) x.portada_id = String(d.portada_id || '');
  if (guia) {
    const base = slugDe(d.slug || x.slug || titulo) || x.id;
    x.slug = lista.some((r) => r.slug === base && r.id !== x.id) ? `${base}-${x.id.split('-').pop()}` : base;
    if (!CATS_G.includes(d.categoria || 'otros')) falla('DATO_INVALIDO', 'Categoría no válida.');
    if (!NIVELES_G.includes(d.nivel || 'basico')) falla('DATO_INVALIDO', 'Nivel no válido.');
    x.categoria = d.categoria || 'otros';
    x.nivel = d.nivel || 'basico';
    x.orden = numeroDemo(d.orden || 0, -9999, 9999, 'orden', false);
  } else {
    if (!TIPOS_N.includes(d.tipo || 'gremio')) falla('DATO_INVALIDO', 'Tipo no válido.');
    x.tipo = d.tipo || 'gremio';
    x.fijada = !!d.fijada;
  }
  const publicar = !!d.publicado;
  if (publicar && !publicada(x)) x.fecha_pub = ahora;
  x.publicado = publicar;
  x.actualizado = ahora;
  return { ...x, publicado: publicada(x) };
}

function eliminarContenido(lista, id, guia) {
  const i = lista.findIndex((r) => r.id === id);
  if (i < 0) falla('NO_EXISTE', guia ? 'Guía no encontrada.' : 'Noticia no encontrada.');
  lista.splice(i, 1);
  return { eliminado: true };
}

export async function leerDemo(accion, params = {}) {
  await espera(120);
  switch (accion) {
    case 'inicio':
      return {
        gremio: { ...GREMIO },
        miembros: activos().length,
        noticias: NOTICIAS.filter(publicada).sort((a, b) => (b.fijada - a.fijada) || (a.fecha_pub < b.fecha_pub ? 1 : -1)).slice(0, 3).map(({ cuerpo_md, ...n }) => n),
        clash: { semana_id: semanaId, estado, confirmados: [...asistencia.values()].filter((r) => r === 'voy').length },
      };
    case 'clash':
      return respuestaClash();
    case 'clash_historial':
      return [{ id: '2026-11-21', estado: 'cerrada', puesto: 29, puntos: 18240, notas: '' }];
    case 'noticias': {
      const lista = NOTICIAS.filter((n) => publicada(n) && (!params.tipo || n.tipo === params.tipo))
        .sort((a, b) => (b.fijada - a.fijada) || (a.fecha_pub < b.fecha_pub ? 1 : -1));
      const porPagina = 5; // menos que el backend (12) para ver "Cargar más" en el ejemplo
      const pagina = Math.max(1, Number(params.pagina) || 1);
      return {
        total: lista.length, pagina, por_pagina: porPagina,
        items: lista.slice((pagina - 1) * porPagina, pagina * porPagina).map(({ cuerpo_md, ...n }) => ({ ...n })),
      };
    }
    case 'noticia': {
      const n = NOTICIAS.find((x) => x.id === params.id && publicada(x));
      if (!n) falla('NO_EXISTE', 'Noticia no encontrada.');
      return { ...n };
    }
    case 'guias':
      return CATEGORIAS_ORDEN.map((categoria) => ({
        categoria,
        guias: GUIAS.filter((g) => publicada(g) && g.categoria === categoria).sort((a, b) => a.orden - b.orden).map(({ cuerpo_md, ...g }) => ({ ...g })),
      })).filter((x) => x.guias.length);
    case 'guia': {
      const g = GUIAS.find((x) => x.slug === params.slug && publicada(x));
      if (!g) falla('NO_EXISTE', 'Guía no encontrada.');
      return { ...g };
    }
    case 'miembros':
      return activos().map((m) => {
        const { adventurers, ...p } = perfilDemo(m);
        return { ...p, principal: adventurers.find((a) => a.id === p.adventurer_principal_id) ?? null };
      }).sort((a, b) => (b.principal?.poder_total ?? 0) - (a.principal?.poder_total ?? 0));
    case 'miembro': {
      const m = activos().find((x) => x.id === params.id);
      if (!m) falla('NO_EXISTE', 'Miembro no encontrado.');
      return perfilDemo(m);
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
      const codigo = String(datos.codigo_clan || '').trim();
      if (!codigo || (codigoClanDemo && codigo !== codigoClanDemo)) falla('CODIGO_INVALIDO', 'El código del clan no es correcto.');
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
    case 'editor.contenido': {
      const guia = datos.tipo === 'guia';
      const lista = guia ? GUIAS : NOTICIAS;
      if (datos.id) {
        const x = lista.find((r) => r.id === datos.id);
        if (!x) falla('NO_EXISTE', 'No encontrado.');
        return { ...x, publicado: publicada(x), actualizado: x.actualizado || x.fecha_pub || '' };
      }
      return lista.map((r) => ({
        id: r.id, titulo: r.titulo, slug: r.slug, tipo: r.tipo, categoria: r.categoria, nivel: r.nivel, orden: r.orden,
        publicado: publicada(r), fijada: !!r.fijada, fecha_pub: r.fecha_pub || '', actualizado: r.actualizado || r.fecha_pub || '',
      }));
    }
    case 'noticia.guardar':
      return guardarContenido(NOTICIAS, datos, false);
    case 'noticia.eliminar':
      return eliminarContenido(NOTICIAS, datos.id, false);
    case 'guia.guardar':
      return guardarContenido(GUIAS, datos, true);
    case 'guia.eliminar':
      return eliminarContenido(GUIAS, datos.id, true);
    case 'admin.miembros':
      return todos().map((m) => {
        const c = credDemo.get(m.id) || {};
        return {
          id: m.id, nick: m.nick, nick_juego: m.nick_juego || m.nick, pais: m.pais, rol: m.rol, avatar_id: m.id === 'demo-yo' ? YO.avatar_id : '',
          creado: m.id === 'demo-yo' ? YO.creado : m.creado, estado: m.estado, bloqueado: !!c.bloqueado, pin_temporal: !!c.pin_temporal,
        };
      });
    case 'miembro.resetPin': {
      const m = miembroAdmin(datos.miembro_id);
      if (m.rol === 'admin' && YO.rol !== 'admin') falla('SIN_PERMISO', 'Solo el admin puede resetear su propio PIN.');
      credDemo.set(m.id, { bloqueado: false, pin_temporal: true });
      return { pin_temporal: pinTemporalDemo() };
    }
    case 'miembro.estado': {
      const m = miembroAdmin(datos.miembro_id);
      if (m.rol === 'admin') falla('SIN_PERMISO', 'No se puede desactivar al admin.');
      if (m.rol === 'oficial' && YO.rol !== 'admin') falla('SIN_PERMISO', 'Solo el admin puede desactivar oficiales.');
      if (!['activo', 'inactivo'].includes(datos.estado)) falla('DATO_INVALIDO', 'Estado no válido.');
      m.estado = datos.estado;
      return { id: m.id, nick: m.nick, rol: m.rol, estado: m.estado };
    }
    case 'miembro.rol': {
      if (YO.rol !== 'admin') falla('SIN_PERMISO', 'No tienes permiso para esta acción.');
      const m = miembroAdmin(datos.miembro_id);
      if (m.id === 'demo-yo') falla('SIN_PERMISO', 'No puedes cambiar tu propio rol.');
      if (!['miembro', 'oficial'].includes(datos.rol)) falla('DATO_INVALIDO', 'Rol no válido.');
      m.rol = datos.rol;
      return { id: m.id, nick: m.nick, rol: m.rol };
    }
    case 'config.guardar': {
      const { datos: limpios, errores } = validarConfig(datos);
      const malo = Object.keys(datos).find((k) => !(k in limpios) && !errores[k]);
      if (malo) falla('DATO_INVALIDO', `Clave no editable: ${malo}`);
      const [k1] = Object.keys(errores);
      if (k1) falla('DATO_INVALIDO', errores[k1]);
      for (const [k, v] of Object.entries(limpios)) {
        if (k === 'whatsapp_invitacion') whatsappDemo = v; else GREMIO[k] = v;
      }
      return { ...GREMIO };
    }
    case 'config.codigoClan': {
      const c = String(datos.codigo || '').trim();
      if (c.length < 6) falla('DATO_INVALIDO', 'El código debe tener al menos 6 caracteres.');
      codigoClanDemo = c;
      return { cambiado: true };
    }
    case 'imagen.subir':
      // Sin Drive: la imagen comprimida se guarda en memoria como data: URL.
      return { id: `data:${datos.mime};base64,${datos.base64}` };
    default:
      return null;
  }
}
