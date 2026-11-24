# HANDOFF — MH-Ragnarok (sesión 18: entrega 1 publicada — backend v9 + Pages · siguiente: E3 tarjeta de build, decisiones tomadas)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 18 — Publicación de la entrega 1 y decisiones de la E3

### Hecho en la sesión 18 (Claude con el Chrome de Juan)
- **Backend v9 publicado**: en el editor de Apps Script se aplicaron solo las dos diferencias con la v8 (línea de versión de la cabecera y la lista de `poder` con `'maestria'` en `composicionValida_`); el contenido quedó **idéntico al paquete** `Claude outputs/MH-Ragnarok.gs` (SHA-256 `f8286f1a2e37…280843`). Guardado e implementado como **Versión 9** "v9 (poder a mano)" (misma URL). `builds?clase=ejemplo` → `{ok:true,data:[]}`.
- **Pages**: las ejecuciones #27 (`a53e738`) y #28 (`8ee94d7`) fallaron con "No artifacts named github-pages" (el fallo conocido). Se lanzó **Run workflow** a mano (#29) en `main`: **verde**, la web publicada ya sirve `build-calc.js` con `PODER_MANUAL`/`calcularPoder`.

### Punto de partida exacto para la sesión 19
1. ~~Pages #29~~ **HECHO** (verde, verificado).
2. **Prueba en el celular (Juan)**: "Fire Heavy" → 7228 en Armadura, 2099 en Rostros y 220 en Adventurer y arma → la barra debe decir **Poder 17.343**.
3. **E3 · Tarjeta de build** (BUILDER §5), con las decisiones de Juan de la sesión 18:
   - La tarjeta compacta muestra: **poder total** (o "N de 5 escritos"), **arma y elemento** (ES + EN, tipo e icono), **habilidades top** (3–4 con más nivel, "Ataque 5/5") y **Rostros + camarada** en chips (núcleo de Rostros, camarada con rareza). Al tocarla abre la build completa.
   - Dónde: en el perfil del miembro (debajo de cada adventurer) y en guías con `[[build:ID]]`; acciones Compartir y "Usar de base".
   - **Proof of Mastery pasa al perfil del miembro** (es de la cuenta): se escribe una vez en "Mi perfil" y todas sus builds lo suman. Migración: si una build ya tiene `poder.maestria`, usarlo como valor inicial del perfil (o seguir leyéndolo de la build si el perfil no lo tiene). Requiere backend v10 (campo nuevo en `Miembros`).
   - **El poder total de la build alimenta automáticamente el `poder_total` del adventurer** (el que usa el balanceo del Clash) cuando la build está asociada a ese adventurer (`adventurer_id`) y el total está completo (5 de 5). Definir: si hay varias builds del mismo adventurer, ¿cuál manda? (proponer: la más reciente o una marcada como "principal"; preguntar a Juan).
   - Antes de programar: proponer a Juan el diseño de la tarjeta (mockup a 390 px) y la regla de "varias builds por adventurer".
4. Siguen abiertos: activador diario de `limpiarSesiones`; probar en el celular Camarada, equipo en español, E6 y Rostros; lo de "Por confirmar con el juego" de la sesión 16.

---

# (Sesión 17) HANDOFF — MH-Ragnarok (sesión 17: poder a mano + poder total en la barra · pusheado `a53e738` · backend v9 por publicar)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 17 — Poder a mano y total (entrega 1 de 4; detalle en docs/BUILDER.md §16)

### Punto de partida exacto para la sesión 18
**Orden elegido por Juan: por entregas**, cada una publicada y probada en el celular: 1) poder a mano + total (**hecha, falta publicar**) → 2) **E3 tarjeta de build** → 3) **E5 Comparar** → 4) **E7 poder estimado**.

1. Si la entrega 1 no está publicada, publicar (en este orden):
   1. ~~`npm test`~~ **HECHO:** 138 pasan (Juan, 2026-11-23).
   2. **Backend versión 9** (Apps Script, misma URL, sin `instalar()`): el único cambio frente a la v8 es la lista de `poder` en `composicionValida_` (`Builds.gs`), que ahora incluye `'maestria'`. Paquete probado: `Claude outputs/MH-Ragnarok.gs` (SHA-256 `f8286f1a2e37…`; la v8 era `3017aff336f5…`). Publicar "v9 (poder a mano)". Probar `builds?clase=ejemplo` → `{ok:true,data:[]}`. (Si la web sale antes, la v8 guarda la build pero descarta el Proof of Mastery.)
   3. ~~Commit + push~~ **HECHO:** commit `a53e738`, pusheado por Juan. (Comandos usados:)
      ```
      git add -A
      git commit -m "Sesión 17: poder a mano (equipo, Rostros, Proof of Mastery) y poder total en la barra, backend v9"
      git push
      ```
   4. Revisar Pages. Si falla con "No artifacts named github-pages": **Run workflow** (no Re-run).
   5. Probar en el celular: "Fire Heavy" → escribir 7228 en Armadura, 2099 en Rostros y 220 en Adventurer y arma → la barra debe decir **Poder 17.343** (con camarada 1998 y Recuerdo 5798 ya escritos).
2. **Siguiente: E3 tarjeta de build** (BUILDER §5): en el perfil (debajo de cada adventurer) y en guías con `[[build:ID]]`; Compartir y "Usar de base". Confirmar con Juan qué muestra la tarjeta (¿poder total? ¿habilidades top? ¿Rostros?) antes de programar.
3. Idea pendiente (preguntar): pasar Proof of Mastery al perfil del miembro (es de la cuenta) para no repetirlo en cada build; y si el total de la build debe alimentar el `poder_total` del adventurer (el que usa el Clash).
4. Siguen abiertos: activador diario de `limpiarSesiones`; probar en el celular Camarada, equipo en español, E6 y Rostros; lo de "Por confirmar con el juego" de la sesión 16.

### Respuestas de Juan (sesión 17)
- Poder del equipo: **un solo número para arma + 5 piezas**.
- Adventurer Power 17343 = equipo 7228 + Rostros 2099 + camarada 1998 + Recuerdo 5798 + **220 de Proof of Mastery** (captura: rango "Legendary Traveler III", "+220 physical attack and +110 elemental attack" a los adventurers del escuadrón).
- Entregas: una por vez (poder → E3 → E5 → E7).

### Hecho en la sesión 17
- `build-calc.js`: `PODER_MANUAL`, `limpiarPoder`, `conPoder`, `calcularPoder`; `limpiarBuild` conserva `poder`; `calcular()` devuelve `poder`.
- `views/build.js`: campos de poder (Proof of Mastery en Adventurer y arma; equipo en Armadura; Rostros), "poder N" en los resúmenes y **Poder total** en la barra fija ("· 4 de 5 escritos" si falta algo). CSS en `views.css` (`.bld-barra__poder`, `.bld-poder-campo`).
- `Builds.gs` v9 y `demo-data.js` aceptan `poder.maestria`; la build de ejemplo suma 17.343.
- Pruebas: **138** (+4). Revisado a 390 y 320 px (demo): sin scroll horizontal ni errores.
- Docs: BUILDER §3 y §16, SPEC (`build.guardar`), CLAUDE.md (glosario: Proof of Mastery).

### Git (sesión 17 — publicado en `a53e738`)
Modificados: `HANDOFF.md`, `CLAUDE.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/Builds.gs`, `site/js/{build-calc,demo-data}.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/{build-calc,builds}.test.mjs`. (`Claude outputs/` no va al repo.)

---

# (Sesión 16) HANDOFF — MH-Ragnarok (sesión 16)

## Sesión 16 — Corrección del Recuerdo (Keepsake) (publicado: `6f683ef` + backend v8)

### Punto de partida exacto para la sesión 17
**Plan que pidió Juan (2026-11-23, al cerrar la sesión 16):** en una sesión nueva, hacer de una sola vez **E3 tarjeta de build, E5 Comparar y E7 poder estimado** (BUILDER §5). Antes, y mientras no exista el poder estimado, estos cambios en la hoja de la build:
- **Armadura**: campo para escribir el poder a mano (como en Camarada y Recuerdo).
- **Rostros**: campo para escribir el poder a mano (igual).
- **Abajo (barra fija con Def./Atq./elemento y Guardar)**: **poder total** que se suma solo con los poderes escritos (armadura + Rostros + camarada + Recuerdo…).
Notas para empezar:
- La composición ya tiene un bloque `poder: { total, equipo, rostros, camarada }` (BUILDER §3) y el backend ya lo valida (`Builds.gs`, final de `composicionValida_`): puede que la armadura y los Rostros no necesiten backend nuevo. Revisar si `limpiarBuild` (build-calc.js) lo conserva. Camarada y Recuerdo guardan su poder en su propio bloque (`camarada.poder`, `keepsake.poder`): decidir de dónde lee la suma sin duplicar.
- **Preguntar a Juan antes de programar**: ¿el poder de "Armadura" es uno solo para las 5 piezas o por pieza? ¿y el arma (Legendary 14/14 = 2888) va en su propio campo? ¿Las Reflexiones o el nivel del adventurer suman poder? ¿Qué incluye el "Adventurer Power" total del juego (para que la suma de la web coincida)? Datos conocidos en "Datos para E7" del resumen del proyecto y BUILDER §12–§15.
- Confirmar con Juan el orden y el alcance de E3/E5/E7 (es un bloque grande; dividirlo en entregas publicadas si conviene).
- Captura de Juan (2026-11-23): su build real muestra Def. 888 · Atq. 1.040 · Fuego 520, 11 habilidades, Recuerdo "grabados 87 %" → el Recuerdo nuevo funciona en la web publicada.

