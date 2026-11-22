# HANDOFF — MH-Ragnarok (fin de sesión 6 en Cowork)

Fecha: 2026-11-22
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Punto de partida exacto para la sesión 7

1. Leer `CLAUDE.md`, este archivo, `SPEC.md` y `DESIGN.md`.
2. **Las sesiones 5 y 6 van en un solo commit** (decisión de Juan) y todavía no se hizo: confirmar que corrió los comandos de "Commit pendiente" abajo. Después del push, revisar con él en el celular: el aviso **"Hay una versión nueva · Actualizar"** (la primera publicación con versionado puede necesitar esperar ~10 min o borrar caché una última vez), **Miembros**, **Noticias** y **Guías**.
3. Siguiente bloque del frontend v1 (`SPEC.md` §2): **editor** de noticias y guías para oficiales (`#/editor/noticia/:id?`, `#/editor/guia/:id?`: Markdown con vista previa usando `renderMarkdown`, portada con `comprimir` + `imagen.subir` tipo `portada`, publicar/borrador, fijar; lista vía `editor.contenido`) y luego **admin** (`#/admin`: miembros con rol/estado/reset de PIN, código del clan, configuración del gremio). Faltan en `demo-data.js` las escrituras `noticia.guardar/eliminar`, `guia.guardar/eliminar`, `editor.contenido` y las de admin.
4. Juan monta el backend con `docs/SETUP-backend.md` y pega la URL `/exec` en `site/config.js` (con eso se apaga el modo demostración solo).
5. Pendiente menor: subir las acciones de GitHub Pages a versiones con Node 24 (hoy corren en Node 20, deprecado). Verificar versiones vigentes antes de cambiarlas.

## Commit pendiente (sesiones 5 y 6 juntas)

```powershell
cd C:\dev\mh-ragnarok
git add .
git status
git commit -m "Miembros, Noticias y Guías (Markdown seguro) y versionado de la web con aviso de actualización"
git push
```

## Hecho en la sesión 6 (misma conversación que la 5)

- **`js/markdown.js`** (subconjunto propio, sin dependencias): escapa todo el HTML; títulos `#`–`####` (`#` y `##` salen como h2, con id `s-<slug>` único), párrafos (un salto de línea = `<br>`), listas `- * 1.`, citas `>`, `---`, bloques de código, tablas con `|`; en línea **negrita**, *cursiva*, `código`, enlaces y imágenes. Enlaces: solo `https:`, rutas internas `#/…` y anclas `#seccion` (cualquier otro esquema queda como texto). Imágenes: solo de Drive (`drive:ID` o enlaces de Drive → miniatura). Devuelve `{ html, titulos }`.
- **`js/ui/contenido.js`**: `fechaRelativa` ("hace 3 h", "ayer", "hace 4 días", "22 nov 2026"), `fechaLarga`, `activarAnclas` (las anclas no pueden usar el hash porque lo usa el router: se salta con `scrollIntoView`), `compartir` (menú del teléfono con `navigator.share`, o copia el enlace) y `portada`.
- **Noticias** (`views/noticias.js`, `views/noticia.js`): lista con filtro Todas / Juego / Gremio / Eventos (`#/noticias?tipo=…`), fijadas primero con su marca, color por tipo, "Cargar más" (paginado de la API); detalle con tipo, fecha, autor, entrada, portada, cuerpo en Markdown, Compartir y "Más noticias".
- **Guías** (`views/guias.js`, `views/guia.js`): agrupadas por categoría con saltos rápidos, insignia de nivel (Básico / Intermedio / Avanzado); detalle con índice "En esta guía" (si hay 3 o más secciones), cuerpo en Markdown, Compartir y "Todas las guías". Etiquetas `CATEGORIAS_GUIA` y `NIVELES_GUIA` en `etiquetas.js`.
- **Contenido de ejemplo** en `js/demo-contenido.js`: 7 noticias y 7 guías escritas solo con datos confirmados del juego (capturas de Juan) y las reglas de la web; los oficiales pueden usarlas como base para las reales. En demo la lista de noticias pagina de 5 en 5 (el backend de 12) para que se vea "Cargar más". Inicio muestra las 3 últimas (fijadas primero).
- `views/pronto.js` ahora es solo la página "no encontrada": ya no queda ninguna sección "próximamente".
- Verificado con Playwright a 390 y 320 px sobre la copia versionada: lista, filtro, cargar más, detalle, no existe, saltos e índice sin tocar el hash, tablas sin desborde, enlace desde Inicio. Arreglados en la prueba: el reset global quitaba viñetas y números de las listas del Markdown y del índice; las tablas cortaban palabras a la mitad en 320 px.
- Pruebas: **65** (`npm test`), nueva `tests/markdown.test.mjs` (incluye intentos de `javascript:`, `data:`, `http:`, atributos inyectados e imágenes de fuera de Drive).
- Quedan en `Claude outputs/` los paquetes de prueba `site-build*.tgz` (ignorados por git); Juan puede borrarlos.

