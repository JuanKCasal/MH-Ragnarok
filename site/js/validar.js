/**
 * Validaciones del lado del navegador. Son espejo de las del backend (apps-script/Auth.gs,
 * Adventurers.gs): solo sirven para avisar antes de enviar; el backend vuelve a validar todo.
 * Devuelven '' si está bien o el mensaje de error.
 */
import { ARMAS, TIPOS_NOTICIA, CATEGORIAS_GUIA, NIVELES_GUIA } from './etiquetas.js';
import { slug } from './markdown.js';

export const NICK_RE = /^[\p{L}\p{N} _.\-]{3,24}$/u;

export function errorNick(nick) {
  const n = String(nick ?? '').trim();
  if (!n) return 'Escribe tu nick.';
  if (!NICK_RE.test(n)) return 'Entre 3 y 24 caracteres: letras, números, espacio, _ . -';
  return '';
}

export function errorPin(pin) {
  const p = String(pin ?? '');
  if (!/^\d{6}$/.test(p)) return 'El PIN son exactamente 6 dígitos.';
  if (/^(\d)\1{5}$/.test(p) || p === '123456' || p === '654321') return 'Ese PIN es muy fácil de adivinar. Elige otro.';
  return '';
}

/** "16.851", "16,851" o "16851" → 16851. Vacío → null. Texto sin dígitos → NaN. */
export function leerNumero(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const limpio = s.replace(/[.,\s]/g, '');
  return /^\d+$/.test(limpio) ? Number(limpio) : NaN;
}

/** Países frecuentes del clan primero; el resto en orden alfabético. */
export const PAISES = [
  ['CL', 'Chile'], ['CO', 'Colombia'], ['BR', 'Brasil'], ['MX', 'México'], ['AR', 'Argentina'], ['PE', 'Perú'],
  ['VE', 'Venezuela'], ['EC', 'Ecuador'],
  ['BO', 'Bolivia'], ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['ES', 'España'], ['US', 'Estados Unidos'],
  ['SV', 'El Salvador'], ['GT', 'Guatemala'], ['HN', 'Honduras'], ['NI', 'Nicaragua'], ['PA', 'Panamá'],
  ['PY', 'Paraguay'], ['PR', 'Puerto Rico'], ['DO', 'República Dominicana'], ['UY', 'Uruguay'],
];

export const nombrePais = (cod) => PAISES.find(([c]) => c === cod)?.[1] ?? '';

/** Bandera emoji a partir del código ISO-2 (los celulares la dibujan; Windows muestra las letras). */
export function bandera(cod) {
  const c = String(cod || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
}

/** Solo enlaces de invitación de WhatsApp (nunca teléfonos). */
export const esInvitacionWhatsapp = (url) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(String(url || ''));

/** Valida y arma los datos para el backend. Pura (sin DOM) para poder probarla. */
export function validarAdventurer(d) {
  const errores = {};
  const num = (k, min, max, nombre, requerido) => {
    const n = leerNumero(d[k]);
    if (n === null) { if (requerido) errores[k] = `Escribe el ${nombre}.`; return ''; }
    if (Number.isNaN(n)) { errores[k] = 'Solo números (puedes usar punto de miles).'; return ''; }
    if (n < min || n > max) { errores[k] = `Debe estar entre ${min} y ${max.toLocaleString('es-CL')}.`; return ''; }
    return n;
  };
  const datos = {
    adventurer: String(d.adventurer || '').trim(),
    arma: d.arma || '',
    elemento: d.elemento || 'none',
    tipo: d.tipo || '',
    nivel: num('nivel', 1, 80, 'nivel', false),
    poder_total: num('poder_total', 0, 999999, 'poder total', true),
    poder_equipo: num('poder_equipo', 0, 999999, 'poder de equipamiento', false),
    poder_rostros: num('poder_rostros', 0, 999999, 'poder de Rostros', false),
    poder_camarada: num('poder_camarada', 0, 999999, 'poder del camarada', false),
    loadout: String(d.loadout || '').trim(),
    notas: String(d.notas || '').trim(),
  };
  if (!datos.adventurer) errores.adventurer = 'Escribe el nombre del adventurer.';
  if (!ARMAS[datos.arma]) errores.arma = 'Elige el arma.';
  const suma = [datos.poder_equipo, datos.poder_rostros, datos.poder_camarada].reduce((t, x) => t + (Number(x) || 0), 0);
  if (datos.poder_total !== '' && suma > datos.poder_total) errores.poder_total = 'El desglose suma más que el poder total. Revisa los números.';
  return { datos, errores };
}

/** Límites de Contenido.gs (noticias y guías). */
export const LIMITES_CONTENIDO = { titulo: 120, resumen: 280, cuerpo_md: 40000 };

/**
 * Noticia o guía del editor (espejo de Contenido.gs). Pura, para poder probarla.
 * @param {'noticia'|'guia'} tipo
 */
export function validarContenido(tipo, d) {
  const errores = {};
  const texto = (k) => String(d[k] ?? '').replace(/\r\n?/g, '\n').trim();
  const datos = { titulo: texto('titulo'), resumen: texto('resumen'), cuerpo_md: texto('cuerpo_md') };
  if (!datos.titulo) errores.titulo = tipo === 'guia' ? 'La guía necesita un título.' : 'La noticia necesita un título.';
  for (const [k, max] of Object.entries(LIMITES_CONTENIDO)) {
    if (datos[k].length > max) errores[k] = `Máximo ${max.toLocaleString('es-CL')} caracteres (tiene ${datos[k].length.toLocaleString('es-CL')}).`;
  }
  if (tipo === 'guia') {
    datos.categoria = CATEGORIAS_GUIA[d.categoria] ? d.categoria : 'otros';
    datos.nivel = NIVELES_GUIA[d.nivel] ? d.nivel : 'basico';
    const s = texto('slug');
    datos.slug = s ? slug(s) : '';
    if (s && !datos.slug) errores.slug = 'Usa letras o números.';
    const o = String(d.orden ?? '').trim();
    if (!o) datos.orden = 0;
    else if (!/^-?\d+$/.test(o) || Math.abs(Number(o)) > 9999) errores.orden = 'Un número entero (1 = primera de su categoría).';
    else datos.orden = Number(o);
  } else {
    datos.tipo = TIPOS_NOTICIA[d.tipo] ? d.tipo : 'gremio';
  }
  return { datos, errores };
}
