import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './gas-mock.mjs';

let E, admin, pepe, pepeId;
const CODIGO = 'ragna-2026';
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.data; };
const err = (r, codigo) => { assert.equal(r.ok, false, 'se esperaba error ' + codigo); assert.equal(r.error.codigo, codigo, r.error.mensaje); };

before(() => {
  E = crearEntorno();
  E.run('instalar()');
  E.run(`setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + ${JSON.stringify(CODIGO)}))`);
  E.run(`crearAdmin_('Juan', '135790')`);
  admin = ok(E.post('login', { nick: 'juan', pin: '135790' })).token;
  const p = ok(E.post('registro', { codigo_clan: CODIGO, nick: 'Pepe', pin: '246810' }));
  pepe = p.token; pepeId = p.miembro.id;
});

test('nombres ES (E6): solo oficiales escriben; lectura pública; quitar vuelve al de GameWith', () => {
  assert.deepEqual(ok(E.get({ accion: 'catalogo_nombres' })), []);
  const base = { tipo: 'arma', id: 'scintillant-bayard', en: 'Scintillant Bayard', es: 'Nombre de prueba' };
  err(E.post('catalogo.nombre', base), 'SIN_SESION');
  err(E.post('catalogo.nombre', base, pepe), 'SIN_PERMISO');
  ok(E.post('miembro.rol', { miembro_id: pepeId, rol: 'oficial' }, admin));

  err(E.post('catalogo.nombre', { ...base, tipo: 'adventurer' }, pepe), 'DATO_INVALIDO');
  err(E.post('catalogo.nombre', { ...base, id: 'Scintillant Bayard' }, pepe), 'DATO_INVALIDO');

  const g = ok(E.post('catalogo.nombre', { ...base, es: '  Nombre   de prueba ' }, pepe));
  assert.equal(g.es, 'Nombre de prueba');
  assert.equal(g.validado, true);
  assert.equal(g.por, 'Pepe');

  // Reemplaza (no duplica) y la lectura pública lo trae (la caché se invalida al escribir).
  ok(E.post('catalogo.nombre', { ...base, es: 'Otro nombre' }, admin));
  ok(E.post('catalogo.nombre', { tipo: 'habilidad', id: 'fire-damage-up', en: 'Fire Damage Up', es: 'Mejora de daño de fuego' }, pepe));
  let lista = ok(E.get({ accion: 'catalogo_nombres' }));
  assert.equal(lista.length, 2);
  const arma = lista.find((x) => x.tipo === 'arma');
  assert.equal(arma.es, 'Otro nombre');
  assert.equal(arma.por, 'Juan');
  assert.equal(arma.en, 'Scintillant Bayard');

  ok(E.post('catalogo.nombre', { ...base, es: '' }, pepe));
  lista = ok(E.get({ accion: 'catalogo_nombres' }));
  assert.deepEqual(lista.map((x) => x.id), ['fire-damage-up']);
});

// ---------- Frontend: aplicar las correcciones sobre el catálogo real ----------
import { readFileSync } from 'node:fs';
import { indexarCatalogo, nombreEs, nombreOk } from '../site/js/build-calc.js';
import { ARCHIVOS } from '../site/js/catalogo.js';
import { aplicarNombres, entradasNombres, claveNombre, partirNombre, baseEs } from '../site/js/nombres.js';

const catalogo = () => indexarCatalogo(Object.fromEntries(ARCHIVOS.map((n) =>
  [n, JSON.parse(readFileSync(new URL(`../site/data/catalogo/${n}.json`, import.meta.url), 'utf8'))])));

test('claves y partes del nombre EN', () => {
  assert.equal(claveNombre("Hunter's Helm"), 'hunter-helm');
  assert.equal(claveNombre('Flammenzahn+'), 'flammenzahn-plus');
  assert.equal(claveNombre('Wyvern Blade "Holly"'), 'wyvern-blade-holly');
  assert.deepEqual(partirNombre('Scintillant Bayard (Fire) III', true), { base: 'Scintillant Bayard', el: 'Fire', num: ' III' });
  assert.equal(baseEs('Gran espada de cresta carmesí de gremio (fuego) III'), 'Gran espada de cresta carmesí de gremio');
});

test('aplicarNombres: arma por nombre base (todas las rarezas y elementos), radiante derivada, fichas confirmadas', () => {
  const cat = catalogo();
  const fuego = cat.armas.get('scintillant-bayard-fire');
  const radiante = cat.lista.armas.find((w) => /^Radiant Twin Flames/.test(w.nombres[0][1]));
  assert.equal(nombreEs(fuego, 14), '');
  aplicarNombres(cat, [
    { tipo: 'arma', id: 'scintillant-bayard', es: 'Nombre ES' },
    { tipo: 'arma', id: 'twin-flames', es: 'Llamas gemelas' },
    { tipo: 'pieza', id: 'rathalos-helm', es: 'Casco de Rathalos' },
    { tipo: 'habilidad', id: 'critical-element', es: 'Elemento crítico (ok)' },
    { tipo: 'set', id: 'rathalos-weakness', es: 'Debilidad de Rathalos' },
    { tipo: 'monstruo', id: 'rathalos', es: 'Rathalos' },
    { tipo: 'nada', id: 'x', es: 'se ignora' },
  ]);
  assert.match(nombreEs(fuego, 14), /^Nombre ES \(fuego\)( [IVX]+)?$/);
  assert.equal(nombreOk(fuego, 14), true);
  assert.match(nombreEs(radiante, radiante.rmax), /^Llamas gemelas radiante/);
  assert.equal(nombreOk(radiante, radiante.rmax), false);
  const casco = cat.armaduras.get('rathalos-helm-ii');
  assert.ok(casco.nombres.every((t) => /^Casco de Rathalos [IVX]+$/.test(t[2]) && t[3] === true));
  // La radiante del casco ya tenía nombre de GameWith: no se pisa.
  assert.match(nombreEs(cat.lista.armaduras.find((p) => /^Radiant Rathalos Helm/.test(p.nombres[0][1])), 13), /^Yelmo de Rathalos radiante/);
  assert.equal(cat.habilidades.get('critical-element').esOk, true);
  assert.equal(cat.habilidades.get('critical-element-control')?.es ?? 'Elemento crítico (ok)', 'Elemento crítico (ok)');
  assert.equal(cat.sets.get('rathalos-weakness').esOk, true);
  assert.equal(cat.monstruos.get('rathalos').esOk, true);
});

test('entradasNombres: una por nombre base, con estado en / gw / ok', () => {
  const cat = aplicarNombres(catalogo(), [{ tipo: 'pieza', id: 'rathalos-helm', es: 'Yelmo de Rathalos' }]);
  const piezas = entradasNombres(cat, 'pieza');
  assert.equal(new Set(piezas.map((x) => x.id)).size, piezas.length);
  assert.equal(piezas.find((x) => x.id === 'rathalos-helm').estado, 'ok');
  assert.equal(piezas.find((x) => x.id === 'rathalos-mail').estado, 'gw');
  assert.equal(piezas.find((x) => x.id === 'diablos-nero-helm').estado, 'en');
  const armas = entradasNombres(cat, 'arma');
  assert.ok(!armas.some((x) => /\(Fire\)/.test(x.en)), 'el elemento no es una entrada aparte');
  assert.equal(armas.find((x) => x.id === 'scintillant-bayard').estado, 'en');
  const habs = entradasNombres(cat, 'habilidad');
  assert.ok(!habs.some((x) => /-s0$/.test(x.id)), 'sin variantes repetidas');
  assert.ok(habs.some((x) => x.id === 'bow-mastery' && x.estado === 'en'));
});