1. Leer `CLAUDE.md`, este bloque y `docs/BUILDER.md` §15.1 ("Hecho en la sesión 16").
2. **Publicar (en este orden; el backend va ANTES que el push: la v7 rechaza los ids nuevos)**:
   1. `npm test` → **134** (Claude ya las corrió en su PC: 134 pasan).
   2. ~~Backend versión 8~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan, con su permiso):** el editor tenía exactamente la v7; se aplicó el cambio y quedó idéntico al paquete (SHA-256 `3017aff336f5…`), guardado y publicada la **versión 8** ("v8 (Recuerdo como en el juego)", misma URL); `builds?clase=ejemplo` → `{ok:true,data:[]}`. (Lo que se verificó: el editor tenía exactamente la v7 (SHA-256 `4dc4d558b460…`). Cambio solo en `Builds.gs` (`GRABADO_RE` y máx. 31 en `keepsakeValido_`). Paquete probado: `Claude outputs/MH-Ragnarok.gs` (SHA-256 `3017aff336f5…`). Publicar "v8 (Recuerdo como en el juego)", misma URL; sin `instalar()`. Probar `builds?clase=ejemplo` → `{ok:true,data:[]}`.)
   3. ~~Commit + push~~ **HECHO:** commit `6f683ef`, pusheado por Juan. (Comandos usados:)
      ```
      git add -A
      git commit -m "Sesión 16: Recuerdo (Keepsake) como en el juego: 31 pasos con rangos, backend v8"
      git push
      ```
   4. ~~Revisar el despliegue de Pages~~ **HECHO:** la ejecución #23 falló con el error pasajero de GitHub ("No artifacts named github-pages"); "Re-run failed jobs" volvió a fallar ("Multiple artifacts": el reintento sube un segundo artefacto en la misma ejecución). Se lanzó una ejecución nueva con **Run workflow** (#24, `workflow_dispatch`) y salió bien; la web sirve el código nuevo. **Para la próxima vez que pase: usar Run workflow, no Re-run.**
   5. Probar en el celular: "Fire Heavy" → cajón Recuerdo: marcar tus grabados (todo menos el Atributo de 4 puntos) → debe decir **87 %** como el juego. Si guardaste grabados con la v7, se pierden (ids viejos): vuelve a marcarlos.
3. **Por confirmar con el juego (Juan)**: la matriz con otro adventurer (¿misma forma?); que todos los grabados pidan el anterior de su columna; lo de la sesión 15 (Reflexiones de Haze, clase del Fated, rarezas §11).
4. Siguen abiertos: activador diario de `limpiarSesiones`; probar en el celular Camarada, equipo en español, E6 y Rostros.
5. **Siguiente entrega**: ver el plan de Juan al inicio de este punto (poder a mano + total, luego E3, E5 y E7).

### Hecho en la sesión 16
- Recuerdo rehecho con las capturas de Juan (BUILDER §15.1): 8 filas (1…80, 80), 31 pasos, nodos de 3 y 4 rangos con puntos (tocar = siguiente rango), % como el juego (piso de hechos / 31). Ids nuevos (`sb1…`, `ul…`, `el…`, `cp…`, `ca80`, `sb80b1–3`, `ca80b1–4`); los de la v7 se descartan.
- Rótulos: "Reflexiones (Insight)" y "Recuerdo (Keepsake) y grabados".
- Backend `Builds.gs` (v8) y `demo-data.js` con la validación nueva; build de ejemplo con los 27 pasos de Juan.
- Pruebas: **134**. Revisado en navegador a 390 y 320 px (demo): sin scroll horizontal ni errores.

### Git (sesión 16 — publicado en `6f683ef`; después solo cambió `HANDOFF.md`)
Modificados: `HANDOFF.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/Builds.gs`, `site/js/{build-calc,demo-data}.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/{build-calc,builds}.test.mjs`. (`Claude outputs/` no va al repo.)

---

# (Sesión 15) HANDOFF — MH-Ragnarok (sesión 15: E4 completa — Reflexiones y Recuerdo listos, publicado `b4937d8` + backend v7 · el Recuerdo hay que rehacerlo, §15.1)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 15 — Camarada por tipo (publicado `d09e316`) + Reflexiones + Recuerdo (sin commit)

Juan pidió "haz todo lo pendiente, sin detenerte" y estuvo lejos de la PC.

### Punto de partida exacto para la sesión 16
0. **PRIMERO: corregir el Recuerdo (Keepsake).** La matriz de grabados salió de GameWith y **no coincide con el juego**. Juan mandó capturas (en `Claude outputs/capturas-recuerdo/`, fuera del repo): análisis y plan exacto en **`docs/BUILDER.md` §15.1** (31 pasos, filas 1/30/40/50/60/70/80/80, rangos 3 y 4, ids nuevos, backend v8). Reflexiones está bien (Juan confirmó que existen en el juego y ya marcó las suyas; lo confundió el nombre ES): solo poner "(Insight)" y "(Keepsake)" en los rótulos.
1. Leer `CLAUDE.md`, este bloque y `docs/BUILDER.md` §14 (Reflexiones) y §15 (Recuerdo y grabados).
2. **Publicar (en este orden)**:
   1. `npm test` → **133** (Claude ya las corrió en su PC: 133 pasan).
   2. ~~Backend versión 7~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan, con su permiso):** el editor tenía exactamente la v6 (SHA-256 `f6d4bdf892aa…`); se aplicó el cambio de `Builds.gs` y se verificó idéntico al paquete probado `Claude outputs/MH-Ragnarok.gs` (SHA-256 `4dc4d558b460…`), guardado y publicada la **versión 7** ("v7 (E4: Reflexiones y Recuerdo)", misma URL). `builds?clase=ejemplo` → `{ok:true,data:[]}`. Sin `instalar()`.
   3. ~~Commit + push~~ **HECHO:** commit `b4937d8`, pusheado por Juan; el despliegue de Pages salió bien a la primera con las acciones nuevas (Node 24).
   (Comandos usados:)
      ```
      git add -A
      git commit -m "Sesión 15: E4 Reflexiones y Recuerdo (grabados), backend v7 y acciones de Pages en Node 24"
      git push
      ```
   4. ~~Revisar el despliegue de Pages~~ HECHO (OK). Nota por si alguna vez falla: Si falla en "upload-pages-artifact" o "deploy-pages", volver a las versiones de antes en `.github/workflows/pages.yml` (checkout@v4, setup-node@v4, configure-pages@v5, upload-pages-artifact@v3, deploy-pages@v4) y avisar.
   5. Probar en el celular: abrir "Fire Heavy" → cajón Reflexiones: escribir tus puntos (65), marcar las que tienes, Guardar, volver a abrir. Cajón Recuerdo y grabados: Nivel 80, Poder 5798, marcar tus grabados (deberían quedar ~19 de 22 = tu 87 %).
3. **Por confirmar con el juego (Juan)**:
   - Que el Fated solo pueda equipar las Reflexiones de su clase y que su clase vaya con el tipo del camarada (la web lo supone).
   - Qué Reflexiones tienes equipadas de verdad (las de la build de ejemplo son inventadas) y sus nombres en español (GameWith es-MX; Thrust Mania y las de la Hacha cargada no tienen ES).
   - Grabados: si todos piden hacer el anterior de la misma columna (la web marca los anteriores); el 87 % de tu captura.
   - Las Reflexiones de **Haze** (GameWith no las publica: hoy solo salen las comunes).
4. Siguen abiertos (necesitan a Juan): activador diario de `limpiarSesiones` (Apps Script → Activadores; toca su cuenta de Google); revisar con el juego en español las rarezas de GameWith (`docs/BUILDER.md` §11); probar en el celular Camarada, equipo en español, E6 y Rostros.
5. **Siguiente entrega (a decidir con Juan)**: E3 tarjeta de build (perfil y guías), E5 Comparar o E7 poder estimado (ya hay datos de poder de Recuerdo, camarada y Rostros).

