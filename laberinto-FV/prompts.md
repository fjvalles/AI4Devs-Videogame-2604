# Prompts y Proceso de Desarrollo — La mazmorra de Asteria

Este documento detalla la simulación del proceso de desarrollo asistido por IA para construir **La mazmorra de Asteria**, un videojuego del género roguelite top-down programado en Vanilla JavaScript y HTML5 Canvas sin dependencias.

A continuación se presenta la interacción entre el desarrollador (Usuario) y la IA (Asistente) simulando la evolución del proyecto paso a paso, desde la concepción inicial hasta la versión definitiva con todas las mecánicas integradas.

---

## 💬 Conversación 1: Concepción del Juego, Arquitectura y Planificación

### 🧑 Usuario (Prompt)
> Actúa como un desarrollador de videojuegos senior especialista en JavaScript vanilla y desarrollo web moderno (HTML5 Canvas).
> 
> Quiero diseñar un videojuego llamado **La mazmorra de Asteria**: un roguelite top-down procedural en el que el jugador desciende por pisos plagados de monstruos y trampas. El objetivo es derrotar al monstruo guardián de cada piso para obtener su sello, el cual desbloquea las escaleras para descender al siguiente nivel (hasta un total de 20 pisos con dificultad progresiva).
> 
> Características clave:
> 1. Movimiento fluido en grid lógico pero continuo en píxeles.
> 2. Generación procedural de mazmorras basadas en salas conectadas (MST/Prim) y pasillos transitables con bucles adicionales.
> 3. Terrenos especiales: hielo que desliza (inercia), agua que ralentiza, y lodo intermitente (quicksand).
> 4. Trampas interactivas (gárgolas que lanzan fuego y fuentes de agua reactivas).
> 5. Enemigos diversos con comportamiento de persecución, disparo y un jefe final por piso.
> 6. Combate melee en arco y ranged con munición consumible.
> 7. Compañeros aliados rescatables en pisos superiores que siguen al héroe y le ayudan en combate.
> 8. Progresión con barra de XP, nivel del héroe y HUD premium con un indicador vertical de piso a la derecha del lienzo y minimapa interactivo.
> 9. Guardado de progresos en `localStorage` (desbloqueo de pisos).
> 10. Efectos de audio procedurales sintéticos mediante la API WebAudio.
> 
> Por favor, plantea un plan de arquitectura de archivos y una hoja de ruta estructurada en fases para ir implementándolo paso a paso sin dependencias externas.

### 🤖 Asistente (Respuesta)
¡Excelente concepto! Construir un roguelite completo en JS puro y Canvas requiere una organización modular y limpia desde el inicio para evitar que el código se convierta en un archivo monstruo.

### 📐 Arquitectura de Directorios Propuesta
```
laberinto-FV/
├── index.html           # Estructura e incrustación de scripts (ES Modules)
├── styles.css           # Interfaz premium, HUD flotante y diseño del contenedor
├── prompts.md           # Registro de este proceso de diseño asistido
├── README.md            # Documentación del juego y arquitectura
└── src/
    ├── main.js          # Punto de entrada y orquestador del ciclo de vida
    ├── Game.js          # Núcleo del juego: máquina de estados y variables del jugador
    ├── config.js        # Constantes de balanceo (vida, daño, colores, coeficientes)
    ├── core/            # Módulos de infraestructura
    │   ├── loop.js      # Timestep fijo con acumulador de delta-tiempo
    │   ├── input.js     # Captura de teclado con buffer de estado
    │   ├── rng.js       # Generador de números pseudoaleatorios con semilla (mulberry32)
    │   └── audio.js     # Generador de efectos de sonido con WebAudio API
    ├── world/           # Generación y estructura espacial
    │   ├── tiles.js     # Tipos y propiedades de terrenos (velocidad, deslizamiento)
    │   ├── TileMap.js   # Representación del mapa mediante arrays bidimensionales
    │   └── Maze.js      # Algoritmo procedural de salas, Prim (MST) y conexiones
    ├── entities/        # Modelado de objetos del mundo
    │   ├── Player.js    # Lógica del jugador (experiencia, armas, estadísticas)
    │   ├── Monster.js   # IA y tipos de monstruos (incluyendo el Jefe Guardián)
    │   ├── Weapon.js    # Armas melee y ranged (puños, espada, arco)
    │   ├── Projectile.js# Flechas y proyectiles de fuego/agua de trampas y enemigos
    │   └── Item.js      # Botín: monedas, curaciones y sellos
    └── systems/         # Sistemas de juego puros
        ├── physics.js   # Colisiones círculo-muro y círculo-círculo con eje-separado
        ├── terrain.js   # Interacción del jugador y monstruos con los terrenos
        ├── combat.js    # Detección de golpes cuerpo a cuerpo y disparos
        ├── loot.js      # Tablas de drop ponderadas por tipo de enemigo
        └── camera.js    # Cámara que sigue suavemente al jugador
```

