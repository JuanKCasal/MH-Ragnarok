# Builder de builds — modelo de datos y plan (sesión 10, propuesta)

Estado: **plan aprobado por Juan (2026-11-23)**; **E1 hecha** (catálogo limpio). Dirección elegida: **C · Hoja única con cajones** + pantallas comunes (selector de pieza, tarjeta de build, comparar). Mockups en `docs/mockups/builder/`.

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
  (después) rostros.json · camaradas.json · reflexiones.json
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
- **Nombres ES**: no van en estos archivos. Viven en la hoja `Catalogo` (ya existe, vacía) como capa encima: `tipo, id, nombre_es, validado`. La web muestra "Nombre ES · Nombre EN" si hay ES, y la marca "por confirmar" si `validado = FALSE`.
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
  "rostros": { "nucleo": {"id": "…", "cal": "epic", "nv": 10}, "cartas": [ … 4 … ] },
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
| **E6** | Nombres ES | Un oficial escribe el nombre ES desde el selector o la tarjeta; queda "por confirmar" hasta validar (hoja `Catalogo`) | E2 |
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
