/**
 * Imágenes: compresión en el navegador antes de subir y URL de miniatura de Drive. Ver SPEC.md §8.
 * Capturas: máx. 1600 px de lado. Avatar: cuadrado de 512 px. WebP 0,8 (JPEG 0,82 si no hay WebP).
 */
import { MODO_DEMO } from './api.js';

const MAX_BYTES = 1.9 * 1024 * 1024; // el backend acepta hasta 2 MB

/**
 * Medidas de salida (y recorte centrado si `cuadrado`). Pura, para poder probarla.
 * @returns {{sx:number, sy:number, sw:number, sh:number, w:number, h:number}}
 */
export function medidas(ancho, alto, lado, cuadrado = false) {
  let sx = 0, sy = 0, sw = ancho, sh = alto;
  if (cuadrado) {
    const m = Math.min(ancho, alto);
    sx = Math.round((ancho - m) / 2);
    sy = Math.round((alto - m) / 2);
    sw = sh = m;
  }
  const f = Math.min(1, lado / Math.max(sw, sh));
  return { sx, sy, sw, sh, w: Math.max(1, Math.round(sw * f)), h: Math.max(1, Math.round(sh * f)) };
}

async function abrir(archivo) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* sigue abajo */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

const aBlob = (c, tipo, q) => new Promise((r) => c.toBlob(r, tipo, q));

const aBase64 = (blob) => new Promise((ok, mal) => {
  const fr = new FileReader();
  fr.onload = () => ok(String(fr.result).replace(/^data:[^,]*,/, ''));
  fr.onerror = () => mal(fr.error);
  fr.readAsDataURL(blob);
});

/**
 * @param {File} archivo
 * @param {{lado?: number, cuadrado?: boolean}} [op]
 * @returns {Promise<{base64: string, mime: string, bytes: number}>}
 */
export async function comprimir(archivo, { lado = 1600, cuadrado = false } = {}) {
  if (!archivo || !/^image\//.test(archivo.type)) throw new Error('Ese archivo no es una imagen.');
  let fuente;
  try { fuente = await abrir(archivo); } catch { throw new Error('No se pudo abrir la imagen. Prueba con una captura en PNG o JPG.'); }
  const m = medidas(fuente.width, fuente.height, lado, cuadrado);
  const c = document.createElement('canvas');
  c.width = m.w;
  c.height = m.h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(fuente, m.sx, m.sy, m.sw, m.sh, 0, 0, m.w, m.h);
  fuente.close?.();

  let blob = await aBlob(c, 'image/webp', 0.8);
  if (!blob || blob.type !== 'image/webp') blob = await aBlob(c, 'image/jpeg', 0.82);
  if (blob && blob.size > MAX_BYTES) blob = await aBlob(c, blob.type, 0.6);
  if (!blob || blob.size > MAX_BYTES) throw new Error('La imagen quedó demasiado pesada. Prueba con otra captura.');
  return { base64: await aBase64(blob), mime: blob.type, bytes: blob.size };
}

/** URL para mostrar una imagen de Drive (o la copia local del modo demostración). */
export function urlImagen(id, ancho = 1000) {
  const s = String(id || '');
  if (MODO_DEMO && /^data:image\/(webp|jpeg|png);base64,/.test(s)) return s;
  if (!/^[\w-]{10,100}$/.test(s)) return '';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(s)}&sz=w${ancho}`;
}
