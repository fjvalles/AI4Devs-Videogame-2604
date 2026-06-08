// Proyectil del arma ranged. Vuela recto hasta chocar con muro/monstruo o
// agotar su TTL.

let _id = 0;

export function makeProjectile(x, y, vx, vy, damage) {
  return {
    id: ++_id,
    x, y, vx, vy,
    radius: 5,
    damage,
    ttl: 1.2, // segundos de vida
    emoji: "🔸",
  };
}
