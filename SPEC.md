# SPEC — MH-Ragnarok v1

Especificación técnica de la web del gremio Ragnarok. Contexto estable y reglas: `CLAUDE.md`. Estado de la sesión: `HANDOFF.md`.

Las decisiones que tomé con un valor por defecto y que Juan debe confirmar están marcadas con **⚠ Por confirmar**. Están reunidas en la sección 12.

---

## 1. Objetivos y alcance de la v1

- Que cualquier visitante (sobre todo desde el celular) vea quién es Ragnarok, las noticias, las guías, los perfiles y los próximos eventos con cuenta regresiva en su hora local.
- Que cada miembro pueda registrarse con el código del clan, editar su perfil y cargar sus adventurers (build resumen, Fase 1).
- Que los oficiales publiquen noticias y guías y armen las **brigadas** de Clash (4 jugadores) balanceados por el poder del **adventurer principal** de cada miembro.

Fuera de la v1: catálogo estructurado ES/EN (Fase 2), lectura de capturas con IA, notificaciones push, chat.

## 2. Secciones y rutas

Navegación con *hash router* (`#/ruta`), porque GitHub Pages no reescribe rutas de una SPA. Barra inferior fija en celular (5 íconos); en escritorio, barra superior.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `#/` | **Inicio**: estandarte del gremio, datos (rango, miembros, etiqueta "Veterans"), próximo evento con cuenta regresiva, últimas 3 noticias, CTA "Únete" | Público |
| `#/noticias` · `#/noticias/:id` | Lista con filtro (Juego / Gremio / Eventos) y detalle | Público |
| `#/guias` · `#/guias/:slug` | Guías agrupadas por categoría (Primeros pasos, Armas, Rostros, Camaradas, Eventos) | Público |
| `#/miembros` · `#/miembros/:id` | Directorio (buscador, filtro por arma/elemento/rol, orden por poder) y perfil con sus adventurers | Público |
| `#/eventos` | Guild Clash y Guild Carnival: horario local, cuenta regresiva, asistencia y brigadas de la semana | Público (confirmar asistencia: miembro) |
| `#/clash/armar` | Herramienta de armado de brigadas | Oficial |
| `#/entrar` · `#/registro` | Login con nick + PIN · Registro con código del clan | Público |
| `#/yo` | Mi perfil: datos, adventurers, cambiar PIN, cerrar sesión | Miembro |
| `#/editor` (`?tipo=guia`) | Lista de noticias o guías con borradores, para editar | Oficial |
| `#/editor/noticia/:id?` · `#/editor/guia/:id?` | Editor Markdown con botones de formato, vista previa, portada, borrador/publicar, fijar (noticias), eliminar. Copia local de lo escrito sin guardar | Oficial |
| `#/admin` | Miembros (rol, estado, resetear PIN), código del clan, configuración del gremio | Admin (parte de oficial) |

Pie de página en todas las pantallas: "Sitio de fans no oficial. Monster Hunter es marca de Capcom. No afiliado a Capcom ni a TiMi Studio Group."

## 3. Arquitectura

```
Celular / navegador
   │  GET  ?accion=...             (lecturas públicas, cacheadas)
   │  POST text/plain {accion,...} (escrituras y login, sin preflight CORS)
   ▼
Google Apps Script (Web App, "Ejecutar como: yo", "Acceso: cualquiera")
   ├─ Google Sheets  (una hoja por entidad)
   ├─ Google Drive   (carpeta de imágenes, archivos "cualquiera con el enlace: lector")
   ├─ CacheService   (respuestas públicas, 10 min, invalidadas al escribir)
   └─ PropertiesService (pimienta de PIN, hash del código del clan, IDs de hoja y carpeta)
```

