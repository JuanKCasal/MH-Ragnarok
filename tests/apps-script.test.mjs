import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './gas-mock.mjs';

let E, adminToken, miembroToken, miembroId;
const CODIGO = 'ragna-2026';
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(20)]).toString('base64');

const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.data; };
const err = (r, codigo) => { assert.equal(r.ok, false, 'se esperaba error ' + codigo); assert.equal(r.error.codigo, codigo, r.error.mensaje); };

before(() => {
  E = crearEntorno();
  E.run('instalar()');
  E.run(`setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + ${JSON.stringify(CODIGO)}))`);
  E.run(`crearAdmin_('Juan', '135790')`);
});

test('instalar crea hojas, carpeta, pimienta y config, y es idempotente', () => {
  const libro = Object.values(E.libros)[0];
  const nombres = libro.getSheets().map((h) => h.getName());
  for (const h of ['Miembros', 'Credenciales', 'Sesiones', 'Adventurers', 'Noticias', 'Guias', 'ClashSemanas',
    'ClashAsistencia', 'ClashEquipos', 'Imagenes', 'Config', 'Log', 'Catalogo']) assert.ok(nombres.includes(h), h);
  assert.ok(!nombres.includes('Hoja 1'));
  assert.ok(E.props.PIN_PEPPER && E.props.DRIVE_FOLDER_ID && E.props.SHEET_ID);
  E.run('instalar()');
  assert.equal(libro.getSheetByName('Config').getLastRow() - 1, 14);
});

test('login del admin', () => {
  err(E.post('login', { nick: 'juan', pin: '000000' }), 'LOGIN_INVALIDO');
  const d = ok(E.post('login', { nick: 'JUAN', pin: '135790' }));
  assert.equal(d.miembro.rol, 'admin');
  assert.equal(d.token.length, 64);
  adminToken = d.token;
});

