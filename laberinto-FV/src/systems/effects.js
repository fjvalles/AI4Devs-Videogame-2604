// Power-ups temporales. player.activeEffects = [{ type, expiresAt }].
// type: speed (x movimiento) | damage (x daño) | shield (ignora daño).

export const POWERUP = {
  speed:  { durationS: 8,  speedMul: 1.7 },
  damage: { durationS: 8,  damageMul: 2 },
  shield: { durationS: 6 },
};

export function addEffect(player, type, time) {
  const cfg = POWERUP[type];
  if (!cfg) return;
  const existing = player.activeEffects.find((e) => e.type === type);
  if (existing) existing.expiresAt = time + cfg.durationS; // refresca
  else player.activeEffects.push({ type, expiresAt: time + cfg.durationS });
}

export function pruneEffects(player, time) {
  player.activeEffects = player.activeEffects.filter((e) => e.expiresAt > time);
}

export function hasEffect(player, type, time) {
  return player.activeEffects.some((e) => e.type === type && e.expiresAt > time);
}

export function speedMul(player, time) {
  return hasEffect(player, "speed", time) ? POWERUP.speed.speedMul : 1;
}

export function damageMul(player, time) {
  return hasEffect(player, "damage", time) ? POWERUP.damage.damageMul : 1;
}