- **Frontend:** HTML + CSS + JavaScript (módulos ES) sin framework ni paso de build: carga rápida en celular, nada que compilar, se edita a mano. Sin dependencias externas en la v1 (el Markdown se renderiza con un subconjunto propio y seguro).
- **Despliegue del frontend:** GitHub Actions publica la carpeta `site/` en GitHub Pages (`juankcasal.github.io/MH-Ragnarok`). Así el código del backend, los tests y la documentación quedan en el repo pero no se publican.
- **Despliegue del backend:** copiar/pegar los `.gs` en el editor de Apps Script o usar `clasp` (opcional). `.clasp.json` va en `.gitignore`.
- **URL de la API:** la URL `/exec` del Web App va en `site/config.js`. Es pública por naturaleza (el navegador de cada visitante la usa) y no contiene claves. Lo secreto (pimienta, código del clan, IDs) vive solo en `PropertiesService`.
- **Cuenta de Google:** por ahora la cuenta personal de Juan es dueña del Sheet, la carpeta de Drive y el script (decisión 12.5). Se puede migrar a una cuenta del clan más adelante.
- **PWA ligera:** `manifest.webmanifest` + íconos propios para que se pueda "instalar" en el celular. Service worker con caché del *shell* en v1.1.

## 4. Estructura de carpetas del repo

```
MH-Ragnarok/
├─ CLAUDE.md · HANDOFF.md · SPEC.md · README.md
├─ .gitignore                      # .claude/skills/, .clasp.json, node_modules/
├─ .github/workflows/pages.yml     # publica site/ en GitHub Pages
├─ site/                           # ← lo único que se publica
│  ├─ index.html
│  ├─ config.js                    # API_URL, zona del juego, flags
│  ├─ manifest.webmanifest
│  ├─ assets/
│  │  ├─ css/  tokens.css · base.css · components.css · views.css
│  │  ├─ img/  emblema (SVG propio), íconos, texturas propias
│  │  └─ fonts/ (fuentes libres autoalojadas, p. ej. de Google Fonts con licencia OFL)
│  └─ js/
│     ├─ app.js                    # arranque, layout, barra de navegación
│     ├─ router.js                 # hash router
│     ├─ api.js                    # GET/POST, caché local stale-while-revalidate
│     ├─ auth.js                   # sesión en localStorage, roles
│     ├─ time.js                   # próximos eventos, hora local, cuenta regresiva
│     ├─ clash-balance.js          # algoritmo de balanceo (puro, testeado)
│     ├─ image.js                  # compresión a WebP ~1600 px antes de subir
│     ├─ markdown.js               # subconjunto seguro de Markdown
│     ├─ ui/                       # componentes: tarjeta, modal, toast, countdown…
│     └─ views/                    # inicio, noticias, guias, miembros, perfil, eventos, clash, editor, admin, auth
├─ apps-script/                    # backend (no se publica en Pages)
│  ├─ appsscript.json
│  ├─ Code.gs        # doGet/doPost, enrutador de acciones
│  ├─ Db.gs          # lectura/escritura de hojas como objetos
│  ├─ Auth.gs        # registro, login, sesiones, PIN, bloqueo
│  ├─ Miembros.gs · Adventurers.gs · Contenido.gs · Clash.gs · Imagenes.gs
│  ├─ Setup.gs       # crea hojas, propiedades, primer admin (se ejecuta 1 vez)
│  └─ Util.gs
├─ tests/                          # node --test (sin dependencias)
│  ├─ clash-balance.test.mjs
│  └─ time.test.mjs
└─ docs/
   └─ SETUP-backend.md             # guía paso a paso para montar el backend
```

## 5. Modelo de datos (Google Sheets)

Un archivo de Sheets, una hoja por entidad. Fila 1 = encabezados (exactamente los nombres de abajo). IDs cortos aleatorios (`base36`, 10 caracteres). Fechas en ISO 8601 UTC. Booleanos como `TRUE/FALSE`.

### 5.1 `Miembros` (pública, salvo lo indicado)
| Columna | Tipo | Nota |
|---|---|---|
| id | texto | |
| nick | texto | Único, sin distinguir mayúsculas. Es el usuario de login |
| nick_juego | texto | Nombre dentro del juego |
| uid_juego | texto | ID de jugador del juego (opcional) |
| pais | texto | Código ISO-2 (CL, CO, BR…) para mostrar bandera |
| rol | `admin` \| `oficial` \| `miembro` | |
| estado | `activo` \| `inactivo` | Inactivo: no puede entrar y no aparece en el directorio |
| bio | texto | Máx. 280 caracteres |
| avatar_id | texto | ID de archivo de Drive |
| adventurer_principal_id | texto | FK a `Adventurers.id`; define su poder para el Clash |
| creado · actualizado | fecha | |
| nick_cambios | texto | Privada. Fechas ISO de sus cambios de nick de los últimos 7 días (límite `nick_cambios_semana`) |

