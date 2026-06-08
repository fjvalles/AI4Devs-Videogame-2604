// Drop tables por tipo de monstruo. Roll ponderado => instancia Items en la
// posición del monstruo (con dispersión). Los pesos suman <=1; el resto = nada.

import { makeItem } from "../entities/Item.js";

// Cada entrada: { kind, p (prob 0..1), amt:[min,max] }. kind null => nada.
export const DROP_TABLES = {
  chest: [
    { kind: "heal",    p: 0.24, amt: [1, 1] },
    { kind: "ammo",    p: 0.28, amt: [5, 10] },
    { kind: "powerup", p: 0.22 },
    { kind: "coin",    p: 0.18, amt: [4, 8] },
    { kind: "weapon",  p: 0.08 },
  ],
  mage: [
    { kind: "ammo",    p: 0.50, amt: [3, 7] },
    { kind: "powerup", p: 0.30 },
    { kind: "coin",    p: 0.20, amt: [1, 4] },
  ],
  slime: [
    { kind: "coin", p: 0.60, amt: [1, 3] },
    { kind: "heal", p: 0.15, amt: [1, 1] },
    { kind: null,   p: 0.25 },
  ],
  bat: [
    { kind: "coin", p: 0.40, amt: [1, 2] },
    { kind: "ammo", p: 0.35, amt: [2, 4] },
    { kind: null,   p: 0.25 },
  ],
  guard: [
    { kind: "coin",    p: 0.45, amt: [2, 5] },
    { kind: "heal",    p: 0.20, amt: [1, 1] },
    { kind: "ammo",    p: 0.20, amt: [2, 3] },
    { kind: "powerup", p: 0.15 },        // payload aleatorio (speed/damage/shield)
  ],
  boss: [
    { kind: "coin", p: 1.0, amt: [4, 8] }, // siempre algo extra; el sello va en guaranteed
  ],
};

const POWERUP_TYPES = ["speed", "damage", "shield"];

// Tira la drop table + drops garantizados; empuja Items al mundo (game.items).
export function rollDrops(monster, rng) {
  const out = [];

  // Drops garantizados (p. ej. el guardián: "key", "weapon:sword", "coin:8")
  if (monster.guaranteed) {
    for (const spec of monster.guaranteed) {
      const [kind, payloadRaw] = spec.split(":");
      const payload = kind === "coin" ? Number(payloadRaw || 1) : (payloadRaw || 1);
      out.push(makeItem(kind, monster.x + jitter(rng), monster.y + jitter(rng), payload));
    }
  }

  // Roll de la drop table (un slot)
  const table = DROP_TABLES[monster.dropTable] || [];
  const r = rng();
  let acc = 0;
  for (const slot of table) {
    acc += slot.p;
    if (r < acc) {
      if (slot.kind) {
        const payload = slot.kind === "powerup"
          ? rng.pick(POWERUP_TYPES)
          : (slot.amt ? rng.int(slot.amt[0], slot.amt[1]) : 1);
        out.push(makeItem(slot.kind, monster.x + jitter(rng), monster.y + jitter(rng), payload));
      }
      break;
    }
  }
  return out;
}

export function rollChestDrops(chest, rng) {
  const out = [];
  const rolls = chest.rare ? 3 : 2;
  for (let i = 0; i < rolls; i++) {
    const item = rollTable(DROP_TABLES.chest, rng, chest.x + jitter(rng), chest.y + jitter(rng));
    if (item) out.push(item);
  }
  return out;
}

function rollTable(table, rng, x, y) {
  const r = rng();
  let acc = 0;
  for (const slot of table) {
    acc += slot.p;
    if (r < acc) {
      if (!slot.kind) return null;
      const payload = slot.kind === "powerup"
        ? rng.pick(POWERUP_TYPES)
        : slot.kind === "weapon"
          ? rng.pick(["sword", "bow"])
          : (slot.amt ? rng.int(slot.amt[0], slot.amt[1]) : 1);
      return makeItem(slot.kind, x, y, payload);
    }
  }
  return null;
}

function jitter(rng) { return (rng() - 0.5) * 16; }
