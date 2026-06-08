// Monstruo parametrizado por tipo. IA: persigue si el jugador entra en detectRange.
// Tipos ranged mantienen distancia y disparan en lugar de cerrar al cuerpo a cuerpo.

import { moveEntity, dist } from "../systems/physics.js";
import { terrainAt } from "../systems/terrain.js";
import { MONSTER_TYPES } from "./monsterTypes.js";

let _id = 0;

export function makeMonster(typeKey, x, y) {
  const t = MONSTER_TYPES[typeKey];
  return {
    id: ++_id,
    type: t.key,
    emoji: t.emoji,
    x, y,
    spawnX: x,
    spawnY: y,
    vx: 0, vy: 0,
    radius: t.radius,
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed,
    damage: t.damage,
    detectRange: t.detectRange,
    loseRange: t.loseRange,
    dropTable: t.dropTable,
    isBoss: !!t.isBoss,
    guaranteed: t.guaranteed || null,
    ranged: !!t.ranged,
    rangedOnly: !!t.rangedOnly,
    shootRange: t.shootRange || 0,
    shootCooldownMs: t.shootCooldownMs || 0,
    projectileSpeed: t.projectileSpeed || 0,
    projectileDamage: t.projectileDamage || 0,
    projectileType: t.projectileType || "bolt",
    shootTimer: 0,
    state: "patrol",
    patrolTarget: null,
    alive: true,
  };
}

// onShoot: callback opcional (shooter) => void; solo se llama para monstruos ranged.
export function updateMonster(m, player, map, rng, dt, onShoot, isHellMode = false) {
  const d = dist(m.x, m.y, player.x, player.y);

  if (isHellMode) {
    m.state = "chase";
  } else {
    if (d < m.detectRange) m.state = "chase";
    else if (m.state === "chase" && d > m.loseRange) { m.state = "patrol"; m.patrolTarget = null; }
  }

  let tx, ty;
  if (m.state === "chase") {
    if (m.ranged && d < m.shootRange) {
      const preferDist = m.shootRange * 0.6;
      if (d < preferDist) {
        // Retrocede para mantener distancia óptima
        const rdx = m.x - player.x, rdy = m.y - player.y;
        const rlen = Math.hypot(rdx, rdy) || 1;
        tx = m.x + (rdx / rlen) * 50;
        ty = m.y + (rdy / rlen) * 50;
      } else {
        tx = m.x; ty = m.y; // se queda quieto en rango
      }
      m.shootTimer -= dt;
      if (m.shootTimer <= 0 && onShoot) {
        m.shootTimer = m.shootCooldownMs / 1000;
        onShoot(m);
      }
    } else if (m.rangedOnly) {
      tx = m.x; ty = m.y;
      m.shootTimer -= dt;
      if (m.shootTimer <= 0 && onShoot && d < m.detectRange) {
        m.shootTimer = m.shootCooldownMs / 1000;
        onShoot(m);
      }
    } else {
      tx = player.x; ty = player.y;
    }
  } else {
    if (!m.patrolTarget || dist(m.x, m.y, m.patrolTarget.x, m.patrolTarget.y) < 8) {
      m.patrolTarget = m.guardHome ? randomNearHome(map, rng, m.guardHome) : randomWalkable(map, rng);
    }
    tx = m.patrolTarget.x; ty = m.patrolTarget.y;
  }

  const speedMul = terrainAt(map, m.x, m.y).speedMul;
  const dx = tx - m.x, dy = ty - m.y;
  const len = Math.hypot(dx, dy) || 1;
  const finalSpeed = m.speed * (isHellMode ? 1.4 : 1.0);
  m.vx = (dx / len) * finalSpeed * speedMul;
  m.vy = (dy / len) * finalSpeed * speedMul;

  moveEntity(m, map, dt);
}

function randomNearHome(map, rng, home) {
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng.int(0, 42);
    const p = { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r };
    if (!map.isWallWorld(p.x, p.y)) return p;
  }
  return home;
}

function randomWalkable(map, rng) {
  for (let i = 0; i < 20; i++) {
    const col = rng.int(0, map.cols - 1);
    const row = rng.int(0, map.rows - 1);
    if (map.get(col, row) === 0) return map.centerOf(col, row);
  }
  return { x: map.widthPx / 2, y: map.heightPx / 2 };
}