### 🗓️ Plan de Desarrollo por Fases
* **Fase 0 (Andamiaje)**: Creación de la estructura del proyecto, bucle de juego estable, entrada de teclado y máquina de estados del juego (Menú, Jugando, Pausa, Derrota, Victoria).
* **Fase 1 (MVP de Movimiento y Laberinto)**: Generador de mazmorras procedural, render básico en Canvas, cámara móvil, física de colisiones y una salida básica.
* **Fase 2 (Terrenos y Trampas)**: Implementación de terrenos (lodo intermitente, hielo resbaladizo, agua) y trampas dinámicas de proyectiles y gárgolas.
* **Fase 3 (Combate, Enemigos y Loot)**: Creación de armas, ataques en arco melee, proyectiles, tipos de enemigos, experiencia del jugador (XP) y tablas de botín.
* **Fase 4 (Jefe, Sello de Escaleras y Progresión de Pisos)**: Lógica del monstruo guardián, obtención de la llave/sello obligatoria para bajar las escaleras, selector de 20 pisos y localStorage.
* **Fase 5 (Compañeros Seguidores, UI Premium y Audio Procedural)**: Incorporación de compañeros aliados rescatables, tutorial interactivo en el Piso 1, HUD vertical de pisos a la derecha, sonido de sintetizador retro WebAudio, pulido gráfico y minimapa.

---

## 💬 Conversación 2: Fase 0 - Andamiaje e Infraestructura

### 🧑 Usuario (Prompt)
> Comencemos por la **Fase 0**. Necesito crear los archivos principales del andamiaje: `index.html`, `styles.css` con un estilo retro-moderno y oscuro, el bucle principal en `src/core/loop.js` que implemente un timestep de física constante con acumulador de tiempo para evitar problemas de refresco de pantalla, el controlador de entrada `src/core/input.js` y el punto de entrada `src/main.js` y `src/Game.js`. Pon una pantalla de título y permite iniciar una partida vacía en la que se pueda mover un punto o emoji en pantalla para probar la fluidez del bucle y del input.

### 🤖 Asistente (Respuesta)
Hecho. He configurado la estructura inicial:
1. En `index.html` creamos la estructura de la aplicación y preparamos las pantallas de HUD y menús usando capas CSS absolutas sobre el Canvas.
2. En `styles.css` aplicamos una estética premium oscura y fuentes limpias de Google Fonts ("Outfit" e "Inter").
3. En `src/core/loop.js` definimos un bucle de juego basado en `requestAnimationFrame` que procesa los updates de física a un paso constante (por ejemplo, 60 Hz o 16.6ms) y acumula el tiempo sobrante para evitar fallos físicos (tunneling) a altas o bajas tasas de refresco.
4. En `src/core/input.js` procesamos `keydown` y `keyup` guardando un mapa de teclas activas para el movimiento continuo (WASD y flechas).
5. En `src/Game.js` definimos la máquina de estados principal (`MENU`, `PLAYING`, `PAUSED`, `GAMEOVER`, `VICTORY`) y gestionamos el bucle. Ahora puedes mover un círculo representativo por la pantalla inicial.

---

## 💬 Conversación 3: Fase 1 - Generación Procedural de Mazmorras y Colisiones Eje-Separado

### 🧑 Usuario (Prompt)
> Ahora implementemos la **Fase 1**. Necesito el generador procedural en `src/world/Maze.js`. El laberinto debe constar de salas rectangulares aleatorias que no se solapen. Luego debemos conectarlas usando un algoritmo de árbol de expansión mínima (Prim MST) para asegurar la conectividad total. Añade pasillos en L y un porcentaje de pasillos redundantes para crear loops en la mazmorra.
> Además, implementa en `src/systems/physics.js` la detección de colisiones de tipo círculo contra el grid de tiles sólidos del mapa usando la técnica de proyección en el eje separado (separating axis theorem) para permitir que el jugador se deslice de forma fluida a lo largo de las paredes en lugar de quedarse atascado.