## Hecho en la sesión 5

- **Versionado / caché del celular** (pedido de Juan: en el PC veía la versión nueva con Ctrl+Mayús+R, en el celular no). GitHub Pages sirve con caché de ~10 min y no deja cambiar cabeceras.
  - `scripts/versionar.mjs`: al desplegar, sobre una copia de `site/` (`_site/`), añade `?v=<commit de 7 caracteres>` a cada CSS/JS del HTML y a todos los `import` (estáticos y dinámicos) de los módulos, fija `VERSION` en `js/version.js` y escribe `version.json`. En el repo `VERSION = 'dev'` (local no avisa nada).
  - `js/ui/actualizacion.js`: al abrir y al volver a la pestaña (máx. cada 5 min) compara `version.json` (sin caché) con su `VERSION`; si cambió, muestra **"Hay una versión nueva de la web · Actualizar"**, que recarga con `?v=` en la dirección para saltarse el HTML guardado (luego se limpia de la barra).
  - La versión se ve en el pie ("Versión abc1234"). Workflow `pages.yml`: paso "Versionar" y publica `_site`. `_site/` en `.gitignore`.
- **Miembros** (`views/miembros.js`, `#/miembros`): buscador sin tildes (nick, nombre en el juego, adventurer, arma en ES o EN, elemento, tipo); panel **Filtros** con chips de selección múltiple (arma, elemento con punto de color, tipo; O dentro del grupo, Y entre grupos) y contador; orden Más poder / Menos poder / Nick A–Z; puesto por poder en todo el gremio (podio 1–3 en oro); "Tú" en tu fila; los que no cargaron adventurer van al final. Los filtros se conservan al volver de un perfil. Lógica pura en `js/miembros-filtro.js`.
- **Perfil público** (`views/miembro.js`, `#/miembros/:id`): avatar, rol, país, nombre en el juego, bio, **ID de jugador con botón Copiar** (para agregarlo de amigo), "En el gremio desde…", "Editar mi perfil" si eres tú, adventurers con el principal primero y **barra de desglose del poder** (Equipamiento / Rostros / Camarada / Otros). Mensajes para "sin adventurers" y "no existe".
- `views/yo.js`: exporta `elemDot` y `desglosePoder`; `tarjetaAdventurer` acepta `desglose` y muestra las **notas**; el avatar con foto respeta el tamaño pedido (antes quedaba siempre en 88 px). Mi perfil también muestra el desglose del principal.
- Eventos: el nick de cada cazador en las brigadas enlaza a su perfil.
- `demo-data.js`: `leerDemo('miembros')` y perfiles completos (nombres de adventurer inventados, nivel, loadout, bio, ID, desglose en la mitad, segundo adventurer en un tercio, 2 sin adventurer) con otra semilla para no cambiar los poderes del Clash.
- Verificado con Playwright a 390 y 320 px sobre la copia versionada: búsqueda, filtros, vacío, orden, perfil, volver con filtros, sin adventurer, no existe, enlaces de brigadas y aviso de versión nueva + recarga. Sin errores de consola ni desborde.
- Pruebas: **59** (`npm test`): nuevas `tests/versionar.test.mjs` y `tests/miembros.test.mjs`.

## Hecho en la sesión 4

