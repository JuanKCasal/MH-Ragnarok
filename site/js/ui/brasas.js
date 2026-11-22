/**
 * Fondo de chispas, brasas y virutas de fuego que suben desde el fogón.
 * Un <canvas> fijo detrás del contenido (los paneles opacos lo tapan, así que no
 * estorba la lectura). Ver DESIGN.md > Movimiento > Ambiente.
 *
 * - Chispas: puntos muy calientes, rápidos, con estela corta.
 * - Brasas: luces suaves y lentas que titilan y se enfrían de oro a carmesí.
 * - Virutas: escamas finas que giran (efecto de volteo) y terminan como ceniza.
 *
 * Rendimiento: sprites de brillo prerenderizados (sin shadowBlur), densidad según el
 * área con tope, DPR máx. 1,5, se pausa con la pestaña oculta. Con
 * `prefers-reduced-motion: reduce` se dibuja un solo cuadro quieto.
 */

const TAU = Math.PI * 2;
const TOPE = 170;

/** Cuántas partículas de cada tipo para un área de w × h px (CSS) e intensidad 0–1. */
export function poblacion(w, h, intensidad = 1) {
  const area = Math.max(0, w) * Math.max(0, h);
  // Las pantallas chicas (celular, el uso principal) llevan más densidad para que se note.
  const extra = area < 600000 ? 1.45 : 1;
  let p = { chispas: (area / 19000) * extra, brasas: (area / 13000) * extra, virutas: (area / 24000) * extra };
  const total = p.chispas + p.brasas + p.virutas;
  const escala = Math.min(1, TOPE / (total || 1)) * Math.max(0, Math.min(1, intensidad));
  for (const k of Object.keys(p)) p[k] = Math.round(p[k] * escala);
  return p;
}

/** Color del fuego según temperatura: 1 = blanco dorado, 0.5 = naranja, 0 = carmesí oscuro. */
export function colorFuego(temp) {
  const t = Math.max(0, Math.min(1, temp));
  const paradas = [
    [0, [122, 24, 20]],
    [0.35, [196, 58, 24]],
    [0.65, [255, 146, 48]],
    [0.85, [255, 206, 112]],
    [1, [255, 240, 196]],
  ];
  for (let i = 1; i < paradas.length; i++) {
    const [p1, c1] = paradas[i];
    if (t <= p1) {
      const [p0, c0] = paradas[i - 1];
      const f = (t - p0) / (p1 - p0);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * f));
    }
  }
  return paradas[paradas.length - 1][1];
}

const azar = (a, b) => a + Math.random() * (b - a);

/** Sprite de brillo radial de un color (se dibuja con drawImage, mucho más barato que shadowBlur). */
function sprite(rgb, tam = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const g = c.getContext('2d');
  const r = tam / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const [R, G, B] = rgb;
  grad.addColorStop(0, `rgba(${R},${G},${B},1)`);
  grad.addColorStop(0.18, `rgba(${R},${G},${B},0.55)`);
  grad.addColorStop(0.45, `rgba(${R},${G},${B},0.14)`);
  grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, tam, tam);
  return c;
}