### 🤖 Asistente (Respuesta)
Aquí tienes el desarrollo de la generación procedural y las colisiones:
1. **Generación en `Maze.js`**:
   - Generamos una lista de salas en coordenadas del grid de forma pseudoaleatoria usando el RNG con semilla de `rng.js`.
   - Creamos un grafo de conectividad de salas calculando la distancia euclidiana entre sus centros.
   - Ejecutamos el algoritmo de Prim para obtener el MST (Minimum Spanning Tree), asegurando que siempre hay un camino desde cualquier sala a cualquier otra.
   - Añadimos corredores en forma de L para conectar las salas del árbol.
   - Para evitar que la mazmorra sea totalmente lineal o en árbol estricto, añadimos un 15% de conexiones directas adicionales entre salas cercanas, creando interesantes bucles.
2. **Física y Deslizamiento en `physics.js`**:
   - Para verificar las colisiones de entidades circulares, comprobamos los tiles adyacentes a la posición de la entidad.
   - Si un tile es sólido, calculamos la menor distancia de penetración en los ejes X e Y por separado.
   - Resolvemos la colisión empujando a la entidad fuera del muro en el eje correspondiente. Esto produce un deslizamiento automático y sumamente fluido cuando el jugador camina en diagonal contra una pared.
   - Añadimos soporte para una cámara en `src/systems/camera.js` enfocada en el jugador, limitando sus bordes a las dimensiones de la mazmorra.

---

## 💬 Conversación 4: Fase 2 - Terrenos Especiales, Mud Intermitente y Trampas de Fuego/Agua

### 🧑 Usuario (Prompt)
> Vamos con la **Fase 2**. Agreguemos terrenos especiales a nuestro mapa en `src/world/tiles.js`. Cada terreno debe afectar el movimiento de las entidades:
> - **Agua**: Reduce la velocidad del jugador a la mitad.
> - **Hielo**: Elimina la fricción normal del suelo e introduce inercia / deslizamiento.
> - **Lodo (Mud)**: Debe alternar cíclicamente entre lodo seco (suelo normal) y lodo movedizo (ralentiza un 75% y debe mostrar una animación dinámica visual en el canvas que represente arenas movedizas).
> - Añade además **trampas** en salas específicas: gárgolas estáticas en los muros que disparan proyectiles de fuego periódicamente, y fuentes de agua que lanzan chorros en cruz de forma intermitente.

### 🤖 Asistente (Respuesta)
Implementado. Esto añade profundidad táctica al movimiento:
1. En `src/systems/terrain.js` procesamos el tipo de baldosa debajo del jugador y enemigos:
   - Si es **agua**, aplicamos un multiplicador de velocidad de 0.5.
   - Si es **hielo**, reducimos el coeficiente de fricción drásticamente, permitiendo que la velocidad acumulada continúe empujando al jugador y a los enemigos en la dirección de su inercia.
   - Si es **lodo**, añadimos un temporizador global en `Game.js`. El lodo cambia de estado cada pocos segundos. Visualmente, cuando está activo, dibujamos un patrón oscilante en el canvas simulando arenas movedizas ondulantes en tonos marrones y ocres.
2. En `src/world/Maze.js` colocamos salas temáticas de trampas.
   - Las **gárgolas** se colocan en los muros exteriores de ciertas salas y generan proyectiles de fuego que avanzan en línea recta hasta impactar contra un muro o el jugador.
   - Las **fuentes** se colocan en el centro de las salas de trampa y disparan chorros de agua periódicamente en las 4 direcciones cardinales.

---

## 💬 Conversación 5: Fase 3 - Sistema de Combate, Armas, Experiencia y HUD

