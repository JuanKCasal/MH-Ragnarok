/** Arranque: cabecera, barra de navegación, rutas y sesión. */
import { iniciarRouter, ruta } from './router.js';
import { sesion, alCambiarSesion, revalidar } from './auth.js';
import { html, crudo, pintar } from './ui/dom.js';
import { ICONOS, emblema } from './ui/iconos.js';
import { iniciarBrasas } from './ui/brasas.js';
import { vigilarVersion } from './ui/actualizacion.js';
import { VERSION } from './version.js';

const SECCIONES = [
  { id: 'inicio', ruta: '#/', texto: 'Inicio' },
  { id: 'noticias', ruta: '#/noticias', texto: 'Noticias' },
  { id: 'guias', ruta: '#/guias', texto: 'Guías' },
  { id: 'miembros', ruta: '#/miembros', texto: 'Miembros' },
  { id: 'eventos', ruta: '#/eventos', texto: 'Eventos' },
];

const pronto = () => import('./views/pronto.js');

ruta('/', () => import('./views/inicio.js'), { seccion: 'inicio' });
ruta('/eventos', () => import('./views/eventos.js'), { seccion: 'eventos' });
ruta('/clash/armar', () => import('./views/armar.js'), { seccion: 'eventos' });
ruta('/noticias', () => import('./views/noticias.js'), { seccion: 'noticias' });
ruta('/noticias/:id', () => import('./views/noticia.js'), { seccion: 'noticias' });
ruta('/guias', () => import('./views/guias.js'), { seccion: 'guias' });
ruta('/guias/:slug', () => import('./views/guia.js'), { seccion: 'guias' });
ruta('/miembros', () => import('./views/miembros.js'), { seccion: 'miembros' });
ruta('/miembros/:id', () => import('./views/miembro.js'), { seccion: 'miembros' });
ruta('/entrar', () => import('./views/entrar.js'));
ruta('/registro', () => import('./views/registro.js'));
ruta('/yo', () => import('./views/yo.js'));
ruta('/yo/adventurer', () => import('./views/adventurer.js'));
ruta('/yo/adventurer/:id', () => import('./views/adventurer.js'));
ruta('/editor', () => import('./views/editor.js'));
ruta('/editor/noticia', () => import('./views/editar.js'), { seccion: 'noticias' });
ruta('/editor/noticia/:id', () => import('./views/editar.js'), { seccion: 'noticias' });
ruta('/editor/guia', () => import('./views/editar.js'), { seccion: 'guias' });
ruta('/editor/guia/:id', () => import('./views/editar.js'), { seccion: 'guias' });
ruta('/404', pronto);

function pintarNavegacion() {
  const enlaces = (conIcono) => SECCIONES.map((s) => html`
    <a href="${s.ruta}" data-seccion="${s.id}">${conIcono ? crudo(ICONOS[s.id]) : ''}<span>${s.texto}</span></a>`);
  pintar(document.querySelector('.nav-escritorio'), html`${enlaces(false)}`);
  pintar(document.querySelector('.barra'), html`${enlaces(true)}`);
  pintar(document.querySelector('.marca'), html`${crudo(emblema({ decorativo: true }))}<span>RAGNAROK</span>`);
}

function marcarSeccion(id) {
  document.querySelectorAll('[data-seccion]').forEach((a) => {
    if (a.dataset.seccion === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function pintarCuenta(s = sesion()) {
  const el = document.querySelector('.cuenta');
  pintar(el, s
    ? html`<a class="cuenta__nick" href="#/yo">${s.miembro.nick}</a>`
    : html`<a class="boton boton--chico" href="#/entrar">Entrar</a>`);
}

const brasas = iniciarBrasas();

pintarNavegacion();
pintarCuenta();
alCambiarSesion(pintarCuenta);
iniciarRouter(document.getElementById('vista'), {
  onNavegar: (id) => {
    marcarSeccion(id);
    // Fuego pleno en el Inicio; más tenue en las pantallas de trabajo (Eventos, armado…).
    brasas.intensidad(id === 'inicio' ? 1 : 0.55);
  },
});
revalidar();
vigilarVersion();
if (VERSION !== 'dev') {
  const v = document.createElement('span');
  v.className = 'pie__version';
  v.textContent = `Versión ${VERSION}`;
  document.querySelector('.pie')?.append(v);
}
