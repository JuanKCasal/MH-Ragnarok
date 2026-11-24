/**
 * Subconjunto seguro de Markdown para noticias y guías (SPEC.md §7).
 * - Todo el texto se escapa: el HTML que alguien escriba se ve como texto, nunca se ejecuta.
 * - Enlaces: solo https:, rutas internas (#/…) y anclas de la misma página (#seccion).
 * - Imágenes: solo de Google Drive (se muestran con la miniatura de Drive).
 *
 * Bloques: # a #### (en la página, # y ## salen como h2: el h1 es el título), párrafos,
 * listas (- * 1.), citas (>), separador (---), código (```), tablas con |.
 * En línea: **negrita**, *cursiva* o _cursiva_, `código`, [texto](url), ![alt](imagen de Drive).
 */
import { esc } from './ui/dom.js';
import { urlImagen } from './image.js';

/** "Armas y Rostros" → "armas-y-rostros" (igual que slug_ del backend). */
export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** ID de archivo de Drive a partir de drive:ID o de un enlace de Drive. '' si no es de Drive. */
export function idDrive(url) {
  const u = String(url).trim();
  let m = u.match(/^drive:([\w-]{10,100})$/);
  if (m) return m[1];
  m = u.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{10,100})/);
  if (m) return m[1];
  m = u.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([\w-]{10,100})/);
  return m ? m[1] : '';
}

/** Destino de un enlace ya escapado, o null si no está permitido. */
function destino(url) {
  const u = url.trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return { href: u, externo: true };
  if (/^#\/[\w\-/?=&;.%]*$/.test(u)) return { href: u, externo: false };
  const ancla = u.match(/^#([\w-]{1,60})$/);
  if (ancla) return { href: `#s-${ancla[1]}`, ancla: `s-${ancla[1]}` };
  return null;
}

/** Formato en línea sobre texto YA escapado. */
function enLinea(t) {
  const guardados = [];
  const guardar = (h) => `\u0000${guardados.push(h) - 1}\u0000`;
  // Código primero: dentro no se aplica ningún otro formato.
  t = t.replace(/`([^`\n]+)`/g, (_, c) => guardar(`<code>${c}</code>`));
  // Imágenes ![alt](url)
  t = t.replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (todo, alt, url) => {
    const id = idDrive(url.replace(/&amp;/g, '&'));
    const src = id && urlImagen(id, 1600);
    if (!src) return todo;
    return guardar(`<img src="${esc(src)}" alt="${alt}" loading="lazy" decoding="async">`);
  });
  // Enlaces [texto](url)
  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (todo, texto, url) => {
    const d = destino(url);
    if (!d) return texto; // enlace no permitido: queda solo el texto
    if (d.ancla) return guardar(`<a href="${d.href}" data-ancla="${d.ancla}">`) + texto + guardar('</a>');
    const extra = d.externo ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    return guardar(`<a href="${d.href}"${extra}>`) + texto + guardar('</a>');
  });
  t = t.replace(/\*\*(?=\S)([^*\n]*?\S)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[i]);
}

const celdas = (linea) => linea.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const esSeparadorTabla = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

/**
 * @param {string} md
 * @returns {{ html: string, titulos: {nivel: number, texto: string, id: string}[] }}
 */
const BUILD_RE = /^\s*\[\[build:([\w-]{1,64})\]\]\s*$/;

export function renderMarkdown(md) {
  const lineas = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const titulos = [];
  const usados = new Map();
  let i = 0;

  const esInicioDeBloque = (l) => /^\s*$/.test(l) || /^#{1,4}\s/.test(l) || /^\s*([-*]|\d+[.)])\s+/.test(l)
    || /^\s*>/.test(l) || /^\s*```/.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l) || BUILD_RE.test(l);

  while (i < lineas.length) {
    const l = lineas[i];

    if (/^\s*$/.test(l)) { i++; continue; }

    // Código
    if (/^\s*```/.test(l)) {
      const cuerpo = [];
      i++;
      while (i < lineas.length && !/^\s*```/.test(lineas[i])) cuerpo.push(lineas[i++]);
      i++;
      out.push(`<pre><code>${esc(cuerpo.join('\n'))}</code></pre>`);
      continue;
    }

    // Títulos
    const h = l.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const nivel = Math.max(2, h[1].length);
      const texto = h[2];
      let id = `s-${slug(texto) || 'seccion'}`;
      const n = (usados.get(id) || 0) + 1;
      usados.set(id, n);
      if (n > 1) id += `-${n}`;
      titulos.push({ nivel, texto: texto.replace(/[*_`]/g, ''), id });
      out.push(`<h${nivel} id="${id}">${enLinea(esc(texto))}</h${nivel}>`);
      i++;
      continue;
    }

    // Build incrustada (E3): una línea sola con [[build:ID]]; la vista la rellena con la tarjeta (ui/tarjeta-build.js).
    const bld = l.match(BUILD_RE);
    if (bld) {
      out.push(`<div class="build-incrustada" data-build-incrustada="${bld[1]}"><p class="nota">Cargando build…</p></div>`);
      i++;
      continue;
    }

    // Separador
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }

    // Cita
    if (/^\s*>/.test(l)) {
      const cuerpo = [];
      while (i < lineas.length && /^\s*>/.test(lineas[i])) cuerpo.push(lineas[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(cuerpo.join('\n')).html}</blockquote>`);
      continue;
    }

    // Listas
    const li = l.match(/^\s*([-*]|\d+[.)])\s+(.*)$/);
    if (li) {
      const ordenada = /\d/.test(li[1]);
      const items = [];
      while (i < lineas.length) {
        const m = lineas[i].match(/^\s*([-*]|\d+[.)])\s+(.*)$/);
        if (m && /\d/.test(m[1]) === ordenada) { items.push(m[2]); i++; continue; }
        // Continuación de un ítem (línea con sangría)
        if (items.length && /^\s{2,}\S/.test(lineas[i]) && !m) { items[items.length - 1] += `\n${lineas[i].trim()}`; i++; continue; }
        break;
      }
      const tag = ordenada ? 'ol' : 'ul';
      const inicio = ordenada ? Number(li[1].replace(/\D/g, '')) : 1;
      out.push(`<${tag}${ordenada && inicio !== 1 ? ` start="${inicio}"` : ''}>${items.map((t) => `<li>${enLinea(esc(t)).replace(/\n/g, '<br>')}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Tabla
    if (l.includes('|') && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
      const cab = celdas(l);
      i += 2;
      const filas = [];
      while (i < lineas.length && lineas[i].includes('|') && !/^\s*$/.test(lineas[i])) filas.push(celdas(lineas[i++]));
      out.push(`<div class="prosa__tabla"><table><thead><tr>${cab.map((c) => `<th scope="col">${enLinea(esc(c))}</th>`).join('')}</tr></thead>`
        + `<tbody>${filas.map((f) => `<tr>${cab.map((_, k) => `<td>${enLinea(esc(f[k] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    // Párrafo: hasta una línea en blanco o el inicio de otro bloque. Un salto de línea = <br>.
    const p = [l];
    i++;
    while (i < lineas.length && !esInicioDeBloque(lineas[i])) p.push(lineas[i++]);
    out.push(`<p>${p.map((x) => enLinea(esc(x.trim()))).join('<br>')}</p>`);
  }

  return { html: out.join('\n'), titulos };
}
