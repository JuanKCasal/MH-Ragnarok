import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorNick, errorPin, leerNumero, bandera, esInvitacionWhatsapp, validarAdventurer } from '../site/js/validar.js';
import { medidas, urlImagen } from '../site/js/image.js';

test('nick: mismas reglas que el backend (3–24, letras, números, espacio, _ . -)', () => {
  assert.equal(errorNick('Midori'), '');
  assert.equal(errorNick('  Ñandú_99 '), '');
  assert.equal(errorNick('Señor Rathalos'), '');
  assert.ok(errorNick('ab'));
  assert.ok(errorNick('x'.repeat(25)));
  assert.ok(errorNick('nick<script>'));
  assert.ok(errorNick(''));
});

test('PIN: 6 dígitos y no trivial', () => {
  assert.equal(errorPin('482913'), '');
  for (const malo of ['12345', '1234567', 'abcdef', '111111', '123456', '654321', '']) assert.ok(errorPin(malo), malo);
});

test('números del juego con o sin punto de miles', () => {
  assert.equal(leerNumero('16.851'), 16851);
  assert.equal(leerNumero('16,851'), 16851);
  assert.equal(leerNumero(' 16851 '), 16851);
  assert.equal(leerNumero(''), null);
  assert.ok(Number.isNaN(leerNumero('16k')));
});

test('bandera e invitación de WhatsApp (nunca teléfonos)', () => {
  assert.equal(bandera('cl'), '\u{1F1E8}\u{1F1F1}');
  assert.equal(bandera(''), '');
  assert.equal(bandera('CHL'), '');
  assert.ok(esInvitacionWhatsapp('https://chat.whatsapp.com/AbCdEf1234567890'));
  assert.ok(!esInvitacionWhatsapp('https://wa.me/56912345678'));
  assert.ok(!esInvitacionWhatsapp('javascript:alert(1)'));
});

test('adventurer: valida y normaliza los datos para el backend', () => {
  const ok = validarAdventurer({ adventurer: ' Cazadora ', arma: 'heavy_bowgun', elemento: 'fire', poder_total: '16.851', poder_equipo: '6.736', nivel: '70' });
  assert.deepEqual(ok.errores, {});
  assert.equal(ok.datos.adventurer, 'Cazadora');
  assert.equal(ok.datos.poder_total, 16851);
  assert.equal(ok.datos.poder_equipo, 6736);
  assert.equal(ok.datos.nivel, 70);
  assert.equal(ok.datos.poder_rostros, '');

  const mal = validarAdventurer({ adventurer: '', arma: 'katana', poder_total: '', nivel: '99' });
  assert.deepEqual(Object.keys(mal.errores).sort(), ['adventurer', 'arma', 'nivel', 'poder_total']);

  const desglose = validarAdventurer({ adventurer: 'A', arma: 'bow', poder_total: '1000', poder_equipo: '900', poder_rostros: '200' });
  assert.ok(desglose.errores.poder_total);
});

test('compresión: medidas de salida y recorte cuadrado del avatar', () => {
  assert.deepEqual(medidas(3200, 1440, 1600), { sx: 0, sy: 0, sw: 3200, sh: 1440, w: 1600, h: 720 });
  assert.deepEqual(medidas(800, 600, 1600), { sx: 0, sy: 0, sw: 800, sh: 600, w: 800, h: 600 });
  assert.deepEqual(medidas(1200, 2000, 512, true), { sx: 0, sy: 400, sw: 1200, sh: 1200, w: 512, h: 512 });
});

test('URL de imagen: solo IDs de Drive válidos', () => {
  assert.equal(urlImagen('1AbC_dEf-2345678'), 'https://drive.google.com/thumbnail?id=1AbC_dEf-2345678&sz=w1000');
  assert.equal(urlImagen('"><img onerror=x>'), '');
  assert.equal(urlImagen(''), '');
});
