# Builder de builds — modelo de datos y plan (sesión 10, propuesta)

Estado: **plan aprobado por Juan (2026-11-23)**; **E1 hecha** (catálogo limpio); **E2 hecha** (hoja con cajones, sin publicar todavía el backend v3). Dirección elegida: **C · Hoja única con cajones** + pantallas comunes (selector de pieza, tarjeta de build, comparar). Mockups en `docs/mockups/builder/`.

Decisiones ya tomadas (2026-11-23): el builder sirve para el perfil del miembro **y** para builds de ejemplo en guías; alcance completo (equipo + Rostros + Camarada + Keepsake + Reflexiones); nombres EN ahora y ES después (los agrega un oficial, "por confirmar"); catálogo como JSON estático en `site/data/`; cálculo de stats y habilidades + **poder estimado** (el del Clash sigue siendo el que escribe el miembro).

---

## 1. Qué encontré al revisar el catálogo (`datos/gacha-gg/mho-equipo.json`)

| Tema | Hallazgo | Qué se hace |
|---|---|---|
| Ruido | 25 `test:true`, 1 "Gunlance", 1 cat "Weapons", más `damaged-long-sword` (sin stats) e `iron-katana-i-100000011` (id de datamine, afinidad 2500) | Se descartan → **536 piezas**: 245 armaduras + 291 armas |
| Afinidad | Viene ×100. **Confirmado** con GameWith: Radiant Archer's Dance en rareza 12 = ataque 1057, afinidad 270 → GameWith dice "+2.7 %" | Se guarda en % (270 → 2.7) |
| Rareza | Todas las piezas llegan a 14 (**Juan: tope 14 también en armaduras**, aunque hoy el juego muestre x/13). Las armaduras "Radiant … VI" (5) y 5 armas radiantes solo existen en 14. Cada pieza empieza en una rareza distinta (I…VI) | Se guarda la rareza mínima y máxima de cada pieza |
| Monstruo de armaduras | `series` y `monster` vacíos. Cada armadura pertenece a **un solo set** (49 sets × 5 piezas) | Tabla manual set → monstruo (o "sin monstruo": Chainmail, Leather, Alloy, Guild, Hunter's, High Metal, Ingot…). Marca **radiante** por el prefijo "Radiant" |
| Monstruo de armas | 133 de 291 sin `monster` | Se completa con la misma tabla por serie/nombre cuando se pueda; si no, queda vacío (el filtro lo trata como "otros") |
| Habilidades de armadura | `skills[]` es **acumulativo por rareza** (en r7 trae la lista completa, no solo lo nuevo). Máx. 3 niveles por pieza | Se guarda tal cual (lista de umbrales); el cálculo toma el último umbral ≤ rareza elegida |
| Sets | Cada set tiene **un solo bono**: 35 sets se activan con 2 piezas y 14 con 3; el bono es siempre "Habilidad +1" (una habilidad que existe en la ficha) | Bono = `{piezas, habilidad, +nivel}` |
| Habilidades duplicadas | 28 nombres repetidos de 205: 9 copias exactas; 24 son la versión "Season 0 only" + la versión "high-difficulty"; Evade Extender y Resuscitate con máx. 2 y 5 | Id propio para cada una (`third-power-shot-s0`…). Ninguna se usa en armaduras salvo **Critical Element** |
| **Critical Element** | Dos fichas con el mismo nombre: daño elemental al hacer crítico / daño a monstruos derribados con Co-op Skills. 12 piezas lo traen (Girros, Leather, Vespoid, Hornetaur, Kadachi, Legiana, Radiant Rathalos, Radiant Rath Heart) y no se puede saber cuál es | Queda como `critical-element` con aviso "por confirmar" hasta ver la descripción en el juego |
| Armas | Sin `skills` ni `sets`. Solo 48 tienen efecto innato (`intr`: "X Mastery", 6 por tipo). El "efecto despertado" de las capturas no viene | Se guarda el innato; el despertado queda para más adelante |
| Joyas | `beads` tiene 653 joyas, pero está roto (Health Boost aparece en 290 joyas). **Juan confirmó (2026-11-23): en el juego no existen joyas** | Se ignoran `beads` y `slots`; el catálogo solo guarda las habilidades que usa alguna pieza, set o arma (96). Quitar la columna "Joy" y "2 joyas" de los mockups al programar |
| Filo | `sharp` es un número (4…) sin detalle | Se guarda, no se muestra por ahora |

## 2. Catálogo estático (`site/data/catalogo/`)

Generado por un script (`scripts/catalogo.mjs`, `npm run catalogo`) a partir de `datos/gacha-gg/` + tablas manuales en `scripts/catalogo/` (monstruos, correcciones). Nunca se edita a mano el JSON generado.

```
site/data/catalogo/
  meta.json         { version: "2026-11-23", fuentes: [...], conteos }
  armaduras.json    245 piezas
  armas.json        291 armas
  habilidades.json  96 habilidades (solo las que usa algo; ids propios para las repetidas)
  sets.json         49 sets de armadura (piezas por parte + bono)
  adventurers.json  21: 8 Fated Adventurer (uno por arma) + 13 con nombre (GameWith)
  monstruos.json    21 monstruos, nombre EN (+ ES cuando se confirme)
  rostros.json      56 Rostros (GameWith, E4)
  rostros-sets.json 12 sets de Rostros
  camaradas.json    38 camaradas (GameWith, E4)
  (después) reflexiones.json
```

Formato compacto (ejemplo de armadura):

```json
{ "id": "rathalos-helm-ii", "parte": "head", "set": "rathalos-weakness",
  "monstruo": "rathalos", "radiante": false, "rmin": 5, "rmax": 14,
  "nombres": [[5, "Rathalos Helm II"], [7, "Rathalos Helm III"]],
  "def": [[5, 67], [6, 74]],
  "hab": [[5, [["fire-damage-up", 1]]], [7, [["fire-damage-up", 2], ["health-cycle", 1]]]] }
```

- **Ids estables** = el `id` de gacha.gg (ya es un slug). Las builds guardadas apuntan a estos ids: si gacha.gg cambia un id, el script lleva una tabla de alias para no romper builds viejas.
- Peso real: 274 KB sin comprimir (GitHub Pages lo sirve comprimido, ~40 KB). Se carga solo al abrir el builder o una tarjeta de build, con el `?v=` del versionado como el resto.
- **Nombres ES** (desde la sesión 13): van en estos archivos, sacados de GameWith es-MX (`datos/gamewith/nombres-es.json`, ver §11), todos "por confirmar". La hoja `Catalogo` (vacía) queda para la E6: correcciones de oficiales encima de estos nombres.
- Fuente citada en la web: "Datos del juego: gacha.gg y GameWith" (como en el mockup de la tarjeta).

## 3. Backend: hoja nueva `Builds` (sin tocar las existentes)

`Db.gs` lee las columnas **por posición**: por eso no se cambia ni se reordena nada de `Adventurers`. La migración es agregar `Builds` al `ESQUEMA` y volver a correr `instalar()` (crea la hoja que falta; las demás quedan igual). Publicar como **versión 3** del Web App.

| Columna | Tipo | Nota |
|---|---|---|
| id · miembro_id | texto | Dueño (en las de ejemplo, el oficial que la creó) |
| clase | `perfil` \| `ejemplo` | `ejemplo` = solo oficiales; se puede insertar en guías |
| adventurer_id | texto | Opcional. FK a `Adventurers.id` (la build "de" ese adventurer del perfil) |
| nombre | texto | Ej. "Fire Heavy" (máx. 40) |
| arma_tipo · elemento | enum | Copias para listar y filtrar sin abrir el JSON |
| datos | texto (JSON) | Composición de la build (abajo). Máx. 8.000 caracteres |
| catalogo_version | texto | Versión del catálogo con la que se armó |
| poder_estimado | número | Calculado en el navegador al guardar (informativo) |
| notas | texto | Máx. 500 |
| creado · actualizado | fecha | |

Límites: 10 builds por miembro; las de ejemplo sin límite práctico (oficiales).

API nueva:
- Lectura pública: `builds?miembro=ID`, `build?id=ID` (cacheadas como el resto).
- Escritura: `build.guardar`, `build.eliminar` (dueño; oficiales para `ejemplo`), `catalogo.nombre` (oficial: propone nombre ES), `catalogo.validar` (oficial).
- El backend valida forma y tamaños (ids con formato de slug, rarezas 1–14, niveles, máximo de piezas), **no** la lógica del juego: esa vive en el navegador con el catálogo.

### Composición (`datos`, versión 1)

```json
{ "v": 1,
  "adv": { "id": "fated-adventurer-heavy-bowgun", "nivel": 70 },
  "arma": { "id": "blazing-assault-i", "r": 14 },
  "piezas": { "head": {"id": "rath-heart-helm-iv", "r": 13}, "chest": {…}, "arms": {…}, "waist": {…}, "legs": {…} },
  "rostros": { "nucleo": {"id": "kushala-daora", "cal": "superior", "nv": 10}, "cartas": [ {…} | null, … 4 ], "maestria": true },
  "camarada": { "id": "…", "nv": 60, "estrellas": 3, "poder": 1998 },
  "keepsake": { "nv": 60, "grabados": ["skill-boost", "ultimate", "…"] },
  "reflexiones": { "pts": 65, "max": 65, "nodos": [["internal-ammo", 30]] },
  "poder": { "total": 16851, "equipo": 6736, "rostros": 2099, "camarada": 1998 } }
```

Todo bloque es opcional (una build puede ser solo equipo). Los números de `poder` los escribe el miembro desde su captura y alimentan la fórmula del poder estimado.

## 4. Cálculo (navegador, módulo puro con pruebas)

`site/js/build-calc.js`: dado catálogo + composición devuelve defensa, ataque, afinidad, elemento, **habilidades** (nivel sumado / máximo, "sobra" si pasa del máximo, aporte por pieza para la matriz) y **sets** (piezas puestas / necesarias, bono activo). "Si la cambias…" del selector y "Comparar" son la diferencia entre dos cálculos. Pruebas con `node --test` como el resto.

## 5. Plan por entregas

| # | Entrega | Contenido | Depende de |
|---|---|---|---|
| **E1** | Catálogo limpio | Script + tablas manuales + JSON en `site/data/catalogo/` + pruebas. Sin pantallas | — |
| **E2** | Hoja con cajones · equipo | Ruta `#/build/nueva` y `#/build/:id`: adventurer, arma y 5 piezas con rareza; **selector de pieza** (buscador, filtros por monstruo/elemento/habilidad, "si la cambias…"); barra fija; vista **Habilidades** (matriz). `build-calc.js`. Guardar en `Builds` (backend v3) y en modo demo | E1 |
| **E3** | Tarjeta de build | En el perfil (debajo de cada adventurer) y en guías con `[[build:ID]]` en el Markdown; Compartir y "Usar de base" | E2 |
| **E4** | Resto de cajones | Rostros (catálogo de GameWith: 56 cartas, 12 sets, núcleo, calidad y nivel), Camarada (42 de gacha.gg; nivel/estrellas/poder los escribe el miembro), Keepsake (nivel + grabados), Reflexiones (nodos por adventurer) | E2 |
| **E5** | Comparar | Modo "cambiar una pieza" y dos builds lado a lado | E2 |
| **E6** | Nombres ES | **Hecha (sesión 13, §12)**: los oficiales corrigen o confirman el nombre ES (página "Nombres del juego" y atajo en el selector); hoja `Catalogo` | E2 |
| **E7** | Poder estimado | Ajuste de la fórmula con los poderes reales que carguen los miembros; se muestra como "≈ estimado" | E2 + datos reales |

Cada entrega se publica y se prueba en el celular antes de la siguiente (el clan ya usa la web).

## 6. Preguntas abiertas

Resueltas (2026-11-23): **no hay joyas**; **rareza hasta 14** en armas y armaduras.

1. ~~Joyas~~ · 2. ~~Rareza máxima~~
3. **Critical Element**: mirar en el juego la descripción en una pieza que lo tenga (p. ej. Girros Mask o Radiant Rathalos Greaves) para saber cuál de las dos es.
4. **Efecto despertado del arma** (p. ej. Third Power Shot): ¿se elige o viene fijo con el arma? No viene en los datos.

## 7. E1 — hecho (2026-11-23)

- `scripts/catalogo.mjs` (`npm run catalogo`) + tablas manuales en `scripts/catalogo/`: `correcciones.json` (ids a descartar, habilidades repetidas, monstruo de los sets que no lo nombran, alias de ids), `monstruos.json`, `adventurers.json`.
- Salida en `site/data/catalogo/` (un elemento por línea para que los diffs se lean bien). Cada array de stats va alineado desde `rmin` (índice = rareza − rmin).
- Para actualizar: re-descargar de gacha.gg en `datos/gacha-gg/`, correr `npm run catalogo`, revisar los avisos y hacer commit. La prueba `tests/catalogo.test.mjs` falla si los JSON no están al día con el script o si aparece algo raro (habilidad desconocida, set incompleto, rareza con hueco).
- Pruebas: **87** (`npm test`).

## 8. E2 — hecho (2026-11-23, sesión 11)

- **Cálculo** `site/js/build-calc.js` (puro): `indexarCatalogo`, `calcular` (defensa, ataque, afinidad %, elemento/estado, habilidades con aporte por origen `arma`/parte/`set`, sets con bono activo, resumen y avisos), `diferencia` (gana / igual / pierde según el nivel efectivo con tope), `conPieza`, `buscarPiezas` (parte, texto sin tildes, monstruo u "otros", habilidad, elemento; en armaduras el elemento filtra por habilidades `fire-…`), `limpiarBuild`, `resumenParaGuardar`. Pruebas en `tests/build-calc.test.mjs` con el catálogo real.
- **Carga** `site/js/catalogo.js`: los 7 JSON con `?v=<VERSION>`, una sola vez por sesión de página.
- **Pantallas** `site/js/views/build.js` (rutas `#/build/nueva[?adv=<id de mi adventurer>]` y `#/build/:id`), `site/js/ui/selector-pieza.js` (pantalla completa; el "atrás" del celular la cierra) y `site/js/ui/build-textos.js`. Estilos `.bld-*` al final de `views.css`.
  - Cajón **Adventurer y arma** (nombre, adventurer del catálogo, nivel, unión opcional a un adventurer del perfil, arma filtrada por el tipo del adventurer) y cajón **Armadura** (5 filas con rareza editable y ⇄ para cambiar; chips de defensa y sets). Rostros, Camarada, Keepsake y Reflexiones se ven como "próximamente" (E4).
  - Pestaña **Habilidades**: matriz habilidad × (Arma, Cab, Pec, Bra, Cin, Pie, Set) con total `nivel/máx` y "+sobra"; filtros Todas / Sobran / Al tope / Les falta; tocar una fila muestra qué hace en el nivel actual y en el máximo; lista de sets. **Sin columna de joyas.**
  - Barra fija con defensa, ataque y resumen (habilidades, sobran, sets listos, sets a una pieza) + Guardar.
  - Cualquiera puede armar; guardar pide sesión. Build ajena: solo lectura con **Usar de base** (copia al borrador de una build nueva). Borrador local solo para builds nuevas.
  - Oficiales: casilla "Build de ejemplo" (`clase = ejemplo`).
  - Entrada: sección **Mis builds** en `#/yo` (si el backend aún no tiene `Builds`, la sección queda vacía sin romper el perfil).
- **Backend** `apps-script/Builds.gs` + hoja `Builds` al final del `ESQUEMA`: `builds`, `build`, `build.guardar`, `build.eliminar`. Valida la forma de la composición (v1: `adv`, `arma`, `piezas`, `poder`; lo demás se descarta hasta la E4), ids tipo slug, rarezas 1–14, máx. 8.000 caracteres, 10 builds de perfil por miembro, `adventurer_id` del mismo dueño. Al borrar un adventurer sus builds quedan sueltas. Pruebas en `tests/builds.test.mjs`. Modo demo con una build de ejemplo (`demo-build-1`).
- Pruebas: **104** (`npm test`).

## 9. E4 · Rostros — hecho (2026-11-23, sesión 12)

Alcance elegido por Juan: cartas + **calidad y nivel** (sin efectos potenciales / resketch). Nombres **ES · EN** (GameWith es-MX), marcados "por confirmar".

**Reglas confirmadas con capturas del juego de Juan (2026-11-23, loadout "Fire Heavy")**
- El **núcleo es una de las 5 cartas** y su costo cuenta en el tope: Kushala Daora 3 + 1 + 1 + 3 + 4 = **12/12**.
- Para los sets cuentan **monstruos distintos**: con dos copias de la misma carta (una Lv 10 y otra Lv 1) Ink of Flames bajó de 4/4 a 3/4.
- **Proof of Mastery**: "Core Slot Visage set count +1": el núcleo suma +1 a su set. Así Kushala Daora's Tempest llega a 2/2 con una sola carta. En la web es una casilla (activada por defecto). Por confirmar: cómo se desbloquea y si con un núcleo de dos sets suma a ambos (hoy suma a ambos).
- El juego muestra la cuenta como `(n/máx)` con el umbral más alto (4/4, 2/2).
- **Por confirmar**: si normal y radiante (Rathalos / Rathalos radiante) cuentan como monstruos distintos (hoy sí: son cartas distintas).
- Datos de la pantalla (para E7): poder de Rostros 2099 (todo Lv 10) → 1719 con una carta en Lv 1. "Visage Effects" suma atributos de las cartas (Ultimate Charge Rate, Elemental damage, Affinity, Physical Attack, Damage): vienen de los atributos al azar, fuera del alcance.

**Hecho**
- Datos: `datos/gamewith/rostros.json` (transcrito de GameWith EN y es-MX: 56 cartas, 12 sets, bonos 2/4 —1/2 en Kushala—, efecto núcleo EN/ES). Script: `armarRostros` en `scripts/catalogo.mjs` → `site/data/catalogo/rostros.json` y `rostros-sets.json`. Los núcleos "Instinct +1", "Paralysis Resistance +3", etc. llevan `nucleo.hab` y entran en la matriz de Habilidades (columna **Ros**).
- Cálculo (`build-calc.js`): `calcularRostros` (costo, sets por monstruos distintos + maestría, bonos activos, siguiente umbral), `conRostro`, `limpiarRostros`, `diferenciaRostros`, `CALIDADES` (Fine solo Nv 1; Rare/Epic/Superior hasta 10). `calcular()` devuelve `rostros`.
- Pantallas: cajón **Rostros** (núcleo + 4, costo, calidad y nivel, ⇄, casilla Proof of Mastery, sets con ✓ como en el juego); selector `ui/selector-rostro.js` (buscador, filtros set/costo, "si la cambias…" con sets y costo, aviso si pasa de 12, "Dejar la ranura vacía"); "Sets de Rostros" en la pestaña Habilidades; "Rostros n/12" en la barra. La capa a pantalla completa se movió a `ui/capa.js` (la usan los dos selectores).
- Backend `Builds.gs`: `rostrosValidos_` (calidad, nivel 1–10 / Fine 1, ids slug, máx. 4 cartas, `null` = ranura vacía). **Requiere publicar la versión 4 del Web App** (no cambia hojas; no hace falta `instalar()`). Modo demo igual, y la build de ejemplo trae los Rostros de las capturas.
- Pruebas: **113**.

## 10. Keepsake — notas de las capturas de Juan (2026-11-23), para cuando toque

- Pantalla con dos pestañas: **Upgrade** y **Engrave** (con % de progreso, p. ej. "Engrave 87%"). Keepsake Lv 80/80, poder **5798**.
- **Upgrade**: hitos en Lv 60, 70 y 80; cada hito da nodos tipo "Physical Attack Up" / "Element Attack Up". El detalle de un nodo muestra Adventurer Power 112, Physical Attack 200, Fire Attack 80, Defense 490.
- **Engrave**: matriz de columnas **Skill Boost · Ultimate · Elemental Specialization · Core Passive · Core Attribute** × filas de nivel (60, 70, 80, 80). Core Passive muestra "+15.03 %". Skill Boost tiene 3 puntos (marcadores) y Core Attribute 4 (vacíos en la captura).
- Ejemplo de grabado: "All Elemental Specialization Bonus VII" (Elemental Specialization, +160 de poder): con arma de fuego/agua/trueno/hielo/dragón da **35 % más de daño total**; con arma sin elemento o solo de estado no se activa.

## 11. Nombres en español del equipo — hecho (2026-11-23, sesión 13)

Pedido de Juan: "todo el equipo" (armas, armaduras, sets y habilidades) en español, mostrado **ES con el EN debajo** (como Rostros), buscador en los dos idiomas.

**Fuente**: GameWith es-MX (lista de armaduras y página de cada serie, lista de armas y fichas sueltas, lista de habilidades y habilidades de set). Desde el PC de Juan gamewith.ai no carga (conexión reiniciada) y desde la nube solo con el lector web, que corta las listas largas: por eso se transcribió a mano, como los Rostros.

**Datos**: `datos/gamewith/nombres-es.json` (lo lee `npm run catalogo`):
- `habilidades`, `sets`, `monstruos`: id → ES. Las variantes de habilidad (`-s0`, `-control`, `-2`) toman el nombre de la base.
- `armaduras` y `armas`: nombre EN **sin número romano** (ni elemento en armas) → ES. El script (`crearTraductor` en `scripts/catalogo.mjs`) añade el número del EN ("Yelmo de Rathalos" + " II"), el elemento ("(Fire)" → "(fuego)") y, si la radiante no tiene entrada propia, "<ES> radiante".
- Series Rathalos, Rathian, Hornetaur, Kadachi, Baan, Diablos, Odogaron y Legiana: patrón Yelmo/Cota/Brazales/Faja/Grebas de <monstruo> (confirmado con Rathalos y la lista general). Las demás, de la página de su serie.
- `armas_derivadas`: base sacada de quitar "radiante" a la ficha radiante (GameWith solo tenía la radiante en lo que se pudo leer).

**Catálogo**: `nombres` de armas y armaduras pasa a `[rareza, en, es]` (el tercero solo si hay ES); habilidades, sets y monstruos llevan `es`. Lo que queda en inglés se lista al correr `npm run catalogo` ("Quedan en inglés…"), aparte de los avisos.

**Quedan en inglés** (GameWith no las tiene o no se pudieron leer): 15 habilidades (las 8 "<Arma> Mastery", Desperation, Muck Resistance, Radiant Frenzy, Radiant Power Surge, Sturdy Guard, Unflinching Carver, Unshaken Resolve), los 3 sets de Black Diablos / Pink Rathian's Rampage, las 10 piezas Diablos Nero y 67 nombres de arma (las series de gacha Scintillant Bayard, Luminous Durandal, Gleaming Curtana, Lucent Hauteclaire, Dawnlit Joyeuse, Brilliant Hippogriff, Resplendent Montauban, Sonorous Olifant con sus elementos, y Diablos Clubs/Shatterer/Tyrannis, Cera Coilbender, Griffon Blazooka, Huracan Hammer, Radobaan Slab, Red Bludgeon, Twin Flames, Wyvern Blade "Holly" y sus radiantes).

**Rarezas de GameWith**: van hasta 12 y en otros cortes que gacha.gg (que llega a 14); por eso solo se usa el nombre base y el número romano sale del EN.

**Rarezas en la fuente que conviene revisar con el juego en español**: "Yelmo de corazón de wyvern rathalos" (las otras piezas del set dicen "de corazón de Rath"), "Casco de cazador III" (las otras rarezas dicen "Yelmo de cazador"; se usó Yelmo), "Defensa de Tzitzi" (cabeza), Breaker y Wrecker salen las dos como "Rompedor", Deterrence e Intimidation como "Intimidación". GameWith escribe a veces el monstruo en minúscula ("Yelmo de rathalos II"): se usó mayúscula siempre.

**Pantallas**: `bil(es, en)` en `ui/build-textos.js` (ES y, debajo, el EN más chico; el " · " solo aparece al copiar). Se usa en piezas, arma, chips de habilidades, chips y lista de sets, matriz de Habilidades y selector (título de la candidata). "Si la cambias…", el resumen del cajón y los filtros (monstruo, habilidad) van en una línea con el ES. Orden alfabético por el ES. El buscador del selector encuentra por nombre ES o EN de pieza, set, monstruo y habilidad. Las descripciones de habilidades siguen en inglés.

Pruebas: **115** (nuevas en `tests/catalogo.test.mjs`: traductor y catálogo con ES). Revisado en navegador (modo demo, 390 px): hoja, matriz, sets, selector con búsqueda ES y EN, sin scroll horizontal ni errores de consola. Catálogo: 357 KB sin comprimir (antes 274).

## 12. E6 · Nombres ES editables — hecho (2026-11-23, sesión 13)

Decisiones de Juan: **página + atajo**; armas y armaduras se corrigen por **nombre base** (vale para todas las rarezas; la radiante sale sola si no tiene nombre propio); lo que escribe un **oficial queda confirmado** (✓), los de GameWith siguen "por confirmar".

- **Hoja `Catalogo`** (ya existía, vacía; no hace falta `instalar()`): una fila por corrección. `tipo` = arma / pieza / habilidad / set / monstruo; `id` = id del catálogo (habilidad, set, monstruo) o slug del nombre base EN (armas y piezas: "Rathalos Helm" → `rathalos-helm`, "Flammenzahn+" → `flammenzahn-plus`); `nombre_es`, `nombre_en` (base EN, para leer la hoja), `extra_json` = `{fecha}`, `validado` = TRUE, `creado_por`.
- **Backend** `apps-script/Catalogo.gs`: `catalogo_nombres` (lectura pública, cacheada) y `catalogo.nombre` (oficial; `es` vacío = quitar). Pruebas en `tests/nombres.test.mjs`. **Requiere publicar la versión 5 del Web App** (12 módulos). Si la web sale antes, todo funciona con los nombres de GameWith y guardar da "Acción desconocida".
- **Navegador** `site/js/nombres.js` (puro): `aplicarNombres` (al cargar el catálogo, encima de lo de GameWith; arma por base + número + elemento; habilidades también a sus variantes `-s0`…), `entradasNombres` (lista para la página, estado `en` / `gw` / `ok`), `claveNombre`, `partirNombre`, `baseEs`. `catalogo.js` lo aplica tras indexar (si falla la lectura, sigue sin correcciones). Las tuplas quedan `[r, en, es?, confirmado?]`; `nombreOk(item, r)` en `build-calc.js`.
- **Pantallas**: página `#/nombres` (pestañas Armas / Armaduras / Habilidades / Sets / Monstruos; filtros En inglés / Por confirmar / Confirmados / Todos; buscador ES+EN; los oficiales editan, "Confirmar" y "Volver al de GameWith"; los demás solo leen). En el selector de pieza, "Corregir nombre en español" (solo oficiales). Enlace "Nombres del juego" al pie del builder. ✓ verde junto al nombre confirmado (piezas, arma, matriz, sets). Modo demo con una corrección de ejemplo (Cota de Rathalos).
- Pruebas: **119**. Revisado en navegador (modo demo, 390 px): página (guardar → ✓, volver al de GameWith), atajo en el selector, sin scroll horizontal ni errores de consola.

## 13. E4 · Camarada — hecho (2026-11-23, sesión 14)

Decisiones de Juan (sesión 14): el resto de la E4 va **una entrega por vez** (Camarada → Reflexiones → Keepsake), cada una publicada y probada en el celular. Camarada: **catálogo + datos del miembro** (nivel, estrellas y poder desde su captura). Keepsake: **nivel + poder + matriz de grabados** (marcar los hechos; la web bloquea los que el nivel no abre). Reflexiones: **catálogo de nodos por adventurer** (GameWith), capacidad que escribe el miembro y nodos activos con suma de puntos.

**Fuente**: GameWith `/en/buddies` y `/es-mx/buddies` (2026-11-23): **38 camaradas** (8 SSR, 15 SR, 15 R; 14 Asalto/Palico, 12 Alterador/Rutaco, 12 Apoyo/Trillan). gacha.gg decía 42: faltan 4 que GameWith no lista (por confirmar). Solo "Shadow" cambia de nombre en es-MX (**Sombra**). Por camarada: rareza, tipo y **Aumento de aventurero** (p. ej. Devu: Ataque elemental +350 · Afinidad +9 %). GameWith también muestra Ataque y Ataque máx., 3 habilidades y una "etapa de mejora 0–4" del efecto de apoyo: fuera del alcance.

**Confirmado con capturas de Juan (2026-11-23, pantalla Adventurer/Buddy)**: su camarada es **Kojiro** (SSR, Lv 80/80, **6 estrellas**, poder **1998**; Adventurer Boost Affinity 9.0 % + Elemental Attack 350). Icarus (SR, Lv 80/80, 6 estrellas, poder 1399; Affinity 6.3 % + Elemental Attack 245). Los aumentos de GameWith coinciden; las estrellas van de **0 a 6**. El camarada se equipa desde la pantalla de cada adventurer (botón Equip) → uno por adventurer. La pantalla también muestra **Core Passive** con "Tier" (Kojiro Tier 1, Icarus Tier 2) y **Ultimate Effect**: fuera del alcance por ahora.

**Confirmado también (capturas de la lista de camaradas, 2026-11-23)**:
- **No se puede equipar un camarada de otro tipo** que el adventurer (la lista del juego sale separada por Assault / Disruptor / Support). → Pendiente en la web (sesión 15): en el selector mostrar **solo** los del tipo del adventurer cuando se conoce, y al cambiar a un adventurer de otro tipo quitar el camarada con aviso (como el arma). El Fated Adventurer de ballesta pesada de Juan (MyMarLa) lleva a Kojiro (Asalto): el tipo del Fated no está en el catálogo; por ahora sigue libre.
- Son **38** (14 Asalto: 4 SSR, 5 SR, 5 R · 12 Alterador: 2 SSR, 5 SR, 5 R · 12 Apoyo: 2 SSR, 5 SR, 5 R), igual que GameWith; gacha.gg (42) estaba mal.
- El **Aumento de aventurero sube con el nivel**: Hoppy Lv 75 → Ataque elemental 326 (350 en Lv 80); Golden Bell Lv 1 → 2 (poder 102). Los valores del catálogo son los de **Lv 80** → en la web rotular "Aumento (Nv 80)".
- Otros datos: Hoppy SSR Lv 75/80, 6 ★, poder 1918 (Pepper) · Golden Bell SR Lv 1/80, 0 ★, poder 102 (Madelyn). Core Passive tiene "Tier 0/1/2".

**Hecho**
- Datos: `datos/gamewith/camaradas.json` (transcrito; `aumento` = pares `[stat, valor]`, etiquetas en `stats`). Script: `armarCamaradas` en `scripts/catalogo.mjs` → `site/data/catalogo/camaradas.json` (orden SSR→R, tipo, nombre). `catalogo.js` lo carga (10 archivos).
- Composición: `camarada: { id, nv?, estrellas?, poder? }` (nivel 1–80, estrellas 0–6, poder 0–999999; todo menos el id es opcional).
- Cálculo (`build-calc.js`): `limpiarCamarada`, `calcularCamarada` (ficha + `compatible` = tipo del adventurer igual al del camarada; el Fated Adventurer no tiene tipo → siempre compatible), `conCamarada` (al cambiar de camarada se borran nivel/estrellas/poder), `ordenarCamaradas` (primero los del tipo del adventurer). `calcular()` devuelve `camarada`.
- Pantallas: cajón **Camarada** (rareza, nombre ES · EN, tipo · especie, aumento, ⇄; Nivel / Estrellas / Poder; aviso si el tipo no coincide; resumen "Kojiro · Nv 80 · 6 ★ · poder 1.998"). Selector `ui/selector-camarada.js` (buscador por nombre o aumento, filtros Tipo —preseleccionado con el del adventurer— y Rareza, "Quitar el camarada"). Textos en `ui/build-textos.js` (`textoAumento`, `tipoCamarada`, `TIPOS_CAMARADA`). Estilos `.bld-camarada`, `.bld-rareza-cam*`, `.bld-cam-datos`.
- Backend `Builds.gs`: `camaradaValido_`. **Requiere publicar la versión 6 del Web App** (no cambia hojas; sin `instalar()`). Si la web sale antes, la build se guarda igual pero el backend v5 descarta el camarada. Modo demo igual (build de ejemplo con Kojiro Nv 80, 6 ★, poder 1998, como en la captura de Juan).
- Pruebas: **125** (4 en `build-calc`, 1 en `builds`, 1 en `catalogo`). Revisado en navegador (modo demo, 390 px): cajón, selector, aviso de tipo, borrador; sin scroll horizontal ni errores de consola.

**Ajuste de tipo — hecho (2026-11-23, sesión 15)**
- `build-calc.js`: `camaradasPara(lista, tipo)` (solo los del tipo; sin tipo, todos) y `conAdventurer(cat, build, id)` (cambia el adventurer conservando el nivel y quita el arma si es de otra clase y el camarada si es de otro tipo; devuelve `quitados`). El Fated Adventurer sigue sin tipo → su camarada se conserva y el selector muestra los 38 con el filtro Tipo.
- Selector: con tipo conocido muestra solo ese tipo (sin filtro Tipo; "solo puede llevar uno de ese tipo (14)"); se quitó el aviso "quizá no puedas". `views/build.js` usa `conAdventurer` con toast ("Quitamos el camarada: ese adventurer lleva uno de tipo Apoyo."). Aviso del cajón para builds viejas: "el juego no deja ponérselo". Rótulo **"Aumento (Nv 80)"** en cajón y selector; la nota del cajón dice que con menos nivel el aumento es menor.
- Pruebas: **127** (2 nuevas en `build-calc`). Revisado en navegador (390 px): Midori → 14 de Asalto; elegir Kojiro y cambiar a Ryunosuke → se quita con toast; Fated → 38 con filtro Tipo. Sin scroll horizontal ni errores propios. No toca el backend.