test('registro: código, PIN y nick se validan', () => {
  err(E.post('registro', { codigo_clan: 'malo', nick: 'Pepe', pin: '246810' }), 'CODIGO_INVALIDO');
  err(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe', pin: '111111' }), 'PIN_DEBIL');
  err(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe', pin: '12345' }), 'PIN_FORMATO');
  err(E.post('registro', { codigo_clan: CODIGO, nick: 'x', pin: '246810' }), 'NICK_FORMATO');
  err(E.post('registro', { codigo_clan: CODIGO, nick: 'jUaN', pin: '246810' }), 'NICK_OCUPADO');
  const d = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe Ñandú', nick_juego: 'PepeMH', pais: 'cl', pin: '246810' }));
  assert.equal(d.miembro.rol, 'miembro');
  assert.equal(d.miembro.pais, 'CL');
  miembroToken = d.token;
  miembroId = d.miembro.id;
});

test('registro se pausa tras 20 códigos incorrectos', () => {
  const E2 = crearEntorno();
  E2.run('instalar()');
  E2.run(`setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':abcdefgh'))`);
  for (let i = 0; i < 20; i++) err(E2.post('registro', { codigo_clan: 'x' + i, nick: 'Ana', pin: '246810' }), 'CODIGO_INVALIDO');
  err(E2.post('registro', { codigo_clan: 'abcdefgh', nick: 'Ana', pin: '246810' }), 'REGISTRO_PAUSADO');
});

test('adventurer: el primero queda como principal; validaciones', () => {
  err(E.post('adventurer.guardar', { adventurer: 'Midori', arma: 'espada', poder_total: 1000 }, miembroToken), 'DATO_INVALIDO');
  err(E.post('adventurer.guardar', { adventurer: 'Midori', arma: 'bow', poder_total: 1000 }), 'SIN_SESION');
  const a = ok(E.post('adventurer.guardar', { adventurer: 'Midori', arma: 'heavy_bowgun', elemento: 'fire', tipo: 'assault',
    nivel: 80, poder_total: 16851, poder_equipo: 6736, poder_rostros: 2099, poder_camarada: 1998, loadout: 'Fire Heavy' }, miembroToken));
  const b = ok(E.post('adventurer.guardar', { adventurer: 'Pepper', arma: 'bow', elemento: 'ice', poder_total: 12000 }, miembroToken));
  const perfil = ok(E.get({ accion: 'miembro', id: miembroId }));
  assert.equal(perfil.adventurer_principal_id, a.id);
  assert.equal(perfil.adventurers.length, 2);
  ok(E.post('adventurer.principal', { id: b.id }, miembroToken));
  assert.equal(ok(E.get({ accion: 'miembro', id: miembroId })).adventurer_principal_id, b.id);
  ok(E.post('adventurer.principal', { id: a.id }, miembroToken));
});

test('nadie edita adventurers ajenos (salvo oficiales)', () => {
  const otro = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Lucho', pin: '975310' }));
  const perfil = ok(E.get({ accion: 'miembro', id: miembroId }));
  err(E.post('adventurer.guardar', { id: perfil.adventurers[0].id, adventurer: 'X', arma: 'bow', poder_total: 1 }, otro.token), 'SIN_PERMISO');
  err(E.post('adventurer.eliminar', { id: perfil.adventurers[0].id }, otro.token), 'SIN_PERMISO');
});

test('las respuestas públicas nunca exponen credenciales ni sesiones', () => {
  const txt = JSON.stringify([E.get({ accion: 'miembros' }), E.get({ accion: 'inicio' }), E.get({ accion: 'miembro', id: miembroId })]);
  for (const prohibido of ['pin_hash', 'sal', 'token_hash', 'PIN_PEPPER', E.props.PIN_PEPPER, 'whatsapp_invitacion', '"estado":"activo"', 'intentos_fallidos']) {
    assert.ok(!txt.includes(prohibido), 'expone ' + prohibido);
  }
  const dir = ok(E.get({ accion: 'miembros' }));
  assert.equal(dir[0].nick, 'Pepe Ñandú'); // ordenado por poder del principal
  assert.equal(dir[0].principal.poder_total, 16851);
});

test('caché: una escritura invalida las lecturas', () => {
  const antes = ok(E.get({ accion: 'miembro', id: miembroId }));
  ok(E.post('perfil.guardar', { bio: 'Cazador de Rathalos' }, miembroToken));
  const despues = ok(E.get({ accion: 'miembro', id: miembroId }));
  assert.notEqual(antes.bio, despues.bio);
  assert.equal(despues.bio, 'Cazador de Rathalos');
});

test('nick: el propio miembro lo cambia, único y máx. 2 veces por semana', () => {
  const r = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Cambiante', pais: 'CL', pin: '424242' }));
  const t = r.token;
  err(E.post('perfil.guardar', { nick: 'juan' }, t), 'NICK_OCUPADO');
  err(E.post('perfil.guardar', { nick: 'x' }, t), 'NICK_FORMATO');
  let yo = ok(E.post('perfil.guardar', { nick: 'Cambiante2' }, t));
  assert.equal(yo.nick, 'Cambiante2');
  assert.equal(yo.nick_cambios_restantes, 1);
  yo = ok(E.post('perfil.guardar', { nick: 'Cambiante3' }, t));
  assert.equal(yo.nick_cambios_restantes, 0);
  err(E.post('perfil.guardar', { nick: 'Cambiante4' }, t), 'NICK_LIMITE');
  ok(E.post('perfil.guardar', { nick: 'Cambiante3', bio: 'igual' }, t)); // mismo nick: no cuenta
  ok(E.post('login', { nick: 'cambiante3', pin: '424242' }));
  const pub = ok(E.get({ accion: 'miembro', id: yo.id }));
  assert.equal(pub.nick_cambios, undefined);
});

test('roles: un miembro no publica noticias; tras nombrarlo oficial, sí', () => {
  err(E.post('noticia.guardar', { titulo: 'Hola', publicado: true }, miembroToken), 'SIN_PERMISO');
  err(E.post('miembro.rol', { miembro_id: miembroId, rol: 'oficial' }, miembroToken), 'SIN_PERMISO');
  ok(E.post('miembro.rol', { miembro_id: miembroId, rol: 'oficial' }, adminToken));
  const n = ok(E.post('noticia.guardar', { titulo: 'Bienvenidos a Ragnarok', resumen: 'Arranca la web', cuerpo_md: '# Hola', tipo: 'gremio', publicado: true }, miembroToken));
  ok(E.post('noticia.guardar', { titulo: 'Borrador', publicado: false }, miembroToken));
  const lista = ok(E.get({ accion: 'noticias' }));
  assert.equal(lista.total, 1);
  assert.equal(lista.items[0].autor, 'Pepe Ñandú');
  assert.equal(lista.items[0].cuerpo_md, undefined);
  assert.equal(ok(E.get({ accion: 'noticia', id: n.id })).cuerpo_md, '# Hola');
  assert.equal(ok(E.get({ accion: 'inicio' })).noticias.length, 1);
});

test('guías: slug único y agrupadas por categoría', () => {
  const g1 = ok(E.post('guia.guardar', { titulo: 'Guía de Rostros', categoria: 'rostros', publicado: true }, adminToken));
  const g2 = ok(E.post('guia.guardar', { titulo: 'Guía de Rostros', categoria: 'rostros', publicado: true }, adminToken));
  assert.equal(g1.slug, 'guia-de-rostros');
  assert.notEqual(g2.slug, g1.slug);
  const grupos = ok(E.get({ accion: 'guias' }));
  assert.equal(grupos[0].categoria, 'rostros');
  assert.equal(grupos[0].guias.length, 2);
  assert.equal(ok(E.get({ accion: 'guia', slug: 'guia-de-rostros' })).titulo, 'Guía de Rostros');
});

test('Clash: asistencia, equipos y cierre', () => {
  const lucho = ok(E.post('login', { nick: 'lucho', pin: '975310' }));
  err(E.post('clash.asistencia', { respuesta: 'voy' }, lucho.token), 'SIN_ADVENTURER');
  ok(E.post('clash.asistencia', { respuesta: 'no' }, lucho.token));
  const r = ok(E.post('clash.asistencia', { respuesta: 'voy' }, miembroToken));
  assert.equal(r.poder, 16851);
  const c = ok(E.get({ accion: 'clash' }));
  assert.equal(c.asistencia.length, 2);
  assert.equal(ok(E.get({ accion: 'inicio' })).clash.confirmados, 1);

  const admin = ok(E.post('sesion', {}, adminToken)).miembro;
  err(E.post('clash.guardarEquipos', { equipos: [[{ miembro_id: miembroId }]] }, lucho.token), 'SIN_PERMISO');
  err(E.post('clash.guardarEquipos', { equipos: [[{ miembro_id: miembroId }], [{ miembro_id: miembroId }]] }, adminToken), 'DATO_INVALIDO');
  err(E.post('clash.guardarEquipos', { equipos: [[1, 2, 3, 4, 5].map(() => ({ miembro_id: miembroId }))] }, adminToken), 'DATO_INVALIDO');
  const armado = ok(E.post('clash.guardarEquipos', { equipos: [[{ miembro_id: miembroId, fijado: true }, { miembro_id: admin.id }], [{ miembro_id: lucho.miembro.id }]] }, adminToken));
  assert.equal(armado.semana.estado, 'armada');
  assert.equal(armado.equipos.length, 2);
  assert.equal(armado.equipos[0].suma, 16851);
  // Rearmar reemplaza, no duplica.
  ok(E.post('clash.guardarEquipos', { equipos: [[{ miembro_id: miembroId }]] }, adminToken));
  assert.equal(ok(E.get({ accion: 'clash' })).equipos.length, 1);

  const cerrada = ok(E.post('clash.cerrar', { semana_id: c.semana.id, puesto: 21, puntos: 98000 }, adminToken));
  assert.equal(cerrada.estado, 'cerrada');
  err(E.post('clash.asistencia', { respuesta: 'quiza' }, miembroToken), 'CERRADA');
  assert.equal(ok(E.get({ accion: 'clash_historial' }))[0].puesto, 21);
});

test('bloqueo tras 5 PIN incorrectos', () => {
  ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Torpe', pin: '864200' }));
  for (let i = 0; i < 5; i++) err(E.post('login', { nick: 'Torpe', pin: '000001' }), 'LOGIN_INVALIDO');
  err(E.post('login', { nick: 'Torpe', pin: '864200' }), 'BLOQUEADO');
});

test('reset de PIN por oficial → PIN temporal → cambio obligatorio', () => {
  const lista = ok(E.post('admin.miembros', {}, adminToken));
  const torpe = lista.find((m) => m.nick === 'Torpe');
  assert.equal(torpe.bloqueado, true);
  const { pin_temporal } = ok(E.post('miembro.resetPin', { miembro_id: torpe.id }, miembroToken)); // Pepe es oficial
  assert.match(pin_temporal, /^\d{6}$/);
  const s = ok(E.post('login', { nick: 'torpe', pin: pin_temporal }));
  assert.equal(s.miembro.pin_temporal, true);
  err(E.post('pin.cambiar', { pin_actual: '999999', pin_nuevo: '519753' }, s.token), 'PIN_INVALIDO');
  ok(E.post('pin.cambiar', { pin_actual: pin_temporal, pin_nuevo: '519753' }, s.token));
  assert.equal(ok(E.post('login', { nick: 'torpe', pin: '519753' })).miembro.pin_temporal, false);
  err(E.post('miembro.resetPin', { miembro_id: ok(E.post('sesion', {}, adminToken)).miembro.id }, miembroToken), 'SIN_PERMISO');
});

test('desactivar a un miembro cierra sus sesiones', () => {
  const t = ok(E.post('login', { nick: 'lucho', pin: '975310' }));
  ok(E.post('miembro.estado', { miembro_id: t.miembro.id, estado: 'inactivo' }, miembroToken));
  err(E.post('sesion', {}, t.token), 'SESION_VENCIDA');
  err(E.post('login', { nick: 'lucho', pin: '975310' }), 'SIN_ACCESO');
  assert.ok(!ok(E.get({ accion: 'miembros' })).some((m) => m.nick === 'Lucho'));
});

test('imágenes: solo formatos válidos, compartidas por enlace, y solo propias', () => {
  err(E.post('imagen.subir', { tipo: 'captura', mime: 'image/webp', base64: Buffer.from('no soy imagen').toString('base64') }, miembroToken), 'DATO_INVALIDO');
  err(E.post('imagen.subir', { tipo: 'captura', mime: 'image/gif', base64: WEBP }, miembroToken), 'DATO_INVALIDO');
  const { id } = ok(E.post('imagen.subir', { tipo: 'captura', mime: 'image/webp', base64: WEBP }, miembroToken));
  assert.equal(E.archivos[id].compartido, 'ANYONE_WITH_LINK:VIEW');
  const advId = ok(E.get({ accion: 'miembro', id: miembroId })).adventurers[0].id;
  const base = { id: advId, adventurer: 'Midori', arma: 'heavy_bowgun', poder_total: 16851 };
  ok(E.post('adventurer.guardar', { ...base, capturas: [id] }, miembroToken));
  err(E.post('adventurer.guardar', { ...base, capturas: ['archivo-ajeno'] }, miembroToken), 'DATO_INVALIDO');
  // Al quitar la captura, va a la papelera.
  ok(E.post('adventurer.guardar', { ...base, capturas: [] }, miembroToken));
  assert.equal(E.archivos[id].papelera, true);
});

test('config: solo admin, WhatsApp validado y visible solo con sesión', () => {
  err(E.post('config.guardar', { gremio_rango: '9' }, miembroToken), 'SIN_PERMISO');
  err(E.post('config.guardar', { whatsapp_invitacion: 'https://malo.com/x' }, adminToken), 'DATO_INVALIDO');
  err(E.post('config.guardar', { _secreto: 'x' }, adminToken), 'DATO_INVALIDO');
  ok(E.post('config.guardar', { gremio_rango: '9', whatsapp_invitacion: 'https://chat.whatsapp.com/AbC123' }, adminToken));
  const inicio = ok(E.get({ accion: 'inicio' }));
  assert.equal(inicio.gremio.gremio_rango, '9');
  assert.equal(inicio.gremio.whatsapp_invitacion, undefined);
  assert.equal(ok(E.post('sesion', {}, miembroToken)).miembro.whatsapp_invitacion, 'https://chat.whatsapp.com/AbC123');
});

test('config: horarios y números validados', () => {
  err(E.post('config.guardar', { clash_hora: '8:15 pm' }, adminToken), 'DATO_INVALIDO');
  err(E.post('config.guardar', { clash_dia: '7' }, adminToken), 'DATO_INVALIDO');
  err(E.post('config.guardar', { carnival_horas: '12:00, 25:00' }, adminToken), 'DATO_INVALIDO');
  err(E.post('config.guardar', { carnival_horas: ' ' }, adminToken), 'DATO_INVALIDO');
  err(E.post('config.guardar', { gremio_nombre: '  ' }, adminToken), 'DATO_INVALIDO');
  ok(E.post('config.guardar', { carnival_horas: ' 12:00 , 18:30', clash_dia: '5', clash_hora: '21:00', zona_juego_offset_min: '-300' }, adminToken));
  const g = ok(E.get({ accion: 'inicio' })).gremio;
  assert.equal(g.carnival_horas, '12:00,18:30');
  assert.equal(g.clash_dia, '5');
  assert.equal(g.zona_juego_offset_min, '-300');
  ok(E.post('config.guardar', { clash_dia: '6', clash_hora: '20:15', carnival_horas: '12:00,18:00', zona_juego_offset_min: '-360' }, adminToken));
});

test('cambiar el código del clan', () => {
  ok(E.post('config.codigoClan', { codigo: 'nuevo-codigo' }, adminToken));
  err(E.post('registro', { codigo_clan: CODIGO, nick: 'Nuevo', pin: '246810' }), 'CODIGO_INVALIDO');
  ok(E.post('registro', { codigo_clan: 'nuevo-codigo', nick: 'Nuevo', pin: '246810' }));
});

test('logout invalida el token; acciones desconocidas y JSON roto', () => {
  const t = ok(E.post('login', { nick: 'nuevo', pin: '246810' })).token;
  ok(E.post('logout', {}, t));
  err(E.post('sesion', {}, t), 'SESION_VENCIDA');
  err(E.post('hackear', {}), 'ACCION_DESCONOCIDA');
  err(E.get({ accion: 'nada' }), 'ACCION_DESCONOCIDA');
  E.run('memoTablas_ = {}');
  const roto = JSON.parse(E.ctx.doPost({ postData: { contents: '{roto' } }).getContent());
  err(roto, 'JSON_INVALIDO');
  assert.deepEqual(E.ctx.__errores, [], 'hubo errores internos: ' + JSON.stringify(E.ctx.__errores));
});