export function iniciarBrasas() {
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
  const lienzo = document.createElement('canvas');
  lienzo.className = 'brasas';
  lienzo.setAttribute('aria-hidden', 'true');
  const resplandor = document.createElement('div');
  resplandor.className = 'brasas-fogon';
  resplandor.setAttribute('aria-hidden', 'true');
  document.body.prepend(resplandor, lienzo);

  const ctx = lienzo.getContext('2d');
  if (!ctx) return { intensidad() {} };

  // 12 sprites de la paleta del fuego, de frío (0) a caliente (11).
  const SPRITES = Array.from({ length: 12 }, (_, i) => sprite(colorFuego(i / 11)));
  const spritePara = (temp) => SPRITES[Math.max(0, Math.min(11, Math.round(temp * 11)))];

  let w = 0, h = 0, dpr = 1;
  let intensidad = 1;
  let meta = poblacion(0, 0);
  const parts = [];
  let reloj = 0;
  let anterior = 0;
  let idAnim = 0;

  function medir() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = lienzo.clientWidth || window.innerWidth;
    h = lienzo.clientHeight || window.innerHeight;
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    meta = poblacion(w, h, intensidad);
  }

  /** Crea una partícula; si `enCualquierParte`, aparece ya en vuelo (para no arrancar vacío). */
  function nueva(tipo, enCualquierParte = false) {
    // 70 % nace en el fogón (borde inferior); el resto ya en el aire, en los 2/3 de abajo,
    // para que el fuego llene la pantalla aunque la barra de navegación tape el borde.
    const y = Math.random() < 0.7 ? h + azar(4, 40) : h * azar(0.35, 0.95);
    const p = { tipo, x: azar(-0.05, 1.05) * w, y, edad: 0, fase: azar(0, TAU) };
    const H = Math.max(500, h); // velocidades proporcionales al alto: suben hasta arriba en cualquier pantalla
    if (tipo === 'chispa') {
      Object.assign(p, { vida: azar(1.6, 3.4), vy: -azar(0.12, 0.22) * H, vx: azar(-25, 25), r: azar(0.7, 1.5), temp0: azar(0.85, 1), vaiven: azar(10, 30) });
    } else if (tipo === 'brasa') {
      Object.assign(p, { vida: azar(6, 11), vy: -azar(0.035, 0.08) * H, vx: azar(-6, 6), r: azar(1.4, 3.2), temp0: azar(0.65, 0.98), vaiven: azar(8, 22), titileo: azar(3, 8) });
    } else {
      Object.assign(p, { vida: azar(7, 13), vy: -azar(0.022, 0.05) * H, vx: azar(-8, 8), largo: azar(3, 7.5), ancho: azar(0.9, 1.8), giro: azar(0, TAU), vgiro: azar(-3.5, 3.5), volteo: azar(1.2, 3.2), temp0: azar(0.45, 0.8), vaiven: azar(18, 40) });
    }
    if (enCualquierParte) {
      p.edad = azar(0, p.vida * 0.85);
      p.y = azar(0.1, 1) * h;
    }
    return p;
  }

  function contar() {
    const c = { chispa: 0, brasa: 0, viruta: 0 };
    for (const p of parts) c[p.tipo]++;
    return c;
  }

  function reponer(enCualquierParte = false) {
    const c = contar();
    const faltan = [['chispa', meta.chispas - c.chispa], ['brasa', meta.brasas - c.brasa], ['viruta', meta.virutas - c.viruta]];
    for (const [tipo, n] of faltan) {
      // Sin prisa: como mucho 2 nuevas por tipo y cuadro, para que nazcan escalonadas.
      const k = enCualquierParte ? n : Math.min(n, 2);
      for (let i = 0; i < k; i++) parts.push(nueva(tipo, enCualquierParte));
    }
  }

  const viento = (t) => Math.sin(t * 0.13) * 14 + Math.sin(t * 0.41 + 1.3) * 7;

  function paso(dt) {
    reloj += dt;
    const v = viento(reloj);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.edad += dt;
      if (p.edad >= p.vida || p.y < -30 || p.x < -60 || p.x > w + 60) { parts.splice(i, 1); continue; }
      const sway = Math.sin(reloj * 1.7 + p.fase) * p.vaiven;
      p.px = p.x; p.py = p.y;
      p.x += (p.vx + v + sway * (p.tipo === 'chispa' ? 0.6 : 1)) * dt;
      p.y += p.vy * dt;
      if (p.tipo === 'chispa') { p.vy *= 1 - 0.25 * dt; p.vx += azar(-60, 60) * dt; }
      if (p.tipo === 'viruta') p.giro += p.vgiro * dt;
    }
    // Sobran (bajó la intensidad): se dejan morir solas, no se cortan de golpe.
    reponer();
  }

  function dibujar() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const vida = p.edad / p.vida;
      // Aparece en el primer 8 % y se apaga al final.
      const entra = Math.min(1, vida / 0.08);
      const sale = 1 - Math.pow(vida, 2.2);
      const temp = p.temp0 * (1 - vida * 0.75);

      if (p.tipo === 'chispa') {
        const a = entra * sale;
        const [R, G, B] = colorFuego(temp);
        if (p.px !== undefined) {
          ctx.strokeStyle = `rgba(${R},${G},${B},${0.75 * a})`;
          ctx.lineWidth = p.r;
          ctx.lineCap = 'round';
          ctx.beginPath();
          // Estela un poco más larga que el último paso.
          ctx.moveTo(p.x + (p.px - p.x) * 2.5, p.y + (p.py - p.y) * 2.5);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        const s = p.r * 9;
        ctx.globalAlpha = 0.6 * a;
        ctx.drawImage(spritePara(temp), p.x - s / 2, p.y - s / 2, s, s);
        ctx.globalAlpha = 1;
      } else if (p.tipo === 'brasa') {
        const tit = 0.72 + 0.28 * Math.sin(reloj * p.titileo + p.fase) * Math.sin(reloj * p.titileo * 0.37 + p.fase * 2);
        const a = entra * sale * tit;
        const s = p.r * 13;
        ctx.globalAlpha = 0.95 * a;
        ctx.drawImage(spritePara(temp), p.x - s / 2, p.y - s / 2, s, s);
        const n = p.r * 2.2;
        ctx.globalAlpha = a;
        ctx.drawImage(spritePara(Math.min(1, temp + 0.2)), p.x - n / 2, p.y - n / 2, n, n);
        ctx.globalAlpha = 1;
      } else {
        // Viruta: borde encendido que se va apagando hasta ceniza.
        const a = entra * sale;
        const brasa = Math.max(0, 1 - vida * 1.6);
        const plano = Math.cos(reloj * p.volteo + p.fase); // volteo 3D falso
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.scale(1, Math.max(0.15, Math.abs(plano)));
        if (brasa > 0) {
          const [R, G, B] = colorFuego(temp);
          ctx.fillStyle = `rgba(${R},${G},${B},${0.9 * a * brasa})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.largo, p.ancho, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        if (brasa > 0) {
          const s = p.largo * 5;
          ctx.globalAlpha = 0.35 * a * brasa;
          ctx.drawImage(spritePara(temp), p.x - s / 2, p.y - s / 2, s, s);
          ctx.globalAlpha = 1;
        }
        if (brasa < 1) {
          // Ceniza: gris tibio, pintado normal (no aditivo) para que se vea apagado.
          ctx.globalCompositeOperation = 'source-over';
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.giro);
          ctx.scale(1, Math.max(0.15, Math.abs(plano)));
          ctx.fillStyle = `rgba(150,132,118,${0.35 * a * (1 - brasa)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.largo * 0.9, p.ancho * 0.8, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - (anterior || ahora)) / 1000);
    anterior = ahora;
    paso(dt);
    dibujar();
    idAnim = requestAnimationFrame(cuadro);
  }

  function arrancar() {
    if (idAnim || sinMovimiento.matches || document.hidden) return;
    anterior = 0;
    idAnim = requestAnimationFrame(cuadro);
  }

  function parar() {
    if (idAnim) cancelAnimationFrame(idAnim);
    idAnim = 0;
  }

  /** Movimiento reducido: un cuadro quieto con unas brasas, sin animación. */
  function cuadroQuieto() {
    parar();
    parts.length = 0;
    reponer(true);
    dibujar();
  }

  function aplicarPreferencia() {
    if (sinMovimiento.matches) cuadroQuieto();
    else arrancar();
  }

  let espera = 0;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      const ancho = w;
      medir();
      // La barra del navegador del celular cambia el alto al hacer scroll: solo se repuebla si cambió el ancho.
      if (Math.abs(ancho - w) > 40) { parts.length = 0; reponer(true); }
      if (sinMovimiento.matches) dibujar();
    }, 150);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar()));
  sinMovimiento.addEventListener?.('change', aplicarPreferencia);

  medir();
  reponer(true);
  aplicarPreferencia();

  return {
    /** 1 en el Inicio, menos en las pantallas de trabajo. */
    intensidad(valor) {
      intensidad = valor;
      meta = poblacion(w, h, intensidad);
      if (sinMovimiento.matches) cuadroQuieto();
    },
  };
}