### 5.2 `Credenciales` (privada: nunca sale del backend)
| miembro_id | pin_hash | sal | intentos_fallidos | bloqueado_hasta | pin_temporal (bool) | actualizado |

### 5.3 `Sesiones` (privada)
| token_hash | miembro_id | creado | expira | ultimo_uso |

### 5.4 `Adventurers` (build resumen, Fase 1)
| Columna | Tipo | Nota |
|---|---|---|
| id · miembro_id | texto | |
| adventurer | texto | Nombre del personaje (texto libre en v1; FK a catálogo en Fase 2) |
| arma | enum | `great_sword`, `long_sword`, `dual_blades`, `hammer`, `charge_blade`, `lance`, `heavy_bowgun`, `bow` |
| elemento | enum | `fire`, `water`, `thunder`, `ice`, `dragon`, `none` |
| tipo | enum | `assault`, `disruptor`, `support` (Asalto / Alterador / Apoyo) |
| nivel | número | 1–80 |
| poder_total | número | Adventurer Power |
| poder_equipo · poder_rostros · poder_camarada | número | Opcionales; "otros" = total − suma |
| loadout | texto | Nombre del loadout (ej. "Fire Heavy") |
| notas | texto | Máx. 500 |
| capturas | texto | IDs de Drive separados por coma (máx. 5) |
| creado · actualizado | fecha | |

Los enums se guardan en inglés (clave estable) y la web muestra la etiqueta en español con el inglés al lado cuando aplica: "Ballesta pesada · Heavy Bowgun".

### 5.5 `Noticias`
| id | titulo | resumen | cuerpo_md | tipo (`juego`/`gremio`/`evento`) | portada_id | autor_id | publicado | fijada | fecha_pub | creado | actualizado |

### 5.6 `Guias`
| id | slug | titulo | categoria | nivel (`basico`/`intermedio`/`avanzado`) | resumen | cuerpo_md | portada_id | autor_id | orden | publicado | creado | actualizado |

### 5.7 `ClashSemanas`
| id (fecha del sábado en hora del juego, `2026-11-28`) | estado (`abierta`/`armada`/`cerrada`) | tam_equipo (4) | publicado_en | puesto | puntos | notas |

### 5.8 `ClashAsistencia`
| semana_id | miembro_id | respuesta (`voy`/`no`/`quiza`) | poder_snapshot | adventurer_id | actualizado |

`poder_snapshot` se toma del adventurer principal al confirmar y se refresca al armar los equipos.

### 5.9 `ClashEquipos`
| semana_id | equipo (1..n) | miembro_id | poder_snapshot | fijado (bool) |

### 5.10 `Config` (clave/valor, pública salvo claves que empiecen con `_`)
`gremio_nombre`, `gremio_rango`, `gremio_etiqueta`, `gremio_declaracion`, `lider_juego`, `max_miembros`, `whatsapp_invitacion`, `clash_dia` (6 = sábado), `clash_hora` (`20:15`), `clash_duracion_min` (60), `carnival_horas` (`12:00,18:00`), `carnival_duracion_min` (130), `zona_juego_offset_min` (−360), `nick_cambios_semana` (2).

### 5.11 `Imagenes` (privada)
| id (Drive) | miembro_id | tipo (`avatar`/`captura`/`portada`) | creado |

Registro de cada archivo subido por el backend. Sirve para validar que un ID de imagen es propio antes de asociarlo y para no tocar nunca archivos de Drive ajenos.

### 5.12 `Log` (privada)
| fecha | miembro_id | accion | entidad | entidad_id | detalle |

### 5.13 `Catalogo` (Fase 2, se crea vacía; con el builder guarda solo los nombres ES encima del catálogo estático, ver `docs/BUILDER.md`)
| tipo (`arma`/`pieza`/`habilidad`/`set`/`monstruo`; más adelante `rostro`/`camarada`) | id | nombre_es | nombre_en | extra_json (`{fecha}`) | validado | creado_por |

## 6. API (Apps Script)

**Formato de respuesta:** `{ "ok": true, "data": … }` o `{ "ok": false, "error": { "codigo": "PIN_INVALIDO", "mensaje": "…" } }`. Siempre HTTP 200 (Apps Script no permite elegir el código).

