import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { versionarHtml, versionarJs, fijarVersion } from '../scripts/versionar.mjs';

test('HTML: versiona CSS/JS locales y deja los externos', () => {
  const h = '<link rel="stylesheet" href="assets/css/base.css"><script type="module" src="js/app.js"></script>'
    + '<link rel="icon" href="assets/img/emblema.svg"><script src="https://x.com/a.js"></script>';
  const r = versionarHtml(h, 'abc1234');
  assert.match(r, /href="assets\/css\/base\.css\?v=abc1234"/);
  assert.match(r, /src="js\/app\.js\?v=abc1234"/);
  assert.match(r, /href="assets\/img\/emblema\.svg"/);
  assert.match(r, /src="https:\/\/x\.com\/a\.js"/);
});

test('JS: versiona import estáticos y dinámicos relativos', () => {
  const j = "import { a } from './a.js';\nimport '../b.js';\nconst c = () => import('./views/c.js');\nconst t = 'texto from x.js';";
  const r = versionarJs(j, 'v9');
  assert.match(r, /from '\.\/a\.js\?v=v9'/);
  assert.match(r, /import '\.\.\/b\.js\?v=v9'/);
  assert.match(r, /import\('\.\/views\/c\.js\?v=v9'\)/);
  assert.match(r, /'texto from x\.js'/);
  assert.equal(versionarJs(r, 'v9'), r, 'no versiona dos veces');
});

test('fija la constante VERSION', () => {
  assert.equal(fijarVersion("export const VERSION = 'dev';", 'abc'), "export const VERSION = 'abc';");
});

test('sobre una copia de site/: todos los import quedan versionados y hay version.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mhr-'));
  try {
    await cp('site', dir, { recursive: true });
    execFileSync(process.execPath, ['scripts/versionar.mjs', dir, 't3st'], { stdio: 'pipe' });
    const app = await readFile(join(dir, 'js/app.js'), 'utf8');
    assert.doesNotMatch(app, /['"]\.{1,2}\/[^'"?]+\.js['"]/, 'queda algún import sin versión');
    assert.match(await readFile(join(dir, 'js/version.js'), 'utf8'), /'t3st'/);
    assert.equal(JSON.parse(await readFile(join(dir, 'version.json'), 'utf8')).version, 't3st');
    assert.match(await readFile(join(dir, 'index.html'), 'utf8'), /js\/app\.js\?v=t3st/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
