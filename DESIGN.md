---
name: MH-Ragnarok · Salón de Estandartes
description: Web del gremio Ragnarok — noche en el salón del gremio, estandarte carmesí y emblema dorado.
colors:
  noche-profunda: "#0f0c0d"
  noche: "#1a1214"
  vino-sombra: "#3a1a1f"
  panel: "#241a1c"
  panel-hondo: "#171113"
  celda: "#161012"
  carmesi: "#8c1d2a"
  carmesi-hondo: "#6d1420"
  carmesi-pliegue: "#561019"
  oro: "#e6c068"
  oro-claro: "#f0d48a"
  oro-boton-alto: "#e9c46e"
  oro-boton-bajo: "#b98a32"
  oro-viejo: "#8a6424"
  marfil: "#efe4cc"
  marfil-claro: "#fbf1d8"
  texto-suave: "#d8c9a8"
  texto-tenue: "#b8a888"
  texto-apagado: "#9a8d76"
  bosque: "#1f4a2c"
  bosque-texto: "#bfe8c9"
  acierto: "#9fe0b0"
  acero: "#9fc3e0"
  error: "#f19a8f"
typography:
  display:
    fontFamily: "Cinzel, 'Times New Roman', serif"
    fontSize: "clamp(2.75rem, 12vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.08em"
  titulo:
    fontFamily: "Cinzel, 'Times New Roman', serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
  cifra:
    fontFamily: "Cinzel, 'Times New Roman', serif"
    fontSize: "clamp(2.25rem, 10vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0em"
  marca:
    fontFamily: "Cinzel, 'Times New Roman', serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.3em"
  cuerpo:
    fontFamily: "Mulish, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  rotulo:
    fontFamily: "Mulish, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.14em"
  boton:
    fontFamily: "Mulish, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  filo: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  margen-movil: "16px"
components:
  boton-oro:
    backgroundColor: "{colors.oro-boton-alto}"
    textColor: "{colors.noche}"
    typography: "{typography.boton}"
    rounded: "{rounded.filo}"
    height: "50px"
  boton-filete:
    backgroundColor: "transparent"
    textColor: "{colors.marfil}"
    typography: "{typography.boton}"
    rounded: "{rounded.filo}"
    height: "46px"
  panel-salon:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.filo}"
    padding: "20px"
  celda-brigada:
    backgroundColor: "{colors.celda}"
    textColor: "{colors.marfil}"
    padding: "10px 12px"
  insignia-en-curso:
    backgroundColor: "{colors.bosque}"
    textColor: "{colors.bosque-texto}"
    typography: "{typography.rotulo}"
    rounded: "{rounded.filo}"
    padding: "6px 10px"
  barra-inferior:
    backgroundColor: "{colors.noche-profunda}"
    textColor: "{colors.texto-tenue}"
    height: "72px"
---

# Design System: MH-Ragnarok · Salón de Estandartes

## Overview

De noche, en el salón del gremio: un estandarte carmesí cuelga de una barra dorada, con el emblema propio de Ragnarok (escudo con alas y cuernos y una "R"). Todo lo demás es sobrio: fondo casi negro con un resplandor vino arriba, filetes dorados de 1 px y texto marfil. El oro se gana; no se reparte.

Se usa sobre todo **en el celular**, a menudo de noche y con el juego abierto al lado: fondo oscuro, cifras grandes y botones de 44 px o más. Es un **fan site no oficial**: nada de logos, arte ni fuentes de Capcom; el emblema y los íconos son dibujos propios.

Referencias aprobadas: `docs/mockups/B-Inicio.dc.html` y `docs/mockups/B-Clash.dc.html` (dirección B, elegida "tal cual" por Juan el 2026-11-22). Son el contrato visual; esta guía los generaliza al resto de pantallas.

**Modo por pantalla:** Inicio = Persuade (orgullo de gremio, sumarse). Eventos y armado de brigadas = Operate (leer rápido, decidir, confirmar). Guías y noticias = Read.

## Colors

### Primary
- **Oro** (`oro`, `oro-claro`): títulos de sección, cifras, filetes, ítem activo de la barra, foco. Los filetes son oro con transparencia (35–55 %) para que el oro pleno quede para lo importante.
- **Botón de oro**: degradado vertical de `oro-boton-alto` a `oro-boton-bajo` con texto `noche`. Una sola acción principal por pantalla.

