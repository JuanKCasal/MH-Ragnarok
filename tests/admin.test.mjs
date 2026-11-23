import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarConfig } from '../site/js/validar.js';

const demo = await import('../site/js/demo-data.js');

test('validarConfig: horarios, números y WhatsApp (espejo de guardarConfig_)', () => {
  const { datos, errores } = validarConfig({ clash_hora: '20:15', carnival_horas: ' 12:00 ,18:30 ', clash_dia: '6', zona_juego_offset_min: '-360', whatsapp_invitacion: '' });
  assert.deepEqual(errores, {});
  assert.equal(datos.carnival_horas, '12:00,18:30');
  assert.equal(datos.zona_juego_offset_min, '-360');
  assert.equal(datos.whatsapp_invitacion, '');
  assert.ok(validarConfig({ clash_hora: '8:15' }).errores.clash_hora);
  assert.ok(validarConfig({ clash_hora: '24:00' }).errores.clash_hora);
  assert.ok(validarConfig({ carnival_horas: '12:00, mediodía' }).errores.carnival_horas);
  assert.ok(validarConfig({ carnival_horas: '' }).errores.carnival_horas);
  assert.ok(validarConfig({ clash_dia: '7' }).errores.clash_dia);
  assert.ok(validarConfig({ max_miembros: '0' }).errores.max_miembros);
  assert.ok(validarConfig({ clash_duracion_min: '1.5' }).errores.clash_duracion_min);
  assert.ok(validarConfig({ gremio_nombre: '  ' }).errores.gremio_nombre);
  assert.ok(validarConfig({ whatsapp_invitacion: 'https://wa.me/123' }).errores.whatsapp_invitacion);
  assert.equal(Object.keys(validarConfig({ gremio_rango: '9' }).datos).join(), 'gremio_rango', 'solo las claves que llegan');
});

test('demo admin: reset de PIN, desactivar, roles y reglas de permiso', async () => {
  const lista = await demo.escribirDemo('admin.miembros');
  assert.ok(lista.some((m) => m.estado === 'inactivo'), 'hay inactivos de ejemplo');
  const { pin_temporal: pin } = await demo.escribirDemo('miembro.resetPin', { miembro_id: 'demo-7' });
  assert.match(pin, /^\d{6}$/);
  const r7 = (await demo.escribirDemo('admin.miembros')).find((m) => m.id === 'demo-7');
  assert.equal(r7.bloqueado, false, 'el reset desbloquea');
  assert.equal(r7.pin_temporal, true);

  const antes = (await demo.leerDemo('miembros')).length;
  await demo.escribirDemo('miembro.estado', { miembro_id: 'demo-3', estado: 'inactivo' });
  assert.equal((await demo.leerDemo('miembros')).length, antes - 1, 'el inactivo sale del directorio');
  await assert.rejects(demo.leerDemo('miembro', { id: 'demo-3' }), { codigo: 'NO_EXISTE' });
  await demo.escribirDemo('miembro.estado', { miembro_id: 'demo-3', estado: 'activo' });
  assert.equal((await demo.leerDemo('miembros')).length, antes);

  await assert.rejects(demo.escribirDemo('miembro.estado', { miembro_id: 'demo-yo', estado: 'inactivo' }), { codigo: 'SIN_PERMISO' });
  await assert.rejects(demo.escribirDemo('miembro.rol', { miembro_id: 'demo-yo', rol: 'miembro' }), { codigo: 'SIN_PERMISO' });
  await assert.rejects(demo.escribirDemo('miembro.rol', { miembro_id: 'demo-4', rol: 'admin' }), { codigo: 'DATO_INVALIDO' });
  assert.equal((await demo.escribirDemo('miembro.rol', { miembro_id: 'demo-4', rol: 'oficial' })).rol, 'oficial');
  await demo.escribirDemo('miembro.rol', { miembro_id: 'demo-4', rol: 'miembro' });
});

test('demo admin: configuración y código del clan', async () => {
  await assert.rejects(demo.escribirDemo('config.guardar', { clash_hora: '9pm' }), { codigo: 'DATO_INVALIDO' });
  await assert.rejects(demo.escribirDemo('config.guardar', { _secreto: 'x' }), { codigo: 'DATO_INVALIDO' });
  await demo.escribirDemo('config.guardar', { gremio_rango: '9', whatsapp_invitacion: 'https://chat.whatsapp.com/AbCdEf123456' });
  assert.equal((await demo.leerDemo('inicio')).gremio.gremio_rango, '9');
  assert.equal((await demo.leerDemo('inicio')).gremio.whatsapp_invitacion, undefined, 'WhatsApp no sale en lo público');
  assert.equal((await demo.escribirDemo('sesion')).miembro.whatsapp_invitacion, 'https://chat.whatsapp.com/AbCdEf123456');
  await demo.escribirDemo('config.guardar', { gremio_rango: '8', whatsapp_invitacion: '' });

  await assert.rejects(demo.escribirDemo('config.codigoClan', { codigo: 'corto' }), { codigo: 'DATO_INVALIDO' });
  await demo.escribirDemo('config.codigoClan', { codigo: 'dragon-dorado' });
  await assert.rejects(demo.escribirDemo('registro', { codigo_clan: 'otro-codigo', nick: 'Nuevo', pin: '482913' }), { codigo: 'CODIGO_INVALIDO' });
});
