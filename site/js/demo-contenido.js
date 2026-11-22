/**
 * Noticias y guías de ejemplo para el modo demostración (forma de la API, SPEC.md §6).
 * Las guías solo usan datos confirmados del juego (capturas de Juan) y las reglas de esta web:
 * los oficiales pueden copiarlas como punto de partida.
 */
const hace = (dias, horas = 0) => new Date(Date.now() - dias * 864e5 - horas * 36e5).toISOString();

export const NOTICIAS = [
  {
    id: 'n1', tipo: 'gremio', fijada: true, fecha_pub: hace(0, 3), autor: 'Midori', portada_id: '',
    titulo: 'Las brigadas del Clash ahora se arman en la web',
    resumen: 'Confirma tu asistencia antes del sábado y los oficiales reparten 2 fuertes + 2 normales por brigada.',
    cuerpo_md: `Desde esta semana las **brigadas del Guild Clash** se arman aquí, en la web del gremio.

## Qué tienes que hacer

1. Entra con tu nick y tu PIN.
2. Carga tu **adventurer principal** con su poder (Mi perfil → Agregar adventurer).
3. En [Eventos](#/eventos), marca **Voy**, **Quizá** o **No** antes del sábado.

## Cómo se reparten

Cada brigada es de 4 cazadores. La web suma el poder de cada uno y reparte para que todas queden parejas: **2 fuertes + 2 de poder normal**. Así ganamos más rondas que juntando a los más fuertes en una sola brigada.

> Si no confirmas, no entras en el reparto. Si al final no puedes, cambia tu respuesta a **No** para que el oficial ajuste.`,
  },
  {
    id: 'n2', tipo: 'evento', fijada: false, fecha_pub: hace(1), autor: 'Tormenta', portada_id: '',
    titulo: 'Puesto 29 en el último Clash: vamos por el top 20',
    resumen: 'Cuatro rondas por brigada; cada victoria suma. Esta semana probamos brigadas balanceadas.',
    cuerpo_md: `Cerramos el último Guild Clash en el **puesto 29**. Nada mal para un gremio que recién empieza, pero podemos más.

Cada brigada juega **4 rondas** (4 monstruos) contra brigadas de otros clanes y gana quien caza antes. Cada victoria suma puntos para todo el gremio, así que **una brigada floja nos cuesta tanto como una fuerte nos da**.

Por eso esta semana repartimos parejo. Nos vemos el sábado.`,
  },
  {
    id: 'n3', tipo: 'gremio', fijada: false, fecha_pub: hace(2), autor: 'Midori', portada_id: '',
    titulo: 'Ya puedes ver los perfiles de todo el clan',
    resumen: 'Nueva sección Miembros: busca por nick, arma o elemento y mira los adventurers de cada uno.',
    cuerpo_md: `Abrimos la sección [Miembros](#/miembros). Ahí puedes:

- Buscar por nick, adventurer o arma (en español o inglés).
- Filtrar por arma, elemento y tipo.
- Ver el poder de cada uno y su puesto en el gremio.

Si cargas tu **ID de jugador** en tu perfil, los demás pueden copiarlo y agregarte como amigo.`,
  },
  {
    id: 'n4', tipo: 'juego', fijada: false, fecha_pub: hace(4), autor: 'Tormenta', portada_id: '',
    titulo: 'Cómo armar tus Rostros con costo 12',
    resumen: '1 carta núcleo + 4 de monstruo, sin pasarte del costo. Revisa la guía completa.',
    cuerpo_md: `Los **Rostros** (*Visage* en inglés) se arman con **1 carta núcleo + 4 cartas de monstruo**, con un **costo total máximo de 12**.

Lo explicamos paso a paso en la guía [Rostros: núcleo, cartas y costo](#/guias/rostros).`,
  },
  {
    id: 'n5', tipo: 'evento', fijada: false, fecha_pub: hace(6), autor: 'Midori', portada_id: '',
    titulo: 'Guild Carnival: dos sesiones cada día',
    resumen: 'A las 12:00 y 18:00 del juego (UTC−6), 2 h 10 min cada una. En Eventos la ves en tu hora.',
    cuerpo_md: `El **Guild Carnival** abre todos los días a las **12:00 y a las 18:00** hora del juego (UTC−6) y dura **2 h 10 min**.

No hace falta sacar la cuenta: en [Eventos](#/eventos) la web te lo muestra en la hora de tu país, con cuenta regresiva.`,
  },
  {
    id: 'n6', tipo: 'juego', fijada: false, fecha_pub: hace(24), autor: 'Midori', portada_id: '',
    titulo: 'Monster Hunter Outlanders ya está disponible en todo el mundo',
    resumen: 'Lanzamiento global el 29 de octubre de 2026 en Android e iOS.',
    cuerpo_md: `*Monster Hunter Outlanders* salió en todo el mundo el **29 de octubre de 2026** para Android e iOS.

Ragnarok nació un día antes: **"El inicio 28-10-26"**. Bienvenidos, cazadores.`,
  },
  {
    id: 'n7', tipo: 'gremio', fijada: false, fecha_pub: hace(25), autor: 'Midori', portada_id: '',
    titulo: 'Bienvenidos a la web de Ragnarok',
    resumen: 'Eventos en tu hora, brigadas del Clash, guías para nuevos y los perfiles del clan, todo en un lugar.',
    cuerpo_md: `Esta es la web del gremio **Ragnarok**. Es un sitio de fans, hecho por el clan para el clan.

- **Eventos:** el Clash y el Carnival en tu hora.
- **Guías:** lo básico para empezar.
- **Miembros:** los adventurers de cada uno.

Regístrate con el código del clan (está en el grupo de WhatsApp).`,
  },
];