### 🧑 Usuario (Prompt)
> Avancemos a la **Fase 3: Combate y Recompensas**.
> El jugador debe poder atacar y defenderse:
> 1. Añade 3 armas: Puños (inicial, corto alcance, sin costo), Espada (mayor alcance y daño, se encuentra en el mapa o como botín) y Arco (lanza proyectiles de flechas consumiendo munición de flechas). El jugador puede cambiar de arma usando los números 1, 2 y 3.
> 2. El ataque melee (puños y espada) debe dibujarse como un arco de corte semitransparente frente al jugador en la dirección de su último movimiento.
> 3. Implementa enemigos en `src/entities/Monster.js` de tres tipos: Slimes (lentos, daño físico), Murciélagos (rápidos, evaden obstáculos sencillos) y Guardias (lanzan ataques directos).
> 4. Cuando los enemigos mueren, otorgan experiencia (XP) al jugador. Diseña el sistema de subida de nivel (Level Up) incrementando la salud máxima, fuerza de ataque y resistencia del héroe.
> 5. Implementa el botín: monedas, curaciones y munición en `src/systems/loot.js` usando drop tables según el tipo de enemigo y cofres. Para evitar confusiones con la renderización de emojis grises de monedas en algunos sistemas operativos, dibuja las monedas en el canvas como círculos/discos dorados brillantes con bordes detallados.

### 🤖 Asistente (Respuesta)
Hecho. El sistema de combate y progresión ya está operativo:
1. **Armas (`src/entities/Weapon.js`)**:
   - Definimos las propiedades de cada arma (daño, cooldown, alcance, velocidad de proyectil).
   - Implementamos el ataque melee dibujando un arco de círculo mediante `ctx.arc` que representa la trayectoria del tajo de la espada o el puñetazo, y aplicamos colisión de arco contra los enemigos cercanos.
   - Para el arco, instanciamos un proyectil (`src/entities/Projectile.js`) que viaja con un vector de velocidad en la dirección apuntada.
2. **Progresión de Experiencia**:
   - El jugador gana XP al derrotar monstruos. El límite para subir de nivel crece con la fórmula `xpNext = level * 20 + 50` (o similar en `config.js`).
   - Al subir de nivel, mostramos un efecto visual efímero de "Level Up!" sobre el personaje e incrementamos sus estadísticas.
3. **Monedas y Loot**:
   - En `systems/loot.js` se definen las probabilidades de caída de ítems.
   - Las monedas se dibujan mediante Canvas2D utilizando un gradiente radial dorado para darles un aspecto premium y tridimensional, evitando emojis problemáticos.

---

## 💬 Conversación 6: Fase 4 - Monstruo Guardián, Sello de Escaleras y Progresión de Pisos

### 🧑 Usuario (Prompt)
> Ahora implementemos la **Fase 4: El Jefe y el Acceso al Siguiente Piso**.
> En cada piso debe generarse un **Monstruo Guardián (Jefe)** que es más grande, tiene más vida, una barra de vida visible en el HUD y mecánicas de ataque especiales (como lanzar ráfagas de proyectiles de fuego).
> El objetivo del jugador para superar el piso y bajar por las escaleras es derrotar a este jefe para obtener su **Sello de Guardián**.
> Las escaleras que conducen al siguiente piso deben estar físicamente selladas en el mapa; si el jugador intenta pisarlas sin tener el sello en su inventario, debe mostrarse un mensaje de advertencia indicando que necesita el sello del jefe. Al poseer el sello, las escaleras se activan y permiten descender.
> Gestiona el multinivel de forma que el jugador pueda progresar hasta el piso 20. El progreso de pisos desbloqueados debe guardarse en `localStorage` para que pueda empezar desde cualquier nivel desbloqueado mediante un selector de niveles en la pantalla del menú.

### 🤖 Asistente (Respuesta)
He programado las restricciones de progresión y la lógica del Guardián:
1. **El Guardián**:
   - En cada generación de mapa en `Maze.js`, colocamos al jefe en una sala lejana al jugador (usualmente la sala más distante calculada por el generador).
   - El jefe posee una barra de salud grande en la parte superior de la pantalla cuando el jugador entra en su rango de combate. Su patrón de ataque alterna disparos en abanico y embestidas.
2. **Mecánica del Sello**:
   - Al morir, el jefe realiza un drop garantizado del objeto especial "Sello de la Mazmorra".
   - En `Game.js`, cuando el jugador colisiona con el tile de escaleras (piso inferior), verificamos si posee el sello en su inventario.
   - Si no lo tiene, bloqueamos el descenso e imprimimos en pantalla una alerta: *"Las escaleras están selladas por el poder del Guardián. Consigue el Sello."*
   - Al tener el sello, se limpia el bloqueo, se reproduce un sonido especial de portal y se genera el siguiente piso con mayor dificultad (monstruos más rápidos, más trampas, mayor nivel de enemigos).
