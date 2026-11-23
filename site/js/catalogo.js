/**
 * Carga del catálogo estático del builder (site/data/catalogo/*.json). Ver docs/BUILDER.md §2.
 * Se pide solo al abrir el builder o una build. El versionado del despliegue reescribe CSS/JS
 * pero no los fetch de JSON: por eso se añade ?v= a mano.
 */
import { VERSION } from './version.js';
import { indexarCatalogo } from './build-calc.js';

export const ARCHIVOS = ['meta', 'armaduras', 'armas', 'sets', 'habilidades', 'monstruos', 'adventurers'];
let promesa = null;

export function cargarCatalogo() {
  if (!promesa) {
    promesa = Promise.all(ARCHIVOS.map(async (n) => {
      const r = await fetch(`data/catalogo/${n}.json?v=${encodeURIComponent(VERSION)}`);
      if (!r.ok) throw new Error('No se pudo cargar el catálogo del juego. Revisa tu conexión e inténtalo de nuevo.');
      return [n, await r.json()];
    })).then((pares) => indexarCatalogo(Object.fromEntries(pares)))
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}
