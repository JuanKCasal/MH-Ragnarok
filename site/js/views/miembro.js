/** Perfil público de un miembro: datos y todos sus adventurers. Ver SPEC.md §2 (#/miembros/:id). */
import { leer } from '../api.js';
import { sesion } from '../auth.js';
import { html, pintar, crudo } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { bandera, nombrePais } from '../validar.js';
import { avatar, tarjetaAdventurer } from './yo.js';

const ROLES = { admin: 'Admin', oficial: 'Oficial', miembro: 'Miembro' };
const MES = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('ID copiado. Pégalo en el juego para agregarlo como amigo.');
  } catch {
    toast('No se pudo copiar. Mantén presionado el número para copiarlo.', { error: true });
  }
}

export default async function vistaMiembro(el, { params, recargar }) {
  pintar(el, cargando());
  let m;
  try {
    m = await leer('miembro', { id: params.id });
  } catch (e) {
    if (e.codigo === 'NO_EXISTE') {
      pintar(el, html`
        <a class="volver" href="#/miembros">Miembros</a>
        <div class="vacio"><p>Este cazador ya no está en el gremio o el enlace está mal escrito.</p>
          <a class="boton boton--chico" href="#/miembros">Ver todos los miembros</a></div>`);
      return { titulo: 'Miembro' };
    }
    fallo(el, e, recargar);
    return { titulo: 'Miembro' };
  }

  const esYo = sesion()?.miembro?.id === m.id;
  const advs = [...(m.adventurers || [])];
  // El principal va primero: es el que cuenta para el Guild Clash.
  advs.sort((a, b) => (b.id === m.adventurer_principal_id) - (a.id === m.adventurer_principal_id));
  const lugar = [bandera(m.pais), nombrePais(m.pais)].filter(Boolean).join(' ');
  const desde = m.creado && !Number.isNaN(Date.parse(m.creado)) ? `En el gremio desde ${MES.format(new Date(m.creado))}` : '';

  pintar(el, html`
    ${avisoDemo()}
    <a class="volver" href="#/miembros">Miembros</a>

    <header class="perfil-cabeza">
      <div class="perfil-cabeza__foto">${avatar(m, 88)}</div>
      <div class="perfil-cabeza__texto">
        <h1 class="titulo titulo--pagina">${m.nick}</h1>
        <p class="apoyo">${[ROLES[m.rol], lugar].filter(Boolean).join(' · ')}</p>
        ${m.nick_juego && m.nick_juego !== m.nick ? html`<p class="nota">En el juego: ${m.nick_juego}</p>` : ''}
      </div>
    </header>

    ${m.bio ? html`<p class="perfil-bio">${m.bio}</p>` : ''}

    ${m.uid_juego || desde || esYo
      ? html`<div class="perfil-datos">
          ${m.uid_juego
            ? html`<div class="panel-sencillo perfil-uid">
                <span><span class="rotulo">ID de jugador</span><span class="perfil-uid__num">${m.uid_juego}</span></span>
                <button type="button" class="boton boton--chico" data-copiar>Copiar</button>
              </div>`
            : ''}
          ${desde ? html`<p class="nota">${desde}</p>` : ''}
          ${esYo ? html`<a class="boton boton--chico boton--tenue" href="#/yo">Editar mi perfil</a>` : ''}
        </div>`
      : ''}

    <section class="seccion" aria-labelledby="t-advs">
      <div class="encabezado">
        <h2 class="titulo" id="t-advs">Adventurers</h2>
        ${advs.length ? html`<span class="nota">${advs.length}</span>` : ''}
      </div>
      ${advs.length
        ? html`<div class="advs">${advs.map((a) => {
            const principal = a.id === m.adventurer_principal_id;
            return tarjetaAdventurer(a, { principal, desglose: principal });
          })}</div>`
        : html`<div class="vacio"><p>${esYo ? 'Todavía no cargas ningún adventurer.' : `${m.nick} todavía no carga sus adventurers.`}</p>
            ${esYo ? html`<a class="boton boton--oro boton--chico" href="#/yo/adventurer">Agregar adventurer</a>` : ''}</div>`}
      ${advs.some((a) => a.id === m.adventurer_principal_id)
        ? html`<p class="nota nota--icono">${crudo(ICONOS.info)}<span>El poder del principal es el que se usa para armar las brigadas del Guild Clash.</span></p>`
        : ''}
    </section>`);

  el.querySelector('[data-copiar]')?.addEventListener('click', () => copiar(String(m.uid_juego)));
  return { titulo: m.nick };
}
