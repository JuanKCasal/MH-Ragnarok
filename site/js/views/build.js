/**
 * Builder · hoja única con cajones (opción C). Ver docs/BUILDER.md (E2: adventurer, arma y armadura).
 * #/build/nueva[?adv=<id de mi adventurer>]  ·  #/build/:id
 * Cualquiera puede armar y mirar; guardar requiere sesión. E4: Rostros y Camarada (Keepsake y Reflexiones después).
 */
import { leer, escribir, ErrorApi } from '../api.js';
import { sesion, olvidarSesion, esSesionCaida, tieneRol } from '../auth.js';
import { ir } from '../router.js';
import { html, pintar, numero } from '../ui/dom.js';
import { avisoDemo, cargando, fallo } from '../ui/comun.js';
import { toast } from '../ui/toast.js';
import { ARMAS } from '../etiquetas.js';
import { cargarCatalogo } from '../catalogo.js';
import { calcular, limpiarBuild, buildVacia, conPieza, conRostro, conCamarada, resumenParaGuardar, PARTES, NOMBRE_PARTE,
  CALIDADES, COSTO_ROSTROS, CARTAS_ROSTROS, CAMARADA_NV_MAX, ESTRELLAS_MAX, PODER_MAX } from '../build-calc.js';
import { abrirSelector } from '../ui/selector-pieza.js';
import { abrirSelectorRostro } from '../ui/selector-rostro.js';
import { abrirSelectorCamarada } from '../ui/selector-camarada.js';
import { chipsHab, statsArma, nombreElemento, bilingue, bil, bilFicha, chipsSetsRostro, listaSetsRostros,
  textoAumento, tipoCamarada, TIPOS_CAMARADA } from '../ui/build-textos.js';
import { leerBorrador, guardarBorrador, borrarBorrador } from '../borradores.js';

const FILTROS_HAB = [['todas', 'Todas'], ['sobra', 'Sobran'], ['tope', 'Al tope'], ['falta', 'Les falta']];
const PRONTO = [['Keepsake', 'Nivel y grabados'], ['Reflexiones', 'Puntos y nodos']];

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
    const cuerpo = html`
      <ul class="bld-piezas">${PARTES.map((p) => filaPieza(c, p))}</ul>
      <ul class="bld-resumen-chips">
        <li class="bld-chip">Def. ${numero(c.def)}</li>
        ${c.sets.map((st) => html`<li class="bld-chip ${st.activo ? 'bld-chip--listo' : ''}">${bil(st.es, st.en)} ${Math.min(st.puestas, st.necesarias)}/${st.necesarias}${st.activo ? '' : ` · falta ${st.faltan}`}</li>`)}
      </ul>`;
    return cajon('armadura', `Armadura · ${puestas.length} de 5`, resumen, cuerpo);
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
        r.setsActivos ? `${r.setsActivos} set${r.setsActivos > 1 ? 's' : ''} activo${r.setsActivos > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    const cuerpo = html`
      <ul class="bld-piezas">${['nucleo', ...Array.from({ length: CARTAS_ROSTROS }, (_, i) => i)].map((k) => filaRostro(c, k))}</ul>
      <ul class="bld-resumen-chips">
        <li class="bld-chip ${r && r.costo > COSTO_ROSTROS ? 'bld-chip--mal' : r?.costo === COSTO_ROSTROS ? 'bld-chip--listo' : ''}">Costo ${r?.costo || 0}/${COSTO_ROSTROS}</li>
      </ul>
      ${r ? html`
        <label class="opcion bld-maestria"><input type="checkbox" data-maestria ${r.maestria ? 'checked' : ''} ${editable ? '' : 'disabled'}>
          <span>Proof of Mastery: el núcleo suma +1 a su set</span></label>
        <div class="bld-rsets-marco">${listaSetsRostros(r.sets)}</div>` : ''}
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
            <p class="nota"><span class="rotulo">Aumento</span> ${textoAumento(cam.item)}</p>
          </div>
          ${editable ? html`<button type="button" class="bld-cambiar" data-elegir-camarada data-foco="ecam" aria-label="Cambiar camarada"><span aria-hidden="true">⇄</span></button>` : ''}
        </li></ul>
        ${cam.compatible ? '' : html`<p class="alerta bld-alerta-cam">Es de tipo ${TIPOS_CAMARADA[cam.item.tipo].es} y tu adventurer es ${TIPOS_CAMARADA[advTipo].es}: en el juego quizá no puedas ponérselo.</p>`}
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
      <p class="nota bld-cajon__nota">Nivel, estrellas y poder: cópialos de la pantalla del camarada en el juego (no hay tablas públicas). Aumento de aventurero según GameWith, por confirmar.</p>`);
  }

  const cajonesPronto = () => html`
    <ul class="bld-pronto">
      ${PRONTO.map(([t, d]) => html`<li><span class="rotulo">${t}</span><span class="nota">${d} · próximamente</span></li>`)}
    </ul>`;

  function vistaHoja(c) {
    return html`
      ${cajonAdv(c)}
      ${cajonArmadura(c)}
      ${cajonRostros(c)}
      ${cajonCamarada(c)}
      ${cajonesPronto()}
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
    } else if (t.matches('[data-maestria]')) {
      cambiar(() => { b = { ...b, rostros: { ...b.rostros, maestria: t.checked } }; });
    } else if (t.dataset.rareza) {
      const parte = t.dataset.rareza;
      const actual = parte === 'arma' ? b.arma : b.piezas[parte];
      cambiar(() => { b = conPieza(b, parte, actual.id, Number(t.value)); });
    } else if (t.matches('[data-adv]')) {
      cambiar(() => {
        const nuevo = t.value ? cat.adventurers.get(t.value) : null;
        b = { ...b, adv: nuevo ? { id: nuevo.id, ...(b.adv?.nivel ? { nivel: b.adv.nivel } : {}) } : null };
        const w = b.arma?.id ? cat.armas.get(b.arma.id) : null;
        if (w && nuevo && w.arma !== nuevo.arma) { b.arma = null; toast('Quitamos el arma: ese adventurer usa otra.'); }
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