- **Fondo de chispas, brasas y virutas de fuego** (pedido de Juan tras probar en el celular): `site/js/ui/brasas.js` + `.brasas`/`.brasas-fogon` en `base.css`. Documentado en `DESIGN.md` > Movimiento > Ambiente. Commit `a24623f`, publicado. A Juan le encantó.
- **Entrar** (`views/entrar.js`): nick + PIN, botón Ver/Ocultar, vuelve a `?volver=` (solo rutas internas), PIN temporal → `#/yo?pin=1`.
- **Registro** (`views/registro.js`): código del clan, nick, nombre en el juego, país, PIN ×2; errores del backend marcados en su campo (`CAMPO_DE_ERROR`); al terminar → `#/yo?nuevo=1` con bienvenida.
- **Mi perfil** (`views/yo.js`): avatar (512 px cuadrado), adventurers con "Principal" y "Hacer principal", enlace de WhatsApp (solo enlaces `chat.whatsapp.com`, solo con sesión), Mis datos (nick con cambios restantes de la semana, nombre e ID del juego, país, bio 280), Cambiar PIN (primero y abierto si es temporal), Cerrar sesión. Exporta `tarjetaAdventurer` y `avatar` para reutilizar en Miembros.
- **Adventurer** (`views/adventurer.js`, `#/yo/adventurer` y `#/yo/adventurer/:id`): nombre, arma (ES · EN), elemento y tipo como chips, poder total y nivel, desglose opcional (Equipamiento/Rostros/Camarada), loadout, notas, hasta 5 capturas (comprimidas a WebP 1600 px, se pueden quitar), eliminar con doble toque (sin diálogos del navegador).
- Nuevos módulos: `js/validar.js` (espejo de las validaciones del backend, países, bandera, `validarAdventurer`), `js/image.js` (compresión y URL de miniatura de Drive), `js/ui/form.js` (campos accesibles, errores, PIN, contadores). Estilos de formularios, chips, avatar y alertas en `components.css`; vistas en `views.css`.
- `auth.js`: ahora olvida la sesión también con `SESION_VENCIDA`/`SIN_ACCESO` (antes solo `SIN_SESION`, que el backend no envía); `actualizarMiembro`, `salir`, `esSesionCaida`. En demo se puede cerrar sesión y volver a entrar.
- `demo-data.js`: perfil de "Midori" con 2 adventurers y todas las escrituras de este bloque simuladas con las reglas del backend (prueba el nick "Kaelith" para ver "nick ocupado").
- Eventos: el aviso de "necesitas tu adventurer principal" enlaza a `#/yo/adventurer`.
- Verificado con Playwright a 390 y 320 px: flujo completo (editar con capturas, errores, principal, nick ocupado, PIN débil, salir, entrar, registro), sin errores de consola ni desborde. Arreglados en la prueba: `maxlength` del PIN recortaba un PIN pegado con espacios; `marcar()` fallaba en fieldsets sin párrafo de error.
- Pruebas: **49** (`npm test`), nuevo `tests/perfil.test.mjs`.

## Hecho en la sesión 3

- **Decisiones de `SPEC.md` §12 cerradas** (ya no queda nada por confirmar de la v1):
  - Modo "los más fuertes juntos": **no se ofrece**. La idea es 2 fuertes + 2 de poder normal por brigada.
  - Cuenta de Google: **la personal de Juan** por ahora; repo en su GitHub.
  - Cambio de nick: **cada miembro lo cambia, máx. 2 veces por 7 días corridos** (`nick_cambios_semana` en Config).
  - Guild Clash: **~1 hora** (`clash_duracion_min` = 60). Cada brigada juega 4 rondas (4 monstruos) contra brigadas de otros clanes; cada victoria suma puntos.
  - **Brigada** = siempre 4 personajes por batalla (solo: tú + 3 adventurers propios; Clash: 4 jugadores del clan). En la web los grupos del Clash se llaman **brigadas** (Brigada I, II…). En código y hojas siguen como `equipos`.