### Secondary
- **Carmesí** (`carmesi`, `carmesi-hondo`, `carmesi-pliegue`): solo el estandarte, el inicio de la barra de asistencia y el tinte superior de las tarjetas de brigada. Nunca como color de texto.

### Tertiary
- **Bosque** (`bosque` / `bosque-texto`): estado "En curso". **Acierto** (`acierto`): diferencia de poder baja en el armado. **Acero** (`acero`): rótulo de guías, para diferenciarlas de las noticias del gremio. **Error** (`error`): mensajes de error sobre fondo oscuro.

### Neutral
- Fondo: degradado radial `vino-sombra` → `noche` → `noche-profunda`, centrado arriba.
- Paneles: `panel` → `panel-hondo` en diagonal; celdas de brigada en `celda`.
- Texto: `marfil-claro` para cifras destacadas, `marfil` para el cuerpo, `texto-suave` para apoyo, `texto-tenue` para rótulos, `texto-apagado` para notas y el aviso legal.

**La Regla del Oro Escaso.** En una pantalla, el oro pleno aparece en el título, en la cifra principal y en una sola acción. Todo lo demás es marfil o filete translúcido.

**La Regla del Texto Tibio.** El texto secundario se tiñe de la paleta (marfil apagado), nunca gris neutro. Mínimo 4,5:1 sobre `noche`.

## Typography

**Cinzel** (display, variable 400–900) y **Mulish** (texto, variable 200–1000), ambas OFL y **autoalojadas** en `site/assets/fonts/` (solo subconjunto latino; cubre español y portugués).

### Hierarchy
- **Display** (Cinzel 900, 44–72 px, tracking 0,08em): solo "RAGNAROK" en el Inicio, con el brillo dorado animado.
- **Título** (Cinzel 700, 22 px): encabezado de sección ("Crónicas", "Guild Clash", "Brigada III").
- **Cifra** (Cinzel 700, 36–44 px): cuenta regresiva, conteos del Clash. Números tabulares.
- **Marca** (Cinzel 700, 15 px, tracking 0,3em, mayúsculas): la palabra RAGNAROK en la cabecera.
- **Cuerpo** (Mulish 400, 16 px, 1,45). Nunca menos de 16 px en párrafos; medida máx. 65ch.
- **Rótulo** (Mulish 800, 12 px, tracking 0,14em, mayúsculas): etiquetas de datos (MIEMBROS, LÍDER) y categoría de noticia.
- **Botón** (Mulish 800, 15–16 px, tracking 0,08em, mayúsculas).

**La Regla del Rótulo Abajo.** Los rótulos en mayúsculas acompañan a una cifra o a un dato (debajo o al lado), no se apilan encima de un título como "antetítulo".

## Layout

- **Mobile-first**, diseñado a 390 px. Margen lateral 16–18 px. Columna única con separación de 20–24 px entre bloques.
- **Barra inferior fija** de 5 ítems (Inicio, Noticias, Guías, Miembros, Eventos), 72 px más el área segura del dispositivo (`env(safe-area-inset-bottom)`). El contenido deja ese espacio libre abajo.
- **Escritorio (≥ 900 px):** la barra pasa a la cabecera, el contenido se centra en un ancho máximo de 1080 px y el Inicio usa dos columnas (estandarte a la izquierda, paneles a la derecha). Las brigadas pasan a una grilla de 2–3 columnas.
- Datos del gremio en franja de 3 columnas entre dos filetes dorados.
- Objetivos táctiles de 44 px mínimo; botones principales de 48–50 px.

## Elevation & Depth

Casi plano. La profundidad la dan los filetes y el degradado de los paneles, no las sombras.

- **Doble filete:** borde dorado de 1 px al 55 % + contorno de 1 px al 20 % separado 4 px (`outline-offset`). Solo para el panel principal de cada pantalla (próximo Clash, tu asistencia).
- La barra dorada del estandarte es lo único con sombra (0 3px 6px, negra al 60 %), porque es un objeto colgado.

**La Regla del Filete.** Un borde completo de 1 px o nada. Sin barras laterales de color, sin sombras de color, sin cristal esmerilado.

## Shapes

