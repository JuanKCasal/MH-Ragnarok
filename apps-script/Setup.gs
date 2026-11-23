/**
 * Instalación del backend. Se ejecuta desde el editor de Apps Script, nunca desde la web.
 * Ver docs/SETUP-backend.md.
 */

var CONFIG_INICIAL = {
  gremio_nombre: 'Ragnarok',
  gremio_rango: '8',
  gremio_etiqueta: 'Veterans',
  gremio_declaracion: 'El inicio 28-10-26',
  lider_juego: 'wos',
  max_miembros: '52',
  whatsapp_invitacion: '',
  clash_dia: '6',
  clash_hora: '20:15',
  clash_duracion_min: '60',
  carnival_horas: '12:00,18:00',
  carnival_duracion_min: '130',
  zona_juego_offset_min: '-360',
  nick_cambios_semana: '2'
};

/** 1) Crea (o completa) el Sheet, la carpeta de Drive y las propiedades. Se puede ejecutar varias veces. */
function instalar() {
  var props = PropertiesService.getScriptProperties();
  var libro;
  if (props.getProperty('SHEET_ID')) {
    libro = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  } else {
    libro = SpreadsheetApp.create('MH-Ragnarok · Base de datos');
    props.setProperty('SHEET_ID', libro.getId());
  }
  Object.keys(ESQUEMA).forEach(function (nombre) {
    var h = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
    var cols = Object.keys(ESQUEMA[nombre]);
    h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    h.setFrozenRows(1);
    h.getRange(1, 1, h.getMaxRows(), cols.length).setNumberFormat('@');
    if (['Credenciales', 'Sesiones', 'Log'].indexOf(nombre) !== -1) h.setTabColor('#8b0000');
  });
  var hoja1 = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (hoja1 && libro.getSheets().length > 1) libro.deleteSheet(hoja1);

  if (!props.getProperty('DRIVE_FOLDER_ID')) {
    props.setProperty('DRIVE_FOLDER_ID', DriveApp.createFolder('MH-Ragnarok · Imágenes').getId());
  }
  if (!props.getProperty('PIN_PEPPER')) {
    props.setProperty('PIN_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  }
  libro_ = libro;
  var actual = config_();
  Object.keys(CONFIG_INICIAL).forEach(function (k) { if (!(k in actual)) setConfig_(k, CONFIG_INICIAL[k]); });

  console.log('Listo. Sheet: ' + libro.getUrl());
  console.log('Carpeta de imágenes: https://drive.google.com/drive/folders/' + props.getProperty('DRIVE_FOLDER_ID'));
}

/** 2) Define el código del clan. Edita el texto, ejecuta, y vuelve a dejar el texto vacío antes de guardar. */
function configurarCodigoClan() {
  var CODIGO = ''; // ← escribe aquí el código, ejecuta y bórralo
  if (CODIGO.length < 6) throw new Error('Escribe un código de al menos 6 caracteres en la variable CODIGO.');
  setProp_('CLAN_CODE_HASH', sha256Hex_(prop_('PIN_PEPPER') + ':' + CODIGO));
  console.log('Código del clan configurado. Ahora borra el texto de CODIGO.');
}

/** 3) Crea el primer admin. Edita NICK y PIN, ejecuta, y vuelve a dejarlos vacíos. */
function crearAdmin() {
  var NICK = ''; // ← tu nick para entrar a la web
  var PIN = '';  // ← 6 dígitos; bórralo después de ejecutar
  crearAdmin_(NICK, PIN);
  console.log('Admin creado: ' + NICK + '. Ahora borra NICK y PIN del código.');
}

function crearAdmin_(nick, pin) {
  nick = validarNick_(nick);
  pin = validarPin_(pin);
  var existente = buscar_('Miembros', function (m) { return claveNick_(m.nick) === claveNick_(nick); });
  if (existente) throw new Error('Ya existe un miembro con ese nick.');
  var ahora = ahoraIso_();
  var m = insertar_('Miembros', { id: nuevoId_(), nick: nick, nick_juego: nick, uid_juego: '', pais: '', rol: 'admin',
    estado: 'activo', bio: '', avatar_id: '', adventurer_principal_id: '', creado: ahora, actualizado: ahora });
  var sal = nuevaSal_();
  insertar_('Credenciales', { miembro_id: m.id, pin_hash: hashPin_(pin, sal), sal: sal, intentos_fallidos: 0,
    bloqueado_hasta: '', pin_temporal: false, actualizado: ahora });
  log_(m.id, 'admin_creado', 'Miembros', m.id);
  invalidarCache_(); // que el directorio público lo muestre ya
  return m;
}

/** Mantenimiento: borra sesiones vencidas. Programar con un activador diario (opcional). */
function limpiarSesiones() {
  var ahora = new Date();
  borrarFilas_('Sesiones', filtrar_('Sesiones', function (s) { return new Date(s.expira) < ahora; }));
}
