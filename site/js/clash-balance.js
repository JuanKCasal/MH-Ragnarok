/**
 * Balanceo de equipos de Clash (MH-Ragnarok).
 * Módulo puro: sin DOM ni red. Determinista: misma entrada → mismo resultado.
 * Ver SPEC.md §10.
 *
 * @typedef {{id:string, nombre?:string, poder:number, tipo?:string, arma?:string}} Jugador
 * @typedef {{
 *   tamEquipo?: number,            // 4 por defecto
 *   incompletos?: 'equipos'|'suplentes', // qué hacer si n no es múltiplo de tamEquipo
 *   modo?: 'equilibrado'|'escalonado',
 *   fijados?: Record<string, number>,    // id de jugador → índice de equipo (0..k-1)
 *   composicion?: boolean,         // activa la penalización blanda por composición
 *   maxIteraciones?: number
 * }} Opciones
 */

const PESO_DESVIO = 0.1;
const PENAL_SIN_APOYO = 0.15;   // fracción del poder medio de un jugador
const PENAL_ARMA_REPETIDA = 0.1;

/**
 * @param {Jugador[]} jugadores
 * @param {Opciones} [opciones]
 */
export function balancearEquipos(jugadores, opciones = {}) {
  const tam = opciones.tamEquipo ?? 4;
  const incompletos = opciones.incompletos ?? 'equipos';
  const modo = opciones.modo ?? 'equilibrado';
  const fijados = opciones.fijados ?? {};
  const maxIter = opciones.maxIteraciones ?? 2000;

  if (!Number.isInteger(tam) || tam < 1) throw new Error('tamEquipo inválido');
  const vistos = new Set();
  for (const j of jugadores) {
    if (!j || typeof j.id !== 'string') throw new Error('Jugador sin id');
    if (vistos.has(j.id)) throw new Error(`Jugador repetido: ${j.id}`);
    vistos.add(j.id);
  }

  // Orden estable: poder desc, luego id asc (determinismo).
  const ordenados = jugadores
    .map((j) => ({ ...j, poder: Number.isFinite(+j.poder) ? +j.poder : 0 }))
    .sort((a, b) => b.poder - a.poder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const n = ordenados.length;
  if (n === 0) return resultado([], [], tam);

  let k = incompletos === 'suplentes' ? Math.floor(n / tam) : Math.ceil(n / tam);
  if (k === 0) k = 1; // menos jugadores que un equipo: un único equipo incompleto

  // Capacidades: con 'equipos', los primeros equipos van llenos y los últimos con uno menos.
  const plazas = Math.min(n, k * tam);
  const capacidad = Array.from({ length: k }, (_, i) => {
    const base = Math.floor(plazas / k);
    return i < plazas % k ? base + 1 : base;
  });

  // Quiénes juegan: si sobran (modo suplentes), quedan fuera los de menor poder no fijados.
  let titulares = ordenados;
  let suplentes = [];
  if (plazas < n) {
    const fij = ordenados.filter((j) => j.id in fijados);
    const libres = ordenados.filter((j) => !(j.id in fijados));
    const cupoLibres = Math.max(0, plazas - fij.length);
    titulares = [...fij, ...libres.slice(0, cupoLibres)].sort(
      (a, b) => b.poder - a.poder || (a.id < b.id ? -1 : 1),
    );
    suplentes = libres.slice(cupoLibres);
  }

  const equipos = Array.from({ length: k }, () => []);
  const esFijado = new Set();

  // 1. Fijados.
  for (const j of titulares) {
    if (!(j.id in fijados)) continue;
    const e = fijados[j.id];
    if (!Number.isInteger(e) || e < 0 || e >= k) throw new Error(`Equipo fijado inválido para ${j.id}`);
    if (equipos[e].length >= capacidad[e]) throw new Error(`Equipo ${e + 1} excede su cupo con los fijados`);
    equipos[e].push(j);
    esFijado.add(j.id);
  }
  const libres = titulares.filter((j) => !esFijado.has(j.id));

  if (modo === 'escalonado') {
    // Los más fuertes juntos: se llenan los equipos en orden.
    let e = 0;
    for (const j of libres) {
      while (equipos[e].length >= capacidad[e]) e++;
      equipos[e].push(j);
    }
    return resultado(equipos, suplentes, tam, esFijado);
  }

  // 2. Greedy LPT: al equipo con menor suma que tenga cupo.
  for (const j of libres) {
    let mejor = -1;
    for (let e = 0; e < k; e++) {
      if (equipos[e].length >= capacidad[e]) continue;
      if (mejor === -1 || suma(equipos[e]) < suma(equipos[mejor])) mejor = e;
    }
    equipos[mejor].push(j);
  }

  // 3. Mejora local por intercambios.
  const ctx = { composicion: !!opciones.composicion, poderMedio: promedio(titulares.map((j) => j.poder)) };
  let costoActual = costo(equipos, ctx);
  for (let it = 0; it < maxIter; it++) {
    let mejor = null;
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        for (let i = 0; i < equipos[a].length; i++) {
          const ja = equipos[a][i];
          if (esFijado.has(ja.id)) continue;
          for (let m = 0; m < equipos[b].length; m++) {
            const jb = equipos[b][m];
            if (esFijado.has(jb.id) || ja.poder === jb.poder && !ctx.composicion) continue;
            equipos[a][i] = jb; equipos[b][m] = ja;
            const c = costo(equipos, ctx);
            equipos[a][i] = ja; equipos[b][m] = jb;
            if (c < costoActual - 1e-9 && (!mejor || c < mejor.c - 1e-9)) mejor = { a, i, b, m, c };
          }
        }
      }
    }
    if (!mejor) break;
    const { a, i, b, m, c } = mejor;
    [equipos[a][i], equipos[b][m]] = [equipos[b][m], equipos[a][i]];
    costoActual = c;
  }

  return resultado(equipos, suplentes, tam, esFijado);
}

