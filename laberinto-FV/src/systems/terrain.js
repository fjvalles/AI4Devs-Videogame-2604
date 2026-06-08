// Efectos de terreno bajo una entidad. Lee el tile en el centro y devuelve sus
// propiedades (speedMul, slippery, damage-por-segundo). Game aplica el efecto.

import { tileProps } from "../world/tiles.js";

export function terrainAt(map, x, y) {
  return tileProps(map.tileAtWorld(x, y));
}
