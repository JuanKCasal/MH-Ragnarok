/** Inicio: estandarte del gremio, datos, próximo Clash, Carnival y crónicas. Ver SPEC.md §2. */
import { leer, MODO_DEMO } from '../api.js';
import { sesion } from '../auth.js';
import { html, crudo, pintar, numero, romano } from '../ui/dom.js';
import { emblema } from '../ui/iconos.js';
import { avisoDemo, cargando, fallo, cfgEventos, horaLocal, duracion } from '../ui/comun.js';
import { iniciarRelojes } from '../ui/reloj.js';
import { proximoClash, proximoCarnival, formatoLocal } from '../time.js';
import { TIPOS_NOTICIA } from '../etiquetas.js';

function desde(declaracion) {
  const m = String(declaracion || '').match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  return m ? `Desde el ${m[1]}·${m[2]}·${m[3]}.` : '';
}

/** Hora local de cada sesión del Carnival (dadas en hora del juego). */
function horasCarnivalLocales(cfg) {
  return cfg.carnival.horas.map((h) => {
    const [hh, mm] = h.split(':').map(Number);
    return horaLocal(new Date(Date.UTC(2026, 0, 15, hh, (mm || 0) - cfg.offsetJuegoMin)));
  });
}

const fechaCorta = (iso) => {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return { dia: '', mes: '' };
  return {
    dia: f.getDate(),
    mes: new Intl.DateTimeFormat('es', { month: 'short' }).format(f).replace('.', ''),
  };
};

function cronica(n) {
  const { dia, mes } = fechaCorta(n.fecha_pub);
  const juego = n.tipo === 'juego';
  return html`
    <li><a class="cronica" href="#/noticias/${encodeURIComponent(n.id)}">
      <span class="cronica__fecha ${juego ? 'cronica__fecha--juego' : ''}" aria-hidden="true">${dia}<small>${mes}</small></span>
      <span class="cronica__cuerpo">
        <span class="cronica__tipo ${juego ? 'cronica__tipo--juego' : ''}">${TIPOS_NOTICIA[n.tipo] || 'Gremio'}</span>
        <span class="cronica__titulo">${n.titulo}</span>
      </span>
    </a></li>`;
}

export default async function vistaInicio(el, { recargar }) {
  pintar(el, cargando());
  let d;
  try {
    d = await leer('inicio', {}, { alRefrescar: recargar });
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Inicio' };
  }

  const g = d.gremio || {};
  const cfg = cfgEventos(g);
  const ahora = new Date();
  const clash = proximoClash(ahora, cfg);
  const carnival = proximoCarnival(ahora, cfg);
  const s = sesion();
  const max = Number(g.max_miembros) || 52;
  const confirmados = d.clash?.confirmados ?? 0;
  const pct = Math.min(100, Math.round((confirmados / Math.max(1, d.miembros || max)) * 100));
  const nombre = (g.gremio_nombre || 'Ragnarok').toUpperCase();

  pintar(el, html`
    ${avisoDemo()}
    <div class="inicio">
      <section class="inicio__salon" aria-labelledby="titulo-gremio">
        <div class="estandarte-bloque">
          <div class="estandarte__barra" aria-hidden="true"></div>
          <div class="estandarte">
            ${crudo(emblema())}
            ${g.gremio_rango ? html`<p class="estandarte__rango">RANGO ${romano(g.gremio_rango)}</p>` : ''}
          </div>
          <h1 class="titulo-gremio" id="titulo-gremio">${nombre}</h1>
          <p class="lema">${numero(d.miembros)} cazadores. Una sola cacería. ${desde(g.gremio_declaracion)}</p>
        </div>

        <dl class="datos">
          <div><dt class="rotulo">Miembros</dt><dd class="datos__valor num">${d.miembros}/${max}</dd></div>
          <div><dt class="rotulo">Etiqueta</dt><dd class="datos__valor datos__valor--texto">${g.gremio_etiqueta || '—'}</dd></div>
          <div><dt class="rotulo">Líder</dt><dd class="datos__valor">${g.lider_juego || '—'}</dd></div>
        </dl>
      </section>

      <div class="inicio__tablon">
        <section class="panel proximo" aria-labelledby="t-clash">
          <h2 class="titulo" id="t-clash">Próximo Guild Clash</h2>
          ${clash.enCurso
            ? html`<p class="proximo__curso"><span class="insignia insignia--curso">En curso · termina en <span data-hasta="${clash.fin.getTime()}"></span></span></p>`
            : html`<p class="cifra proximo__cifra" aria-live="off"><span data-hasta="${clash.inicio.getTime()}"></span></p>`}
          <p class="proximo__cuando">${formatoLocal(clash.inicio)} en tu hora · dura ~${duracion(cfg.clash.duracionMin)}</p>
          <div class="proximo__asistencia">
            <div class="barra-progreso" role="presentation"><span style="width:${pct}%"></span></div>
            <p class="nota num">${confirmados} de ${d.miembros} confirmados</p>
          </div>
          ${s
            ? html`<a class="boton boton--oro boton--ancho latido" href="#/eventos">Confirmar asistencia</a>`
            : html`<a class="boton boton--oro boton--ancho latido" href="#/entrar?volver=eventos">Entrar para confirmar</a>`}
        </section>

        <section class="panel-sencillo" aria-labelledby="t-carnival">
          <div>
            <h2 class="evento-linea__nombre" id="t-carnival">Guild Carnival</h2>
            <p class="evento-linea__hora">Diario · ${horasCarnivalLocales(cfg).join(' y ')} tu hora</p>
          </div>
          ${carnival.enCurso
            ? html`<span class="insignia insignia--curso">En curso · <span data-hasta="${carnival.fin.getTime()}"></span></span>`
            : html`<span class="insignia">En <span data-hasta="${carnival.inicio.getTime()}"></span></span>`}
        </section>

        <section class="seccion" aria-labelledby="t-cronicas">
          <div class="encabezado">
            <h2 class="titulo" id="t-cronicas">Crónicas</h2>
            <a href="#/noticias">Ver todas</a>
          </div>
          ${d.noticias?.length
            ? html`<ul class="cronicas">${d.noticias.map(cronica)}</ul>${MODO_DEMO ? html`<p class="nota">Crónicas de ejemplo.</p>` : ''}`
            : html`<p class="vacio">Todavía no hay crónicas. Los oficiales publicarán aquí las novedades del gremio.</p>`}
        </section>

        ${!s || MODO_DEMO
          ? html`<section class="llamado" aria-labelledby="t-unete">
              <h2 class="titulo titulo--menor" id="t-unete">¿Eres del clan?</h2>
              <p>Regístrate con el código del grupo y muestra tus adventurers.</p>
              <a class="boton" href="#/registro">Registrarme</a>
            </section>`
          : ''}
      </div>
    </div>`);

  iniciarRelojes(recargar);
  return { titulo: 'Inicio' };
}