function suma(eq) { return eq.reduce((s, j) => s + j.poder, 0); }
function promedio(xs) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; }
function desvio(xs) {
  const m = promedio(xs);
  return Math.sqrt(promedio(xs.map((x) => (x - m) ** 2)));
}

function costo(equipos, ctx) {
  const sumas = equipos.map(suma);
  let c = Math.max(...sumas) - Math.min(...sumas) + PESO_DESVIO * desvio(sumas);
  if (ctx.composicion) {
    for (const eq of equipos) {
      if (eq.length && eq.some((j) => j.tipo) && !eq.some((j) => j.tipo === 'support')) {
        c += PENAL_SIN_APOYO * ctx.poderMedio;
      }
      const armas = {};
      for (const j of eq) if (j.arma) armas[j.arma] = (armas[j.arma] || 0) + 1;
      for (const v of Object.values(armas)) if (v >= 3) c += PENAL_ARMA_REPETIDA * ctx.poderMedio * (v - 2);
    }
  }
  return c;
}

function resultado(equipos, suplentes, tam, esFijado = new Set()) {
  const salida = equipos.map((eq, i) => {
    const jugadores = [...eq]
      .sort((a, b) => b.poder - a.poder || (a.id < b.id ? -1 : 1))
      .map((j) => ({ ...j, fijado: esFijado.has(j.id) }));
    const s = suma(eq);
    return { numero: i + 1, jugadores, suma: s, promedio: eq.length ? s / eq.length : 0, completo: eq.length === tam };
  });
  const sumas = salida.map((e) => e.suma);
  return {
    equipos: salida,
    suplentes: suplentes.map((j) => ({ ...j })),
    metricas: {
      equipos: salida.length,
      jugadores: salida.reduce((s, e) => s + e.jugadores.length, 0),
      diferencia: sumas.length ? Math.max(...sumas) - Math.min(...sumas) : 0,
      desvio: desvio(sumas),
      promedioEquipo: promedio(sumas),
    },
  };
}
