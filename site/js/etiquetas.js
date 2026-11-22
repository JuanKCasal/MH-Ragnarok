/** Etiquetas en español de los enums (claves estables en inglés). Ver SPEC.md §5.4. */

export const ARMAS = {
  great_sword: { es: 'Gran espada', en: 'Great Sword' },
  long_sword: { es: 'Espada larga', en: 'Long Sword' },
  dual_blades: { es: 'Espadas dobles', en: 'Dual Blades' },
  hammer: { es: 'Martillo', en: 'Hammer' },
  charge_blade: { es: 'Hacha cargada', en: 'Charge Blade' },
  lance: { es: 'Lanza', en: 'Lance' },
  heavy_bowgun: { es: 'Ballesta pesada', en: 'Heavy Bowgun' },
  bow: { es: 'Arco', en: 'Bow' },
};

export const ELEMENTOS = {
  fire: 'Fuego', water: 'Agua', thunder: 'Trueno', ice: 'Hielo', dragon: 'Dragón', none: 'Sin elemento',
};

export const TIPOS = { assault: 'Asalto', disruptor: 'Alterador', support: 'Apoyo' };

export const TIPOS_NOTICIA = { juego: 'Juego', gremio: 'Gremio', evento: 'Evento' };

export const arma = (k) => ARMAS[k]?.es ?? '';
export const armaBilingue = (k) => (ARMAS[k] ? `${ARMAS[k].es} · ${ARMAS[k].en}` : '');
export const elemento = (k) => ELEMENTOS[k] ?? '';
export const tipo = (k) => TIPOS[k] ?? '';

export const CATEGORIAS_GUIA = {
  'primeros-pasos': 'Primeros pasos', armas: 'Armas', rostros: 'Rostros', camaradas: 'Camaradas', eventos: 'Eventos', otros: 'Otros',
};
export const NIVELES_GUIA = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