- **Backend:** `perfil.guardar` acepta `nick` (único, límite semanal, error `NICK_LIMITE`); nueva columna privada `Miembros.nick_cambios`; `nick_cambios_semana` en Config y editable por el admin; Clash de 60 min. Prueba nueva.
- **`DESIGN.md`** escrito con los tokens de la dirección B (formato Impeccable: frontmatter + 8 secciones).
- **Frontend v1, primera entrega** (`site/`, sin dependencias ni build):
  - Estructura: `index.html`, CSS en 4 capas (`tokens`, `base`, `components`, `views`), hash router, cliente de API con copia local, sesión, toasts, relojes, íconos y emblema propios, PWA (manifest + íconos PNG).
  - Fuentes **Cinzel y Mulish autoalojadas** (`site/assets/fonts/`, OFL, subconjunto latino).
  - **Inicio** (estandarte que ondea, título con brillo, datos del gremio, próximo Clash con cuenta regresiva y asistencia, Carnival, crónicas, llamado a registrarse).
  - **Eventos** (tu asistencia VOY/QUIZÁ/NO, resumen, brigadas de la semana con "La tuya" primero, confirmados, último Clash, cómo se juega, Carnival en tu hora).
  - **Armar brigadas** (`#/clash/armar`, oficiales): reparto automático, incluir "quizá", composición opcional, intercambio tocando dos cazadores, fijar, publicar.
  - Noticias, Guías, Miembros, Entrar, Registro y Mi perfil: pantalla "llega en la próxima entrega".
  - **Modo demostración:** sin `API_URL` usa `site/js/demo-data.js` (52 cazadores inventados; navegas como "Midori", oficial de prueba) con aviso visible.
- Verificado con Playwright a 320–1600 px (sin desborde horizontal, sin errores de consola, zona horaria del visitante respetada) y flujo completo de armado.
- Pruebas: **40** (`npm test`), incluidas 4 nuevas del frontend (`tests/frontend.test.mjs`: escape de HTML, romanos, horarios).
- `.gitignore` ahora ignora `Claude outputs/` y `.impeccable/`; nuevo `.gitattributes` (LF, binarios).

## Git (lo hace Juan por consola; no hay credenciales de GitHub en el entorno de Claude)

Autor de los commits: `JuanKCasal <JuanKCasal@users.noreply.github.com>` (decisión de Juan). Comandos entregados en la sesión 3:

```powershell
cd C:\dev\mh-ragnarok
git init -b main
git config user.name "JuanKCasal"
git config user.email "JuanKCasal@users.noreply.github.com"
git remote add origin https://github.com/JuanKCasal/MH-Ragnarok.git
git add .
git status
git commit -m "MH-Ragnarok v0.1: SPEC, backend Apps Script, DESIGN.md y frontend (Inicio, Eventos, armado de brigadas)"
git push -u origin main
```

## Notas técnicas

- El lanzador de Impeccable (`scripts/impeccable`) sigue sin poder ejecutarse en el entorno de Claude (bloqueo del sistema, no de instalación). Se trabaja leyendo sus guías (`SKILL.md`, `reference/craft-floor.md`, `document.md`).
- Para ver la web en local: `python -m http.server 8000 -d site` y abrir http://localhost:8000.

## Proyecto

Web del gremio **Ragnarok** de *Monster Hunter Outlanders* (Android/iOS, TiMi + Capcom, lanzamiento global 29-10-2026). Uso principal en celular: mobile-first obligatorio. Hermosa, moderna, con animaciones, estética Monster Hunter.

Secciones pedidas:
- Landing con información del gremio
- Guías para nuevos
- Noticias (actualizaciones del juego, etc.)
- Perfiles de miembros: adventurers, builds
- Planificación de eventos (Guild Clash de los sábados, Guild Carnival)

## Decisiones tomadas

- **Arquitectura:** frontend estático en GitHub Pages; backend = Google Apps Script publicado como Web App (API); datos en Google Sheets; fotos en carpeta de Google Drive. Por ahora, cuenta de Google personal de Juan (sesión 3).
  - CORS: enviar POST como `text/plain` (sin preflight).
  - Comprimir imágenes en el navegador antes de subir (~1600 px, WebP).