const G = (o) => ({ portada_id: '', autor: 'Midori', actualizado: hace(o.dias ?? 3), ...o });

export const GUIAS = [
  G({
    id: 'g1', slug: 'usar-la-web', categoria: 'primeros-pasos', nivel: 'basico', orden: 1,
    titulo: 'Cómo usar la web del gremio',
    resumen: 'Regístrate, carga tu adventurer principal y confirma el Clash en tres pasos.',
    cuerpo_md: `## 1. Regístrate

Toca **Entrar → Registrarme**. Necesitas el **código del clan** (pídelo en el grupo de WhatsApp), un nick y un **PIN de 6 dígitos**.

> Tu PIN es solo tuyo: nadie del gremio te lo va a pedir. Si lo olvidas, un oficial te da uno temporal.

## 2. Carga tu adventurer principal

En **Mi perfil → Agregar adventurer** anota el nombre, el arma, el elemento, el tipo y el **poder total** (*Adventurer Power*). Márcalo como **principal**: su poder es el que usamos para armar las brigadas.

## 3. Confirma el Guild Clash

En [Eventos](#/eventos) responde **Voy**, **Quizá** o **No** antes del sábado. Cuando el oficial publique las brigadas, verás la tuya primero.

## Extra

- Agrega tu **ID de jugador** para que te sumen como amigo.
- Puedes cambiar tu nick hasta 2 veces por semana.`,
  }),
  G({
    id: 'g2', slug: 'adventurer-principal', categoria: 'primeros-pasos', nivel: 'basico', orden: 2,
    titulo: 'Tu adventurer principal y el poder',
    resumen: 'Qué es el Adventurer Power, de dónde sale y por qué importa para el Clash.',
    cuerpo_md: `## Qué es el poder

El **poder** (*Adventurer Power*) es la cifra total de tu adventurer. Sale de sumar sus partes:

| Parte | En inglés | Ejemplo |
|---|---|---|
| Equipamiento | Equipment | 6.736 |
| Rostros | Visage | 2.099 |
| Camarada | Buddy | 1.998 |
| Otros | — | el resto |

En la web solo es obligatorio el **total**. Si cargas las partes, tu perfil muestra una barra con el reparto.

## Por qué “principal”

Puedes cargar varios adventurers, pero solo uno es el **principal**. Su poder es el que cuenta para armar las brigadas del Guild Clash, así que mantenlo al día después de mejorar tu equipo.`,
  }),
  G({
    id: 'g3', slug: 'guild-clash', categoria: 'eventos', nivel: 'basico', orden: 1,
    titulo: 'Guild Clash: reglas y brigadas',
    resumen: 'Sábados, 4 rondas por brigada y cada victoria suma. Así repartimos para ganar más.',
    cuerpo_md: `## Cuándo

Los **sábados a las 20:15** hora del juego (UTC−6). Dura cerca de **1 hora**. En [Eventos](#/eventos) lo ves en tu hora.

## Cómo se juega

- Cada **brigada** es de **4 jugadores** del clan, con un adventurer cada uno.
- Cada brigada juega **4 rondas** (4 monstruos) contra brigadas de otros clanes.
- Gana la ronda quien **caza antes**. Cada victoria suma puntos para el gremio.

## Cómo armamos las brigadas

Repartimos **2 fuertes + 2 de poder normal** por brigada, para que todas tengan opciones de ganar. Juntar a los más fuertes en una sola brigada gana sus rondas, pero deja a las demás sin chance.

1. Confirma tu asistencia antes del sábado.
2. El oficial arma y ajusta las brigadas.
3. Revisa la tuya en Eventos y coordina con tus compañeros.

> Si sobran jugadores, alguna brigada puede quedar de 3.`,
  }),
  G({
    id: 'g4', slug: 'guild-carnival', categoria: 'eventos', nivel: 'basico', orden: 2,
    titulo: 'Guild Carnival',
    resumen: 'Dos sesiones diarias de 2 h 10 min. Cuándo son en tu país.',
    cuerpo_md: `El **Guild Carnival** abre **todos los días**, dos veces:

- **12:00** hora del juego (UTC−6)
- **18:00** hora del juego (UTC−6)

Cada sesión dura **2 h 10 min**. La web convierte estos horarios a la hora de tu teléfono en [Eventos](#/eventos).`,
  }),
  G({
    id: 'g5', slug: 'rostros', categoria: 'rostros', nivel: 'intermedio', orden: 1,
    titulo: 'Rostros: núcleo, cartas y costo',
    resumen: '1 carta núcleo + 4 de monstruo con costo máximo 12, y los sets de cartas.',
    cuerpo_md: `Los **Rostros** se llaman *Visage* en el juego en inglés.

## La regla básica

- **1 carta núcleo** + **4 cartas de monstruo**.
- **Costo total máximo: 12.** Si te pasas, no puedes equiparlas.

## Sets

Algunas cartas forman **sets**: con varias del mismo set activas un bono (por ejemplo *Ink of Flames 4/4*). Antes de subir una carta suelta, revisa si te conviene completar un set.

## Para el perfil

En tu adventurer puedes anotar el poder que te dan los Rostros (*Visage*) en el desglose.`,
  }),
  G({
    id: 'g6', slug: 'armas', categoria: 'armas', nivel: 'basico', orden: 1,
    titulo: 'Las 8 armas (español · inglés)',
    resumen: 'Cómo se llama cada arma en los dos idiomas, para entenderse en el grupo.',
    cuerpo_md: `En el clan unos juegan en español y otros en inglés. Esta tabla ayuda a entenderse:

| Español | Inglés |
|---|---|
| Gran espada | Great Sword |
| Espada larga | Long Sword |
| Espadas dobles | Dual Blades |
| Martillo | Hammer |
| Hacha cargada | Charge Blade |
| Lanza | Lance |
| Ballesta pesada | Heavy Bowgun |
| Arco | Bow |

Cada arma tiene un árbol de **Weapon Insight** con sus puntos. ¿Dominas alguna? Escribe una guía y pásala a un oficial.`,
  }),
  G({
    id: 'g7', slug: 'camaradas', categoria: 'camaradas', nivel: 'basico', orden: 1,
    titulo: 'Camaradas: lo básico',
    resumen: 'Rareza, nivel, Adventurer Boost y Core Passive de tu camarada.',
    cuerpo_md: `Tu **camarada** (*Buddy*) te acompaña y suma poder a tu adventurer.

- Tiene **rareza** (por ejemplo SSR), **nivel** (máximo 80) y estrellas.
- **Adventurer Boost:** lo que le suma a tu adventurer.
- **Core Passive:** su habilidad pasiva principal.

El poder que aporta aparece como *Buddy* en el desglose de tu adventurer.`,
  }),
];

export const CATEGORIAS_ORDEN = ['primeros-pasos', 'armas', 'rostros', 'camaradas', 'eventos', 'otros'];
