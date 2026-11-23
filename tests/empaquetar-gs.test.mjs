import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { empaquetar } from '../scripts/empaquetar-gs.mjs';

test('el backend en un solo archivo compila y trae todas las funciones de entrada', async () => {
  const { texto, archivos } = await empaquetar();
  assert.equal(archivos.length, 12);
  assert.doesNotThrow(() => new vm.Script(texto, { filename: 'MH-Ragnarok.gs' }));
  for (const f of ['doGet', 'doPost', 'instalar', 'configurarCodigoClan', 'crearAdmin', 'limpiarSesiones']) {
    assert.match(texto, new RegExp(`\\nfunction ${f}\\(`), f);
  }
  assert.doesNotMatch(texto, /\r/);
});
