/** Imágenes en Google Drive. Ver SPEC.md §8. */

var MIME_PERMITIDOS = ['image/webp', 'image/jpeg', 'image/png'];
var MAX_BYTES = 2 * 1024 * 1024;
var TIPOS_IMAGEN = ['avatar', 'captura', 'portada'];

function carpeta_() {
  var id = prop_('DRIVE_FOLDER_ID');
  if (!id) fallar_('NO_INSTALADO', 'Falta la carpeta de imágenes (ejecuta instalar()).');
  return DriveApp.getFolderById(id);
}

function subirImagen_(token, d) {
  var yo = requerir_(token);
  var tipo = enumValido_(d.tipo, TIPOS_IMAGEN, 'tipo de imagen');
  if (tipo === 'portada' && NIVEL_ROL[yo.rol] < NIVEL_ROL.oficial) fallar_('SIN_PERMISO', 'Solo oficiales suben portadas.');
  var mime = enumValido_(d.mime, MIME_PERMITIDOS, 'formato de imagen');
  var base64 = String(d.base64 || '').replace(/^data:[^,]*,/, '');
  if (base64.length > MAX_BYTES * 1.37) fallar_('IMAGEN_GRANDE', 'La imagen supera 2 MB.');
  var bytes;
  try { bytes = Utilities.base64Decode(base64); } catch (e) { fallar_('DATO_INVALIDO', 'Imagen corrupta.'); }
  if (!bytes.length || bytes.length > MAX_BYTES) fallar_('IMAGEN_GRANDE', 'La imagen supera 2 MB.');
  if (!firmaCoincide_(bytes, mime)) fallar_('DATO_INVALIDO', 'El archivo no es una imagen válida.');

  // Límite suave anti-abuso: 40 imágenes por miembro por día.
  var hoy = ahoraIso_().slice(0, 10);
  var deHoy = filtrar_('Imagenes', function (i) { return i.miembro_id === yo.id && String(i.creado).slice(0, 10) === hoy; });
  if (deHoy.length >= 40) fallar_('LIMITE', 'Llegaste al límite de imágenes de hoy.');

  var ext = mime.split('/')[1].replace('jpeg', 'jpg');
  var nombre = tipo + '_' + yo.id + '_' + ahoraIso_().replace(/[:.]/g, '-') + '.' + ext;
  var archivo = carpeta_().createFile(Utilities.newBlob(bytes, mime, nombre));
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = archivo.getId();
  insertar_('Imagenes', { id: id, miembro_id: yo.id, tipo: tipo, creado: ahoraIso_() });
  return { id: id };
}

/** Revisa los "magic bytes" del archivo. */
function firmaCoincide_(b, mime) {
  var u = function (i) { return (b[i] + 256) % 256; };
  if (mime === 'image/jpeg') return u(0) === 0xFF && u(1) === 0xD8;
  if (mime === 'image/png') return u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4E && u(3) === 0x47;
  if (mime === 'image/webp') return u(0) === 0x52 && u(1) === 0x49 && u(8) === 0x57 && u(9) === 0x45;
  return false;
}

/** Comprueba que la imagen la subió este backend (y, si se indica, este miembro). */
function validarImagenPropia_(id, miembroId, tipo) {
  var img = buscar_('Imagenes', function (i) { return i.id === id; });
  if (!img) fallar_('DATO_INVALIDO', 'Imagen desconocida. Súbela de nuevo.');
  if (miembroId && img.miembro_id !== miembroId) fallar_('SIN_PERMISO', 'Esa imagen no es tuya.');
  if (tipo && img.tipo !== tipo) fallar_('DATO_INVALIDO', 'Tipo de imagen incorrecto.');
  return img;
}

function enviarAPapelera_(id) {
  var img = buscar_('Imagenes', function (i) { return i.id === id; });
  if (!img) return; // nunca tocar archivos que no subió este backend
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { console.warn('No se pudo borrar ' + id, e); }
  borrarFilas_('Imagenes', [img]);
}