- **Autenticación:** código del clan (solo para registrarse; cambiable) + PIN personal de 6 dígitos, guardado como hash con sal. Token de sesión con vencimiento guardado en el celular. Bloqueo temporal tras 5 intentos fallidos.
- **Roles:**
  - Admin (Juan): todo, nombra oficiales.
  - Oficial: publica noticias y guías, organiza el Guild Clash, resetea PIN.
  - Miembro: edita su propio perfil y builds, confirma asistencia.
- **Idioma de la web:** solo español. El catálogo del juego debe guardar nombre ES + EN (Juan juega en inglés; la mayoría del clan en español).
- **Visibilidad:** todo público por ahora. No publicar teléfonos; WhatsApp mediante enlace de invitación.
- **Horarios:** mostrar eventos en la hora local de cada visitante + cuenta regresiva.
- **Estética:** inspirada en la UI del juego (pergamino, madera tallada, dorado, estandartes) y el dragón dorado de la foto del grupo de WhatsApp. Sin logos ni arte oficial de Capcom; aviso de "fan site no oficial".
- **Skills de diseño:** Impeccable (pbakaus/impeccable) + Taste Skill (Leonxlnx/taste-skill, design-taste-frontend), instaladas en el proyecto desde Cowork con permiso de Juan. UI UX Pro Max solo como referencia de paletas (tuvo CVEs hasta v2.5.0).
- **Builds:** Juan quiere catálogo estructurado. Propuesta de Claude (pendiente de confirmar): por fases (ver abajo).
- **Guild Clash:** herramienta de pre-armado de equipos de jugadores balanceados por poder. Hoy el clan no se organiza para el Clash.

## Datos del gremio (de capturas del juego y WhatsApp)

- Ragnarok — rango 8 — 52/52 miembros — etiqueta "Veterans" — líder in-game: "wos" — declaración: "El inicio 28-10-26".
- **Guild Clash:** sábados 20:15 (UTC-6). Semana pasada: puesto 29 en puntos. Es competencia de speedrun entre gremios (tiempos de clear + puntos de ranking).
- **Guild Carnival:** diario 12:00 y 18:00 (UTC-6), dura 2 h 10 min.
- Grupo de WhatsApp "MH Ragnarok": 24 miembros. Tono del grupo: humorístico ("hospital psiquiátrico de Ragnarok").
- Miembros de varios países (Chile, Colombia, Brasil...).

## Estructura de una build (capturas de Juan, juego en inglés)

Pantallas del adventurer: Attribute, Equipment, Visage (= "Rostros" en español), Buddy, Weapon Insight. También Squad (= "Brigada") y Loadout.

- **Adventurer Power** total (ej. 16.851) = suma por componente (Equipment 6.736, Visage 2.099, Buddy 1.998, …). Es la métrica para balancear.
- Adventurer: nombre, nivel (máx. 80), elemento, tipo de arma. Loadout con nombre (ej. "Fire Heavy").
- Charm: Monster Spirit Charm, nivel x/80.
- Atributos: Physical Attack, Defense, Affinity %, Health, Stamina, ataque elemental, Ele/Phys Crit DMG, bonos por elemento (Fire/Water/Thunder/Ice/Dragon), Ultimate Charge Rate, resistencias.
- Equipamiento: arma + 5 piezas (casco, pecho, brazos, cintura, piernas). Cada pieza con rareza (x/13; arma x/14), calidad, poder y habilidades. Efectos de set por número de piezas (ej. "Pink Rathian's Acuity 2/3").
- Habilidades: nivel actual/máximo y aporte por pieza (ej. Fire Damage Up 7/7).
- Arma: efecto innato (ej. Heavy Bowgun Mastery) y efecto despertado (ej. Third Power Shot). Algunos marcados "Season 0 only".
- Visage: 1 carta núcleo + 4 cartas de monstruo; costo total máx. 12; nivel de Visage; set de cartas (ej. "Ink of Flames 4/4").
- Buddy: rareza (SSR), nivel x/80, estrellas, poder, Adventurer Boost, Core Passive.
- Weapon Insight: árbol por tipo de arma, puntos (ej. 65/65), nodos con puntos (Internal Ammo 30, etc.).
- Tipos de arma (8): Great Sword, Long Sword, Dual Blades, Hammer, Charge Blade, Lance, Heavy Bowgun, Bow.
- Roles de adventurer: Assault, Disruptor, Support.

