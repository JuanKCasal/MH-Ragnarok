/** Página no encontrada (rutas que no existen). Las secciones "próximamente" ya están todas hechas. */
import { html, pintar } from '../ui/dom.js';

export default function vistaNoEncontrada(el) {
  pintar(el, html`
    <section class="pronto">
      <h1 class="titulo titulo--pagina">Página no encontrada</h1>
      <p>Esta dirección no existe. Vuelve al inicio del salón.</p>
      <a class="boton" href="#/">Volver al inicio</a>
    </section>`);
  return { titulo: 'Página no encontrada' };
}