**Lecturas públicas — `GET ?accion=`** (cacheadas en `CacheService` 10 min; el cliente además guarda copia en `localStorage` y muestra lo guardado mientras refresca):

| accion | Parámetros | Devuelve |
|---|---|---|
| `inicio` | — | config pública del gremio, conteo de miembros, últimas 3 noticias, semana de Clash vigente (estado) |
| `noticias` | `tipo?`, `pagina?` | lista (sin `cuerpo_md`) |
| `noticia` | `id` | noticia completa |
| `guias` | — | lista agrupada por categoría |
| `guia` | `slug` | guía completa |
| `miembros` | — | directorio: miembro + adventurer principal (sin datos privados) |
| `miembro` | `id` | perfil + todos sus adventurers |
| `clash` | `semana?` | semana (por defecto la vigente) + asistencia + equipos |
| `clash_historial` | — | semanas cerradas con puesto y puntos (últimas 52) |
| `builds` | `miembro` o `clase=ejemplo` | builds de perfil de un miembro activo, o las de ejemplo (con `datos` y `autor`). Ver `docs/BUILDER.md` §3 |
| `build` | `id` | una build (las de perfil solo si el dueño sigue activo) |
| `catalogo_nombres` | — | correcciones de nombres ES de los oficiales (hoja `Catalogo`): `[{tipo, id, es, en, validado, por, fecha}]`. Ver `docs/BUILDER.md` §12 |

**Escrituras — `POST` con cuerpo `text/plain` que contiene JSON `{ accion, token?, datos }`:**

| accion | Rol mínimo | Qué hace |
|---|---|---|
| `registro` | — | `{codigo_clan, nick, nick_juego, pais, pin}` → crea miembro + credencial, devuelve sesión |
| `login` | — | `{nick, pin}` → token de sesión |
| `logout` | miembro | invalida el token |
| `sesion` | miembro | valida el token, devuelve el miembro actual (y extiende el vencimiento) |
| `pin.cambiar` | miembro | `{pin_actual, pin_nuevo}` |
| `perfil.guardar` | miembro | campos editables propios (nick, nick_juego, pais, bio, avatar_id). Nick: único y máx. 2 cambios por 7 días corridos (`NICK_LIMITE`) |
| `adventurer.guardar` | miembro | crea/edita uno propio (oficial: cualquiera) |
| `adventurer.eliminar` | miembro | propio |
| `adventurer.principal` | miembro | marca su principal |
| `build.guardar` | miembro | crea/edita una propia (oficial: cualquiera). `clase: 'ejemplo'` solo oficiales. Máx. 10 de perfil por miembro. Composición v1: `adv`, `arma`, `piezas`, `rostros` (desde la E4, backend v4), `camarada` (`{id, nv?, estrellas?, poder?}`, backend v6), `reflexiones` (`{cap?, activas: [ids]}`, backend v7), `keepsake` (`{nv?, poder?, grabados: [ids de paso]}`: backend v7, ids como en el juego desde la v8, máx. 31) y `poder` (docs/BUILDER.md §3, §14 y §15) |
| `build.eliminar` | miembro | propia (oficial: cualquiera) |
| `catalogo.nombre` | oficial | `{tipo, id, en, es}`: guarda y confirma el nombre ES (`es` vacío = quitar la corrección). `tipo` = arma / pieza / habilidad / set / monstruo; en armas y piezas `id` = slug del nombre base EN |
| `imagen.subir` | miembro | `{base64, mime, tipo}` → ID de Drive. Máx. 2 MB ya comprimida |
| `clash.asistencia` | miembro | `{respuesta}` para la semana vigente |
| `noticia.guardar` · `noticia.eliminar` | oficial | |
| `guia.guardar` · `guia.eliminar` | oficial | |
| `clash.guardarEquipos` | oficial | guarda el resultado del armado (y cambios manuales); estado → `armada` |
| `clash.cerrar` | oficial | `{puesto, puntos, notas}`; estado → `cerrada` |
| `editor.contenido` | oficial | `{tipo: 'noticia'\|'guia', id?}`: lista con borradores, o un ítem completo para editar |
| `admin.miembros` | oficial | lista con inactivos, bloqueos y PIN temporal |
| `miembro.resetPin` | oficial | genera PIN temporal de 6 dígitos que se muestra **una vez** al oficial; obliga a cambiarlo al entrar. El PIN de un oficial solo lo resetea el admin |
| `miembro.estado` | oficial | activar / desactivar |
| `miembro.rol` | admin | nombra o quita oficiales |
| `config.guardar` | admin | claves públicas de `Config`; valida rangos numéricos y horas `HH:MM` (Clash y Carnival) |
| `config.codigoClan` | admin | cambia el código del clan (se guarda como hash) |

