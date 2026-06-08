// Cámara que sigue al jugador y traduce mundo->pantalla. Clamp a los bordes
// del mundo para no mostrar el vacío fuera del mapa.

import { CANVAS } from "../config.js";

export class Camera {
  constructor() { this.x = 0; this.y = 0; }

  follow(target, map) {
    this.x = clamp(target.x - CANVAS.width / 2, 0, Math.max(0, map.widthPx - CANVAS.width));
    this.y = clamp(target.y - CANVAS.height / 2, 0, Math.max(0, map.heightPx - CANVAS.height));
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
