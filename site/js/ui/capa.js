/**
 * Capa a pantalla completa del builder (selectores de pieza y de Rostro).
 * El "atrás" del celular la cierra: se apila un estado en el historial sin cambiar el hash.
 * Escape también la cierra y el foco vuelve a donde estaba.
 */
export function abrirCapa(titulo) {
  const capa = document.createElement('div');
  capa.className = 'bld-capa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', titulo);
  const previo = document.activeElement;
  document.body.append(capa);
  document.body.classList.add('bld-sin-scroll');

  function cerrar({ desdeHistorial = false } = {}) {
    if (!capa.isConnected) return;
    window.removeEventListener('popstate', alVolver);
    document.removeEventListener('keydown', alTeclado);
    capa.remove();
    document.body.classList.remove('bld-sin-scroll');
    if (!desdeHistorial && history.state?.bldSelector) history.back();
    previo?.focus?.({ preventScroll: true });
  }
  const alVolver = () => cerrar({ desdeHistorial: true });
  const alTeclado = (ev) => { if (ev.key === 'Escape') cerrar(); };
  history.pushState({ bldSelector: true }, '');
  window.addEventListener('popstate', alVolver);
  document.addEventListener('keydown', alTeclado);
  return { capa, cerrar };
}
