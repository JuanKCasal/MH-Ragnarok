import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, idDrive, slug } from '../site/js/markdown.js';

const r = (md) => renderMarkdown(md).html;

test('escapa todo el HTML', () => {
  const h = r('<script>alert(1)</script>\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(h, /<script|<img/);
  assert.match(h, /&lt;script&gt;/);
});

test('enlaces: solo https, rutas internas y anclas', () => {
  assert.match(r('[guía](https://gamewith.ai/x?a=1&b=2)'), /<a href="https:\/\/gamewith\.ai\/x\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow">guía<\/a>/);
  assert.match(r('[eventos](#/eventos)'), /<a href="#\/eventos">eventos<\/a>/);
  assert.match(r('[arriba](#armas)'), /<a href="#s-armas" data-ancla="s-armas">arriba<\/a>/);
  for (const malo of ['javascript:alert(1)', 'http://x.com', 'data:text/html,hola', 'JaVaScRiPt:alert(1)', '//x.com']) {
    const h = r(`[clic](${malo})`);
    assert.doesNotMatch(h, /<a /, malo);
    assert.match(h, /clic/);
  }
  assert.doesNotMatch(r('[x](https://a.com/"onmouseover="alert(1))'), /"onmouseover/);
});

test('imágenes: solo de Drive', () => {
  assert.match(r('![mapa](drive:1AbCdEfGhIjKlMnOp)'), /<img src="https:\/\/drive\.google\.com\/thumbnail\?id=1AbCdEfGhIjKlMnOp&amp;sz=w1600" alt="mapa"/);
  assert.match(r('![x](https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing)'), /thumbnail\?id=1AbCdEfGhIjKlMnOp/);
  assert.doesNotMatch(r('![x](https://evil.com/a.png)'), /<img/);
  assert.equal(idDrive('https://evil.com/file/d/1AbCdEfGhIjKlMnOp'), '');
});

test('bloques: títulos con id, listas, citas, código, tabla, separador', () => {
  const { html, titulos } = renderMarkdown('# Inicio\n## Armas y **Rostros**\n## Armas y Rostros\n- uno\n- dos\n\n1. a\n2. b\n\n> ojo **aquí**\n\n```\n<b>x</b>\n```\n\n| Arma | EN |\n|---|---|\n| Arco | Bow |\n\n---');
  assert.match(html, /<h2 id="s-inicio">Inicio<\/h2>/);
  assert.match(html, /<h2 id="s-armas-y-rostros">Armas y <strong>Rostros<\/strong><\/h2>/);
  assert.match(html, /id="s-armas-y-rostros-2"/);
  assert.deepEqual(titulos.map((t) => t.texto), ['Inicio', 'Armas y Rostros', 'Armas y Rostros']);
  assert.match(html, /<ul><li>uno<\/li><li>dos<\/li><\/ul>/);
  assert.match(html, /<ol><li>a<\/li><li>b<\/li><\/ol>/);
  assert.match(html, /<blockquote><p>ojo <strong>aquí<\/strong><\/p><\/blockquote>/);
  assert.match(html, /<pre><code>&lt;b&gt;x&lt;\/b&gt;<\/code><\/pre>/);
  assert.match(html, /<th scope="col">Arma<\/th>/);
  assert.match(html, /<td>Bow<\/td>/);
  assert.match(html, /<hr>/);
});

test('en línea: negrita, cursiva, código y saltos de línea', () => {
  assert.equal(r('**fuerte** y *suave* y _otra_ y `nick_juego`\nsegunda'),
    '<p><strong>fuerte</strong> y <em>suave</em> y <em>otra</em> y <code>nick_juego</code><br>segunda</p>');
  assert.equal(r('nick_juego_2 y 2*3*4'), '<p>nick_juego_2 y 2*3*4</p>');
});

test('slug igual al del backend', () => assert.equal(slug('Guía del Guild Clash: ¡brigadas!'), 'guia-del-guild-clash-brigadas'));
