# HANDOFF — MH-Ragnarok (fin de sesión 3 en Cowork)

Fecha: 2026-11-22
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Punto de partida exacto para la sesión 4

1. Leer `CLAUDE.md`, este archivo, `SPEC.md` y `DESIGN.md`.
2. **Primer commit y push hechos** por Juan (commit `599e4f5`, 65 archivos, rama `main`). **GitHub Pages activado** (Source: GitHub Actions, lo activó Claude desde el navegador de Juan) y la acción "Publicar en GitHub Pages" pasó en verde. **Web en línea: https://juankcasal.github.io/MH-Ragnarok/** (modo demostración). Aviso menor de la acción: `checkout`, `setup-node`, `configure-pages`, `upload-pages-artifact` y `deploy-pages` corren en Node 20 (deprecado); subirlas a su versión más nueva cuando toque.
3. Comentarios de Juan tras probar en el celular (sesión 4):
   - ✅ **Fondo de chispas y virutas de fuego** — hecho en la sesión 4 (`site/js/ui/brasas.js`, estilos `.brasas`/`.brasas-fogon` en `base.css`, conectado en `app.js`, documentado en `DESIGN.md` > Movimiento > Ambiente, 2 pruebas nuevas → **42**). Verificado con Playwright a 390 y 1440 px, 60 fps, sin errores de consola, con `reduced-motion` = cuadro quieto. **Falta commit + push** (comandos abajo) y que Juan lo vea en su celular.
   - (anotar aquí el resto de sus comentarios)
4. Siguiente bloque del frontend v1 (`SPEC.md` §2): **Entrar / Registro / Mi perfil** (login con nick + PIN, registro con código del clan, cambio de nick con límite, adventurers Fase 1 y subida de capturas con `image.js`). Después Noticias, Guías y Miembros, y por último editor y admin.
5. Juan monta el backend con `docs/SETUP-backend.md` y pega la URL `/exec` en `site/config.js` (con eso se apaga el modo demostración solo).

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

## Commit pendiente (sesión 4)

```powershell
cd C:\dev\mh-ragnarok
git add .
git status
git commit -m "Fondo animado de chispas, brasas y virutas de fuego"
git push
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