3. **Guardado en `localStorage`**:
   - Al completar exitosamente un piso, actualizamos el nivel máximo alcanzado en `localStorage.setItem('maxReachedFloor', currentFloor)`.
   - Modificamos el menú principal para leer este dato y renderizar un selector visual premium donde el jugador elige su piso inicial de juego.

---

## 💬 Conversación 7: Fase 5 - Compañeros Aliados, Visualizador de Pisos, Tutorial e Integración Final

### 🧑 Usuario (Prompt)
> Excelente. Completemos con la **Fase 5: Compañeros Aliados, visualizador vertical de piso, tutorial y pulido**.
> Necesito añadir las siguientes características finales para que el juego se sienta premium y completo:
> 1. **Compañeros Rescatables**: En pisos avanzados (a partir del piso 3), añade celdas con aventureros cautivos. Al eliminar a los enemigos que custodian la sala y abrir la celda, el aventurero se une como compañero. Debe seguir al jugador de manera inteligente utilizando un algoritmo de seguimiento que evite atascarse en paredes o chocar directamente con el jugador (manteniendo una distancia segura) y atacando automáticamente a los enemigos cercanos.
> 2. **Visualizador de Pisos HUD**: En el lateral derecho de la pantalla, dibuja un indicador vertical de pisos (del 1 al 20) que muestre visualmente dónde está el jugador en la estructura de la mazmorra con un marcador brillante y dinámico.
> 3. **Tutorial en Piso 1**: Haz que el primer piso actúe como tutorial dinámico. El ritmo de los enemigos debe ser lento, con menos trampas, y deben aparecer textos guía en la pantalla que le expliquen al jugador cómo moverse, cómo atacar, la necesidad de derrotar al jefe para conseguir el sello y cómo descender por las escaleras.
> 4. **Audio WebAudio**: Genera efectos de sonido sintetizados por código para el tajo de espada, disparos de flecha, daño recibido, apertura de cofres, subidas de nivel y una melodía de fondo procedural que cambie de ritmo o tono según el piso de la mazmorra.
> 5. **Verificación de Accesibilidad**: Asegúrate de que el algoritmo de reordenación de paredes del laberinto nunca bloquee por completo el acceso a salas clave (salas de cofres, escaleras o la sala del jefe), manteniendo siempre la conectividad.

### 🤖 Asistente (Respuesta)
¡Perfecto! Hemos integrado estas mecánicas premium para finalizar el videojuego:
1. **Compañeros Aliados (`src/entities/Companion.js`)**:
   - Añadimos la entidad seguidora. Su lógica de movimiento calcula la distancia hacia el jugador. Si está lejos, calcula un vector de dirección hacia él aplicando la física de colisiones del mapa para deslizarse por los muros.
   - Si la distancia es menor a un rango mínimo (ej. 45 píxeles), el compañero se detiene para no estorbar al jugador.
   - Periódicamente busca enemigos cercanos dentro de su radio de visión y lanza un proyectil o ataque melee automático hacia ellos.
2. **Visualizador de Pisos HUD**:
   - Creamos un panel lateral derecho en la UI (`styles.css` y `src/ui/screens.js`).
   - Muestra una barra vertical estilizada con los números del 1 al 20. El piso actual se resalta con una animación de pulso de luz y un fondo degradado premium.
3. **Tutorial Interactivo**:
   - En `src/Game.js` detectamos si `currentFloor === 1`.
   - De ser así, limitamos los spawns a slimes lentos y mostramos banners temporales: *"Usa WASD para moverte"*, *"Presiona Espacio para atacar"*, *"Consigue el sello del jefe para abrir las escaleras"*.
4. **Música y Efectos de Audio Procedural (`src/core/audio.js`)**:
   - Implementamos osciladores WebAudio (`OscillatorNode`) y nodos de ganancia (`GainNode`) para sintetizar sonidos FM en tiempo real sin usar archivos `.mp3`.
   - Creamos un secuenciador de notas básico que reproduce arpegios de sintetizador retro como música de fondo ambiental, variando el tono (más grave y tenso) a medida que el jugador desciende a pisos más profundos.
 5. **Accesibilidad de Salas**:
    - En el sistema de actualización dinámica del laberinto, cualquier cambio o mutación de paredes se valida verificando la conectividad del grafo mediante una búsqueda en anchura (BFS) desde la posición del jugador hacia la sala del jefe, cofres y escaleras. Si una mutación aísla alguna de estas ubicaciones, la mutación se descarta de inmediato.

