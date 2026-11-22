/**
 * Versionado para el despliegue (lo corre .github/workflows/pages.yml sobre una COPIA de site/).
 *
 * GitHub Pages sirve todo con caché de ~10 min y el celular no tiene Ctrl+Mayús+R.
 * Este script añade ?v=<versión> a cada CSS/JS local (en el HTML y en los import de
 * los módulos) para que cada publicación use URLs nuevas, escribe version.json y fija
 * la constante VERSION de js/version.js. La app compara ambas y ofrece "Actualizar".
 *
 * Uso: node scripts/versionar.mjs <carpeta> <versión>
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const LOCAL = '(?!https?:|//|data:)';

/** HTML: href="assets/css/x.css" / src="js/app.js" → con ?v= */
export function versionarHtml(texto, v) {
  const re = new RegExp(`(\\s(?:href|src)=")(${LOCAL}[^"?#]+\\.(?:css|js))"`, 'g');
  return texto.replace(re, (_, a, url) => `${a}${url}?v=${v}"`);
}

/** JS: import … from './x.js', import './x.js', import('./x.js') → con ?v= */
export function versionarJs(texto, v) {
  const re = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g;
  return texto.replace(re, (_, a, q, url) => `${a}${q}${url}?v=${v}${q}`);
}

export function fijarVersion(texto, v) {
  return texto.replace(/export const VERSION = '[^']*';/, `export const VERSION = '${v}';`);
}

async function* archivos(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* archivos(p);
    else yield p;
  }
}

async function main([dir, v]) {
  if (!dir || !/^[\w.-]{1,40}$/.test(v || '')) {
    console.error('Uso: node scripts/versionar.mjs <carpeta> <versión>');
    process.exit(1);
  }
  let n = 0;
  for await (const p of archivos(dir)) {
    const ext = extname(p);
    if (ext !== '.html' && ext !== '.js') continue;
    const antes = await readFile(p, 'utf8');
    let despues = ext === '.html' ? versionarHtml(antes, v) : versionarJs(antes, v);
    if (p.endsWith(join('js', 'version.js'))) despues = fijarVersion(despues, v);
    if (despues !== antes) { await writeFile(p, despues); n++; }
  }
  await writeFile(join(dir, 'version.json'), JSON.stringify({ version: v, publicada: new Date().toISOString() }) + '\n');
  console.log(`Versión ${v}: ${n} archivos actualizados.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('versionar.mjs')) {
  await main(process.argv.slice(2));
}