## Propuesta de fases para builds

- **Fase 1:** perfil + "build resumen": adventurer, arma, elemento, poder total y por componente, nombre de loadout, capturas.
- **Fase 2:** catálogo estructurado completo (ES/EN, autocompletado) que crece con lo que cargan los miembros; oficiales validan.
- **Opcional:** lectura automática de capturas con IA de visión (costo por captura).

## Respuestas de Juan (sesión 2, 2026-11-22)

1. El repo `JuanKCasal/MH-Ragnarok` **ya existe en GitHub y está vacío**. Falta `git init` local y conectar el remoto.
2. **Aprobado** el enfoque por fases para las builds (Fase 1 resumen → Fase 2 catálogo ES/EN).
3. Confirmado: "equipos de Clash" = grupos de jugadores del clan para el Guild Clash.
4. Cada equipo de Clash es de **4 jugadores**. Se balancea con el **poder del adventurer principal** de cada miembro (marcado en su perfil).

## Hecho en la sesión 2

- `SPEC.md` completo (rutas, arquitectura, carpetas, modelo de datos, API, seguridad, imágenes, horarios, balanceo, fases). Sección 12 = decisiones por confirmar.
- `apps-script/` — backend v1 completo (10 archivos `.gs` + `appsscript.json`). Guía: `docs/SETUP-backend.md`.
- `site/js/clash-balance.js` (greedy LPT + intercambios; 52 jugadores → diferencia ~0,4 % entre equipos, ~25 ms) y `site/js/time.js`.
- `tests/` — `node --test`, sin dependencias: 18 pruebas del backend sobre un simulador de Apps Script (`gas-mock.mjs`), 11 del balanceo, 6 de horarios.
- `.github/workflows/pages.yml` (prueba y publica `site/`), `README.md`, `package.json` (solo scripts), `site/config.js` (API_URL vacía).
- Glosario de `CLAUDE.md`: términos de GameWith es-MX marcados "confirmar".
- **Sin git todavía:** no hice `git init` ni commits (requiere permiso de Juan).

- **Direcciones visuales** (canvas de Claude Design, 6 artboards a 390 px): A · Tablón del Gremio (pergamino clavado en madera, lacre), B · Salón de Estandartes (noche, estandarte carmesí, emblema dorado), C · Bitácora de Cacería (diario de campo, curvas de nivel, tinta). Emblema propio: escudo con alas y cuernos + "R" (sin arte de Capcom). Fuentes de Google Fonts.
- El lanzador de Impeccable (`scripts/impeccable`) **no se ejecutó**: el sistema bloqueó correr ese binario descargado. Las direcciones se hicieron leyendo sus guías a mano. Si Juan quiere usar sus comandos, debe autorizarlo explícitamente.

## Skills de diseño instaladas (sesión 2)

- `.claude/skills/impeccable/` — Impeccable 4.10.0 (pbakaus/impeccable, commit b49177d). El lanzador `scripts/impeccable` descarga en su primer uso un binario verificado con `engine-checksums.txt` (motor 0.1.27). **No** se copiaron los hooks de `.claude/settings.json` del repo original (corrían el binario en cada edición) ni sus subagentes.
- `.claude/skills/design-taste-frontend/` — Taste Skill 2.5.1 (Leonxlnx/taste-skill, commit f6b7657). Sus scripts son herramientas Node locales (capturas, lint de copy).
- Ambas están en `.gitignore` (≈40 MB de terceros, no se publican en GitHub Pages).

5. (Sesión 2, al cierre) Equipos incompletos → **equipos de 3**. WhatsApp → **solo con sesión**. Registro → **alta directa con el código del clan**. Diseño → **B tal cual**. Prefirió abrir **sesión nueva** para el siguiente bloque.

## Pendiente

- Completar el glosario EN → ES de `CLAUDE.md` (confirmados: Visage = Rostros, Squad = Brigada): pedir capturas del juego en español.

## Fuentes

- Guías de builds: GameWith (gamewith.ai/monster-hunter-outlanders). El enlace de Game8 que dio Juan (archives/618476) no se pudo abrir desde el entorno de Claude.