---

## 💬 Conversación 8: Actualización del Tutorial y Atajos de Teclado

### 🧑 Usuario (Prompt)
> actualiza el tutorial

### 🤖 Asistente (Respuesta)
¡Hecho! He actualizado el sistema de tutorial interactivo del primer piso en `src/Game.js` para incluir indicaciones y recordatorios clave sobre las nuevas mecánicas añadidas:
1. **Selección de armas**: Indicación de pulsar `[1]` para equipar la Espada y `[2]` para equipar el Arco.
2. **Atajos de la Tienda**: Indicación de pulsar `[V]` para curarse con pociones de salud (cuesta 10🪙) o `[F]` para comprar flechas (cuesta 5🪙).
3. **Flujo y claridad**: Amplié los tiempos de visualización y reorganicé la secuencia de mensajes iniciales para que el jugador se familiarice paso a paso con los controles del juego y el objetivo de recolectar el Sello 🌀 del Guardián antes de bajar por las escaleras 🪜.

---

## 💬 Conversación 9: Temporizador de Nivel y Modo Infierno (Hell Mode)

### 🧑 Usuario (Prompt)
> Agrega un temporizador por nivel en el juego que active un "Modo Infierno" cuando el tiempo se agote.
> Al activarse el Modo Infierno:
> 1. Se debe mostrar un anuncio prominente en pantalla ("¡MODO INFIERNO ACTIVADO!").
> 2. Los monstruos eliminados deben comenzar a revivir periódicamente cada pocos segundos en sus puntos de aparición iniciales con su vida completa.
> 3. Todos los monstruos deben entrar en estado de persecución directa ("chase") hacia el jugador ignorando su rango normal de detección y moviéndose un 40% más rápido.
> 4. La música debe cambiar a un ritmo/tono tenso de modo infierno.
> 5. El HUD debe actualizar el indicador de tiempo para reflejar el estado de "INFIERNO" con un estilo visual de peligro (letras rojas y un emoji de demonio 👹).

### 🤖 Asistente (Respuesta)
He implementado el temporizador de nivel y el Modo Infierno para añadir tensión y un desafío adicional de tiempo:
1. **Lógica de Temporizador e Infierno (`src/Game.js`)**:
   - Agregamos las propiedades `levelTimeLeft`, `isHellMode` y `nextReviveAt` al juego.
   - Si `levelTimeLeft` llega a `0`, activamos `isHellMode = true`, mostramos una advertencia en el banner e invocamos `setMusicLevel(level, true)` para cambiar la música a la versión tensa.
   - Periódicamente, si estamos en modo infierno, elegimos un monstruo del pool de caídos (`!m.alive`) de manera aleatoria y lo revivimos en su posición original de spawn (`m.spawnX`, `m.spawnY`) con su salud recuperada al máximo.
2. **IA de los Enemigos y Velocidad en Modo Infierno (`src/entities/Monster.js`)**:
   - En `updateMonster`, si `isHellMode` es activo, forzamos el estado a `"chase"` incondicionalmente, haciendo que busquen al jugador por todo el nivel.
   - Aplicamos un aumento del 40% a su velocidad modificando el cálculo final a `m.speed * 1.4`.
3. **Audio de Tensión Procedural (`src/core/audio.js`)**:
   - Ajustamos `setMusicLevel` para que cuando `isHellMode` sea verdadero, la secuencia FM cambie de tempo y tono, produciendo una melodía mucho más rápida y agobiante.
4. **Visualización en HUD y Canvas (`src/ui/screens.js` y `src/ui/render.js`)**:
   - En `screens.js`, agregamos la sincronización del temporizador mostrando un formato `MM:SS`. Cuando el tiempo baja de 10 segundos, mostramos una advertencia `⚠️`, y al entrar en modo infierno, el HUD cambia al emoji de demonio `👹` y muestra el texto `"INFIERNO"` con la clase de estilo `.hell-mode` (color rojo pulsante).
   - En `render.js`, cuando el modo infierno está activo, añadimos un sutil efecto de pulsación de tinte rojo translúcido alrededor de la pantalla para sumergir visualmente al jugador en la atmósfera del infierno.
