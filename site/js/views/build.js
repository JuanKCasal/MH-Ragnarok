/**
 * Builder · hoja única con cajones (opción C). Ver docs/BUILDER.md (E2: adventurer, arma y armadura).
 * #/build/nueva[?adv=<id de mi adventurer>]  ·  #/build/:id
 * Cualquiera puede armar y mirar; guardar requiere sesión. E4: Rostros, Camarada, Reflexiones y Recuerdo (Keepsake).
 */
import { leer, escribir, ErrorApi } from '../api.js';
import { sesion, olvidarSesion, esSesionCaida, tieneRol } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, numero } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { toast } from '../ui/toast.js';
import { ARMAS } from '../etiquetas.js';
import { cargarCatalogo } from '../catalogo.js';
import { calcular, limpiarBuild, buildVacia, conPoder, conPieza, conRostro, conCamarada, conAdventurer, resumenParaGuardar, PARTES, NOMBRE_PARTE,
  CALIDADES, COSTO_ROSTROS, CARTAS_ROSTROS, CAMARADA_NV_MAX, ESTRELLAS_MAX, PODER_MAX,
  conReflexion, conCapReflexiones, REFLEXION_CAP_MAX, conGrabado, conRangoGrabado, conDatoKeepsake, KEEPSAKE_NV_MAX, FILAS_GRABADO } from '../build-calc.js';
import { abrirSelector } from '../ui/selector-pieza.js';
import { abrirSelectorRostro } from '../ui/selector-rostro.js';
import { abrirSelectorCamarada } from '../ui/selector-camarada.js';
import { chipsHab, statsArma, nombreElemento, bilingue, bil, bilFicha, chipsSetsRostro, listaSetsRostros,
  textoAumento, tipoCamarada, TIPOS_CAMARADA } from '../ui/build-textos.js';
import { leerBorrador, guardarBorrador, borrarBorrador } from '../borradores.js';

const FILTROS_HAB = [['todas', 'Todas'], ['sobra', 'Sobran'], ['tope', 'Al tope'], ['falta', 'Les falta']];

function nombreAdv(cat, id) {
  const a = cat.adventurers.get(id);
  if (!a) return '';
  return a.en === 'Fated Adventurer' ? `${a.en} · ${ARMAS[a.arma]?.es}` : a.en;
}

/** Adventurer del catálogo que corresponde a uno del perfil (mismo nombre o el Fated de esa arma). */
function advDelPerfil(cat, a) {
  if (!a) return null;
  const n = String(a.adventurer || '').trim().toLowerCase();
  return cat.lista.adventurers.find((x) => x.en.toLowerCase() === n && x.arma === a.arma)
    || cat.lista.adventurers.find((x) => x.id === `fated-adventurer-${String(a.arma).replace(/_/g, '-')}`) || null;
}

