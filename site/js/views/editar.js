/**
 * Editor de una noticia o guía (oficiales): Markdown con botones de formato, vista previa,
 * portada, borrador/publicar, fijar y eliminar. Ver SPEC.md §2 (#/editor/noticia/:id?, #/editor/guia/:id?).
 * Lo que se escribe se copia en este dispositivo mientras no se guarde (borradores.js).
 */
import { escribir, ErrorApi } from '../api.js';
import { sesion, tieneRol, olvidarSesion, esSesionCaida } from '../auth.js';
import { ir, rutaActual } from '../router.js';
import { html, pintar, crudo, numero } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { ICONOS } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { campo, activarCampos, mostrarErrores, limpiarErrores, errorGeneral, ocupado, datosDe } from '../ui/form.js';
import { TIPOS_NOTICIA, CATEGORIAS_GUIA, NIVELES_GUIA } from '../etiquetas.js';
import { validarContenido, LIMITES_CONTENIDO } from '../validar.js';
import { renderMarkdown, slug as slugDe } from '../markdown.js';
import { comprimir, urlImagen } from '../image.js';
import { aplicarFormato, ACCIONES } from '../editor-formato.js';
import { fechaRelativa, fechaLarga, tiempo, activarAnclas, portada } from '../ui/contenido.js';
import { leerBorrador, guardarBorrador, borrarBorrador } from '../borradores.js';
import { insigniaNivel } from './guias.js';
import { incrustarBuilds } from '../ui/tarjeta-build.js';
import { soloOficiales } from './editor.js';

const ANCHO_DOBLE = '(min-width: 1000px)';

const radios = (nombre, opciones, actual, leyenda) => html`
  <fieldset class="campo campo--grupo" data-campo="${nombre}">
    <legend class="campo__etiqueta">${leyenda}</legend>
    <div class="opciones">${opciones.map(([v, t]) => html`
      <label class="opcion"><input type="radio" name="${nombre}" value="${v}" ${v === actual ? 'checked' : ''}><span>${t}</span></label>`)}
    </div>
    <p class="campo__error" hidden></p>
  </fieldset>`;

const CHULETA = [
  ['## Título de sección', 'Título (en las guías arma el índice)'],
  ['**negrita**  ·  *cursiva*', 'Resaltar palabras'],
  ['- algo', 'Lista con viñetas'],
  ['1. algo', 'Lista numerada'],
  ['> Ojo con esto', 'Aviso destacado'],
  ['[texto](https://…)', 'Enlace a otra web'],
  ['[Eventos](#/eventos)', 'Enlace a una sección de esta web'],
  ['![descripción](enlace de Drive)', 'Imagen del Drive del clan'],
  ['| A | B |', 'Tabla (una fila por línea)'],
  ['---', 'Línea separadora'],
];

