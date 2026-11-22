import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, romano, numero } from '../site/js/ui/dom.js';
import { cfgEventos, duracion, fechaSemana } from '../site/js/ui/comun.js';

test('html escapa los datos interpolados y respeta las plantillas anidadas', () => {
  const nick = '<img src=x onerror=alert(1)>';
  const s = String(html`<p>${nick}</p>${html`<b>${'"ok"'}</b>`}${[1, 2]}${null}${false}`);
  assert.equal(s, '<p>&lt;img src=x onerror=alert(1)&gt;</p><b>&quot;ok&quot;</b>12');
});

test('números romanos de brigadas y rango', () => {
  assert.deepEqual([1, 4, 8, 9, 11, 14, 29].map(romano), ['I', 'IV', 'VIII', 'IX', 'XI', 'XIV', 'XXIX']);
  assert.equal(numero(16851), '16.851');
});

test('cfgEventos toma la hoja Config y cae a los valores por defecto', () => {
  const c = cfgEventos({ clash_hora: '20:15', clash_duracion_min: '60', carnival_horas: '12:00, 18:00', zona_juego_offset_min: '-360' });
  assert.equal(c.clash.duracionMin, 60);
  assert.equal(c.clash.dia, 6);
  assert.deepEqual(c.carnival.horas, ['12:00', '18:00']);
  assert.equal(c.offsetJuegoMin, -360);
  assert.equal(cfgEventos().clash.duracionMin, 60);
});

test('formatos de duración y semana', () => {
  assert.equal(duracion(130), '2 h 10 min');
  assert.equal(duracion(60), '1 h');
  assert.equal(fechaSemana('2026-11-28'), '28 nov');
});

test('brasas: población según el área, con tope e intensidad', async () => {
  const { poblacion } = await import('../site/js/ui/brasas.js');
  const cel = poblacion(390, 844, 1);
  const totalCel = cel.chispas + cel.brasas + cel.virutas;
  assert.ok(totalCel >= 60 && totalCel <= 110, `celular: ${totalCel}`);
  const pc = poblacion(2560, 1440, 1);
  assert.ok(pc.chispas + pc.brasas + pc.virutas <= 172, 'tope en pantallas grandes');
  const tenue = poblacion(390, 844, 0.5);
  assert.ok(tenue.brasas < cel.brasas);
  assert.deepEqual(poblacion(0, 0), { chispas: 0, brasas: 0, virutas: 0 });
});

test('brasas: color del fuego de carmesí a blanco dorado', async () => {
  const { colorFuego } = await import('../site/js/ui/brasas.js');
  assert.deepEqual(colorFuego(0), [122, 24, 20]);
  assert.deepEqual(colorFuego(1), [255, 240, 196]);
  assert.deepEqual(colorFuego(2), [255, 240, 196]);
  const [r, g] = colorFuego(0.65);
  assert.equal(r, 255); assert.equal(g, 146);
});
