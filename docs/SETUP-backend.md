# Montar el backend (Google Apps Script)

Tiempo estimado: 15 minutos. Todo se hace desde el navegador, con la cuenta de Google que será dueña de los datos del clan (recomendado: una cuenta dedicada, ver `SPEC.md` §12).

## 1. Crear el proyecto de Apps Script

1. Entra a <https://script.google.com> → **Nuevo proyecto**. Nómbralo `MH-Ragnarok API`.
2. En **Configuración del proyecto** (engranaje) marca **"Mostrar el archivo de manifiesto appsscript.json en el editor"**.
3. **Un solo archivo (recomendado):** genera `MH-Ragnarok.gs` con `npm run gs` (queda en `Claude outputs/`; también te lo puede generar Claude). En el editor, renombra el `Código.gs` que trae el proyecto a `MH-Ragnarok`, borra todo su contenido y pega el archivo completo. Guarda (Ctrl+S).
   - *Alternativa:* un archivo por cada `.gs` de `apps-script/` (botón **+ → Secuencia de comandos**) con el mismo nombre: `Adventurers`, `Auth`, `Clash`, `Code`, `Contenido`, `Db`, `Imagenes`, `Miembros`, `Setup`, `Util`. No mezcles las dos formas: habría funciones repetidas.
4. Reemplaza el contenido de `appsscript.json` por el del repo.

> Alternativa para quien use terminal: `npm i -g @google/clasp`, `clasp login`, `clasp create --type webapp --rootDir apps-script` y `clasp push`. El archivo `.clasp.json` queda fuera de git.

## 2. Instalar (crea el Sheet, la carpeta de imágenes y las claves)

1. Abre `Setup.gs`, elige la función **`instalar`** en la barra superior y pulsa **Ejecutar**.
2. Google pedirá permisos (Sheets y Drive). Como el script es tuyo y no está verificado, aparece "Google no verificó esta app": **Configuración avanzada → Ir a MH-Ragnarok API (no seguro) → Permitir**.
3. En el **Registro de ejecución** aparecen los enlaces al Sheet `MH-Ragnarok · Base de datos` y a la carpeta `MH-Ragnarok · Imágenes`. No hace falta tocarlos: el script los administra.

`instalar` se puede volver a ejecutar sin perder datos (solo completa lo que falte).

## 3. Código del clan y primer admin

1. Función `crearAdmin` (búscala con Ctrl+F): escribe tu `NICK` y un `PIN` de 6 dígitos, elige `crearAdmin` en la barra superior, ejecuta y **vuelve a dejarlos vacíos** y guarda.
2. **Código del clan:** lo más simple es ponerlo desde la web, ya entrando como admin: Mi perfil → Administración → Código. Así no se escribe en el script. (También existe la función `configurarCodigoClan`: escribe el código en `CODIGO`, ejecuta y vuelve a dejarlo vacío.) Se guarda solo como hash. Mientras no haya código, nadie puede registrarse.

## 4. Publicar como aplicación web

1. **Implementar → Nueva implementación → tipo "Aplicación web"**.
2. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier usuario** (aunque no tenga cuenta de Google).
3. Copia la **URL de la aplicación web** (termina en `/exec`) y pégala en `site/config.js` → `API_URL`.
4. Prueba en el navegador: `URL/exec?accion=inicio` debe responder `{"ok":true,"data":{…}}`.

Cada vez que cambies el código (con un solo archivo: borrar todo y pegar el `MH-Ragnarok.gs` nuevo): **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva → Implementar**. Así la URL no cambia.

## 5. Mantenimiento opcional

- **Activadores** (reloj) → `limpiarSesiones`, diario: borra sesiones vencidas.
- Las hojas en rojo (`Credenciales`, `Sesiones`, `Log`) son privadas: no las compartas. Si compartes el Sheet con oficiales, que sea solo con permiso de lectura y preferiblemente nada.

## Qué guarda el script en "Propiedades del script"

| Propiedad | Para qué |
|---|---|
| `SHEET_ID` | ID del Sheet de datos |
| `DRIVE_FOLDER_ID` | ID de la carpeta de imágenes |
| `PIN_PEPPER` | Clave secreta para el hash de los PIN (no compartir, no borrar: si se pierde, todos los PIN dejan de funcionar) |
| `CLAN_CODE_HASH` | Hash del código del clan |
| `CACHE_VER` | Versión de la caché (se incrementa sola) |

## Límites a tener en cuenta

- Apps Script tarda ~1–2 s en la primera respuesta "en frío". La web muestra los datos guardados en el celular mientras refresca.
- Cuenta gratuita de Google: 6 min por ejecución y 30 ejecuciones simultáneas, de sobra para 52 miembros.
- Imágenes: máx. 2 MB cada una (el navegador las comprime antes a WebP ~1600 px).
