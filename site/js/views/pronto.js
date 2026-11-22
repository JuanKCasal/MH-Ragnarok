/** Secciones que llegan en la próxima entrega del frontend v1. */
import { html, pintar } from '../ui/dom.js';
import { rutaActual } from '../router.js';

const TEXTOS = {
  noticias: ['Noticias', 'Aquí van las crónicas del gremio y las novedades del juego, con filtro por tipo.'],
  guias: ['Guías', 'Guías para nuevos: primeros pasos, armas, Rostros, Camaradas y eventos.'],
  miembros: ['Miembros', 'El directorio del clan con los adventurers y el poder de cada cazador.'],
};

export default function vistaPronto(el) {
  const clave = rutaActual().camino.split('/')[1] || '';
  const [titulo, texto] = TEXTOS[clave] || ['Página no encontrada', 'Esta dirección no existe. Vuelve al inicio del salón.'];
  const existe = clave in TEXTOS;
  pintar(el, html`
    <section class="pronto">
      <h1 class="titulo titulo--pagina">${titulo}</h1>
      <p>${texto}</p>
      ${existe ? html`<p class="nota">Esta sección llega en la próxima entrega de la web.</p>` : ''}
      <a class="boton" href="#/">Volver al inicio</a>
    </section>`);
  return { titulo };
}