export default async function vistaBuild(el, { params, query, recargar }) {
  const s = sesion();
  pintar(el, cargando());
  let cat;
  let guardada = null;
  let misAdvs = [];
  try {
    const [c, g, perfil] = await Promise.all([
      cargarCatalogo(),
      params.id ? leer('build', { id: params.id }) : null,
      s ? leer('miembro', { id: s.miembro.id }).catch(() => null) : null,
    ]);
    cat = c;
    guardada = g;
    misAdvs = perfil?.adventurers || [];
  } catch (e) {
    fallo(el, e, recargar);
    return { titulo: 'Build' };
  }

  const esMia = !guardada || (s && guardada.miembro_id === s.miembro.id);
  const editable = !guardada || (s && (esMia || tieneRol('oficial')));
  const volverA = guardada && !esMia ? (guardada.autor ? `#/miembros/${guardada.autor.id}` : '#/') : s ? '#/yo' : '#/';
  // El borrador local solo cubre builds nuevas (una por dispositivo); las guardadas viven en el servidor.
  const claveBorrador = '';

  // Estado
  let b;
  let meta;
  let recuperado = false;
  if (guardada) {
    b = limpiarBuild(cat, guardada.datos);
    meta = { nombre: guardada.nombre, clase: guardada.clase, adventurer_id: guardada.adventurer_id || '', notas: guardada.notas || '' };
  } else {
    const borr = leerBorrador('build', '');
    if (borr?.datos?.b) {
      b = limpiarBuild(cat, borr.datos.b);
      meta = { nombre: '', clase: 'perfil', adventurer_id: '', notas: '', ...borr.datos.meta };
      recuperado = true;
    } else {
      b = buildVacia();
      meta = { nombre: '', clase: 'perfil', adventurer_id: '', notas: '' };
    }
    const delPerfil = query.adv ? misAdvs.find((a) => a.id === query.adv) : null;
    if (delPerfil) {
      meta.adventurer_id = delPerfil.id;
      const c = advDelPerfil(cat, delPerfil);
      if (c) b.adv = { id: c.id, ...(delPerfil.nivel ? { nivel: delPerfil.nivel } : {}) };
      if (!meta.nombre) meta.nombre = delPerfil.loadout || '';
    }
  }
  let vista = 'hoja';
  let filtroHab = 'todas';
  let abierto = b.adv ? 'armadura' : 'adv';
  let sucio = false;
  let selector = null;

  const advCat = () => (b.adv?.id ? cat.adventurers.get(b.adv.id) : null);
  const armaTipo = () => advCat()?.arma || (b.arma?.id ? cat.armas.get(b.arma.id)?.arma : '') || '';

  function cambiar(fn) {
    fn();
    sucio = true;
    if (!guardada) guardarBorrador('build', '', { b, meta });
    pintarTodo();
  }

  /* ---------- Piezas de la hoja ---------- */

  const selectRareza = (parte, item, r) => html`
    <label class="bld-rareza">
      <span class="oculto-visual">Rareza de ${parte === 'arma' ? 'arma' : NOMBRE_PARTE[parte].es.toLowerCase()}</span>
      <select data-rareza="${parte}" data-foco="r-${parte}" ${editable ? '' : 'disabled'}>
        ${Array.from({ length: item.rmax - item.rmin + 1 }, (_, i) => item.rmin + i).reverse()
          .map((n) => html`<option value="${n}" ${n === r ? 'selected' : ''}>${n}/${item.rmax}</option>`)}
      </select>
    </label>`;

  const botonCambiar = (parte, etiqueta) => (editable
    ? html`<button type="button" class="bld-cambiar" data-elegir="${parte}" data-foco="e-${parte}" aria-label="${etiqueta}"><span aria-hidden="true">⇄</span></button>`
    : '');

  // Poder a mano (hasta que exista el poder estimado, E7): mismo campo que en Camarada y Recuerdo.
  const campoPoder = (campo, etiqueta, ejemplo, ayuda = '') => html`
    <label class="campo bld-poder-campo"><span class="campo__etiqueta">${etiqueta}</span>
      <input class="entrada" data-poder="${campo}" data-foco="po-${campo}" inputmode="numeric" maxlength="7"
        value="${b.poder?.[campo] ?? ''}" placeholder="${ejemplo}" ${editable ? '' : 'disabled'}>
      ${ayuda ? html`<span class="campo__ayuda">${ayuda}</span>` : ''}</label>`;
  const conPoderTxt = (n) => (n === null || n === undefined ? '' : `poder ${numero(n)}`);

  function filaPieza(c, parte) {
    const p = c.piezas[parte];
    const n = NOMBRE_PARTE[parte];
    if (!p) {
      return html`<li class="bld-pieza bld-pieza--vacia">
        <span class="bld-pieza__parte">${n.corto}</span>
        <div class="bld-pieza__texto"><p class="bld-pieza__nombre">${n.es}</p><p class="nota">Sin pieza</p></div>
        ${editable ? html`<button type="button" class="boton boton--chico" data-elegir="${parte}" data-foco="e-${parte}">Elegir</button>` : ''}
      </li>`;
    }
    return html`<li class="bld-pieza">
      <span class="bld-pieza__parte" title="${n.es}">${n.corto}</span>
      <div class="bld-pieza__texto">
        <p class="bld-pieza__nombre">${bil(p.nombreEs, p.nombre, { ok: p.esOk })}</p>
        ${chipsHab(cat, p.habs)}
      </div>
      ${selectRareza(parte, p.item, p.r)}
      ${botonCambiar(parte, `Cambiar ${n.es.toLowerCase()}`)}
    </li>`;
  }

  function cajon(id, rotulo, resumen, cuerpo) {
    const open = abierto === id;
    return html`
      <section class="bld-cajon ${open ? 'bld-cajon--abierto' : ''}">
        <h2 class="bld-cajon__titulo">
          <button type="button" class="bld-cajon__boton" data-cajon="${id}" aria-expanded="${open}" aria-controls="cajon-${id}" data-foco="c-${id}">
            <span class="rotulo">${rotulo}</span>
            <span class="bld-cajon__resumen">${resumen}</span>
          </button>
        </h2>
        <div class="bld-cajon__cuerpo" id="cajon-${id}" ${open ? '' : 'hidden'}>${cuerpo}</div>
      </section>`;
  }

  function cajonAdv(c) {
    const adv = c.adv;
    const opcionesAdv = [['', 'Elige el adventurer'], ...cat.lista.adventurers.map((a) => [a.id, nombreAdv(cat, a.id)])];
    const arma = c.arma;
    const cuerpo = html`
      <div class="bld-datos">
        <label class="campo"><span class="campo__etiqueta">Nombre de la build</span>
          <input class="entrada" data-meta="nombre" value="${meta.nombre}" maxlength="40" placeholder="Por ejemplo: Fire Heavy" spellcheck="false" ${editable ? '' : 'disabled'}></label>
        <div class="campos-dos">
          <label class="campo"><span class="campo__etiqueta">Adventurer</span>
            <select class="entrada" data-adv data-foco="adv" ${editable ? '' : 'disabled'}>
              ${opcionesAdv.map(([v, t]) => html`<option value="${v}" ${v === (b.adv?.id || '') ? 'selected' : ''}>${t}</option>`)}
            </select></label>
          <label class="campo"><span class="campo__etiqueta">Nivel <span class="campo__opcional">opcional</span></span>
            <input class="entrada" data-nivel inputmode="numeric" maxlength="2" value="${b.adv?.nivel ?? ''}" ${editable && b.adv ? '' : 'disabled'}></label>
        </div>
        ${misAdvs.length && meta.clase === 'perfil' && esMia
          ? html`<label class="campo"><span class="campo__etiqueta">De mi perfil <span class="campo__opcional">opcional</span></span>
              <select class="entrada" data-meta="adventurer_id" ${editable ? '' : 'disabled'}>
                <option value="">No la uno a ninguno</option>
                ${misAdvs.map((a) => html`<option value="${a.id}" ${a.id === meta.adventurer_id ? 'selected' : ''}>${a.adventurer}${a.loadout ? ` · ${a.loadout}` : ''}</option>`)}
              </select>
              <span class="campo__ayuda">La build se mostrará junto a ese adventurer en tu perfil.</span></label>`
          : ''}
        ${campoPoder('maestria', 'Poder de Proof of Mastery', '220', 'Lo que tu rango de Proof of Mastery suma a todos tus adventurers (Legendary Traveler III: +220).')}
      </div>
      <div class="bld-arma">
        <p class="rotulo">Arma${adv ? ` · ${ARMAS[adv.arma]?.es}` : ''}</p>
        ${arma
          ? html`<div class="bld-pieza">
              <span class="bld-pieza__parte">Arm</span>
              <div class="bld-pieza__texto">
                <p class="bld-pieza__nombre">${bil(arma.nombreEs, arma.nombre, { ok: arma.esOk })}</p>
                <p class="nota">${statsArma(c)}</p>
                ${arma.item.innato ? chipsHab(cat, [[arma.item.innato.hab, arma.item.innato.nv]]) : ''}
              </div>
              ${selectRareza('arma', arma.item, arma.r)}
              ${botonCambiar('arma', 'Cambiar arma')}
            </div>`
          : html`<div class="bld-pieza bld-pieza--vacia">
              <span class="bld-pieza__parte">Arm</span>
              <div class="bld-pieza__texto"><p class="nota">${adv ? 'Sin arma' : 'Elige primero el adventurer.'}</p></div>
              ${editable && adv ? html`<button type="button" class="boton boton--chico" data-elegir="arma" data-foco="e-arma">Elegir</button>` : ''}
            </div>`}
      </div>`;
    const resumen = adv
      ? [b.adv.nivel ? `Nv ${b.adv.nivel}` : '', nombreAdv(cat, adv.id), arma ? `${arma.nombreEs || arma.nombre} ${arma.r}/${arma.item.rmax}` : 'sin arma'].filter(Boolean).join(' · ')
      : 'Sin elegir';
    return cajon('adv', 'Adventurer y arma', resumen, cuerpo);
  }

  function cajonArmadura(c) {
    const puestas = PARTES.filter((p) => c.piezas[p]);
    const rarezas = [...new Set(puestas.map((p) => c.piezas[p].r))];
    const resumen = !puestas.length ? 'Sin piezas'
      : rarezas.length === 1 && puestas.length === 5 ? `Todo en ${rarezas[0]}` : `${puestas.length} de 5 piezas`;
    const resumenArm = [resumen, conPoderTxt(b.poder?.equipo)].filter(Boolean).join(' · ');
    const cuerpo = html`
      <ul class="bld-piezas">${PARTES.map((p) => filaPieza(c, p))}</ul>
      ${campoPoder('equipo', 'Poder del equipo (arma + 5 piezas)', '7228', 'Suma el poder del arma y de las 5 piezas tal como sale en el juego.')}
      <ul class="bld-resumen-chips">
        <li class="bld-chip">Def. ${numero(c.def)}</li>
        ${c.sets.map((st) => html`<li class="bld-chip ${st.activo ? 'bld-chip--listo' : ''}">${bil(st.es, st.en)} ${Math.min(st.puestas, st.necesarias)}/${st.necesarias}${st.activo ? '' : ` · falta ${st.faltan}`}</li>`)}
      </ul>`;
    return cajon('armadura', `Armadura · ${puestas.length} de 5`, resumenArm, cuerpo);
  }

  /* ---------- Rostros ---------- */

  function filaRostro(c, ranura) {
    const esNucleo = ranura === 'nucleo';
    const f = c.rostros ? (esNucleo ? c.rostros.nucleo : c.rostros.cartas[ranura]) : null;
    const etiqueta = esNucleo ? 'Núc' : String(ranura + 1);
    const nombreRanura = esNucleo ? 'Núcleo' : `Rostro ${ranura + 1}`;
    if (!f) {
      return html`<li class="bld-pieza bld-pieza--vacia ${esNucleo ? 'bld-rostro--nucleo' : ''}">
        <span class="bld-pieza__parte">${etiqueta}</span>
        <div class="bld-pieza__texto"><p class="bld-pieza__nombre">${nombreRanura}</p><p class="nota">${esNucleo ? 'Su efecto núcleo solo cuenta aquí' : 'Sin Rostro'}</p></div>
        ${editable ? html`<button type="button" class="boton boton--chico" data-elegir-rostro="${ranura}" data-foco="er-${ranura}">Elegir</button>` : ''}
      </li>`;
    }
    const cal = CALIDADES.find((x) => x.id === f.cal);
    return html`<li class="bld-pieza bld-rostro ${esNucleo ? 'bld-rostro--nucleo' : ''}">
      <span class="bld-pieza__parte" title="${nombreRanura}">${etiqueta}</span>
      <div class="bld-pieza__texto">
        <p class="bld-pieza__nombre">${bilingue(f.item)} <span class="bld-costo" title="Costo">${f.item.costo}</span></p>
        ${chipsSetsRostro(cat, f.item.sets)}
        ${esNucleo && f.item.nucleo ? html`<p class="nota bld-nucleo-texto">${f.item.nucleo.es}</p>` : ''}
        <div class="bld-rostro__nivel">
          <label><span class="oculto-visual">Calidad de ${nombreRanura}</span>
            <select data-rostro-cal="${ranura}" data-foco="rc-${ranura}" ${editable ? '' : 'disabled'}>
              ${CALIDADES.map((q) => html`<option value="${q.id}" ${q.id === f.cal ? 'selected' : ''}>${q.en}</option>`)}
            </select></label>
          <label><span class="oculto-visual">Nivel de ${nombreRanura}</span>
            <select data-rostro-nv="${ranura}" data-foco="rn-${ranura}" ${editable && cal.nvMax > 1 ? '' : 'disabled'}>
              ${Array.from({ length: cal.nvMax }, (_, i) => cal.nvMax - i).map((n) => html`<option value="${n}" ${n === f.nv ? 'selected' : ''}>Nv ${n}</option>`)}
            </select></label>
        </div>
      </div>
      ${editable ? html`<button type="button" class="bld-cambiar" data-elegir-rostro="${ranura}" data-foco="er-${ranura}" aria-label="Cambiar ${nombreRanura.toLowerCase()}"><span aria-hidden="true">⇄</span></button>` : ''}
    </li>`;
  }

  function cajonRostros(c) {
    const r = c.rostros;
    const resumen = !r ? 'Sin Rostros'
      : [r.nucleo ? (r.nucleo.item.es || r.nucleo.item.en) : 'sin núcleo', `costo ${r.costo}/${COSTO_ROSTROS}`,
        r.setsActivos ? `${r.setsActivos} set${r.setsActivos > 1 ? 's' : ''} activo${r.setsActivos > 1 ? 's' : ''}` : '',
        conPoderTxt(b.poder?.rostros)].filter(Boolean).join(' · ');
    const cuerpo = html`
      <ul class="bld-piezas">${['nucleo', ...Array.from({ length: CARTAS_ROSTROS }, (_, i) => i)].map((k) => filaRostro(c, k))}</ul>
      <ul class="bld-resumen-chips">
        <li class="bld-chip ${r && r.costo > COSTO_ROSTROS ? 'bld-chip--mal' : r?.costo === COSTO_ROSTROS ? 'bld-chip--listo' : ''}">Costo ${r?.costo || 0}/${COSTO_ROSTROS}</li>
      </ul>
      ${r ? html`
        <label class="opcion bld-maestria"><input type="checkbox" data-maestria ${r.maestria ? 'checked' : ''} ${editable ? '' : 'disabled'}>
          <span>Proof of Mastery: el núcleo suma +1 a su set</span></label>
        <div class="bld-rsets-marco">${listaSetsRostros(r.sets)}</div>` : ''}
      ${campoPoder('rostros', 'Poder de Rostros', '2099')}
      <p class="nota bld-cajon__nota">Para los sets cuentan monstruos distintos: dos copias de la misma carta suman 1. Nombres en español de GameWith, por confirmar.</p>`;
    return cajon('rostros', `Rostros · ${r?.costo || 0}/${COSTO_ROSTROS}`, resumen, cuerpo);
  }

  /* ---------- Camarada ---------- */

  function cajonCamarada(c) {
    const cam = c.camarada;
    const advTipo = c.adv?.tipo || '';
    const numero_ = (n) => (n === null || n === undefined ? '' : n);
    const resumen = !cam ? 'Sin camarada'
      : [cam.item.es || cam.item.en, cam.nv ? `Nv ${cam.nv}` : '', cam.estrellas !== null ? `${cam.estrellas} ★` : '',
        cam.poder !== null ? `poder ${numero(cam.poder)}` : ''].filter(Boolean).join(' · ');
    const cuerpo = !cam
      ? html`<ul class="bld-piezas"><li class="bld-pieza bld-pieza--vacia">
          <span class="bld-pieza__parte">Cam</span>
          <div class="bld-pieza__texto"><p class="bld-pieza__nombre">Camarada</p>
            <p class="nota">${advTipo ? `Tu adventurer lleva uno de tipo ${TIPOS_CAMARADA[advTipo].es}` : 'Sin camarada'}</p></div>
          ${editable ? html`<button type="button" class="boton boton--chico" data-elegir-camarada data-foco="ecam">Elegir</button>` : ''}
        </li></ul>`
      : html`
        <ul class="bld-piezas"><li class="bld-pieza bld-camarada">
          <span class="bld-pieza__parte bld-rareza-cam bld-rareza-cam--${cam.item.rareza.toLowerCase()}" title="Rareza">${cam.item.rareza}</span>
          <div class="bld-pieza__texto">
            <p class="bld-pieza__nombre">${bil(cam.item.es, cam.item.en)}</p>
            <p class="nota">${tipoCamarada(cam.item.tipo)}</p>
            <p class="nota"><span class="rotulo">Aumento (Nv 80)</span> ${textoAumento(cam.item)}</p>
          </div>
          ${editable ? html`<button type="button" class="bld-cambiar" data-elegir-camarada data-foco="ecam" aria-label="Cambiar camarada"><span aria-hidden="true">⇄</span></button>` : ''}
        </li></ul>
        ${cam.compatible ? '' : html`<p class="alerta bld-alerta-cam">Es de tipo ${TIPOS_CAMARADA[cam.item.tipo].es} y tu adventurer es ${TIPOS_CAMARADA[advTipo].es}: el juego no deja ponérselo. Cámbialo por uno de tipo ${TIPOS_CAMARADA[advTipo].es}.</p>`}
        <div class="campos-tres bld-cam-datos">
          <label class="campo"><span class="campo__etiqueta">Nivel</span>
            <input class="entrada" data-cam="nv" data-foco="cam-nv" inputmode="numeric" maxlength="2" value="${numero_(cam.nv)}" placeholder="1–${CAMARADA_NV_MAX}" ${editable ? '' : 'disabled'}></label>
          <label class="campo"><span class="campo__etiqueta">Estrellas</span>
            <select class="entrada" data-cam="estrellas" data-foco="cam-es" ${editable ? '' : 'disabled'}>
              <option value="" ${cam.estrellas === null ? 'selected' : ''}>—</option>
              ${Array.from({ length: ESTRELLAS_MAX + 1 }, (_, i) => i).map((n) => html`<option value="${n}" ${n === cam.estrellas ? 'selected' : ''}>${n} ★</option>`)}
            </select></label>
          <label class="campo"><span class="campo__etiqueta">Poder</span>
            <input class="entrada" data-cam="poder" data-foco="cam-po" inputmode="numeric" maxlength="6" value="${numero_(cam.poder)}" placeholder="1998" ${editable ? '' : 'disabled'}></label>
        </div>`;
    return cajon('camarada', 'Camarada', resumen, html`${cuerpo}
      <p class="nota bld-cajon__nota">Nivel, estrellas y poder: cópialos de la pantalla del camarada en el juego (no hay tablas públicas). El aumento de aventurero es el de Nv 80 (GameWith); con menos nivel es menor.</p>`);
  }

  /* ---------- Reflexiones (Insights) ---------- */

  function cajonReflexiones(c) {
    const r = c.reflexiones;
    const numero_ = (n) => (n === null || n === undefined ? '' : n);
    if (!r) {
      return cajon('reflexiones', 'Reflexiones (Insight)', 'Sin adventurer', html`
        <p class="nota bld-cajon__nota">Elige primero el adventurer: cada uno tiene sus Reflexiones.</p>`);
    }
    const resumen = r.activas
      ? `${r.usados}${r.cap !== null ? `/${r.cap}` : ''} pts · ${r.activas === 1 ? '1 activa' : `${r.activas} activas`}`
      : (r.cap !== null ? `0/${r.cap} pts` : 'Sin reflexiones');
    const fila = (n) => html`
      <li class="bld-ref ${n.activa ? 'bld-ref--activa' : ''} ${!n.activa && (!n.cabe || n.bloqueada) ? 'bld-ref--no' : ''}">
        <label class="bld-ref__marca">
          <input type="checkbox" data-ref="${n.id}" data-foco="ref-${n.id}" ${n.activa ? 'checked' : ''}
            ${!editable || (!n.activa && (!n.cabe || n.bloqueada)) ? 'disabled' : ''}>
          <span class="bld-ref__texto">
            <span class="bld-ref__nombre">${bil(n.es, n.en)}</span>
            <span class="nota">${n.efecto}${!n.activa && n.bloqueada ? ' · Es de otra clase.' : !n.activa && !n.cabe ? ' · No te alcanzan los puntos.' : ''}</span>
          </span>
          <span class="bld-ref__pts" aria-label="${n.pts} puntos">${n.pts}</span>
        </label>
      </li>`;
    const TIPO = { assault: 'Asalto', disruptor: 'Alterador', support: 'Apoyo' };
    const grupos = [];
    const de = (g) => r.nodos.filter((n) => n.grupo === g);
    if (de('propia').length) grupos.push(['Propias', de('propia')]);
    if (de('arma').length) grupos.push(['Del arma', de('arma')]);
    for (const t of ['assault', 'disruptor', 'support']) {
      const xs = de('clase').filter((n) => n.tipo === t);
      if (!xs.length || (r.clase && r.clase !== t && !xs.some((n) => n.activa))) continue;
      grupos.push([`De clase · ${TIPO[t]}`, xs]);
    }
    grupos.push(['Comunes', de('comun')]);
    const esFated = de('clase').length > 0;
    const cuerpo = html`
      <div class="bld-ref-cabeza">
        <label class="campo"><span class="campo__etiqueta">Puntos de Reflexión</span>
          <input class="entrada" data-ref-cap data-foco="ref-cap" inputmode="numeric" maxlength="3" value="${numero_(r.cap)}" placeholder="65" ${editable ? '' : 'disabled'}></label>
        <p class="bld-ref-cuenta"><strong>${r.usados}</strong>${r.cap !== null ? html` de ${r.cap}` : ''} usados
          <span class="nota">· con todo: ${r.maximo}</span></p>
      </div>
      ${r.avisos.map((a) => html`<p class="alerta bld-alerta-cam">${a}</p>`)}
      ${r.incompleto ? html`<p class="nota bld-cajon__nota">GameWith todavía no publica las Reflexiones propias de este adventurer: por ahora solo salen las comunes.</p>` : ''}
      ${esFated ? html`<p class="nota bld-cajon__nota">${r.clase ? `Clase ${TIPO[r.clase]} (según tu camarada): solo se muestran las de esa clase.` : 'El Fated usa solo las Reflexiones de su clase. Elige el camarada y se muestran solo las de esa clase.'}</p>` : ''}
      ${grupos.map(([t, xs]) => html`
        <h3 class="rotulo bld-ref-grupo">${t}</h3>
        <ul class="bld-refs">${xs.map(fila)}</ul>`)}`;
    return cajon('reflexiones', 'Reflexiones (Insight)', resumen, html`${cuerpo}
      <p class="nota bld-cajon__nota">Escribe los puntos de Reflexión que tiene tu adventurer y marca las que tienes equipadas. Nombres y efectos según GameWith (resumidos, por confirmar).</p>`);
  }

  /* ---------- Recuerdo (Keepsake) y Grabados ---------- */

  function cajonKeepsake(c) {
    const k = c.keepsake;
    const numero_ = (n) => (n === null || n === undefined ? '' : n);
    const resumen = [k.nv ? `Nv ${k.nv}` : '', k.poder !== null ? `poder ${numero(k.poder)}` : '',
      k.hechos ? `grabados ${k.pct} %` : ''].filter(Boolean).join(' · ') || 'Sin datos';
    const CORTO = { sb: 'Hab.', ul: 'Def.', el: 'Elem.', cp: 'Pasiva', ca: 'Atrib.' };
    const falta = (x) => (x.abierto ? '' : ', te falta nivel');
    const clases = (x) => `bld-grab ${x.hecho ? 'bld-grab--hecho' : ''} ${x.abierto ? '' : 'bld-grab--cerrado'}`;
    const simple = (x, nombre) => html`
      <label class="${clases(x)}" title="${nombre} · Nv ${x.nv}${x.abierto ? '' : ' (te falta nivel)'}">
        <input type="checkbox" data-gra="${x.id}" data-foco="gra-${x.id}" ${x.hecho ? 'checked' : ''} ${!editable || (!x.abierto && !x.hecho) ? 'disabled' : ''}
          aria-label="${nombre}, nivel ${x.nv}${falta(x)}">
        <span aria-hidden="true">${x.hecho ? '✓' : x.abierto ? '' : '🔒'}</span>
      </label>`;
    // Nodo con rangos (3 o 4 puntos, como en el juego): cada toque sube un rango; desde el último vuelve a 0.
    const conRangos = (x, nombre) => html`
      <button type="button" class="${clases(x)} bld-grab--rangos ${x.hechos ? 'bld-grab--parcial' : ''}" data-gra-rango="${x.id}" data-foco="gra-${x.id}"
        title="${nombre} · Nv ${x.nv} · ${x.hechos} de ${x.rangos}${x.abierto ? '' : ' (te falta nivel)'}" ${!editable || (!x.abierto && !x.hechos) ? 'disabled' : ''}
        aria-label="${nombre}, nivel ${x.nv}, ${x.hechos} de ${x.rangos} rangos${falta(x)}${editable ? '. Toca para subir un rango' : ''}">
        <span class="bld-grab__puntos" aria-hidden="true">${Array.from({ length: x.rangos }, (_, i) => html`<i class="${i < x.hechos ? 'si' : ''}"></i>`)}</span>
        ${x.abierto || x.hechos ? '' : html`<span class="bld-grab__candado" aria-hidden="true">🔒</span>`}
      </button>`;
    const cuerpo = html`
      <div class="bld-cam-datos bld-kee-datos">
        <label class="campo"><span class="campo__etiqueta">Nivel del Recuerdo</span>
          <input class="entrada" data-kee="nv" data-foco="kee-nv" inputmode="numeric" maxlength="2" value="${numero_(k.nv)}" placeholder="1–${KEEPSAKE_NV_MAX}" ${editable ? '' : 'disabled'}></label>
        <label class="campo"><span class="campo__etiqueta">Poder</span>
          <input class="entrada" data-kee="poder" data-foco="kee-po" inputmode="numeric" maxlength="6" value="${numero_(k.poder)}" placeholder="5798" ${editable ? '' : 'disabled'}></label>
      </div>
      <div class="bld-grabados">
        <table class="bld-grab-tabla">
          <caption class="oculto-visual">Grabados por nivel del Recuerdo</caption>
          <thead><tr><th scope="col">Nv</th>${k.columnas.map((g) => html`<th scope="col" title="${g.es} (${g.en})">${CORTO[g.id]}</th>`)}</tr></thead>
          <tbody>
            ${FILAS_GRABADO.map((f) => html`<tr><th scope="row">${f.nv}</th>${k.columnas.map((g) => {
              const x = g.nodos.find((n) => n.fila === f.id);
              return x ? html`<td>${x.rangos > 1 ? conRangos(x, g.es) : simple(x, g.es)}</td>` : html`<td class="bld-grab-vacia" aria-label="nada">·</td>`;
            })}</tr>`)}
          </tbody>
        </table>
      </div>
      <p class="bld-ref-cuenta">Grabado <strong>${k.pct} %</strong> <span class="bld-kee-pasos">(${k.hechos} de ${k.total} pasos)</span></p>
      ${k.avisos.map((a) => html`<p class="alerta bld-alerta-cam">${a}</p>`)}
      <p class="nota bld-cajon__nota">${k.columnas.map((g) => `${CORTO[g.id]} = ${g.es} (${g.en})`).join(' · ')}. Marcar uno marca los anteriores de su columna (el juego pide hacerlos en orden). Los de 3 y 4 puntos tienen rangos: cada toque suma uno; desde el último vuelve a cero.</p>`;
    return cajon('keepsake', 'Recuerdo (Keepsake) y grabados', resumen, html`${cuerpo}
      <p class="nota bld-cajon__nota">Copia nivel, poder y grabados de la pantalla del Recuerdo en el juego (pestaña Engrave): el % debe darte igual que allí. Lo que hace cada grabado cambia según el adventurer.</p>`);
  }

  function vistaHoja(c) {
    return html`
      ${cajonAdv(c)}
      ${cajonArmadura(c)}
      ${cajonRostros(c)}
      ${cajonCamarada(c)}
      ${cajonReflexiones(c)}
      ${cajonKeepsake(c)}
      ${editable ? html`
        <label class="campo"><span class="campo__etiqueta">Notas <span class="campo__opcional">opcional</span></span>
          <textarea class="entrada" data-meta="notas" maxlength="500" rows="3" placeholder="Para qué monstruos la usas, qué cambiarías…">${meta.notas}</textarea></label>
        ${tieneRol('oficial') && esMia ? html`
          <label class="opcion bld-ejemplo"><input type="checkbox" data-ejemplo ${meta.clase === 'ejemplo' ? 'checked' : ''}>
            <span>Build de ejemplo (para guías; no cuenta en tu perfil)</span></label>` : ''}`
        : meta.notas ? html`<p class="perfil-bio">${meta.notas}</p>` : ''}`;
  }

  /* ---------- Habilidades (matriz habilidad × pieza) ---------- */

  function vistaHabilidades(c) {
    const lista = c.habilidades.filter((h) => filtroHab === 'todas' || h.estado === filtroHab);
    const cols = [['arma', 'Arm'], ...PARTES.map((p) => [p, NOMBRE_PARTE[p].corto]), ['set', 'Set'],
      ...(c.habilidades.some((h) => h.aportes.rostro) ? [['rostro', 'Ros']] : [])];
    const celda = (h, k) => (h.aportes[k] ? html`<td class="bld-matriz__n">${h.aportes[k]}</td>` : html`<td class="bld-matriz__vacia" aria-label="nada">·</td>`);
    return html`
      <div class="segmentos" role="group" aria-label="Filtrar habilidades">
        ${FILTROS_HAB.map(([k, t]) => html`<button type="button" data-filtro-hab="${k}" aria-pressed="${filtroHab === k}">${t}</button>`)}
      </div>
      ${c.habilidades.length
        ? html`<div class="bld-matriz-marco">
            <table class="bld-matriz">
              <caption class="rotulo">Nivel aportado por pieza</caption>
              <thead><tr><th scope="col">Habilidad</th>${cols.map(([, t]) => html`<th scope="col">${t}</th>`)}<th scope="col">Total</th></tr></thead>
              <tbody>
                ${lista.map((h) => html`
                  <tr class="bld-matriz__fila" data-hab="${h.id}" tabindex="0" aria-expanded="false">
                    <th scope="row">${bil(h.es, h.en, { ok: h.esOk })}${h.porConfirmar ? html` <span class="nota">(por confirmar)</span>` : ''}</th>
                    ${cols.map(([k]) => celda(h, k))}
                    <td class="bld-matriz__total bld-matriz__total--${h.estado}">${h.nivel}/${h.max}${h.sobra ? html`<small>+${h.sobra}</small>` : ''}</td>
                  </tr>`)}
                ${!lista.length ? html`<tr><td colspan="${cols.length + 2}" class="nota">Ninguna habilidad en este filtro.</td></tr>` : ''}
              </tbody>
            </table>
          </div>
          <p class="nota">Toca una habilidad para ver qué hace en el nivel que tienes.</p>`
        : html`<div class="vacio"><p>Elige arma y armadura para ver de dónde sale cada habilidad.</p></div>`}
      ${c.sets.length ? html`
        <section class="bld-sets">
          <h2 class="titulo titulo--menor">Sets</h2>
          <ul>
            ${c.sets.map((st) => html`<li>
              <div><p class="bld-pieza__nombre">${bil(st.es, st.en, { ok: st.esOk })}</p>
                <p class="nota">${st.necesarias}: ${bilFicha(cat.habilidades.get(st.hab), { num: ` +${st.nv}` }) || `${st.hab} +${st.nv}`}</p></div>
              <span class="bld-cuenta-set ${st.activo ? 'bld-cuenta-set--listo' : ''}">${Math.min(st.puestas, st.necesarias)}/${st.necesarias}</span>
            </li>`)}
          </ul>
        </section>` : ''}
      ${c.rostros?.sets.length ? html`
        <section class="bld-sets">
          <h2 class="titulo titulo--menor">Sets de Rostros</h2>
          ${listaSetsRostros(c.rostros.sets)}
        </section>` : ''}`;
  }

  function detalleHab(c, id) {
    const h = c.habilidades.find((x) => x.id === id);
    const ficha = cat.habilidades.get(id);
    if (!h || !ficha) return '';
    const texto = ficha.niveles?.[h.nivel - 1] || ficha.texto;
    return html`<tr class="bld-matriz__detalle"><td colspan="99">
      <p>${ficha.texto}</p>
      <p class="nota">Nivel ${h.nivel}: ${texto}</p>
      ${h.nivel < h.max ? html`<p class="nota">Nivel ${h.max} (máximo): ${ficha.niveles?.[h.max - 1] || ''}</p>` : ''}
    </td></tr>`;
  }

  /* ---------- Barra fija ---------- */

  function barra(c) {
    const r = c.resumen;
    const hab = r.habilidades === 1 ? '1 habilidad' : `${r.habilidades} habilidades`;
    return html`
      <div class="bld-barra" role="region" aria-label="Resumen de la build">
        <div class="bld-barra__datos">
          ${c.poder.total !== null ? html`<p class="bld-barra__poder" title="${c.poder.partes.filter((x) => x.v !== null).map((x) => `${x.es} ${numero(x.v)}`).join(' + ')}">Poder <strong>${numero(c.poder.total)}</strong>${c.poder.escritos < c.poder.partes.length ? html` <span class="bld-barra__falta">· ${c.poder.escritos} de ${c.poder.partes.length} escritos</span>` : ''}</p>` : ''}
          <p><strong>Def. ${numero(c.def)}</strong>${c.atk ? html` · Atq. ${numero(c.atk)}` : ''}${c.ele ? html` · ${nombreElemento(c.ele.tipo)} ${numero(c.ele.v)}` : ''}${c.estado ? html` · ${nombreElemento(c.estado.tipo)} ${numero(c.estado.v)}` : ''}</p>
          <p class="nota">${hab}${r.sobran ? html` · <span class="bld-sobra">${r.sobran} sobra${r.sobran > 1 ? 'n' : ''}</span>` : ''}${r.setsListos ? html` · <span class="bld-listo">${r.setsListos} set${r.setsListos > 1 ? 's' : ''} listo${r.setsListos > 1 ? 's' : ''}</span>` : ''}${r.setsAUna ? ` · ${r.setsAUna} a una pieza` : ''}${c.rostros ? html` · <span class="${c.rostros.costo > COSTO_ROSTROS ? 'bld-sobra' : ''}">Rostros ${c.rostros.costo}/${COSTO_ROSTROS}</span>` : ''}</p>
        </div>
        ${editable
          ? (s ? html`<button type="button" class="boton boton--oro" data-guardar>${guardada ? 'Guardar' : 'Guardar build'}</button>`
            : html`<a class="boton boton--oro" href="#/entrar?volver=${encodeURIComponent(guardada ? `build/${guardada.id}` : 'build/nueva')}">Entrar para guardar</a>`)
          : html`<button type="button" class="boton" data-base>Usar de base</button>`}
      </div>`;
  }

  /* ---------- Pintado ---------- */

  // El contenedor de la vista es el mismo para todas las rutas: los eventos van en una raíz propia.
  const raiz = document.createElement('div');
  raiz.className = 'bld';
  el.replaceChildren(raiz);

  let expandida = '';
  function pintarTodo() {
    const foco = document.activeElement?.dataset?.foco;
    const c = calcular(cat, b);
    const titulo = meta.nombre || (guardada ? 'Build' : 'Nueva build');
    pintar(raiz, html`
      ${avisoDemo()}
      <a class="volver" href="${volverA}">${volverA === '#/yo' ? 'Mi perfil' : 'Volver'}</a>
      <header class="cabeza-pagina">
        <h1 class="titulo titulo--pagina">${titulo}</h1>
        <p class="apoyo">${[c.adv ? nombreAdv(cat, c.adv.id) : '', guardada?.autor && !esMia ? `de ${guardada.autor.nick}` : '',
          meta.clase === 'ejemplo' ? 'build de ejemplo' : '', editable && guardada ? 'editar build' : ''].filter(Boolean).join(' · ') || 'Elige adventurer, arma y armadura: el resto se calcula solo.'}</p>
      </header>
      ${recuperado && !sucio ? html`<p class="aviso bld-recuperado"><span>Seguiste donde quedaste en este dispositivo.</span> <button type="button" class="boton boton--chico boton--tenue" data-de-cero>Empezar de cero</button></p>` : ''}
      ${c.avisos.length ? html`<p class="alerta" role="status">${c.avisos.join(' ')}</p>` : ''}
      <div class="pestanas bld-pestanas" role="tablist">
        <button type="button" role="tab" aria-selected="${vista === 'hoja'}" data-vista="hoja" data-foco="v-hoja">Build</button>
        <button type="button" role="tab" aria-selected="${vista === 'habilidades'}" data-vista="habilidades" data-foco="v-hab">Habilidades${c.habilidades.length ? ` · ${c.habilidades.length}` : ''}</button>
      </div>
      <div class="bld-cuerpo">${vista === 'hoja' ? vistaHoja(c) : vistaHabilidades(c)}</div>
      ${editable && guardada ? html`<button type="button" class="boton boton--ancho boton--peligro" data-eliminar>Eliminar build</button>` : ''}
      <p class="nota bld-fuente">Datos del juego: gacha.gg y GameWith (catálogo ${cat.meta.version || ''}). Nombres en español de GameWith es-MX, por confirmar con el juego; al lado, el inglés. Lo que GameWith no trae sigue en inglés. <a href="#/nombres">Nombres del juego</a>${tieneRol('oficial') ? ' (corregir)' : ''}.</p>
      ${barra(c)}`);
    if (expandida) {
      const fila = raiz.querySelector(`[data-hab="${expandida}"]`);
      if (fila) { fila.setAttribute('aria-expanded', 'true'); fila.insertAdjacentHTML('afterend', String(detalleHab(c, expandida))); }
    }
    if (foco) raiz.querySelector(`[data-foco="${foco}"]`)?.focus({ preventScroll: true });
  }
  pintarTodo();

  /* ---------- Eventos ---------- */

  function manejarError(e, porDefecto) {
    if (esSesionCaida(e)) {
      olvidarSesion();
      toast('Tu sesión venció. Vuelve a entrar.', { error: true });
      ir(`/entrar?volver=${guardada ? `build/${guardada.id}` : 'build/nueva'}`);
      return null;
    }
    return e instanceof ErrorApi ? e.message : (e?.message || porDefecto);
  }

  async function guardar(boton) {
    const nombre = meta.nombre.trim();
    if (!nombre) {
      abierto = 'adv';
      vista = 'hoja';
      pintarTodo();
      raiz.querySelector('[data-meta="nombre"]')?.focus();
      toast('Ponle un nombre a la build.', { error: true });
      return;
    }
    boton.disabled = true;
    boton.textContent = 'Guardando…';
    try {
      const datos = {
        ...(guardada ? { id: guardada.id } : {}),
        nombre, clase: meta.clase, adventurer_id: meta.clase === 'perfil' ? meta.adventurer_id : '', notas: meta.notas,
        datos: b, catalogo_version: cat.meta.version || '', ...resumenParaGuardar(cat, b),
      };
      const r = await escribir('build.guardar', datos, s.token);
      borrarBorrador('build', claveBorrador);
      sucio = false;
      toast(guardada ? 'Cambios guardados.' : `${nombre} quedó guardada.`);
      if (!guardada) ir(`/build/${r.id}`);
      else { guardada = r; pintarTodo(); }
    } catch (e) {
      boton.disabled = false;
      boton.textContent = guardada ? 'Guardar' : 'Guardar build';
      const msg = manejarError(e, 'No se pudo guardar. Inténtalo de nuevo.');
      if (msg) toast(msg, { error: true });
    }
  }

  let armado = 0;
  async function eliminar(boton) {
    if (!armado) {
      boton.textContent = 'Toca otra vez para eliminar';
      boton.classList.add('boton--peligro-armado');
      armado = setTimeout(() => { armado = 0; boton.textContent = 'Eliminar build'; boton.classList.remove('boton--peligro-armado'); }, 4000);
      return;
    }
    clearTimeout(armado);
    boton.disabled = true;
    try {
      await escribir('build.eliminar', { id: guardada.id }, s.token);
      borrarBorrador('build', claveBorrador);
      toast(`${guardada.nombre} se eliminó.`);
      ir(volverA.slice(1));
    } catch (e) {
      boton.disabled = false;
      const msg = manejarError(e, 'No se pudo eliminar.');
      if (msg) toast(msg, { error: true });
    }
  }

  raiz.addEventListener('click', (ev) => {
    const t = ev.target;
    const cj = t.closest('[data-cajon]');
    if (cj) { abierto = abierto === cj.dataset.cajon ? '' : cj.dataset.cajon; pintarTodo(); return; }
    const v = t.closest('[data-vista]');
    if (v) { vista = v.dataset.vista; pintarTodo(); return; }
    const fh = t.closest('[data-filtro-hab]');
    if (fh) { filtroHab = fh.dataset.filtroHab; expandida = ''; pintarTodo(); return; }
    const fila = t.closest('[data-hab]');
    if (fila) { expandida = expandida === fila.dataset.hab ? '' : fila.dataset.hab; pintarTodo(); return; }
    const el2 = t.closest('[data-elegir]');
    if (el2) {
      const parte = el2.dataset.elegir;
      selector = abrirSelector(cat, b, parte, {
        armaTipo: armaTipo(),
        alElegir: (id, r) => cambiar(() => { b = conPieza(b, parte, id, r); }),
        alCambiarNombre: () => pintarTodo(),
      });
      return;
    }
    const er = t.closest('[data-elegir-rostro]');
    if (er) {
      const ranura = er.dataset.elegirRostro === 'nucleo' ? 'nucleo' : Number(er.dataset.elegirRostro);
      selector = abrirSelectorRostro(cat, b, ranura, {
        alElegir: (id) => cambiar(() => { b = conRostro(b, ranura, id); }),
      });
      return;
    }
    if (t.closest('[data-elegir-camarada]')) {
      selector = abrirSelectorCamarada(cat, b, {
        tipo: advCat()?.tipo || '',
        alElegir: (id) => cambiar(() => { b = conCamarada(b, id); }),
      });
      return;
    }
    const gr = t.closest('[data-gra-rango]');
    if (gr) { if (!gr.disabled) cambiar(() => { b = conRangoGrabado(b, gr.dataset.graRango); }); return; }
    if (t.closest('[data-guardar]')) { guardar(t.closest('[data-guardar]')); return; }
    if (t.closest('[data-eliminar]')) { eliminar(t.closest('[data-eliminar]')); return; }
    if (t.closest('[data-de-cero]')) {
      borrarBorrador('build', '');
      b = buildVacia();
      meta = { nombre: '', clase: 'perfil', adventurer_id: '', notas: '' };
      recuperado = false;
      abierto = 'adv';
      pintarTodo();
      return;
    }
    if (t.closest('[data-base]')) {
      guardarBorrador('build', '', { b, meta: { nombre: `${meta.nombre} (copia)`.slice(0, 40), clase: 'perfil', adventurer_id: '', notas: '' } });
      ir('/build/nueva');
    }
  });

  raiz.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-hab]')) { ev.preventDefault(); ev.target.click(); }
  });

  raiz.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.rostroCal !== undefined || t.dataset.rostroNv !== undefined) {
      const k = t.dataset.rostroCal ?? t.dataset.rostroNv;
      const ranura = k === 'nucleo' ? 'nucleo' : Number(k);
      const actual = ranura === 'nucleo' ? b.rostros.nucleo : b.rostros.cartas[ranura];
      const extra = t.dataset.rostroCal !== undefined ? { cal: t.value, nv: actual.nv } : { cal: actual.cal, nv: Number(t.value) };
      if (extra.cal !== 'fine' && actual.cal === 'fine' && t.dataset.rostroCal !== undefined) extra.nv = 10;
      cambiar(() => { b = conRostro(b, ranura, actual.id, extra); });
    } else if (t.dataset.cam) {
      const k = t.dataset.cam;
      const max = { nv: CAMARADA_NV_MAX, estrellas: ESTRELLAS_MAX, poder: PODER_MAX }[k];
      const txt = String(t.value).replace(/[.\s]/g, '');
      const n = txt === '' ? null : Math.round(Number(txt));
      const valido = n === null || (Number.isFinite(n) && n >= (k === 'nv' ? 1 : 0) && n <= max);
      if (!valido) toast(k === 'nv' ? `El nivel va de 1 a ${CAMARADA_NV_MAX}.` : 'Escribe solo números.', { error: true });
      cambiar(() => {
        const datos = { ...b.camarada };
        if (valido && n !== null) datos[k] = n; else delete datos[k];
        b = conCamarada(b, b.camarada.id, datos);
      });
    } else if (t.dataset.ref) {
      cambiar(() => { b = conReflexion(b, t.dataset.ref, t.checked); });
    } else if (t.matches('[data-ref-cap]')) {
      const txt = String(t.value).trim();
      const n = txt === '' ? null : Math.round(Number(txt));
      if (n !== null && !(Number.isFinite(n) && n >= 0 && n <= REFLEXION_CAP_MAX)) toast(`Los puntos van de 0 a ${REFLEXION_CAP_MAX}.`, { error: true });
      cambiar(() => { b = conCapReflexiones(b, n); });
    } else if (t.dataset.gra) {
      cambiar(() => { b = conGrabado(b, t.dataset.gra, t.checked); });
    } else if (t.dataset.kee) {
      const k = t.dataset.kee;
      const txt = String(t.value).replace(/[.\s]/g, '');
      const n = txt === '' ? null : Math.round(Number(txt));
      const max = k === 'nv' ? KEEPSAKE_NV_MAX : PODER_MAX;
      if (n !== null && !(Number.isFinite(n) && n >= (k === 'nv' ? 1 : 0) && n <= max)) toast(k === 'nv' ? `El nivel va de 1 a ${KEEPSAKE_NV_MAX}.` : 'Escribe solo números.', { error: true });
      cambiar(() => { b = conDatoKeepsake(b, k, n); });
    } else if (t.dataset.poder) {
      const txt = String(t.value).replace(/[.\s]/g, '');
      const n = txt === '' ? null : Math.round(Number(txt));
      if (n !== null && !(Number.isFinite(n) && n >= 0 && n <= PODER_MAX)) toast('Escribe solo números.', { error: true });
      cambiar(() => { b = conPoder(b, t.dataset.poder, n); });
    } else if (t.matches('[data-maestria]')) {
      cambiar(() => { b = { ...b, rostros: { ...b.rostros, maestria: t.checked } }; });
    } else if (t.dataset.rareza) {
      const parte = t.dataset.rareza;
      const actual = parte === 'arma' ? b.arma : b.piezas[parte];
      cambiar(() => { b = conPieza(b, parte, actual.id, Number(t.value)); });
    } else if (t.matches('[data-adv]')) {
      cambiar(() => {
        const r = conAdventurer(cat, b, t.value);
        b = r.build;
        const tipo = TIPOS_CAMARADA[cat.adventurers.get(t.value)?.tipo]?.es || '';
        const partes = { arma: 'el arma', camarada: 'el camarada', reflexiones: 'las Reflexiones que no tiene' };
        const q = r.quitados.map((x) => partes[x]);
        if (q.length > 1) toast(`Quitamos ${q.slice(0, -1).join(', ')} y ${q[q.length - 1]}: no van con ese adventurer.`);
        else if (r.quitados[0] === 'arma') toast('Quitamos el arma: ese adventurer usa otra.');
        else if (r.quitados[0] === 'camarada') toast(`Quitamos el camarada: ese adventurer lleva uno de tipo ${tipo}.`);
        else if (r.quitados[0] === 'reflexiones') toast('Quitamos las Reflexiones que ese adventurer no tiene.');
      });
    } else if (t.matches('[data-nivel]')) {
      const n = Math.round(Number(t.value));
      cambiar(() => {
        b = { ...b, adv: { ...b.adv } };
        if (n >= 1 && n <= 80) b.adv.nivel = n; else delete b.adv.nivel;
      });
    } else if (t.dataset.meta === 'adventurer_id') {
      cambiar(() => { meta.adventurer_id = t.value; });
    } else if (t.matches('[data-ejemplo]')) {
      cambiar(() => { meta.clase = t.checked ? 'ejemplo' : 'perfil'; if (t.checked) meta.adventurer_id = ''; });
    }
  });

  // Nombre y notas: sin repintar (no perder el cursor); solo borrador y título.
  raiz.addEventListener('input', (ev) => {
    const k = ev.target.dataset.meta;
    if (k !== 'nombre' && k !== 'notas') return;
    meta[k] = ev.target.value;
    sucio = true;
    if (!guardada) guardarBorrador('build', '', { b, meta });
    if (k === 'nombre') raiz.querySelector('.titulo--pagina').textContent = meta.nombre || (guardada ? 'Build' : 'Nueva build');
  });

  return {
    titulo: meta.nombre || (guardada ? 'Build' : 'Nueva build'),
    limpiar: () => { selector?.cerrar({ desdeHistorial: true }); clearTimeout(armado); },
  };
}
