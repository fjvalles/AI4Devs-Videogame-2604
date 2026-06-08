// Constantes de juego. Único lugar para tunear balance/feel.

export const CANVAS = { width: 800, height: 600 };

// Estados de la máquina de estados (Game.js)
export const STATE = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameover",
  VICTORY: "victory",
};

// Timestep fijo del loop (60 Hz lógico). Física determinista.
export const STEP_MS = 1000 / 60;

// Mundo / grid lógico
export const TILE = 40; // px por celda
export const WORLD = { cols: 40, rows: 30 }; // 1600x1200 px => cámara scrollea

// Generación de laberinto (salas + corredores conectados por MST)
export const MAZE = {
  roomAttempts: 30,   // intentos de colocación (algunos se rechazan por solape)
  roomMin: 4,         // tamaño de sala en tiles
  roomMax: 8,
  extraEdges: 0.12,   // % de aristas extra sobre el MST => loops
  terrainPatches: 14, // manchas de terreno (lodo/agua/hielo)
  patchSize: 22,      // pasos de random-walk por mancha
  spawnSafeTiles: 3,  // radio (en tiles) sin terreno alrededor del spawn
};

// Hielo: fricción reducida => conserva momentum (deslizamiento)
export const ICE_FRICTION = 120; // px/s^2 (vs PLAYER.friction normal)

// Jugador
export const PLAYER = {
  radius: 14,
  speed: 220,      // px/s objetivo
  accel: 1800,     // px/s^2 hacia la velocidad objetivo
  friction: 1400,  // px/s^2 de frenado en suelo normal
  maxHp: 120,
  invulnMs: 650,   // i-frames tras recibir daño
  emoji: "🧙",
};

// Progresión de pisos
export const LEVELS = {
  total: 20,           // pisos para ganar
  baseMonsters: 5,     // monstruos normales en piso 1
  perLevel: 2,         // +monstruos por piso
  maxMonsters: 26,
  hpScale: 0.11,
  damageScale: 0.065,
  speedScale: 0.018,
  levelTimeLimit: 60,  // tiempo límite en segundos por nivel
};

export const PLAYER_PROGRESS = {
  baseXpNext: 45,
  xpGrowth: 22,
  hpPerLevel: 10,
  attackPerLevel: 0.08,
  resistPerLevel: 0.035,
};

// Monstruo (Fase 1: un tipo, persecución directa, daño por contacto)
export const MONSTER = {
  radius: 14,
  speed: 130,
  hp: 30,
  damage: 12,
  detectRange: 260,   // px: dentro => persigue
  countPerLevel: 6,
  emoji: "👹",
};

export const COLORS = {
  floor: "#1d2233",
  wall: "#3a4060",
  exitGlow: "#2e6b3a",
};
