/**
 * Une apps-script/*.gs en un solo archivo para pegarlo en el editor de Apps Script
 * (un único archivo "MH-Ragnarok.gs" en vez de diez). Mismo orden que usan las pruebas
 * (tests/gas-mock.mjs), así que lo que se pega es exactamente lo que se probó.
 *
 * Uso: node scripts/empaquetar-gs.mjs [salida]   (por defecto: "Claude outputs/MH-Ragnarok.gs")
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function empaquetar(dir = join(RAIZ, 'apps-script'), version = '') {
  const archivos = (await readdir(dir)).filter((f) => f.endsWith('.gs')).sort();
  const partes = await Promise.all(archivos.map(async (f) => {
    const texto = (await readFile(join(dir, f), 'utf8')).replace(/\r\n/g, '\n').trimEnd();
    return `// ==================== ${f} ====================\n${texto}\n`;
  }));
  const cabeza = [
    '// MH-Ragnarok — backend completo en un solo archivo (generado; no editar aquí).',
    '// Fuente: carpeta apps-script/ del repo. Se regenera con: node scripts/empaquetar-gs.mjs',
    version ? `// Versión: ${version}` : '',
    `// Archivos: ${archivos.join(', ')}`,
  ].filter(Boolean).join('\n');
  return { texto: `${cabeza}\n\n${partes.join('\n')}`, archivos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const salida = process.argv[2] || join(RAIZ, 'Claude outputs', 'MH-Ragnarok.gs');
  let version = '';
  try {
    const commit = execSync('git rev-parse --short=7 HEAD', { cwd: RAIZ }).toString().trim();
    const sucio = execSync('git status --porcelain apps-script', { cwd: RAIZ }).toString().trim();
    version = `${commit}${sucio ? ' + cambios sin commit' : ''} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  } catch { /* sin git: sin versión */ }
  const { texto, archivos } = await empaquetar(undefined, version);
  await mkdir(dirname(salida), { recursive: true });
  await writeFile(salida, texto);
  console.log(`${salida}: ${archivos.length} archivos, ${texto.split('\n').length} líneas.`);
}