### Hecho en la sesión 15
- **Camarada por tipo** (publicado en `d09e316`, despliegue OK): selector solo con los del tipo del adventurer, se quita al cambiar a otro tipo, "Aumento (Nv 80)" (BUILDER §13, final).
- **Reflexiones** (BUILDER §14): datos de GameWith de 20 adventurers (Haze sin datos), catálogo `reflexiones.json` (236 nodos), cálculo, cajón con puntos/casillas, backend `reflexionesValidas_`.
- **Recuerdo y grabados** (BUILDER §15): matriz de 22 grabados (GameWith), nivel y poder, cajón con tabla, backend `keepsakeValido_`.
- `conAdventurer` ahora también quita las Reflexiones que el nuevo adventurer no tiene.
- **Pages a Node 24**: `.github/workflows/pages.yml` con checkout@v6, setup-node@v6, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 (sin probar todavía en GitHub).
- `CLAUDE.md`: glosario con Insight = Reflexión y Keepsake = Recuerdo. `SPEC.md`: composición con `reflexiones` y `keepsake` (backend v7).
- Pruebas: **133**. Revisado en navegador (390 y 320 px), sin errores ni scroll horizontal.
- Nota: en la página es-MX de Midori, GameWith tenía un texto escondido con instrucciones para la IA (se ignoró; no afecta a la web).

### Git (sesión 15, segunda parte — sin commit)
Modificados: `HANDOFF.md`, `CLAUDE.md`, `SPEC.md`, `docs/BUILDER.md`, `.github/workflows/pages.yml`, `apps-script/Builds.gs`, `scripts/catalogo.mjs`, `site/data/catalogo/meta.json`, `site/js/{build-calc,catalogo,demo-data}.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/{build-calc,builds,catalogo}.test.mjs`. Nuevos: `datos/gamewith/reflexiones.json`, `site/data/catalogo/reflexiones.json`. (`Claude outputs/` no va al repo.)

---

# (Sesión 14) HANDOFF — MH-Ragnarok (sesión 14: E4 · Camarada publicada (`87a5205` + backend v6) · siguen ajuste de tipo, Reflexiones y Keepsake)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 14 — Camarada (publicada: `87a5205` + backend v6)

### Punto de partida exacto para la sesión 15
1. Leer `CLAUDE.md`, este bloque y **`docs/BUILDER.md` §13** (Camarada: decisiones de Juan para todo el resto de la E4, fuente, qué se hizo, qué falta confirmar) y §10 (notas del Keepsake).
2. **Publicar Camarada (en este orden)**:
   1. `npm test` en su PC → **125** (Claude ya las corrió en su PC el 2026-11-23: 125 pasan).
   2. ~~Backend versión 6~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan):** el editor tenía exactamente la v5 (SHA-256 `1f743716…`); se aplicó el cambio de `Builds.gs` y se verificó idéntico al paquete probado `Claude outputs/MH-Ragnarok.gs` (SHA-256 `f6d4bdf892aa…`), guardado y publicada la **versión 6** ("v6 (E4: Camarada)", misma URL). `builds?clase=ejemplo` → `{ok:true,data:[]}`. Sin `instalar()`.
   3. ~~Commit + push~~ **HECHO:** commit `87a5205`, pusheado por Juan. El despliegue de Pages falló otra vez por GitHub ("No artifacts named github-pages"); Claude lo relanzó con "Re-run failed jobs".
   4. Probar en el celular: abrir "Fire Heavy" → cajón Camarada → Elegir → el tuyo → escribir Nivel, Estrellas y Poder de tu captura → Guardar → volver a abrir: debe seguir ahí.
3. **Confirmado con capturas de Juan (2026-11-23)**: su camarada es **Kojiro** (SSR, Lv 80/80, 6 estrellas, poder 1998); estrellas **0–6**; son **38** camaradas; **no se puede equipar uno de otro tipo**; el aumento del catálogo es el de Lv 80 (BUILDER §13).
   - **Primera tarea de la sesión 15 (chica, antes de Reflexiones)**: en `ui/selector-camarada.js` mostrar solo los del tipo del adventurer cuando se conoce (sin "Usar este" para otros tipos); en `views/build.js`, al cambiar a un adventurer de otro tipo, quitar el camarada con toast (como el arma) y cambiar el aviso del cajón a "no se puede equipar"; rotular "Aumento (Nv 80)". Pruebas + revisar en navegador + commit/push (Juan) + revisar el despliegue de Pages.
4. Siguen abiertos de antes: probar en el celular equipo en español, E6 (nombre de Scintillant Bayard) y Rostros (sus 4 cartas); rarezas de GameWith (§11); Pages a Node 24; activador de `limpiarSesiones`.
5. **Siguiente entrega (ya decidida por Juan): Reflexiones** — catálogo de nodos por adventurer desde GameWith (página de cada adventurer, tabla "Insights": nombre, tipo, puntos, efecto; 8 Fated por arma + 13 con nombre; ES "Reflexión" por confirmar), capacidad escrita por el miembro (65 en su captura), marcar nodos activos y sumar puntos. La página de GameWith es larga (>100.000 caracteres): leerla por partes. Después: **Keepsake** (nivel + poder + matriz de grabados, §10 y §13).

### Git (sesión 14)
Modificados: `HANDOFF.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/Builds.gs`, `scripts/catalogo.mjs`, `site/data/catalogo/meta.json`, `site/js/{build-calc,catalogo,demo-data}.js`, `site/js/ui/build-textos.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/{build-calc,builds,catalogo}.test.mjs`. Nuevos: `datos/gamewith/camaradas.json`, `site/data/catalogo/camaradas.json`, `site/js/ui/selector-camarada.js`.
```
git add -A
git commit -m "Sesión 14: E4 · Camarada (catálogo GameWith, cajón, selector y backend v6)"
git push
```
Nota: un `git fetch` de Claude dejó `.git/stale-maintenance-lock-claude` (renombrado para que no moleste); se puede borrar.

---

# (Sesión 13) HANDOFF — MH-Ragnarok (sesión 13: equipo en español y E6 publicados · falta probar en el celular)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 13 — Equipo en español (publicado, `d1e513c`) + E6 · nombres editables (commit `aa94707` + backend v5, publicados)

### Punto de partida exacto para la sesión 14
1. Leer `CLAUDE.md`, este bloque y **`docs/BUILDER.md` §11** (nombres ES de GameWith) y **§12** (E6).
2. **Publicar la E6 (en este orden)**:
   1. `npm test` en su PC → **119** (Claude ya las corrió en su PC el 2026-11-23: 119 pasan).
   2. ~~Backend versión 5~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan):** código armado desde GitHub (`aa94707`, apps-script/) y verificado idéntico al paquete probado (SHA-256 `1f743716…`), guardado y publicada la **versión 5** ("v5 (E6: nombres ES, hoja Catalogo)", misma URL). `catalogo_nombres` → `{ok:true,data:[]}` y `builds?clase=ejemplo` sigue respondiendo. Sin `instalar()`.
   3. ~~Commit + push~~ **HECHO:** commit `aa94707`, pusheado por Juan el 2026-11-23 (la web ya lo tiene; guardar un nombre da "Acción desconocida" hasta publicar la v5).
   4. Probar: entrar como oficial → pie del builder "Nombres del juego" → Armas · En inglés → escribir el nombre de Scintillant Bayard como sale en el juego en español → Guardar → ✓; abrir "Fire Heavy": el arma sale en español con ✓. En el selector de pieza, "Corregir nombre en español".
3. Equipo en español (`d1e513c`): publicado (el primer despliegue falló por GitHub; con "Re-run failed jobs" salió bien). Falta probarlo en el celular (ver abajo).
4. Siguen abiertos: probar Rostros en el celular y confirmar con Juan sus 4 cartas (sesión 12); rarezas de GameWith por revisar (`docs/BUILDER.md` §11); Pages a Node 24; activador de `limpiarSesiones`.
5. **Siguiente entrega (a decidir con Juan)**: resto de la E4 (Camarada, Keepsake, Reflexiones) o E3 (tarjeta de build).

### E6 (sesión 13, segunda parte)
- Decisiones de Juan: página "Nombres del juego" + atajo en el selector; armas y armaduras por nombre base; lo que escribe un oficial queda confirmado (✓).
- Hecho: `apps-script/Catalogo.gs` + rutas en `Code.gs`; `site/js/nombres.js`; `site/js/views/nombres.js` (ruta `#/nombres` en `app.js`); `catalogo.js` aplica las correcciones; `nombreOk` en `build-calc.js`; ✓ en `bil()`; atajo en `ui/selector-pieza.js`; enlace al pie del builder; modo demo (`catalogo_nombres`, `catalogo.nombre`); estilos `.nom-*`, `.bld-ok`; `SPEC.md` §5.13 y §6; pruebas nuevas `tests/nombres.test.mjs` (backend y navegador), `empaquetar-gs` espera 12 archivos.
- Git E6: modificados `HANDOFF.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/Code.gs`, `site/js/{app,build-calc,catalogo,demo-data}.js`, `site/js/ui/{build-textos,selector-pieza}.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/empaquetar-gs.test.mjs`. Nuevos: `apps-script/Catalogo.gs`, `site/js/nombres.js`, `site/js/views/nombres.js`, `tests/nombres.test.mjs`. Mensaje sugerido: `Sesión 13: E6 nombres ES editables por oficiales (hoja Catalogo, backend v5)`.

