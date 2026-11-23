// Configuración pública del frontend. No poner aquí claves ni el código del clan.
// API_URL es la URL /exec del Web App de Apps Script: es pública por naturaleza
// (el navegador de cada visitante la usa) y no contiene secretos.
export const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwtwr4PjqLeC34po0Q9wBUv6y2sF1yY4qMfxFj3Fn5tkvaMYVdfw6Dp-WxzyDE72LYw/exec', // Web App de Apps Script (pública, sin secretos)
  ZONA_JUEGO_OFFSET_MIN: -360, // UTC−6
  CACHE_LOCAL_MIN: 10,
};