export default async function vistaEditar(el, { params, recargar }) {
  const tipo = rutaActual().camino.split('/')[2] === 'guia' ? 'guia' : 'noticia';
  const esGuia = tipo === 'guia';
  const nombre = esGuia ? 'guía' : 'noticia';
  const lista = `#/editor${esGuia ? '?tipo=guia' : ''}`;
  const rutaEsta = () => `editor/${tipo}${item.id ? `/${item.id}` : ''}`;
  if (!tieneRol('oficial')) return soloOficiales(el, `editor/${tipo}${params.id ? `/${params.id}` : ''}`, esGuia ? 'Editar guía' : 'Editar noticia');
  const s = sesion();

  let item = { id: '', titulo: '', resumen: '', cuerpo_md: '', portada_id: '', publicado: false, fijada: false,
    tipo: 'gremio', categoria: 'primeros-pasos', nivel: 'basico', orden: '', slug: '' };

  /** Si la sesión venció, guarda lo escrito y manda a Entrar. Si no, devuelve el mensaje del error. */
  function manejar(e, porDefecto) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Lo que escribiste quedó en este dispositivo: entra y sigue.', { error: true, ms: 5000 });
      ir(`/entrar?volver=${encodeURIComponent(rutaEsta())}`);
      return null;
    }
    return e instanceof ErrorApi ? e.message : (e?.message || porDefecto);
  }

  if (params.id) {
    pintar(el, cargando());
    try {
      item = { ...item, ...(await escribir('editor.contenido', { tipo, id: params.id }, s.token)) };
    } catch (e) {
      if (e.codigo === 'NO_EXISTE') {
        borrarBorrador(tipo, params.id);
        pintar(el, html`<a class="volver" href="${lista}">Editor</a>
          <div class="vacio"><p>Esta ${nombre} ya no existe: puede que otro oficial la haya eliminado.</p>
            <a class="boton boton--chico" href="${lista}">Volver al editor</a></div>`);
        return { titulo: 'Editor' };
      }
      if (manejar(e) === null) return { titulo: 'Editor' };
      fallo(el, e, recargar);
      return { titulo: 'Editor' };
    }
  }
  let portadaId = item.portada_id || '';
  let subiendo = false;
  let trabajando = false;
  let eliminado = false;
  const titulo = item.id ? (esGuia ? 'Editar guía' : 'Editar noticia') : (esGuia ? 'Nueva guía' : 'Nueva noticia');

  pintar(el, html`
    ${avisoDemo('Modo demostración: lo que publiques se ve en la web mientras no recargues la página, pero no se guarda de verdad.')}
    <a class="volver" href="${lista}">Editor</a>
    <header class="cabeza-pagina">
      <h1 class="titulo titulo--pagina">${titulo}</h1>
      <p class="editor-estado" data-estado></p>
    </header>
    <div class="editor-aviso" data-recuperar></div>
    <div class="pestanas" role="tablist" aria-label="Editar o ver cómo queda">
      <button type="button" role="tab" id="tab-editar" aria-controls="panel-editar" aria-selected="true" data-pestana="editar">Editar</button>
      <button type="button" role="tab" id="tab-previa" aria-controls="panel-previa" aria-selected="false" tabindex="-1" data-pestana="previa">Vista previa</button>
    </div>
    <div class="editor-zona" data-zona="editar">
      <form class="formulario editor-form" id="panel-editar" role="tabpanel" aria-labelledby="tab-editar" novalidate>
        ${campo({ nombre: 'titulo', etiqueta: 'Título', valor: item.titulo, attrs: { required: true, maxlength: LIMITES_CONTENIDO.titulo, 'data-contador': true, autocomplete: 'off' } })}
        ${esGuia
          ? html`
            ${campo({ nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', valor: item.categoria, opciones: Object.entries(CATEGORIAS_GUIA) })}
            ${radios('nivel', Object.entries(NIVELES_GUIA), item.nivel || 'basico', 'Nivel')}`
          : radios('tipo', Object.entries(TIPOS_NOTICIA), item.tipo || 'gremio', 'Tipo')}
        ${campo({ nombre: 'resumen', etiqueta: 'Resumen', tipo: 'textarea', opcional: true, valor: item.resumen,
          ayuda: esGuia ? 'Una o dos frases: se ve en la lista de guías.' : 'Una o dos frases: se ve en la lista, en el Inicio y al compartir.',
          attrs: { maxlength: LIMITES_CONTENIDO.resumen, rows: 2, 'data-contador': true } })}

        <fieldset class="campo campo--grupo">
          <legend class="campo__etiqueta">Portada <span class="campo__opcional">opcional</span></legend>
          <div class="editor-portada" data-portada></div>
          <p class="campo__ayuda">Mejor horizontal: se recorta a 16:9. Se comprime en tu dispositivo antes de subir.</p>
        </fieldset>

        <div class="campo" data-campo="cuerpo_md">
          <label class="campo__etiqueta" for="ed-cuerpo">Texto</label>
          <div class="formato" role="toolbar" aria-label="Formato del texto" aria-controls="ed-cuerpo">
            ${Object.entries(ACCIONES).map(([k, a]) => html`<button type="button" class="formato__boton formato__boton--${k}" data-formato="${k}" title="${a.ayuda}" aria-label="${a.ayuda}">${a.texto}</button>`)}
          </div>
          <textarea class="entrada editor-cuerpo" id="ed-cuerpo" name="cuerpo_md" rows="14" spellcheck="true" aria-describedby="ed-cuerpo-cuenta ed-cuerpo-error">${item.cuerpo_md}</textarea>
          <p class="campo__contador editor-cuenta" id="ed-cuerpo-cuenta"></p>
          <p class="campo__error" id="ed-cuerpo-error" hidden></p>
          <details class="desplegable">
            <summary>Cómo dar formato</summary>
            <dl class="chuleta">${CHULETA.map(([c, d]) => html`<div><dt><code>${c}</code></dt><dd>${d}</dd></div>`)}</dl>
            <p class="nota">Los enlaces solo pueden ser https:// o secciones de esta web. Para una imagen, súbela al Drive del clan y pega su enlace de compartir.</p>
          </details>
        </div>

        ${esGuia
          ? html`<details class="desplegable desplegable--panel" ${item.orden ? 'open' : ''}>
              <summary>Más opciones</summary>
              <div class="formulario formulario--anidado">
                ${campo({ nombre: 'slug', etiqueta: 'Dirección de la guía', opcional: true, valor: item.slug,
                  ayuda: 'Vacía, se arma con el título. Si la cambias en una guía ya publicada, los enlaces que se compartieron dejan de funcionar.',
                  attrs: { maxlength: 60, autocapitalize: 'none', spellcheck: 'false', autocomplete: 'off' } })}
                ${campo({ nombre: 'orden', etiqueta: 'Orden dentro de su categoría', opcional: true, valor: item.orden || '',
                  ayuda: '1 va primero. Vacío = 0.', attrs: { inputmode: 'numeric', maxlength: 5, autocomplete: 'off' } })}
              </div>
            </details>
            <p class="nota editor-direccion" data-direccion></p>`
          : html`<label class="interruptor interruptor--texto">
              <input type="checkbox" name="fijada" ${item.fijada ? 'checked' : ''}>
              <span><strong>Fijar arriba de todo</strong><span class="nota">Queda primera en Noticias y en el Inicio hasta que la desfijes.</span></span>
            </label>`}
      </form>
      <section class="editor-previa" id="panel-previa" role="tabpanel" aria-labelledby="tab-previa" data-previa></section>
    </div>
    <p class="error-form" role="alert" hidden></p>
    <div class="franja-acciones editor-acciones" data-acciones></div>
    <div class="editor-pie" data-pie></div>`);

  const form = el.querySelector('form');
  const zona = el.querySelector('[data-zona]');
  const cuerpo = form.elements.cuerpo_md;
  const $ = (sel) => el.querySelector(sel);
  activarCampos(form);

  // ---------- Estado y cambios sin guardar ----------
  const estadoForm = () => ({ ...datosDe(form), portada_id: portadaId });
  let instantanea = JSON.stringify(estadoForm());
  const sucio = () => !eliminado && JSON.stringify(estadoForm()) !== instantanea;

  function pintarEstado() {
    const ver = esGuia ? `#/guias/${encodeURIComponent(item.slug)}` : `#/noticias/${encodeURIComponent(item.id)}`;
    pintar($('[data-estado]'), html`
      <span class="estado-pub estado-pub--${item.publicado ? 'publicada' : 'borrador'}">${item.publicado ? 'Publicada' : item.id ? 'Borrador' : 'Sin guardar'}</span>
      ${item.publicado ? html`<a href="${ver}">Ver en la web</a>` : item.id ? html`<span>Solo la ven los oficiales</span>` : ''}
      ${item.actualizado ? html`<span class="nota">Guardada ${tiempo(item.actualizado, fechaRelativa(item.actualizado))}</span>` : ''}
      ${sucio() ? html`<span class="editor-estado__sucio">Cambios sin guardar</span>` : ''}`);
  }

  function pintarAcciones() {
    pintar($('[data-acciones]'), item.publicado
      ? html`<button type="button" class="boton boton--tenue" data-guardar="borrador" aria-label="Ocultar: pasa a borrador y deja de verse en la web">Ocultar</button>
             <button type="button" class="boton boton--oro" data-guardar="publicar" aria-label="Guardar los cambios (sigue publicada)">Guardar</button>`
      : html`<button type="button" class="boton boton--tenue" data-guardar="borrador" aria-label="Guardar como borrador (solo lo ven los oficiales)">Borrador</button>
             <button type="button" class="boton boton--oro" data-guardar="publicar">Publicar</button>`);
    pintar($('[data-pie]'), item.id
      ? html`<button type="button" class="boton boton--ancho boton--peligro" data-eliminar>Eliminar ${nombre}</button>`
      : '');
    actualizarBotones();
  }

  const actualizarBotones = () => {
    el.querySelectorAll('[data-guardar], [data-eliminar]').forEach((b) => { if (!b.hasAttribute('aria-busy')) b.disabled = subiendo || trabajando; });
  };

  // ---------- Copia local ----------
  let tCopia = 0;
  const copiar = () => {
    if (eliminado) return;
    if (sucio()) guardarBorrador(tipo, item.id, estadoForm()); else borrarBorrador(tipo, item.id);
  };

  function alCambiar() {
    clearTimeout(tCopia);
    tCopia = setTimeout(copiar, 500);
    pintarEstado();
    contar();
    direccion();
    programarPrevia();
  }
  form.addEventListener('input', alCambiar);
  form.addEventListener('change', alCambiar);
  form.addEventListener('submit', (ev) => ev.preventDefault());

  const local = leerBorrador(tipo, item.id);
  if (local && JSON.stringify(local.datos) !== instantanea) {
    pintar($('[data-recuperar]'), html`
      <div class="alerta alerta--accion">
        ${crudo(ICONOS.info)}
        <div>
          <p>Tienes cambios sin guardar de esta ${nombre} en este dispositivo (${fechaRelativa(new Date(local.t).toISOString())}).</p>
          <div class="alerta__botones">
            <button type="button" class="boton boton--chico boton--oro" data-recuperar-si>Recuperarlos</button>
            <button type="button" class="boton boton--chico boton--tenue" data-recuperar-no>Descartar</button>
          </div>
        </div>
      </div>`);
    $('[data-recuperar-si]').addEventListener('click', () => {
      for (const ctrl of form.elements) {
        if (!ctrl.name) continue;
        if (ctrl.type === 'checkbox') ctrl.checked = !!local.datos[ctrl.name];
        else if (ctrl.type === 'radio') ctrl.checked = local.datos[ctrl.name] === ctrl.value;
        else if (local.datos[ctrl.name] !== undefined) ctrl.value = local.datos[ctrl.name];
      }
      portadaId = local.datos.portada_id || '';
      pintarPortada();
      form.querySelectorAll('[data-contador]').forEach((c) => c.dispatchEvent(new Event('input', { bubbles: true })));
      alCambiar();
      pintar($('[data-recuperar]'), '');
      toast('Recuperado. Guarda para no perderlo.');
    });
    $('[data-recuperar-no]').addEventListener('click', () => {
      borrarBorrador(tipo, item.id);
      pintar($('[data-recuperar]'), '');
    });
  }

  // ---------- Texto: contador, formato y dirección ----------
  const cuenta = $('#ed-cuerpo-cuenta');
  function contar() {
    const n = cuerpo.value.length;
    cuenta.textContent = `${numero(n)} / ${numero(LIMITES_CONTENIDO.cuerpo_md)}`;
    cuenta.classList.toggle('editor-cuenta--excede', n > LIMITES_CONTENIDO.cuerpo_md);
  }
  contar();

  const barra = form.querySelector('.formato');
  // En el escritorio, que el clic no le quite la selección al texto.
  barra.addEventListener('mousedown', (ev) => { if (ev.target.closest('[data-formato]')) ev.preventDefault(); });
  barra.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-formato]');
    if (!b) return;
    const r = aplicarFormato(cuerpo.value, cuerpo.selectionStart, cuerpo.selectionEnd, b.dataset.formato);
    cuerpo.value = r.texto;
    cuerpo.focus({ preventScroll: true });
    cuerpo.setSelectionRange(r.inicio, r.fin);
    cuerpo.dispatchEvent(new Event('input', { bubbles: true }));
  });

  function direccion() {
    const p = $('[data-direccion]');
    if (!p) return;
    const s2 = slugDe(form.elements.slug.value || form.elements.titulo.value);
    p.textContent = s2 ? `Dirección: …/#/guias/${s2}` : '';
  }
  direccion();

  // ---------- Portada ----------
  const zonaPortada = $('[data-portada]');
  const entradaArchivo = html`<input type="file" accept="image/*" class="oculto-visual" data-archivo>`;
  function pintarPortada() {
    const src = urlImagen(portadaId, 1000);
    pintar(zonaPortada, subiendo
      ? html`<div class="editor-portada__vacia editor-portada__vacia--subiendo" aria-busy="true"><span>Subiendo portada…</span></div>`
      : src
        ? html`<img class="portada" src="${src}" alt="Portada actual">
               <div class="editor-portada__botones">
                 <label class="boton boton--chico">Cambiar${entradaArchivo}</label>
                 <button type="button" class="boton boton--chico boton--tenue" data-quitar-portada>Quitar</button>
               </div>`
        : html`<label class="editor-portada__vacia">
                 <span class="boton boton--chico">Elegir imagen</span>
                 ${entradaArchivo}
               </label>`);
    actualizarBotones();
  }
  pintarPortada();

  zonaPortada.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-quitar-portada]')) return;
    portadaId = '';
    pintarPortada();
    alCambiar();
    toast('Portada quitada. Se borra al guardar.');
  });
  zonaPortada.addEventListener('change', async (ev) => {
    if (!ev.target.matches('[data-archivo]')) return;
    const archivo = ev.target.files?.[0];
    ev.target.value = '';
    if (!archivo) return;
    subiendo = true;
    pintarPortada();
    try {
      const img = await comprimir(archivo, { lado: 1600 });
      const { id } = await escribir('imagen.subir', { ...img, tipo: 'portada' }, s.token);
      portadaId = id;
    } catch (e) {
      const msg = manejar(e, 'No se pudo subir la portada.');
      if (msg) toast(msg, { error: true });
    } finally {
      subiendo = false;
      pintarPortada();
      alCambiar();
    }
  });

  // ---------- Vista previa ----------
  const previa = $('[data-previa]');
  const anchoDoble = matchMedia(ANCHO_DOBLE);
  let tPrevia = 0;
  const previaVisible = () => anchoDoble.matches || zona.dataset.zona === 'previa';

  function pintarPrevia() {
    const d = datosDe(form);
    const { html: cuerpoHtml, titulos } = renderMarkdown(d.cuerpo_md || '');
    const secciones = titulos.filter((t) => t.nivel === 2);
    const fecha = item.publicado && item.fecha_pub ? tiempo(item.fecha_pub, fechaLarga(item.fecha_pub)) : 'al publicar';
    pintar(previa, html`
      <p class="rotulo editor-previa__rotulo">Así se verá</p>
      <article class="articulo">
        <header class="articulo__cabeza">
          <p class="articulo__meta">
            ${esGuia
              ? html`<span class="rotulo">${CATEGORIAS_GUIA[d.categoria] || 'Guía'}</span>${insigniaNivel(d.nivel)}`
              : html`<span class="noticia-tarjeta__tipo noticia-tarjeta__tipo--${d.tipo}">${TIPOS_NOTICIA[d.tipo] || 'Gremio'}</span>
                     <span aria-hidden="true">·</span> ${fecha}
                     ${d.fijada ? html`<span class="noticia-tarjeta__fijada">${crudo(ICONOS.fijar)}Fijada</span>` : ''}`}
          </p>
          <h2 class="titulo titulo--pagina">${d.titulo?.trim() || 'Sin título'}</h2>
          ${d.resumen?.trim() ? html`<p class="articulo__entrada">${d.resumen.trim()}</p>` : ''}
          <p class="nota">Por ${item.autor || s.miembro.nick}</p>
        </header>
        ${portada(portadaId, '')}
        ${esGuia && secciones.length >= 3
          ? html`<nav class="indice" aria-label="Índice de la guía">
              <p class="rotulo">En esta guía</p>
              <ol>${secciones.map((t) => html`<li><a href="#${t.id}" data-ancla="${t.id}">${t.texto}</a></li>`)}</ol>
            </nav>`
          : ''}
        ${cuerpoHtml
          ? html`<div class="prosa">${crudo(cuerpoHtml)}</div>`
          : html`<p class="nota">El texto aparece aquí a medida que escribes.</p>`}
      </article>`);
    incrustarBuilds(previa, { acciones: false });
  }
  function programarPrevia() {
    if (!previaVisible()) return;
    clearTimeout(tPrevia);
    tPrevia = setTimeout(pintarPrevia, 180);
  }
  if (anchoDoble.matches) pintarPrevia();
  const alCambiarAncho = () => { if (anchoDoble.matches) pintarPrevia(); };
  anchoDoble.addEventListener('change', alCambiarAncho);

  activarAnclas(previa);
  // En la vista previa los enlaces no navegan (se perdería lo escrito); los de otras webs se abren aparte.
  previa.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (!a || a.hasAttribute('data-ancla')) return;
    ev.preventDefault();
    if (a.protocol === 'https:') window.open(a.href, '_blank', 'noopener');
    else toast('Los enlaces a la web funcionan al publicar.');
  });

  const pestanas = [...el.querySelectorAll('[data-pestana]')];
  function elegirPestana(cual, enfocar = false) {
    zona.dataset.zona = cual;
    pestanas.forEach((b) => {
      const si = b.dataset.pestana === cual;
      b.setAttribute('aria-selected', String(si));
      b.tabIndex = si ? 0 : -1;
      if (si && enfocar) b.focus();
    });
    if (cual === 'previa') pintarPrevia();
  }
  el.querySelector('.pestanas').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pestana]');
    if (b) elegirPestana(b.dataset.pestana);
  });
  el.querySelector('.pestanas').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    elegirPestana(zona.dataset.zona === 'editar' ? 'previa' : 'editar', true);
  });

  // ---------- Guardar, publicar y eliminar ----------
  async function guardar(publicar, boton) {
    if (subiendo || trabajando) return;
    limpiarErrores(form);
    errorGeneral(el, '');
    const { datos, errores } = validarContenido(tipo, datosDe(form));
    if (Object.keys(errores).length) {
      elegirPestana('editar');
      mostrarErrores(form, errores);
      return;
    }
    const envio = { ...(item.id ? { id: item.id } : {}), ...datos, portada_id: portadaId, publicado: publicar };
    if (!esGuia) envio.fijada = form.elements.fijada.checked;
    const antes = { id: item.id, publicado: item.publicado };
    trabajando = true;
    ocupado(boton, true, publicar ? (item.publicado ? 'Guardando…' : 'Publicando…') : 'Guardando…');
    actualizarBotones();
    try {
      const r = await escribir(`${tipo}.guardar`, envio, s.token);
      item = { ...item, ...r, autor: item.autor || r.autor || s.miembro.nick };
      borrarBorrador(tipo, antes.id);
      borrarBorrador(tipo, item.id);
      if (!antes.id) history.replaceState(null, '', `#/${rutaEsta()}`);
      if (esGuia) form.elements.slug.value = item.slug || '';
      instantanea = JSON.stringify(estadoForm());
      toast(publicar
        ? (antes.publicado ? 'Cambios publicados.' : `${esGuia ? 'Guía publicada' : 'Noticia publicada'}. Ya la ve todo el clan.`)
        : (antes.publicado ? 'Oculta: pasó a borrador y ya no se ve en la web.' : 'Borrador guardado. Solo lo ven los oficiales.'));
    } catch (e) {
      const msg = manejar(e, 'No se pudo guardar. Inténtalo de nuevo.');
      if (msg) errorGeneral(el, msg);
    } finally {
      trabajando = false;
      ocupado(boton, false);
      pintarAcciones();
      pintarEstado();
      direccion();
      if (previaVisible()) pintarPrevia();
    }
  }

  $('[data-acciones]').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-guardar]');
    if (b) guardar(b.dataset.guardar === 'publicar', b);
  });

  // Eliminar: dos toques (sin diálogos del navegador).
  let armado = 0;
  $('[data-pie]').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-eliminar]');
    if (!b || trabajando) return;
    if (!armado) {
      b.textContent = 'Toca otra vez para eliminar';
      b.classList.add('boton--peligro-armado');
      armado = setTimeout(() => {
        armado = 0;
        b.textContent = `Eliminar ${nombre}`;
        b.classList.remove('boton--peligro-armado');
      }, 4000);
      return;
    }
    clearTimeout(armado);
    armado = 0;
    trabajando = true;
    ocupado(b, true, 'Eliminando…');
    actualizarBotones();
    try {
      await escribir(`${tipo}.eliminar`, { id: item.id }, s.token);
      eliminado = true;
      borrarBorrador(tipo, item.id);
      toast(`${esGuia ? 'La guía' : 'La noticia'} se eliminó.`);
      ir(lista.slice(1));
    } catch (e) {
      trabajando = false;
      ocupado(b, false);
      actualizarBotones();
      const msg = manejar(e, 'No se pudo eliminar. Inténtalo de nuevo.');
      if (msg) toast(msg, { error: true });
    }
  });

  // Cerrar la pestaña con cambios: el navegador pregunta (la copia local queda igual).
  const alSalir = (ev) => { if (sucio()) { ev.preventDefault(); ev.returnValue = ''; } };
  window.addEventListener('beforeunload', alSalir);

  pintarEstado();
  pintarAcciones();

  return {
    titulo,
    limpiar() {
      window.removeEventListener('beforeunload', alSalir);
      anchoDoble.removeEventListener('change', alCambiarAncho);
      clearTimeout(tCopia);
      clearTimeout(tPrevia);
      clearTimeout(armado);
      if (sucio()) {
        copiar();
        toast(`Tus cambios quedaron guardados en este dispositivo. Vuelve a abrir la ${nombre} para seguir.`, { ms: 5000 });
      }
    },
  };
}