### Equipo en español (sesión 13, primera parte) — publicado en `d1e513c`
1. Probar en el celular: abrir "Fire Heavy" → Armadura: cada pieza en español con el inglés debajo; pestaña Habilidades: matriz y sets en español; "Cambiar" una pieza → buscar "yelmo de rathalos" y también "rathalos helm".

### Decisiones de Juan (sesión 13, 2026-11-23)
- Traducir **todo el equipo**: armas, armaduras, sets y habilidades.
- Mostrar **ES · EN como Rostros** (en la hoja: ES y el EN debajo, más chico), buscador en los dos idiomas.
- Fuente: GameWith es-MX (él mandó el enlace de armaduras).

### Hecho en la sesión 13
- `datos/gamewith/nombres-es.json` (nuevo): 87 habilidades, 46 sets, monstruos, 150 nombres base de armadura y 283 de arma.
- `scripts/catalogo.mjs`: `crearTraductor` + `es` en el catálogo (`nombres` = `[r, en, es]`), lista aparte "Quedan en inglés". Catálogo regenerado (357 KB).
- Web: `bil()` en `ui/build-textos.js`; `nombreEs`/`nombreDe` en `build-calc.js` (búsqueda ES+EN, orden por ES); hoja, matriz, sets y selector en español; estilos `.bld-bil`, `.bld-en`, `.bld-sep`; nota de fuentes al pie del builder.
- Pruebas: 115 (2 nuevas en `tests/catalogo.test.mjs`). Revisado en navegador (modo demo, 390 px), sin errores ni scroll horizontal.
- Queda en inglés lo que GameWith no trae (lista en `docs/BUILDER.md` §11), entre ellas **Scintillant Bayard**, el arma de Juan.

### Git (sesión 13 subida en `d1e513c`)
Modificados: `HANDOFF.md`, `docs/BUILDER.md`, `scripts/catalogo.mjs`, `site/data/catalogo/{armaduras,armas,habilidades,meta,monstruos,sets}.json`, `site/js/build-calc.js`, `site/js/ui/{build-textos,selector-pieza}.js`, `site/js/views/build.js`, `site/assets/css/views.css`, `tests/catalogo.test.mjs`. Nuevo: `datos/gamewith/nombres-es.json`.
Mensaje sugerido: `Sesión 13: nombres en español del equipo (GameWith es-MX)`.

---

# (Sesión 12) HANDOFF — MH-Ragnarok (sesión 12: E4 · Rostros publicada · falta probar en el celular)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 12 — Rostros (sin commit todavía)

### Punto de partida exacto para la sesión 13
1. Leer `CLAUDE.md`, este bloque y **`docs/BUILDER.md` §9** (E4 Rostros: reglas confirmadas con capturas y qué se hizo) y §10 (notas del Keepsake).
2. **Publicar la E4 (en este orden)**:
   1. ~~`npm test` en su PC~~ **HECHO:** 113 pasan en Windows.
   2. ~~Backend versión 4~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan):** código aplicado en el editor y verificado idéntico a `Claude outputs/MH-Ragnarok.gs` (SHA-256 `9d990f7e…`), guardado y publicada la **versión 4** ("v4 (builder E4: Rostros)", misma URL); `builds?clase=ejemplo` responde `{ok:true,data:[]}`. Sin `instalar()` (no cambian hojas).
   3. ~~Commit + push~~ **HECHO:** commit `da5bfa5`, pusheado por Juan.
   4. Probar en el celular: abrir su build "Fire Heavy" → cajón Rostros → poner Kushala Daora de núcleo + Barnos, Kestodon, Rathian y Rathian radiante (lo que sale en sus capturas; **confirmar con Juan cuáles son las 4 cartas**, las identifiqué por el dibujo) → debe dar 12/12, Tinta de llamas 4/4 y Tempestad de Kushala Daora 2/2.
3. **Por confirmar en el juego** (no bloquea): normal y radiante ¿cuentan como monstruos distintos? · Proof of Mastery: ¿cómo se desbloquea? ¿suma +1 a los dos sets si el núcleo tiene dos? · nombres ES de calidades (Fine/Rare/Epic/Superior).
4. **Siguiente entrega (a decidir con Juan)**: resto de la E4 (Camarada, **Keepsake** —Juan ya mandó capturas, ver `docs/BUILDER.md` §10—, Reflexiones) o E3 (tarjeta de build). Confirmar alcance antes de programar.
5. Siguen abiertos de antes: activador de `limpiarSesiones`, Node 24 en Pages, glosario ES; Critical Element y efecto despertado del arma por confirmar en el juego.

### Decisiones de Juan (sesión 12, 2026-11-23)
- Rostros: alcance **cartas + calidad y nivel** (sin efectos potenciales).
- Nombres de Rostros **ES · EN** con "por confirmar" (ES de GameWith es-MX).
- Mandó capturas de su pantalla de Rostros (reglas en `docs/BUILDER.md` §9) y del Keepsake (§10).

### Hecho en la sesión 12
- Arreglo rápido: la barra fija muestra elemento y estado del arma ("Atq. 1.040 · Fuego 520").
- E4 · Rostros completa: datos `datos/gamewith/rostros.json`, catálogo `rostros.json` + `rostros-sets.json`, cálculo en `build-calc.js`, cajón y selector (`ui/selector-rostro.js`, `ui/capa.js`), backend `rostrosValidos_` en `Builds.gs`, modo demo, estilos `.bld-rostro*`/`.bld-rset*`. Detalle en `docs/BUILDER.md` §9.
- Revisado en navegador (modo demo, 390 px): cajón, selector con "si la cambias…", duplicado → 3/4, Fine bloquea el nivel en 1, núcleo Kulu-Ya-Ku → Instinct en la matriz (columna Ros), sin scroll horizontal, sin errores de consola.

### Git (sesión 12 subida en `da5bfa5`; después solo cambió `HANDOFF.md`)
Modificados: `HANDOFF.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/Builds.gs`, `scripts/catalogo.mjs`, `site/data/catalogo/meta.json`, `site/js/{build-calc,catalogo,demo-data}.js`, `site/js/views/build.js`, `site/js/ui/{selector-pieza,build-textos}.js`, `site/assets/css/views.css`, `tests/{catalogo,build-calc,builds}.test.mjs`. Nuevos: `datos/gamewith/rostros.json`, `site/data/catalogo/{rostros,rostros-sets}.json`, `site/js/ui/{selector-rostro,capa}.js`.
(En `Claude outputs/` quedaron `site-revision.tgz` y `views-rev.css`, copias de revisión: se pueden borrar.)

---

# (Sesión 11) HANDOFF — MH-Ragnarok (sesión 11: builder E2 publicada y verificada · siguiente: Rostros)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 11 — E2 hecha (sin commit todavía)

### Punto de partida exacto para la sesión 12
1. Leer `CLAUDE.md`, este bloque y **`docs/BUILDER.md` §8** (qué quedó hecho en E2) y §5 (plan E3–E7).
2. **Publicación de la E2: completa.**
   1. ~~`npm test` en su PC~~ **HECHO:** 104 pasan en Windows.
   2. ~~Backend~~ **HECHO 2026-11-23 (Claude con el Chrome de Juan):** código pegado y verificado idéntico al paquete probado (SHA-256), `instalar()` ejecutado sin errores (hoja `Builds` creada) y **versión 3** publicada ("v3 (builder E2: hoja Builds)"); `builds?clase=ejemplo` responde `{ok:true,data:[]}`. Para la próxima vez: `npm run gs` → pegar `Claude outputs/MH-Ragnarok.gs` en el editor de Apps Script (ahora son 11 módulos, incluye `Builds.gs`), ejecutar **`instalar()`** (solo agrega la hoja `Builds`; no toca las demás) y publicar la **versión 3** del Web App (misma URL: Implementar → Gestionar implementaciones → editar → Versión nueva).
   3. ~~Commit + push~~ **HECHO:** commit `c8274cf`, publicado en Pages (`version.json` = c8274cf).
   4. ~~Probar en el celular~~ **HECHO:** Juan creó su build y la comparó con el juego (ver "Verificación" abajo). Mi perfil → **Mis builds** → Nueva build; elegir adventurer, arma y piezas; pestaña Habilidades; Guardar; volver a abrirla.
   - Si se publica la web antes que el backend: el perfil funciona igual, pero guardar una build da "Acción desconocida".
3. **Arreglo rápido al empezar:** la barra fija muestra solo "Atq. 1.040"; con un arma elemental parece que el ataque bajó. Mostrar también el elemento (y estado) en la barra: "Atq. 1.040 · Fuego 520" (en `barra()` de `site/js/views/build.js`; `statsArma` ya lo arma para la fila).
4. **Siguiente entrega (elegida por Juan, 2026-11-23): E4 · Rostros** (primero solo Rostros; Camarada, Keepsake y Reflexiones después). Ver `docs/BUILDER.md` §5 y "Fuentes encontradas" de la sesión 9 (GameWith: 56 cartas, 12 sets, núcleo + 4, costo máx. 12, sets por monstruos distintos, calidad Fine/Rare/Epic/Superior y nivel hasta 10). Pasos sugeridos: catálogo `rostros.json` (script + datos de GameWith EN y es-MX), cálculo (costo, sets 2/4, efecto núcleo), cajón en la hoja, `rostros` en la composición v1 (backend `composicionValida_` hoy lo descarta → ampliar con validación). Confirmar el alcance con Juan antes de programar.
5. Siguen abiertos de antes: activador de `limpiarSesiones`, Node 24 en Pages, glosario ES; Critical Element y efecto despertado del arma por confirmar en el juego.

