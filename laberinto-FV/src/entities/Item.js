// Loot en el suelo. kind define el efecto al recoger; payload el valor o subtipo.
// coin/heal/ammo (Fase 3) + weapon/key/powerup (Fase 4).

import { WEAPONS } from "./Weapon.js";

let _id = 0;

const BASE_EMOJI = {
  coin: "🪙",
  heal: "💗",
  ammo: "🏹",
  key: "🌀",
};

export const POWERUP_EMOJI = {
  speed: "👟",
  damage: "💪",
  shield: "🛡️",
};

function emojiFor(kind, payload) {
  if (kind === "weapon") return (WEAPONS[payload] || {}).emoji || "⚔️";
  if (kind === "powerup") return POWERUP_EMOJI[payload] || "✨";
  return BASE_EMOJI[kind] || "❓";
}

export function makeItem(kind, x, y, payload = 1) {
  return {
    id: ++_id,
    kind, payload,
    x, y,
    radius: 12,
    pickupRadius: 24,
    emoji: emojiFor(kind, payload),
  };
}