Todas las escrituras usan `LockService` (evita choques entre dos oficiales) y registran en `Log`.

## 7. Autenticación y seguridad

- **Registro:** código del clan + nick + PIN (dos veces). El código se compara contra su hash en `PropertiesService`. Tras 20 intentos fallidos de código en 10 minutos, el registro se pausa 10 minutos para todos (Apps Script no ve la IP del visitante, así que el límite es global).
- **PIN:** 6 dígitos. Se guarda `HMAC-SHA256(pimienta, sal + pin)` iterado 1.000 veces; `sal` aleatoria por miembro; `pimienta` solo en `PropertiesService` (así, si alguien ve la hoja, no puede probar PINs sin la pimienta).
- **Bloqueo:** 5 intentos fallidos → bloqueado 15 minutos (`bloqueado_hasta`). Mensajes de error genéricos ("nick o PIN incorrectos").
- **Sesión:** token aleatorio de 256 bits; en la hoja solo se guarda su SHA-256. Vence a los 30 días sin uso (se renueva al usarlo). Máximo 5 sesiones por miembro (la más vieja se borra). El token se guarda en `localStorage` del dispositivo.
- **Primer admin:** se crea desde el editor de Apps Script con `crearAdmin('Juan', 'PIN')` (función de `Setup.gs`), nunca desde la web.
- **Salida de datos:** el backend arma cada respuesta pública con una lista blanca de campos. `Credenciales`, `Sesiones`, `Log` y las claves `_` de `Config` nunca se devuelven.
- **Contenido:** el Markdown de noticias y guías se renderiza con un parser propio que escapa todo el HTML; los enlaces solo aceptan `https:`; las imágenes solo de Drive.
- **Privacidad:** nunca se piden ni se muestran teléfonos. El enlace de WhatsApp se muestra según la decisión de la sección 12.

## 8. Imágenes

1. El navegador redimensiona a máx. 1600 px de lado (avatares: 512 px) y exporta WebP calidad 0,8 (`canvas.toBlob`). Si el navegador no soporta WebP, JPEG 0,82.
2. Se envía en base64 por `imagen.subir`. El backend valida tipo y tamaño (≤ 2 MB), crea el archivo en la carpeta de Drive del clan con nombre `tipo_miembro_fecha`, y lo comparte como "cualquiera con el enlace: lector".
3. Se muestra con `https://drive.google.com/thumbnail?id=ID&sz=w1000` (miniaturas con `sz=w400`). Respaldo: `https://lh3.googleusercontent.com/d/ID=w1000`.
4. Límites: 5 capturas por adventurer, 1 avatar por miembro, 1 portada por noticia/guía. Al reemplazar o borrar, el archivo anterior va a la papelera de Drive.

## 9. Eventos y horarios

- La hora del juego es **UTC−6 fija** (`zona_juego_offset_min = -360`).
- **Guild Clash:** sábados 20:15 hora del juego = domingo 02:15 UTC.
- **Guild Carnival:** todos los días 12:00 y 18:00 hora del juego (18:00 y 00:00 UTC), duración 2 h 10 min.
- `time.js` calcula la próxima ocurrencia en UTC y la muestra con `Intl.DateTimeFormat` en la zona del visitante: "Sáb 28 nov · 23:15 (tu hora)". Si el evento está en curso: "En curso · termina en 1 h 12 min".
- La **semana de Clash** se identifica por la fecha del sábado en hora del juego. La asistencia de la semana siguiente se abre cuando termina el Clash anterior (domingo 02:15 UTC + 1 h).

## 10. Algoritmo de balanceo de brigadas de Clash

En el código y en las hojas se siguen llamando "equipos" (`ClashEquipos`, `balancearEquipos`); en pantalla se muestran como **brigadas**.

