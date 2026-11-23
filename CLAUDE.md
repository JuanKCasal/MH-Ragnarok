# CLAUDE.md — MH-Ragnarok

Web del gremio **Ragnarok** de *Monster Hunter Outlanders* (juego móvil de TiMi Studio + Capcom, lanzamiento global 29-10-2026).
Dueño del proyecto: Juan (GitHub: JuanKCasal). Repo: https://github.com/JuanKCasal/MH-Ragnarok

> Estado actual de la sesión, decisiones recientes y pendientes: ver `HANDOFF.md`. Léelo al empezar cada sesión.

## Forma de trabajar con Juan

- Responder siempre en **español**, aunque el código, los comentarios técnicos o las fuentes estén en inglés.
- Antes de un bloque grande de trabajo nuevo, confirmar con Juan.
- Cuando la sesión se alargue (muchos pasos, varios archivos grandes leídos o la conversación ya se resumió una vez): al terminar el paso en curso, actualizar `HANDOFF.md` con el punto de partida exacto, recomendar abrir una sesión nueva y preguntar si prefiere seguir.
- Pedir permiso antes de: `git push`, instalar dependencias o skills, crear o borrar archivos fuera del repo, y cualquier cosa que toque su Google Drive.
- Nunca escribir en el repo secretos, tokens, la URL de despliegue privada de Apps Script con claves, el código del clan ni teléfonos de miembros.

## Producto

Uso principal en **celular**: todo se diseña mobile-first y debe ser responsivo. Hermosa, moderna, con animaciones, estética Monster Hunter.

Secciones:
1. **Landing** con información del gremio.
2. **Guías** para nuevos.
3. **Noticias** (actualizaciones del juego, avisos del gremio).
4. **Perfiles** de miembros: adventurers y builds.
5. **Eventos**: Guild Clash (sábados) y Guild Carnival (diario), con pre-armado de **brigadas** de Clash balanceadas por poder.

Idioma de la web: **solo español**. Los datos del juego (armas, piezas, habilidades, Visage…) guardan nombre **ES + EN**: Juan juega en inglés, la mayoría del clan en español.

Visibilidad: todo público por ahora. Editar requiere login. No mostrar teléfonos; WhatsApp solo por enlace de invitación.

Horarios: el juego los da en UTC-6. La web los muestra en la hora local de cada visitante, con cuenta regresiva.

## Arquitectura

- **Frontend:** estático, publicado en **GitHub Pages** (`juankcasal.github.io/MH-Ragnarok`).
- **Backend:** **Google Apps Script** publicado como Web App, actuando como API JSON.
  - Peticiones POST con `Content-Type: text/plain` para evitar el preflight de CORS.
- **Datos:** Google Sheets (una hoja por entidad).
- **Imágenes:** carpeta de Google Drive (se recomienda una cuenta de Google dedicada al clan). Comprimir en el navegador antes de subir (~1600 px, WebP). Mostrar con la URL de miniatura de Drive.
- **Auth:** código del clan (solo para registrarse; cambiable) + PIN personal de 6 dígitos guardado como hash con sal. Token de sesión con vencimiento guardado en el dispositivo. Bloqueo temporal tras 5 intentos fallidos.
- **Roles:**
  - `admin` (Juan): todo, nombra oficiales.
  - `oficial`: publica noticias y guías, organiza el Guild Clash, resetea el PIN de miembros (el de oficiales solo el admin).
  - `miembro`: edita su propio perfil y builds, confirma asistencia.

La estructura de carpetas, el modelo de datos y los endpoints se definen en `SPEC.md`.

## Diseño

- Estética inspirada en la propia UI del juego: pergamino, madera tallada, dorado, estandartes de gremio. Referencia extra: el dragón dorado de la foto del grupo de WhatsApp.
- **Fan site no oficial:** no usar logos, arte ni fuentes oficiales de Capcom. Incluir aviso de "sitio de fans no oficial".
- Animaciones con `prefers-reduced-motion` respetado.
- Antes de programar el frontend, mostrar a Juan **2–3 direcciones visuales** (en Claude Design, o como mockups HTML si no está disponible) para que elija.
- Skills de diseño a usar: **Impeccable** (`pbakaus/impeccable`) como base y **Taste Skill** (`Leonxlnx/taste-skill`, `design-taste-frontend`) para controlar la intensidad de movimiento. **UI UX Pro Max** solo como referencia de paletas (tuvo vulnerabilidades hasta la v2.5.0; si se instala, usar la última versión).

## Glosario del juego (EN → ES)

| Inglés | Español | Nota |
|---|---|---|
| Adventurer | Aventurero (GameWith es-MX, confirmar) | Personajes prediseñados, cada uno con arma y elemento |
| Visage | Rostros | Cartas de monstruo: 1 núcleo + 4, costo máx. 12 |
| Squad | Brigada | Siempre 4 personajes por batalla: en solitario, tú + 3 adventurers tuyos (NPC); en el Guild Clash, 4 jugadores del clan con 1 adventurer cada uno |
| Buddy | Camarada (GameWith es-MX, confirmar) | Palico, Trillan, Rutaco… con rareza (SSR…) |
| Loadout | (por confirmar) | Configuración guardada con nombre |
| Insight | Reflexión (GameWith es-MX, confirmar) | Pasivas por adventurer que cuestan 5/10/30 puntos de Reflexión |
| Keepsake | Recuerdo (GameWith es-MX, confirmar) | Nivel 1–80; desde Nv 30 abre Grabados (Engravings) |
| Adventurer Power | ¿Poder de caza? (GameWith es-MX, confirmar) | Poder total; métrica para balancear el Clash |

| Assault / Disruptor / Support | Asalto / Alterador / Apoyo (GameWith es-MX, confirmar) | Tipos de adventurer |

En la web, los grupos de 4 jugadores para el Guild Clash se llaman **"brigadas"** (Brigada I, II…), igual que en el juego (decisión de Juan, 2026-11-22).

**Guild Clash:** cada brigada se enfrenta a brigadas de otros clanes en 4 rondas (4 monstruos); gana la ronda quien caza antes; cada victoria suma puntos al clan. Dura ~1 hora. Por eso conviene repartir: 2 fuertes + 2 de poder normal por brigada, en vez de juntar a los más fuertes.

Completar el resto del glosario con capturas del juego en español.
