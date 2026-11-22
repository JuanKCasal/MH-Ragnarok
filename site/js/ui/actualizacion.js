/**
 * Aviso de versión nueva. Al desplegar, version.json cambia (scripts/versionar.mjs).
 * Si la del servidor no coincide con la que corre, ofrecemos recargar: así el celular
 * recibe la versión nueva sin tener que borrar la caché a mano.
 */
import { VERSION } from '../version.js';

const CADA_MS = 5 * 60_000;

export function vigilarVersion() {
  // Quita el ?v= que deja la recarga forzada, para que la dirección quede limpia.
  if (new URLSearchParams(location.search).has('v')) {
    history.replaceState(null, '', location.pathname + location.hash);
  }
  if (VERSION === 'dev') return;

  let ultima = 0;
  let avisado = false;
  const revisar = async () => {
    if (avisado || Date.now() - ultima < CADA_MS) return;
    ultima = Date.now();
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      const { version } = await r.json();
      if (version && version !== VERSION) { avisado = true; avisar(version); }
    } catch { /* sin red: se intenta en la próxima vuelta */ }
  };
  revisar();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar(); });
}

function avisar(version) {
  const el = document.createElement('div');
  el.className = 'actualizar';
  el.setAttribute('role', 'status');
  el.innerHTML = '<p>Hay una versión nueva de la web.</p><button type="button" class="boton boton--oro boton--chico">Actualizar</button>';
  el.querySelector('button').addEventListener('click', () => {
    // Una dirección distinta obliga a pedir el HTML nuevo aunque el navegador tenga copia.
    location.replace(`${location.pathname}?v=${encodeURIComponent(version)}${location.hash}`);
  });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('visible'));
}
