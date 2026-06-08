// Movimiento con colisión círculo↔grid. Eje-separado => deslizar por paredes
// sin trabarse en esquinas. Sub-pasos si el desplazamiento supera medio tile
// (anti-tunneling a alta velocidad: hielo / power-ups de velocidad).

import { TILE } from "../config.js";

// Mueve la entidad (e.x/e.y, e.vx/e.vy ya en px/s) un dt, resolviendo muros.
// Devuelve { hitX, hitY } por si el llamador quiere matar momentum en ese eje.
export function moveEntity(e, map, dt, hasKey = true) {
  let dx = e.vx * dt;
  let dy = e.vy * dt;

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (TILE / 2)));
  const sx = dx / steps;
  const sy = dy / steps;

  let hitX = false, hitY = false;

  for (let i = 0; i < steps; i++) {
    // Eje X
    if (!map.blockedBox(e.x + sx, e.y, e.radius, hasKey)) {
      e.x += sx;
    } else {
      hitX = true;
    }
    // Eje Y
    if (!map.blockedBox(e.x, e.y + sy, e.radius, hasKey)) {
      e.y += sy;
    } else {
      hitY = true;
    }
  }

  if (hitX) e.vx = 0;
  if (hitY) e.vy = 0;

  return { hitX, hitY };
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Colisión círculo-círculo (entidad vs entidad)
export function circlesOverlap(a, b) {
  const r = a.radius + b.radius;
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy < r * r;
}
