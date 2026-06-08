// Catálogo de tipos de tile. El grid guarda solo el id (Uint8); aquí están
// las propiedades.

export const T = {
  FLOOR: 0,
  WALL: 1,
  EXIT: 2,
  MUD: 3,
  WATER: 4,
  ICE: 5,
};

// damage = daño por segundo (DoT) mientras la entidad esté encima.
export const TILES = {
  [T.FLOOR]: { name: "floor", walkable: true,  speedMul: 1,    damage: 0,  slippery: false, color: "#1d2233" },
  [T.WALL]:  { name: "wall",  walkable: false, speedMul: 0,    damage: 0,  slippery: false, color: "#3a4060" },
  [T.EXIT]:  { name: "stairs", walkable: true,  speedMul: 1,    damage: 0,  slippery: false, color: "#2e3f32", emoji: "🪜" },
  [T.MUD]:   { name: "mud",   walkable: true,  speedMul: 0.45, damage: 0,  slippery: false, color: "#4a3a23" },
  [T.WATER]: { name: "water", walkable: true,  speedMul: 0.65, damage: 0,  slippery: false, color: "#1b3a5c" },
  [T.ICE]:   { name: "ice",   walkable: true,  speedMul: 1,    damage: 0,  slippery: true,  color: "#9fd6e6" },
};

// Terrenos que el generador puede pintar sobre el suelo (con peso relativo).
// El fuego ya no aparece como tile: ahora lo disparan las gárgolas.
export const TERRAIN_WEIGHTS = [
  { id: T.MUD, w: 45 },
  { id: T.WATER, w: 35 },
  { id: T.ICE, w: 8 },
];

export function tileProps(id) {
  return TILES[id] || TILES[T.WALL];
}
