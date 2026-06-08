// Combate. melee (arco) + ranged (proyectil). Al morir un monstruo tira su
// drop table. Recogida de ítems aplica efectos (incl. armas y power-ups).

import { dist } from "./physics.js";
import { rollDrops } from "./loot.js";
import { makeProjectile } from "../entities/Projectile.js";
import { makeWeapon } from "../entities/Weapon.js";
import { addEffect, damageMul } from "./effects.js";
import { sfx } from "../core/audio.js";

// Ataque según el tipo de arma equipada. Devuelve true si se ejecutó.
export function attack(game) {
  const w = game.player.weapon;
  if (game.time < w.nextReadyAt) return false;
  return w.kind === "ranged" ? rangedAttack(game) : meleeAttack(game);
}

function meleeAttack(game) {
  const p = game.player;
  const w = p.weapon;
  w.nextReadyAt = game.time + w.cooldownMs / 1000;
  p.swingUntil = game.time + 0.12;
  sfx.attack();

  const fa = Math.atan2(p.facing.y, p.facing.x);
  const half = w.arc / 2;
  const dmg = w.damage * damageMul(p, game.time) * game.playerAttackMul();

  for (const m of game.monsters) {
    if (!m.alive) continue;
    if (dist(p.x, p.y, m.x, m.y) > w.range + m.radius) continue;
    const ang = Math.atan2(m.y - p.y, m.x - p.x);
    if (Math.abs(angleDiff(ang, fa)) > half) continue;
    damageMonster(game, m, dmg);
  }
  return true;
}

function rangedAttack(game) {
  const p = game.player;
  const w = p.weapon;
  if (p.inventory.ammo < w.ammoCost) return false; // sin munición

  w.nextReadyAt = game.time + w.cooldownMs / 1000;
  p.inventory.ammo -= w.ammoCost;
  sfx.attack();

  const len = Math.hypot(p.facing.x, p.facing.y) || 1;
  const vx = (p.facing.x / len) * w.projectileSpeed;
  const vy = (p.facing.y / len) * w.projectileSpeed;
  const dmg = w.damage * damageMul(p, game.time) * game.playerAttackMul();
  game.projectiles.push(makeProjectile(p.x, p.y, vx, vy, dmg));
  return true;
}

export function updateProjectiles(game, dt) {
  const live = [];
  for (const pr of game.projectiles) {
    pr.ttl -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (pr.ttl <= 0 || game.map.isWallWorld(pr.x, pr.y)) continue; // muere

    let hit = false;
    for (const m of game.monsters) {
      if (!m.alive) continue;
      if (dist(pr.x, pr.y, m.x, m.y) <= m.radius + pr.radius) {
        damageMonster(game, m, pr.damage);
        hit = true;
        break;
      }
    }
    if (!hit) live.push(pr);
  }
  game.projectiles = live;
}

export function damageMonster(game, m, dmg, playHit = true) {
  m.hp -= dmg;
  if (playHit) sfx.hit();
  if (m.hp <= 0) {
    m.alive = false;
    game.stats.kills++;
    if (m.isBoss) game.stats.bossKilled = true;
    game.awardXp(m);
    sfx.death(m.isBoss);
    for (const it of rollDrops(m, game.rng)) game.items.push(it);
  }
}

// Recoge ítems cuyo radio de pickup solape al jugador. Aplica efecto.
export function collectItems(game) {
  const p = game.player;
  const messages = [];
  game.items = game.items.filter((it) => {
    if (dist(p.x, p.y, it.x, it.y) > it.pickupRadius + p.radius) return true;
    messages.push(applyItem(game, it));
    sfx.pickup();
    return false;
  });
  if (messages.length) game.showPickup(messages.filter(Boolean).join(" · "));
}

function applyItem(game, it) {
  const p = game.player;
  switch (it.kind) {
    case "coin": {
      const amount = Number(it.payload) || 1;
      p.inventory.coins += amount;
      return `<span class="yellow-coin">🪙</span> +${amount} monedas`;
    }
    case "ammo": {
      const amount = Number(it.payload) || 1;
      p.inventory.ammo += amount;
      return `🏹 +${amount} flechas`;
    }
    case "heal": {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + 25);
      return `💗 Curación +${Math.ceil(p.hp - before)} vida`;
    }
    case "key":
      p.inventory.keys += 1;
      return "🌀 Sello del guardián obtenido";
    case "weapon":
      p.inventory.weapons[it.payload] = true;
      p.weapon = makeWeapon(it.payload);
      return `${p.weapon.emoji} Arma equipada: ${p.weapon.name}`;
    case "powerup":
      addEffect(p, it.payload, game.time);
      return powerupMessage(it.payload);
  }
  return "✨ Objeto recogido";
}

function powerupMessage(type) {
  if (type === "speed") return "👟 Poder: velocidad temporal";
  if (type === "damage") return "💪 Poder: más ataque temporal";
  if (type === "shield") return "🛡️ Poder: escudo temporal";
  return "✨ Poder obtenido";
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
