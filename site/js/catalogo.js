/**
 * Carga del catálogo estático del builder (site/data/catalogo/*.json). Ver docs/BUILDER.md §2.
 * Se pide solo al abrir el builder o una build. El versionado del despliegue reescribe CSS/JS
 * pero no los fetch de JSON: por eso se añade ?v= a mano.
 * Encima se aplican los nombres ES que corrigieron los oficiales (E6, hoja Catalogo): si el
 * backend no responde o aún no tiene esa acción, el catálogo sale igual con los de GameWith.
 */
import { VERSION } from './version.js';
import { indexarCatalogo } from './build-calc.js';
import { leer } from './api.js';
import { aplicarNombres } from './nombres.js';

export const ARCHIVOS = ['meta', 'armaduras', 'armas', 'sets', 'habilidades', 'monstruos', 'adventurers', 'rostros', 'rostros-sets', 'camaradas', 'reflexiones'];
let promesa = null;

export function cargarCatalogo() {
  if (!promesa) {
    const correcciones = leer('catalogo_nombres').catch(() => []);
    promesa = Promise.all(ARCHIVOS.map(async (n) => {
      const r = await fetch(`data/catalogo/${n}.json?v=${encodeURIComponent(VERSION)}`);
      if (!r.ok) throw new Error('No se pudo cargar el catálogo del juego. Revisa tu conexión e inténtalo de nuevo.');
      return [n, await r.json()];
    })).then(async (pares) => aplicarNombres(indexarCatalogo(Object.fromEntries(pares)), await correcciones))
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** Tras quitar una corrección hay que volver al nombre de GameWith: se recarga todo la próxima vez. */
export function olvidarCatalogo() {
  promesa = null;
}