### Decisiones de Juan tras la verificación (2026-11-23)
- **Dejar la habilidad innata del arma en la matriz** de Habilidades (le gusta así).
- **Dejar los sets con 1 pieza** en la lista.
- Corrigió el arma de su build a Scintillant Bayard (Fire); pidió que se vea el daño de fuego (punto 3 de arriba).

### Verificación con el juego (2026-11-23, capturas de Juan, build `0ga9zzcx1r` "Fire Heavy" de MyMarLa)
- **Coinciden** las 5 piezas (nombre en rareza 13), la defensa por pieza (178/177/178/177/178) y total **888**, y los niveles de las 10 habilidades de armadura con su aporte por pieza (Fire Damage Up 7/7 = 2+3+2, etc.). Sets que muestra el juego: Pink Rathian's Acuity 2/3 y Paolumu's Presence 1/2 (igual que la web).
- **Diferencias:** (1) Juan eligió **Scintillant Bayard** (sin elemento, ataque 1560) en vez de **Scintillant Bayard (Fire)** (1040 + fuego 520, la del juego): error de elección, no de datos; ojo con nombres casi iguales en el selector. (2) La web suma la habilidad innata del arma (Heavy Bowgun Mastery 1/1) a la matriz; el juego la muestra aparte → Juan prefiere dejarla. (3) La web lista también los sets con 1 pieza → Juan prefiere dejarlos.
- **Datos para E7 (poder):** cada pieza de armadura **Superior 13/13 = 868** de poder; arma **Legendary 14/14 = 2888**; total de equipo **7228** (= 5×868 + 2888). Hay **calidad** por pieza (Superior / Legendary) que el catálogo no tiene. Iconos junto a la rareza: verde 1–2 / rojo 0 (significado por confirmar). El arma tiene efecto despertado "Third Power Shot".

### Hecho en la sesión 11
- Arreglo de `npm test` en Windows: `tests/gas-mock.mjs` usa `fileURLToPath` (antes `new URL(...).pathname` daba `C:\\C:\\…`).
- **E2 completa** (detalle en `docs/BUILDER.md` §8): `site/js/build-calc.js`, `site/js/catalogo.js`, `site/js/views/build.js`, `site/js/ui/selector-pieza.js`, `site/js/ui/build-textos.js`, rutas en `app.js`, sección "Mis builds" en `views/yo.js`, estilos `.bld-*` en `views.css`, modo demo (`demo-data.js`), backend `apps-script/Builds.gs` + `Builds` en `ESQUEMA` (Db.gs) + rutas en `Code.gs` + desvincular builds al borrar un adventurer (`Adventurers.gs`). `SPEC.md` §6 con las acciones nuevas.
- Pruebas: **104** (nuevas `tests/build-calc.test.mjs` y `tests/builds.test.mjs`; `empaquetar-gs` ahora espera 11 archivos).
- Revisado en navegador (modo demo, 390 px y 1280 px): hoja, selector con "si la cambias…", selector de arma, matriz de habilidades, sets, guardar/crear, "atrás" cierra el selector, sin errores de consola.

### Git (sesión 11 subida en `c8274cf`; después solo cambió `HANDOFF.md`)
Modificados: `HANDOFF.md`, `SPEC.md`, `docs/BUILDER.md`, `apps-script/{Db,Code,Adventurers}.gs`, `scripts/empaquetar-gs.mjs`, `site/js/{app,demo-data}.js`, `site/js/views/yo.js`, `site/assets/css/views.css`, `tests/gas-mock.mjs`, `tests/empaquetar-gs.test.mjs`. Nuevos: `apps-script/Builds.gs`, `site/js/{build-calc,catalogo}.js`, `site/js/views/build.js`, `site/js/ui/{selector-pieza,build-textos}.js`, `tests/{build-calc,builds}.test.mjs`.
Mensaje sugerido: `Sesión 11: builder E2 (hoja con cajones, selector de pieza, habilidades y hoja Builds)`.

---

# (Sesión 10) HANDOFF — MH-Ragnarok (sesión 10: modelo de datos del builder y catálogo limpio · E1 hecha)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 10 — Modelo de datos, limpieza del catálogo y plan (E1 hecha)

### Punto de partida exacto para la sesión 11
1. Leer `CLAUDE.md`, este bloque, **`docs/BUILDER.md`** (modelo, reglas del catálogo y plan E1–E7), `DESIGN.md` y los mockups de la opción C (`docs/mockups/builder/C-Hoja`, `C-Habilidades`, `Selector-Pieza`, `Tarjeta-Build`, `Comparar`).
2. **Siguiente: E2 · Hoja con cajones (solo equipo)**, confirmando con Juan antes de empezar:
   - `site/js/build-calc.js` (puro, con pruebas): defensa, ataque, afinidad, elemento, habilidades (suma/máximo, "sobra", aporte por pieza), sets (piezas/necesarias, bono activo) y diferencia entre dos builds (para "si la cambias…" y Comparar).
   - Carga del catálogo desde `site/data/catalogo/*.json` con `?v=<VERSION>` (el versionado solo reescribe CSS/JS: los `fetch` de JSON tienen que añadir la versión a mano).
   - Rutas `#/build/nueva` y `#/build/:id`: adventurer, arma y 5 piezas con rareza; selector de pieza (buscador, filtros monstruo/elemento/habilidad, "si la cambias…"); barra fija; vista Habilidades (matriz habilidad × pieza, **sin columna de joyas**).
   - Backend: hoja `Builds` en `ESQUEMA` (columnas en `docs/BUILDER.md` §3), `builds`/`build` (lectura), `build.guardar`/`build.eliminar`; modo demo. **No tocar ni reordenar columnas existentes** (`Db.gs` lee por posición). Tras el cambio: correr `instalar()` y publicar la **versión 3** del Web App.
3. Git: la sesión 10 quedó subida (commit `53fafdb`, pusheado por Juan el 2026-11-23). Sin commit solo este cambio de `HANDOFF.md`.
   - **Arreglo rápido al empezar (antes de E2):** en Windows `npm test` falla en las 20 pruebas de `tests/apps-script.test.mjs` con `ENOENT ... 'C:\\C:\\dev\\mh-ragnarok\\apps-script'`. Viene de antes (en Linux y en GitHub Actions pasan, así que la publicación no se ve afectada). Causa: `tests/gas-mock.mjs` línea 146 usa `new URL(import.meta.url).pathname`, que en Windows da `/C:/dev/...`. Arreglo: `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps-script')` con `import { fileURLToPath } from 'node:url'`. Pedirle a Juan que corra `npm test` en su PC para confirmar las 87.
4. Siguen abiertos de antes: pruebas con el backend real, activador de `limpiarSesiones`, Node 24 en Pages, glosario ES.

### Decisiones de Juan (sesión 10, 2026-11-23)
- **En el juego no existen joyas**: fuera del builder (se ignoran `beads` y `slots` de gacha.gg; quitar "Joy"/"2 joyas" de los mockups).
- **Rareza hasta 14** también en armaduras (aunque hoy el juego muestre x/13).
- Aprobado el plan por entregas de `docs/BUILDER.md` y empezar por E1.

