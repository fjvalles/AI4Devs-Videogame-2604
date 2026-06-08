# 🏰 La mazmorra de Asteria

Roguelite top-down en **HTML5 Canvas + JavaScript vanilla** (sin frameworks ni
dependencias). Desciende por una mazmorra inspirada en historias de anime de
dungeons: pelea con monstruos, abre cofres, derrota al guardián para conseguir
su sello y baja por escaleras al siguiente piso. Tiene 20 pisos desbloqueables.

## ▶️ Cómo jugar

| Acción | Tecla |
|--------|-------|
| Moverse | **WASD** o **flechas** |
| Atacar | **Espacio** (mantener) |
| Elegir arma | **1** puños · **2** espada · **3** arco |
| Pausa | **ESC** |

- El **piso 1 funciona como tutorial**: enemigos lentos, menos trampas y mensajes
  contextuales en el HUD para aprender movimiento, ataque, loot, sello y escaleras.
- El golpe se lanza en la **dirección del último movimiento**.
- Empiezas con **Puños** y **Arco**; la espada se consigue como drop.
- Las **escaleras 🪜 están selladas** hasta que consigas el sello del guardián.
- Cuidado con el terreno: **hielo** te ayuda a escapar, **agua** frena, el
  **lodo** aparece/desaparece, las gárgolas disparan fuego y las fuentes lanzan
  chorros de agua.
- El loot incluye monedas, curación 💗, munición 🏹 (para el arco), armas y
  **power-ups** temporales (👟 velocidad, 💪 daño x2, 🛡️ escudo).
- Las monedas se dibujan como discos dorados para evitar la confusión del emoji
  de moneda gris en algunos navegadores.
- Matar monstruos otorga experiencia. Al subir de nivel aumentan vida máxima,
  ataque y resistencia.
- Las salas tienen encuentros: peleas, tesoros custodiados, trampas con fuentes
  o gárgolas, duelos a distancia, emboscadas y escapes sobre hielo.
- Desde pisos avanzados puedes salvar aventureros cautivos. Cuando limpias su
  sala y te acercas, se unen al equipo y atacan automáticamente.

## 🚀 Ejecutar

El juego usa **ES Modules nativos**, así que necesita servirse por HTTP (no
funciona abriendo el `index.html` con `file://` por la política CORS):

```bash
# Opción 1: Python
python3 -m http.server 5500

# Opción 2: Node
npx serve .
```

Luego abre `http://localhost:5500`. (Añade `?debug` a la URL para exponer
`window.__game` en la consola.)

## 🧱 Arquitectura

```
src/
├── main.js              # bootstrap
├── Game.js              # orquestador + máquina de estados (dueño del estado)
├── config.js            # constantes (tunear balance aquí)
├── core/                # infra: loop (timestep fijo), input, rng (semilla), audio
├── world/               # tiles, TileMap (grid Uint8), Maze (rooms + MST)
├── entities/            # Player(*) / Monster / Item / Weapon / Projectile + tipos
├── systems/             # physics, terrain, combat, loot, effects, camera
└── ui/                  # render (canvas), screens (DOM/HUD)
```
(*) el jugador vive como objeto dentro de `Game.js`.

### Detalles de implementación

- **Game loop**: `requestAnimationFrame` con **timestep fijo + acumulador** →
  física determinista, independiente del FPS.
- **Generación procedural**: salas aleatorias (rechazo por solape) conectadas por
  un **árbol de expansión mínima (Prim)** con corredores en L + aristas extra para
  loops. Garantiza que inicio ↔ escaleras ↔ guardián siempre son alcanzables.
- **Colisiones**: círculo (entidad) vs grid de tiles, resueltas **eje-separado**
  con sub-pasos anti-tunneling; deslizan a lo largo de las paredes.
- **Terrenos**: cada tile aporta `speedMul` / `slippery` / `damage`; el hielo
  desactiva la fricción para conservar el momentum, y el generador coloca hielo
  cerca de zonas clave de escape. El lodo alterna entre activo/inactivo durante
  la partida.
- **Laberinto mutable**: cada cierto tiempo se abren paredes y se cierran algunos
  pasos lejos del jugador, cofres, escaleras y guardián.
- **Combate**: melee con **hitbox de arco** + cooldown; ranged con **proyectiles**
  y munición. Jefes y algunos monstruos atacan a distancia; hay proyectiles de
  fuego, hielo y bombas explosivas. Drop tables ponderadas por tipo de monstruo
  y cofres.
- **Encuentros por sala**: cada habitación no inicial/final se clasifica como
  pelea, tesoro, trampa, duelo ranged, emboscada o escape; esto define enemigos,
  cofres, fuentes, gárgolas y marcas visuales en el piso.
- **Compañeros**: algunos pisos generan cautivos custodiados. Al rescatarlos se
  integran como aliados seguidores con ataques automáticos.
- **Progresión**: pisos desbloqueados en `localStorage`, selector de 20 pisos y
  crecimiento del jugador por experiencia.
- **Audio**: WebAudio procedural con música por piso y sonidos separados para
  ataques, monstruos, guardián, cofres y terreno.
- **PRNG con semilla** (mulberry32) → laberintos reproducibles.

## 🛠️ Stack

HTML5 Canvas 2D · JavaScript ES Modules · CSS. **Cero dependencias.**
Probado en navegadores basados en Chromium y Firefox.