Implementado en `site/js/clash-balance.js` (JavaScript puro, sin DOM) y probado con `node --test`. Corre en el navegador del oficial (no gasta cuota de Apps Script); el resultado se guarda con `clash.guardarEquipos`.

**Entrada:** jugadores que confirmaron "voy", cada uno con `poder` (del adventurer principal), `tipo` y `arma` opcionales; tamaño de equipo `4`; jugadores **fijados** a un equipo por el oficial.

**Cantidad de equipos:** `ceil(n / 4)`. Si `n` no es múltiplo de 4, uno a tres equipos quedan de 3 jugadores (confirmado por Juan). El modo `suplentes` sigue disponible en el código pero no se muestra en la v1.

**Pasos (determinista: misma entrada, mismo resultado):**
1. Se colocan los fijados.
2. Los demás se ordenan de mayor a menor poder y cada uno entra al equipo con menor poder acumulado que tenga cupo (*greedy* LPT).
3. Mejora local: se prueban todos los intercambios de 2 jugadores entre equipos distintos (y movimientos hacia equipos con cupo); se aplica el que más reduce el costo; se repite hasta que ninguno mejore (tope de iteraciones).
4. **Costo** = (poder del equipo más fuerte − poder del más débil) + 0,1 × desviación estándar de los poderes + penalización blanda opcional por composición (equipos sin ningún "Apoyo", o con 3+ armas iguales). La penalización está apagada por defecto y se activa con un interruptor en la pantalla.

**Comparación entre equipos de distinto tamaño:** por **suma** de poder (un equipo de 3 recibe jugadores más fuertes para compensar).

**Salida:** equipos con jugadores, suma, promedio, y métricas globales (diferencia máx.−mín., desviación). La pantalla permite arrastrar/intercambiar jugadores a mano, fijarlos y recalcular el resto.

**Modo "escalonado"** (los 4 más fuertes juntos, etc.): existe en el código pero **no se muestra**. Juan lo descartó: juntar a los fuertes asegura las 4 rondas de una brigada pero deja a las demás sin opciones, y el clan suma menos. La idea es 2 fuertes + 2 de poder normal por brigada, que es lo que tiende a producir el balanceo por suma.

## 11. Fases

| Fase | Contenido |
|---|---|
| **0 — Base** (sesión 2) | SPEC, backend v1 con 18 pruebas sobre un simulador de Apps Script, algoritmo de balanceo y horarios con pruebas, direcciones visuales |
| **1 — MVP** | Frontend completo de la sección 2 con la dirección visual elegida; despliegue en Pages y Apps Script; carga de datos iniciales del gremio |
| **1.1** | PWA con service worker, historial de Clash con resultados y gráfico de puesto/puntos, estadísticas del gremio (armas y elementos más usados) |
| **2 — Catálogo y builder** | Catálogo estático en `site/data/catalogo/` (generado desde gacha.gg) + nombres ES en la hoja `Catalogo` que validan los oficiales; builder interactivo (opción C) con hoja nueva `Builds`. Modelo, reglas y entregas: **`docs/BUILDER.md`** |
| **Opcional** | Lectura de capturas con IA de visión (costo por captura) |

## 12. Decisiones

**Confirmadas por Juan (2026-11-22):**
1. **Equipos incompletos:** equipos de 3 (`incompletos: 'equipos'`, el valor por defecto del algoritmo).
3. **WhatsApp:** el enlace solo se muestra a miembros con sesión.
4. **Registro:** con el código del clan el miembro queda activo de inmediato (sin aprobación).
- **Dirección visual:** B · Salón de Estandartes, tal cual (sin los paneles de pergamino).

2. **Modo escalonado:** no se ofrece (ver §10).
5. **Cuenta de Google:** la personal de Juan por ahora (repo en su GitHub `JuanKCasal`).
6. **Cambio de nick:** lo hace cada miembro desde su perfil, máximo **2 veces por 7 días corridos**.
7. **Duración del Guild Clash:** ~1 hora (`clash_duracion_min` = 60). Cada brigada juega 4 rondas (4 monstruos) contra brigadas de otros clanes; cada victoria suma puntos.
- **Nombre:** los grupos de 4 jugadores del Clash se llaman **brigadas**, como en el juego.

Ya no queda nada por confirmar de la v1.
