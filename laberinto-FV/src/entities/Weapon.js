// Armas. melee (arco con cooldown) y ranged (proyectil + munición).

export const WEAPONS = {
  sword: { name: "Espada", kind: "melee", damage: 26, range: 56, cooldownMs: 340, arc: Math.PI * 0.8, emoji: "⚔️" },
  bow:   { name: "Arco", kind: "ranged", damage: 20, cooldownMs: 300, projectileSpeed: 480, ammoCost: 1, emoji: "🏹" },
};

export const WEAPON_SLOTS = ["sword", "bow"];

export function makeWeapon(key) {
  return { ...WEAPONS[key], key, nextReadyAt: 0 };
}
