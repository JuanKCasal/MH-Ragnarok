/**
 * Botones de formato del editor de noticias y guías (Markdown de markdown.js).
 * En el celular escribir ** o ## cuesta: estos botones lo hacen sobre la selección.
 * Puro (sin DOM) para poder probarlo: recibe el texto y la selección y devuelve los nuevos.
 */

export const ACCIONES = {
  titulo: { texto: 'Título', ayuda: 'Título de sección (##)' },
  negrita: { texto: 'Negrita', ayuda: 'Negrita (**texto**)' },
  cursiva: { texto: 'Cursiva', ayuda: 'Cursiva (*texto*)' },
  lista: { texto: 'Lista', ayuda: 'Lista con viñetas (- )' },
  numerada: { texto: '1. Lista', ayuda: 'Lista numerada (1. )' },
  cita: { texto: 'Cita', ayuda: 'Cita o aviso destacado (> )' },
  enlace: { texto: 'Enlace', ayuda: 'Enlace [texto](https://…)' },
};

function envolver(t, ini, fin, marca, relleno) {
  const sel = t.slice(ini, fin);
  const antes = t.slice(0, ini);
  const despues = t.slice(fin);
  // Ya envuelto: quitar la marca (el botón funciona como interruptor).
  if (sel && antes.endsWith(marca) && despues.startsWith(marca)) {
    return { texto: antes.slice(0, -marca.length) + sel + despues.slice(marca.length), inicio: ini - marca.length, fin: fin - marca.length };
  }
  if (sel.length > 2 * marca.length && sel.startsWith(marca) && sel.endsWith(marca)) {
    const sin = sel.slice(marca.length, -marca.length);
    return { texto: antes + sin + despues, inicio: ini, fin: ini + sin.length };
  }
  // Los espacios de los bordes quedan fuera (**hola ** no se ve en negrita).
  const m = sel.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const nucleo = m[2] || relleno;
  const nuevo = m[1] + marca + nucleo + marca + m[3];
  const i = ini + m[1].length + marca.length;
  return { texto: antes + nuevo + despues, inicio: i, fin: i + nucleo.length };
}

const PATRON = { titulo: /^## /, lista: /^[-*] /, numerada: /^\d+[.)] /, cita: /^> ?/ };

function prefijar(t, ini, fin, accion) {
  // Se trabaja sobre las líneas completas que toca la selección.
  const a = t.lastIndexOf('\n', ini - 1) + 1;
  let b = t.indexOf('\n', fin > ini && t[fin - 1] === '\n' ? fin - 1 : fin);
  if (b < 0) b = t.length;
  const lineas = t.slice(a, b).split('\n');
  const llenas = lineas.filter((l) => l.trim());
  const quitar = llenas.length > 0 && llenas.every((l) => PATRON[accion].test(l));
  let n = 0;
  const nuevas = lineas.map((l) => {
    if (!l.trim() && lineas.length > 1) return l;
    if (quitar) return l.replace(PATRON[accion], '');
    const base = l.replace(/^(#{1,4} |[-*] |\d+[.)] |> ?)/, '');
    if (accion === 'titulo') return `## ${base}`;
    if (accion === 'lista') return `- ${base}`;
    if (accion === 'numerada') return `${++n}. ${base}`;
    return `> ${base}`;
  });
  const bloque = nuevas.join('\n');
  // Un título, una lista o una cita necesitan una línea en blanco antes para no pegarse al párrafo anterior.
  const previo = t.slice(0, a);
  const separa = !quitar && previo && !previo.endsWith('\n\n') ? (previo.endsWith('\n') ? '\n' : '\n\n') : '';
  const texto = previo + separa + bloque + t.slice(b);
  const inicio = a + separa.length;
  // Línea vacía: el cursor queda listo para escribir después del prefijo.
  if (lineas.length === 1 && !lineas[0].trim()) return { texto, inicio: inicio + bloque.length, fin: inicio + bloque.length };
  return { texto, inicio, fin: inicio + bloque.length };
}

function enlazar(t, ini, fin) {
  const sel = t.slice(ini, fin).trim();
  const antes = t.slice(0, ini);
  const despues = t.slice(fin);
  if (/^https:\/\/\S+$/.test(sel)) {
    // Pegaron una dirección: falta el texto del enlace.
    return { texto: `${antes}[texto](${sel})${despues}`, inicio: ini + 1, fin: ini + 6 };
  }
  const etiqueta = sel || 'texto';
  const i = sel ? ini + etiqueta.length + 3 : ini + 1;
  return { texto: `${antes}[${etiqueta}](https://)${despues}`, inicio: i, fin: sel ? i + 8 : i + etiqueta.length };
}

/**
 * @param {string} texto
 * @param {number} inicio  selectionStart
 * @param {number} fin     selectionEnd
 * @param {keyof ACCIONES} accion
 * @returns {{texto: string, inicio: number, fin: number}}
 */
export function aplicarFormato(texto, inicio, fin, accion) {
  const t = String(texto ?? '');
  const ini = Math.max(0, Math.min(inicio, fin, t.length));
  const f = Math.min(t.length, Math.max(inicio, fin));
  if (accion === 'negrita') return envolver(t, ini, f, '**', 'texto');
  if (accion === 'cursiva') return envolver(t, ini, f, '*', 'texto');
  if (accion === 'enlace') return enlazar(t, ini, f);
  if (PATRON[accion]) return prefijar(t, ini, f, accion);
  return { texto: t, inicio: ini, fin: f };
}