- Radio de **2 px** en todo (`filo`): cantos de metal, no píldoras.
- El estandarte termina en cola de golondrina (`clip-path` en V) con un filete interior dorado.
- Íconos de línea propios, trazo 1,8 px, 22 px, `stroke-linejoin: round`.

## Components

### Buttons
- **Oro** (principal): degradado, 50 px de alto, texto oscuro en mayúsculas. Hover: un punto más claro. Pulsado: baja 1 px. Deshabilitado: 45 % de opacidad, sin latido.
- **Filete** (secundario): fondo transparente, borde dorado 1 px, texto marfil, 44–46 px. Hover: fondo oro al 8 %.
- **Grupo de respuesta** (VOY / QUIZÁ / NO): tres botones iguales; el elegido toma el estilo oro y `aria-pressed="true"`.
- Foco visible siempre: contorno oro-claro de 2 px separado 3 px.

### Cards / Containers
- **Panel del salón**: degradado `panel` → `panel-hondo`, doble filete. Uno por pantalla.
- **Panel sencillo**: fondo blanco al 3 %, borde dorado al 25–30 %. Para el Carnival, el último Clash y avisos.
- **Tarjeta de brigada**: tinte carmesí arriba que se funde a negro, cabecera con nombre (Cinzel) y suma de poder; debajo una grilla 2 × 2 de celdas separadas por líneas de 1 px. La brigada del visitante usa borde oro pleno, tinte dorado e insignia "LA TUYA"; su propia celda va en fondo `#2a2010`.

### Inputs / Fields
- Fondo `celda`, borde dorado al 35 %, 48 px de alto, texto marfil 16 px (evita el zoom de iOS). Foco: borde oro pleno. Error: borde y mensaje en `error`, con el problema y cómo arreglarlo.

### Navigation
- Barra inferior: fondo `noche-profunda` al 96 %, filete superior dorado al 45 %. Ítem activo en `oro-claro` y peso 800 con `aria-current="page"`; inactivos en `#a99c84`.
- Cabecera: marca RAGNAROK a la izquierda; ENTRAR (botón filete) o el nick del miembro a la derecha. En subpantallas, flecha de volver de 44 px.

### Estandarte (componente firma)
Barra dorada de 250 px, paño carmesí de 210 × 300 px con cola en V, filete interior, emblema SVG propio de 128 px y "RANGO VIII" en Cinzel.

### Cuenta regresiva
Cifra Cinzel en `marfil-claro` con `font-variant-numeric: tabular-nums`, línea de fecha en la hora local del visitante ("sáb 28 nov · 23:15 en tu hora"). Se actualiza cada segundo solo con la pestaña visible. Si el evento está en curso, cambia a la insignia bosque "EN CURSO · termina en …".

## Movimiento

Tres momentos, uno por elemento, nunca en todas las secciones a la vez:
1. **El estandarte ondea** (rotación ±1,5° y sesgo ±1°, 7 s, ease-in-out, desde la barra).
2. **Brillo en el título** RAGNAROK (barrido dorado, 6 s, lineal).
3. **Latido del botón principal** (halo dorado que se expande y se apaga, 2,4 s), solo mientras la acción esté pendiente.

Entradas de pantalla: aparición de 220 ms con ease-out exponencial (opacidad + 6 px). Con `prefers-reduced-motion: reduce` todo lo anterior se apaga y los cambios son instantáneos.

## Do's and Don'ts

### Do:
- Mostrar todas las horas en la zona del visitante y aclarar "en tu hora".
- Escribir en español de tú, corto y con el humor del gremio cuando calce; los nombres del juego van con el inglés al lado cuando ayuda ("Ballesta pesada · Heavy Bowgun").
- Mantener el aviso "Sitio de fans no oficial…" en el pie de todas las pantallas.
- Marcar con claridad los datos de ejemplo mientras no haya backend.

### Don't:
- No usar logos, capturas de arte oficial ni la tipografía de Capcom.
- No añadir antetítulos sobre los encabezados ni números de sección decorativos.
- No usar sombras de color, cristal, píldoras ni barras laterales de color.
- No mostrar teléfonos. WhatsApp solo como enlace de invitación, y solo con sesión.
- No mezclar con el pergamino de la dirección A: Juan eligió B sin mezcla.