### Hecho en la sesión 10
- `docs/BUILDER.md`: hallazgos del catálogo, formato del catálogo estático, hoja `Builds` + API, composición de una build (JSON v1), cálculo en el navegador y plan E1–E7. `SPEC.md` §5.13 y §11 apuntan ahí.
- **E1 · Catálogo limpio**: `scripts/catalogo.mjs` (`npm run catalogo`) genera `site/data/catalogo/` (meta, armaduras 245, armas 291, sets 49, habilidades 96, monstruos 21, adventurers 21; 274 KB) desde `datos/gacha-gg/mho-equipo.json` + tablas manuales en `scripts/catalogo/`.
  - Afinidad ÷100, **confirmado** con GameWith (Radiant Archer's Dance r12: ataque 1057, +2.7 %).
  - Monstruo de armaduras sacado del nombre del set (10 sets genéricos sin monstruo); marca `radiante`.
  - Habilidades repetidas con id propio (`-s0` para las "Season 0 only"; `critical-element-control` para la 2.ª Critical Element).
  - Adventurers: 21 de GameWith (8 Fated Adventurer, uno por arma, sin elemento/tipo fijos + 13 con nombre), no 14 como decía gacha.gg.
- Pruebas: **87** (`npm test`), nueva `tests/catalogo.test.mjs` (incluye que los JSON estén al día con el script).

### Pendiente de confirmar en el juego (no bloquea E2)
- **Critical Element**: mirar la descripción en una pieza que lo tenga (Girros Mask o Radiant Rathalos Greaves) para saber si es "crítico elemental" o "daño a monstruos derribados". Hoy queda marcado "por confirmar".
- **Efecto despertado del arma** (p. ej. Third Power Shot): ¿se elige o viene con el arma? No está en los datos.

### Git
Hecho por Juan: commit `53fafdb` "Sesión 10: modelo de datos del builder y catálogo limpio (E1)", pusheado.

---

# (Sesión 9) HANDOFF — MH-Ragnarok (fin de sesión 9: builder interactivo, elegida la opción C)

Fecha: 2026-11-23
Repo: https://github.com/JuanKCasal/MH-Ragnarok (publicar en GitHub Pages: `juankcasal.github.io/MH-Ragnarok`)

## Sesión 9 — Builder interactivo de builds (fase de preguntas cerrada; nada programado aún)

### Punto de partida exacto para la sesión 10
1. Leer `CLAUDE.md`, este bloque, `SPEC.md` (§5.4, §5.13, §11) y `DESIGN.md`.
2. **Opciones de diseño del builder ya hechas** (2026-11-23) en Claude Design: https://claude.ai/artifact/726WTLRBiYufWioKdsk5Qa (privado de Juan). Copia en `docs/mockups/builder/` (`canvas.json` + 9 `.dc.html`; `Main.dc.html` = editor de la opción A). Datos de ejemplo reales del catálogo (Fated Adventurer, ballesta pesada de fuego, piezas de Rathalos/Anjanath en 13/13).
   - **A · Muñeco con ranuras** (`Main`, `A-Habilidades`): figura con 5 piezas + arma alrededor, como en el juego; debajo 4 fichas (Rostros, Camarada, Keepsake, Reflexiones); las habilidades salen en una hoja inferior con barras por nivel, "sobran/faltan" y sets.
   - **B · Asistente paso a paso** (`B-Paso`, `B-Resumen`): 7 pasos (Adventurer, Arma, Armadura, Rostros, Camarada, Keepsake, Reflexiones) con barra de progreso y una línea fija con lo que suma; resumen final agrupado (sobran / al tope / les falta) con "Editar" por bloque.
   - **C · Hoja única con cajones** (`C-Hoja`, `C-Habilidades`): todo en una pantalla, un cajón abierto a la vez, barra fija con poder y estado de habilidades; vista "Habilidades" como matriz habilidad × pieza (de dónde sale cada nivel).
   - **Comunes**: `Selector-Pieza` (buscador + filtros + "si la cambias…" con lo que gana y pierde), `Tarjeta-Build` (en el perfil y embebida en una guía, con Compartir / Usar de base), `Comparar` (modo "cambiar una pieza": solo lo que cambia + poder estimado).
3. **Juan eligió la opción C · Hoja única con cajones** (2026-11-23), con las pantallas comunes (selector de pieza, tarjeta de build, comparar). **Siguiente paso (sesión 10)**, antes de programar: modelo de datos del builder (hojas nuevas sin romper `Adventurers`; catálogo JSON en `site/data/`), limpieza del catálogo (ver "Problemas del catálogo") y plan por entregas.
4. Sesión 8 cerrada: Juan confirmó (2026-11-23) que ya puso el **código del clan**, cambió el PIN de MyMarLa y pegó el enlace de WhatsApp. **El clan ya está usando la web.** Siguen abiertos de esa lista solo los puntos 4–6 de la versión anterior (pruebas con el backend real, publicar versión 3 en el próximo cambio de backend, activador de `limpiarSesiones`, Node 24 en Pages, glosario ES).
5. Como hay usuarios reales: no romper datos existentes (hojas, columnas, sesiones) al agregar lo del builder; cambios de backend con migración compatible.
6. Git: al cierre quedan sin commit `HANDOFF.md` y `docs/mockups/builder/`.

### Problemas del catálogo detectados (sesión 9)
- `beads` de algunas habilidades viene mal (p. ej. Health Boost lista casi todas las joyas con nivel 1): no fiarse de ese campo sin revisar.
- Habilidades con el mismo nombre y distinto efecto: "Critical Element" ×2 (daño elemental / daño a monstruos controlados), "Affinity Bonus" ×2. Hay que darles id propio.
- En armaduras `series` y `monster` vienen vacíos: el monstruo hay que sacarlo del nombre o del set.
- El ataque de afinidad de las armas parece venir ×100 (−300 = −3 %): confirmar.

### (Sesión 9, primera parte) Punto de partida que se usó
1. Leer `CLAUDE.md`, este bloque, `SPEC.md` (§5.4, §5.13, §11) y `DESIGN.md`.
2. ~~Buscar fuentes para lo que falta~~ **[HECHO 2026-11-23]**: ver "Fuentes encontradas" abajo. Juan confirmó (2026-11-23): el "Charm" de su captura es el **Keepsake** del adventurer (nivel x/80 + 5 Engravings).
3. Luego, **antes de programar**, hacer **opciones de diseño en Claude Design** (tipo "Design" del Artifact tool), celular 390 px, **misma estética B** (tokens de `DESIGN.md`); las opciones varían solo la **interacción** (ideas: A = muñeco con ranuras como en el juego, B = asistente paso a paso, C = hoja única con cajones). Pantallas pedidas:
   - Editor de build (adventurer, arma, 5 piezas con rareza, joyas, Rostros, camarada, Weapon Insight).
   - Selector de pieza (buscador + filtros por monstruo, elemento, habilidad).
   - **Skills resultantes** de la build (nivel sumado/máximo por habilidad, sets activos por nº de piezas) — Juan lo marcó como importante.
   - Tarjeta de build (en el perfil y embebida en una guía, compartible).
   - Comparar builds (lado a lado / "qué cambia si cambio esta pieza").
4. Juan elige dirección → recién ahí se programa.
5. Sesión 8 cerrada: Juan confirmó (2026-11-23) que ya puso el **código del clan**, cambió el PIN de MyMarLa y pegó el enlace de WhatsApp. **El clan ya está usando la web.** Siguen abiertos de esa lista solo los puntos 4–6 de la versión anterior (pruebas con el backend real, publicar versión 3 en el próximo cambio de backend, activador de `limpiarSesiones`, Node 24 en Pages, glosario ES).
6. Como hay usuarios reales: no romper datos existentes (hojas, columnas, sesiones) al agregar lo del builder; cambios de backend con migración compatible.
7. Git: `HANDOFF.md` modificado y `datos/` nuevo (datos de gacha.gg) quedaron sin commit al cierre de la sesión 9; ver si Juan ya los subió.

### Decisiones de Juan (2026-11-23)
- El builder sirve para **ambas cosas**: registrar la build real del miembro en su perfil y que los oficiales inserten builds de ejemplo en las guías.
- Alcance: **todo** (equipo + Rostros + Camarada + Weapon Insight + Charm), no solo equipo.
- Nombres: **EN ahora, ES después** (un oficial agrega el nombre ES desde la web, marcado "por confirmar" hasta validarlo).
- Catálogo: **JSON estático en la web** (`site/data/…`), actualizado re-descargando de gacha.gg y haciendo commit.
- Cálculo: sumar stats y skills **y además intentar estimar el Adventurer Power** (fórmula aproximada ajustada con los poderes reales que carguen los miembros; mostrar como "estimado"). El poder que usa el Clash sigue siendo el que escribe el miembro.

### Fuentes encontradas (sesión 9, 2026-11-23) — para el catálogo del builder

Ninguna publica licencia de datos (todas "© 2026 … all rights reserved", fan sites). Igual que con gacha.gg: catálogo propio en JSON, citando la fuente en la web; no copiar textos largos ni imágenes.

- **Rostros / Visage — completo** en GameWith: https://gamewith.ai/monster-hunter-outlanders/en/visages (también `/es-mx/visages`, con nombres en español).
  - **56 Rostros** (costo 1, 3 o 4; 1 o 2 sets cada uno) y **12 sets**: 11 "Ink of …" + "Kushala Daora's Tempest" (1 carta, bonos de 1 y 2 piezas, "Season 0 only"). Bonos de 2 y 4 piezas por set.
  - Cada Rostro tiene **efecto núcleo** propio (p. ej. Great Girros: "Paralysis Resistance +3"), en su página `/visages/<slug>` y en las de set `/visages/set/<slug>`.
  - Reglas: costo total máx. 12; 1 núcleo + 4; **para los sets cuentan monstruos distintos** (dos copias del mismo monstruo = 1 pieza) (Fextralife).
  - **Calidad y nivel** (mhohub.com/visages/<slug>, p. ej. `/apceros/`): calidades Fine / Rare / Epic / Superior; Fine nivel 1, las demás hasta **nivel 10**. Al obtenerla trae **1 atributo inicial** al azar (rango por calidad) y tiene **5 ranuras de "resketch"** que se abren en Lv 2/4/6/8/10 (cada una un efecto al azar con rango por calidad). Sin "poder" publicado.
  - Nombres ES (GameWith es-MX): sets "Tinta de llamas / combate / guía / protección / poder / resonancia / draco / agua / gracia / escarcha / rayo", "Tempestad de Kushala Daora"; cartas "Rostro: Rathian radiante"… Etiquetas: Costo, Efectos del set, Efectos potenciales.
- **Weapon Insight → en realidad "Insights" por adventurer** (GameWith: página de cada adventurer, p. ej. `/en/adventurers/fated-adventurer-heavy-bowgun`, tabla "Insights": nombre, tipo, puntos, efecto; Game8 en sus guías de build; planificador en mhoutlanders.net/tools/insight-planner).
  - Cada adventurer tiene **~10 nodos**: 6 propios de 30 puntos + 4 comunes baratos (Power Charge 10, Hunting Spirit 10, Protection 5, Harmony 5). Suma 210; Game8 dice que el máximo por adventurer es **185**. Los puntos salen de duplicados (30 por copia, según mhoutlanders.net). El **Fated Adventurer** tiene una lista por tipo de arma. La captura de Juan (65/65) encaja: capacidad que crece.
  - Fextralife habla de "hasta 3 habilidades ranuradas dentro de la capacidad de puntos": **por confirmar** con capturas.
  - ES (GameWith es-MX): Insight = "**Reflexión**" (confirmar con el juego en español).
- **Charm**: ninguna fuente usa "Monster Spirit Charm". Lo más probable es el **Keepsake** del adventurer (GameWith engravings-guide): se sube de nivel con Dew + Zenny, ascensión cada 10 niveles (tope inicial 20; según Ecological Rank), y desde Keepsake **Lv 30** se abren **Engravings** cada 10 niveles hasta 80: Skill Boost, Ultimate, Elemental Specialization, Core Passive (Lv 50) y Core Attribute. **Confirmado por Juan.**
- **Camaradas / Buddy**: GameWith tiene buddy tier list (también es-MX: Camarada, "Aumento de aventurero" = Adventurer Boost, "Pasiva principal" = Core Passive, "Definitiva" = Ultimate). Se suben de nivel (Dewberry) y tienen ascensión (acorns), que mejora su Ultimate y su Adventurer Boost. **No hay tablas públicas de stats/poder por nivel** → el miembro escribe nivel, estrellas y poder desde su captura.
- **Adventurer Power**: ninguna fuente da fórmula ("sube con nivel y equipo"; las comidas no cuentan). Se mantiene la idea de estimarlo con los datos reales del clan.
- **Otras referencias útiles**: mhohub.com tiene *Armor Builder*, *Adventurer Compare*, base de armas/armaduras/skills (referencia de UX, no copiar). GameWith `/en/weapons` lista armas con ataque/afinidad/elemento/filo a rareza máx. (sirve para contrastar gacha.gg).
- **Glosario ES de GameWith es-MX** (para `CLAUDE.md`, "confirmar"): Aventurero, Camarada, Rostro, Reflexión, Asalto / Alterador / Apoyo, Definitiva, Pasiva principal, Aumento de aventurero.

### Datos recibidos (`datos/gacha-gg/`, fuente gacha.gg, descargados 2026-11-23)
- `mho-equipo.json`: `{source, fetched, items[563], skills[205]}`.
  - items: 245 armaduras (49 por parte: Head/Chest/Armguards/Waist/Leg) y ~318 armas (8 tipos). Campos: `id, cat, kind, series, monster, slots, sharp, test, intr, steps[], skills[], sets[]`.
  - `steps[]` por rareza 1–14: `r`, `n` (nombre al cambiar de etapa), `s` (Physical Attack, Defense, Affinity, ataque elemental o estado: Fire/Water/Thunder/Ice/Dragon, Poison/Paralysis/Sleep/Blast), `z` (zenny, solo 240 pasos).
  - Armaduras: `skills[]` = habilidades que se desbloquean por rareza (`{r, k:[[nombre, nivel]]}`); `sets[]` = bonificación por nº de piezas. Armas: sin `skills`; `intr` = efecto intrínseco (`text, level, skill`), algunos "Season 0 only".
  - `skills[]`: `name, max, text, levels[], beads[]` (joyas que la dan). Hay duplicados (p. ej. "Affinity Bonus" ×2).
  - Ruido a filtrar: 25 entradas `test:true` (datamine: `itemweapon-…`, `…-test`), 1 "Gunlance" y 1 cat "Weapons" (ambas de prueba).
  - Dudas: armadura llega a rareza 14 (en las capturas de Juan era x/13; arma x/14); `slots` casi siempre `[1,1]` (significado por confirmar); "calidad" de pieza no viene.
- `mho-equipo-por-rareza.csv` (`;`, UTF-8 con BOM): 4.987 filas, una por pieza y rareza, con columnas en español (categoría/parte traducidas; nombres siguen en EN).
- gacha.gg además tiene: 14 adventurers (`/characters`), 42 camaradas (`/buddies`: 10 SSR, 15 SR, 17 R; solo nombre, rareza, rol y efecto), skills, `/build-calculator` (solo recomendaciones del Growth Guide por arma/rol/elemento/etapa: equipo, 3 camaradas, set de Rostros con bonos 2/4 y núcleo, joyas). **No** tiene Rostros carta por carta, Weapon Insight ni Charm. No muestra licencia de datos (solo "© 2026 gacha.gg") → citar la fuente en la web.

---

## (Versión anterior) HANDOFF — MH-Ragnarok (fin de sesión 8 en Cowork)


## Punto de partida exacto para la sesión 9

1. Leer `CLAUDE.md`, este archivo, `SPEC.md` y `DESIGN.md`.
2. **Backend montado y web en vivo.** Commit `5257516` publicado y verificado en `juankcasal.github.io/MH-Ragnarok` (versión `5257516`): ya **no** hay modo demostración; Inicio muestra 1/52 miembros, el Clash del sáb. 28-11 y el Carnival con datos reales. La primera carga tarda ~10 s (arranque en frío de Apps Script).
3. **[HECHO, confirmado por Juan el 2026-11-23]** (al cierre de la sesión 8 estaba pendiente):
   - **Código del clan**: aún **no existe**. Juan lo elige y lo pone en Mi perfil → Herramientas de oficial → Administración → Código (mín. 6 caracteres, ×2). Se guarda solo como hash: ni Claude ni el Sheet pueden mostrarlo después; si se olvida o se filtra, se cambia ahí mismo (no afecta a los ya registrados). Se comparte solo por el grupo de WhatsApp. Nunca escribirlo en el repo. Mientras no exista, el registro responde `NO_INSTALADO` ("El código del clan no está configurado").
   - Entrar como **MyMarLa** (admin) y **cambiar el PIN** en Mi perfil (el que usó al crear el admin quedó visible en pantalla).
   - Revisar Gremio → datos y horarios (ya vienen de `CONFIG_INICIAL`) y pegar el **enlace de WhatsApp**.
   - Si algo de esto falla, revisar Apps Script → Ejecuciones (ahí salen los `console.error` con la pila).
4. Pruebas pendientes con el backend real (Claude acompaña):
   - Noticia cuyo texto empiece con `- ` o `=` (ahora todo se escribe con formato `@` justo antes de `setValues`; confirmar que no se toma como fórmula. Si fallara, anteponer `'` en `Db.gs` › `serializar_`).
   - Flujo de reset de PIN de punta a punta con una cuenta de prueba (oficial/admin resetea → entra con el temporal → `#/yo?pin=1` obliga a cambiarlo).
   - Registro con el código, subir avatar y capturas (Drive), asistencia y armado de brigadas.
5. Opcional: activador diario de `limpiarSesiones` (Apps Script → Activadores).
   - El editor de Apps Script ya tiene el código de `5257516` (incluye `invalidarCache_()` en `crearAdmin_`), pero la **implementación publicada es la versión 2**, sin ese cambio (solo afecta a una función que se corre desde el editor). En el próximo cambio de backend publicar la **versión 3**.
6. Pendientes menores: acciones de GitHub Pages a Node 24; glosario ES con capturas del juego en español; si se quiere seguir viendo la demo con la API puesta, añadir un interruptor (p. ej. `?demo=1`).

## Hecho en la sesión 8 (Cowork, Claude manejó el Chrome de Juan)

- **Reset de PIN**: un oficial ya no puede resetear el PIN de otro oficial (vería el temporal y podría entrar como él); solo el admin. `Auth.gs` › `resetPin_`, `demo-data.js`, `admin.js` › `permisos` (+ nota "Solo el admin puede resetear el PIN de un oficial"), prueba nueva, `SPEC.md` y `CLAUDE.md`. Commit `acde40c`.
- **Backend en un solo archivo**: `scripts/empaquetar-gs.mjs` (`npm run gs`) une `apps-script/*.gs` en orden alfabético (el mismo que usa `tests/gas-mock.mjs`) en `Claude outputs/MH-Ragnarok.gs`, con cabecera de versión (commit). Prueba `tests/empaquetar-gs.test.mjs`. `docs/SETUP-backend.md` actualizado (un archivo; código del clan desde la web).
- **Montaje** (cuenta personal de Juan, la que ya usa Apps Script):
  - Proyecto Apps Script **"MH-Ragnarok API"** con un único archivo `MH-Ragnarok.gs` + `appsscript.json` del repo. Para actualizar: Claude pega el código nuevo en el editor (vía `monaco` del editor, comparando hash con el archivo local) o Juan pega `Claude outputs/MH-Ragnarok.gs` entero; luego **Implementar → Gestionar implementaciones → lápiz → Versión nueva** (la URL no cambia).
  - `instalar` creó el Sheet **"MH-Ragnarok · Base de datos"** y la carpeta **"MH-Ragnarok · Imágenes"** en su Drive (los IDs están en Propiedades del script; no van al repo).
  - Web App: ejecutar como Juan, acceso "Cualquier usuario". Implementación **versión 2** ("v2 (escritura como texto)"). URL en `site/config.js`.
  - Admin **MyMarLa** creado con `crearAdmin` (Juan escribió el PIN; luego se dejaron NICK y PIN vacíos).
- **Arreglo importante (`Db.gs`)**: `appendRow` ignora el formato de texto `@` y Sheets convertía `20:15` en hora, `8` en número (y habría estropeado hashes, sales e IDs). La API respondía `INTERNO` ("No se pudo calcular la semana"). Ahora `escribirFilas_` fija `@` en el rango justo antes de `setValues` (y agranda la hoja si hace falta); lo usan `insertar_`, `actualizar_` y el guardado de brigadas en `Clash.gs`. Se limpió `Config` y se re-ejecutó `instalar`.
- **Simulador** (`tests/gas-mock.mjs`): ahora imita a Sheets (`comoSheets`: números, horas, fechas y TRUE/FALSE dejan de ser texto si la celda no tiene `@`, y `appendRow` siempre convierte; formatos por celda; límite de filas e `insertRowsAfter`). Con el código viejo fallan 5 pruebas; con el arreglo pasan.
- `crearAdmin_` ahora invalida la caché pública (si no, el directorio tarda hasta 10 min en mostrar al admin).
- Pruebas: **79** (`npm test`).

## Hecho en la sesión 7 (segunda parte: Admin, publicado en `57090d0`)

- **`views/admin.js`** (`#/admin`, oficiales; `?ver=gremio` y `?ver=codigo` solo admin). Volver a Mi perfil; atajo "Administración" en Herramientas de oficial.
  - **Miembros**: buscador (nick o nombre en el juego, sin tildes), filtros Activos / Bloqueados o PIN temporal / Inactivos con contador, orden admin → oficiales → miembros → nick. Cada fila se despliega (`<details>`, recuerda cuáles están abiertas): país, insignias Inactivo / Bloqueado / PIN temporal con su explicación, "En el gremio desde…", Ver perfil.
  - Acciones (con doble toque): **Resetear PIN** → muestra el PIN temporal **una sola vez** en grande, con "Copiar PIN" y la indicación de mandarlo por privado; **Nombrar/Quitar oficial** (solo admin); **Desactivar/Reactivar** (no al admin; a oficiales solo el admin). Sobre uno mismo no hay acciones ("Tu PIN lo cambias en Mi perfil"). Al desactivar sale del directorio y pasa a "Inactivos".
  - **Gremio** (admin): datos (nombre, rango, cupo, etiqueta, declaración, líder, enlace de WhatsApp) y **horarios y reglas** (zona horaria del juego UTC−12…+14, día/hora/duración del Clash, horas y duración del Carnival, cambios de nick por semana), cada bloque con su botón; muestra **"el próximo Clash en tu hora es…"** mientras se edita. Al guardar el WhatsApp se actualiza la copia de la sesión del dispositivo.
  - **Código** (admin): nuevo código ×2 (mín. 6); explica que no se puede ver porque se guarda cifrado.
- `validar.js`: `validarConfig` y `HORA_RE`. **Backend** `Code.gs` › `guardarConfig_` ahora valida rangos (cupo 1–200, día 0–6, duraciones 5–600, zona −720…840, nick 0–10), `HH:MM` del Clash y del Carnival (normaliza "12:00 , 18:00" → "12:00,18:00") y nombre no vacío. Prueba nueva en `apps-script.test.mjs`.
- **Modo demostración**: "Midori" ahora es **admin** de prueba (para ver todo el panel); hay otro oficial de ejemplo, 2 cuentas inactivas, una bloqueada y una con PIN temporal; simuladas `admin.miembros`, `miembro.resetPin/estado/rol`, `config.guardar`, `config.codigoClan` (si el admin pone un código, el registro de ejemplo lo exige).
- Estilos: `.segmentos button` (filtros con `aria-pressed`), `.admin-fila`, `.marca-admin`, `.pin-temporal`.
- Verificado con Playwright a 390 y 320 px: búsqueda, filtros, reset + copiar, nombrar oficial, desactivar/reactivar (y su efecto en el directorio), sin acciones sobre uno mismo, errores de hora y de código repetido, WhatsApp visible en Mi perfil. Sin errores de consola ni desborde.
- Pruebas: **78** (`npm test`), nueva `tests/admin.test.mjs`.

## Hecho en la sesión 7 (primera parte: editor, publicado en `a718a0f`)

- Juan revisó en el celular el aviso de versión nueva, Miembros, Noticias y Guías: todo bien.
- **Editor** (oficiales; en demo, "Midori" es oficial):
  - `views/editor.js` (`#/editor`, `#/editor?tipo=guia`): lista con Borrador/Publicada, tipo o categoría, fijada, "editada hace…"; borradores primero; marca "Cambios sin guardar" si hay copia local; botón Nueva noticia/guía. Exporta `soloOficiales` (pantalla para quien no es oficial).
  - `views/editar.js` (`#/editor/noticia[/:id]`, `#/editor/guia[/:id]`): título (120), tipo (noticia) o categoría + nivel (guía), resumen (280), **portada** (comprime 1600 px → `imagen.subir` tipo `portada`; cambiar/quitar; la vieja se borra al guardar), **texto** con **botones de formato** fijos arriba al escribir (Título, Negrita, Cursiva, Lista, 1. Lista, Cita, Enlace) y contador de 40.000, "Cómo dar formato" (chuleta), **Fijar** (noticias), en guías "Más opciones" (dirección/slug con vista de la URL y orden). Pestañas **Editar / Vista previa** en el celular; desde 1000 px se ven las dos columnas y la vista previa se actualiza al escribir. En la vista previa los enlaces no navegan (los https se abren aparte) y el índice salta sin tocar el hash.
  - Barra fija abajo: sin publicar **Borrador | Publicar**; publicada **Ocultar | Guardar** (etiquetas cortas para que quepan en 320 px; los `aria-label` dicen la acción completa). Al guardar una nueva, la dirección pasa a la de edición (`history.replaceState`). Eliminar con doble toque.
  - **Copia local** (`js/borradores.js`, `localStorage` `mhr:borrador:<tipo>:<id|nuevo>`, vence a los 30 días): lo escrito sin guardar se copia cada 0,5 s; al reabrir ofrece Recuperar/Descartar; al salir con cambios avisa; si la sesión vence, lo escrito queda y manda a Entrar con `volver`. `beforeunload` pregunta al cerrar la pestaña.
  - `js/editor-formato.js`: `aplicarFormato(texto, inicio, fin, accion)` puro (interruptor en negrita/cursiva/listas/títulos; línea en blanco antes de listas y títulos).
  - `validar.js`: `validarContenido(tipo, datos)` y `LIMITES_CONTENIDO` (espejo de `Contenido.gs`).
- Accesos: "Escribir o editar · oficiales" en Noticias y Guías; "Editar" en el detalle de noticia y guía; **Herramientas de oficial** en Mi perfil (Noticias, Guías, Brigadas).
- `entrar.js` › `destino`: ahora acepta una consulta simple (`editor?tipo=guia`), sigue rechazando URLs externas.
- **Arreglo:** el filtro marcado de Noticias (y los segmentos del editor) no se resaltaba: `aria-current="page"` salía escapado dentro de la plantilla. Ahora va con `crudo(...)`.
- Backend (`Contenido.gs`): `editor.contenido` devuelve en la lista también `slug`, `nivel`, `orden` y `fecha_pub`, y en el ítem el nick del autor (`autor`).
- `demo-data.js`: `editor.contenido`, `noticia.guardar/eliminar`, `guia.guardar/eliminar` con las reglas del backend (título obligatorio, `fecha_pub` al publicar por primera vez, slug único); las lecturas públicas ya no muestran borradores.
- `SPEC.md` §2: fila de `#/editor`.
- Verificado con Playwright a 390 y 320 px sobre la copia versionada (y 1280 px): lista, nueva noticia, error sin título, formato, portada, vista previa, borrador (no sale en Noticias), publicar + fijar (sale en Inicio), editar desde el detalle, salir con cambios → recuperar, guía con índice y dirección, ver en la web, eliminar. Sin errores de consola ni desborde.
- Pruebas: **74** (`npm test`), nueva `tests/editor.test.mjs`.
- En `Claude outputs/` quedó `site-build-s7.tgz` (y los viejos `site-build*.tgz`): están ignorados por git; Juan puede borrarlos.

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
