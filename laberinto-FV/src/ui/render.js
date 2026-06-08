// Render del mundo: tiles con textura, sprites canvas por tipo de entidad.

import { CANVAS, TILE, PLAYER } from "../config.js";
import { tileProps, T } from "../world/tiles.js";

export function renderWorld(ctx, game) {
  const { map, camera, player, monsters, companions, chests, items, projectiles } = game;

  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);

  // ---- Tiles ---------------------------------------------------------------
  const c0 = Math.max(0, Math.floor(camera.x / TILE));
  const r0 = Math.max(0, Math.floor(camera.y / TILE));
  const c1 = Math.min(map.cols - 1, Math.ceil((camera.x + CANVAS.width) / TILE));
  const r1 = Math.min(map.rows - 1, Math.ceil((camera.y + CANVAS.height) / TILE));

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const id = map.get(col, row);
      const p = tileProps(id);
      const sx = col * TILE - camera.x;
      const sy = row * TILE - camera.y;

      if (id === T.MUD) {
        drawQuicksand(ctx, sx, sy, game.time, col, row);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, TILE, TILE);
      }


      if (id === T.FLOOR) {
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      } else if (id === T.WALL) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(sx, sy, TILE, 2);
        ctx.fillRect(sx, sy, 2, TILE);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        ctx.fillRect(sx + TILE - 2, sy, 2, TILE);
      } else if (id === T.EXIT) {
        const hasKey = game.player && game.player.inventory.keys >= 1;
        ctx.strokeStyle = hasKey ? "rgba(80,255,140,0.65)" : "rgba(255,80,80,0.65)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      } else if (id === T.ICE) {
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(sx + TILE / 2 - 1, sy + TILE / 2 - 5, 2, 10);
        ctx.fillRect(sx + TILE / 2 - 5, sy + TILE / 2 - 1, 10, 2);
      }

      if (p.emoji) {
        let emoji = p.emoji;
        if (id === T.EXIT && game.player && game.player.inventory.keys < 1) {
          emoji = "🔒";
        }
        drawEmoji(ctx, emoji, sx + TILE / 2, sy + TILE / 2, TILE * 0.75);
      }
    }
  }

  // ---- Props de terreno ----------------------------------------------------
  for (const encounter of (game.roomEncounters || [])) {
    drawEncounterMarker(ctx, encounter, camera, game.time);
  }

  // ---- Props de terreno ----------------------------------------------------
  for (const f of (game.terrainFeatures || [])) {
    drawEmoji(ctx, f.type === "gargoyle" ? "🗿" : "⛲", f.x - camera.x, f.y - camera.y, f.type === "gargoyle" ? 25 : 28);
  }

  // ---- Cofres --------------------------------------------------------------
  for (const chest of chests) {
    if (!chest.opened) drawChest(ctx, chest.x - camera.x, chest.y - camera.y, chest.rare);
  }

  // ---- Ítems ---------------------------------------------------------------
  for (const it of items) {
    drawItem(ctx, it, it.x - camera.x, it.y - camera.y);
  }

  // ---- Monstruos -----------------------------------------------------------
  for (const m of monsters) {
    if (!m.alive) continue;
    const sx = m.x - camera.x, sy = m.y - camera.y;
    drawMonster(ctx, m, sx, sy);
    if (m.hp < m.maxHp) drawHpBar(ctx, sx, sy - m.radius - 6, m.hp / m.maxHp);
  }

  // ---- Compañeros rescatables / aliados -----------------------------------
  for (const ally of (companions || [])) {
    drawCompanion(ctx, ally, ally.x - camera.x, ally.y - camera.y, game.time);
  }

  // ---- Proyectiles del jugador (dorados) -----------------------------------
  for (const pr of projectiles) {
    ctx.fillStyle = "#ffd24d";
    ctx.beginPath();
    ctx.arc(pr.x - camera.x, pr.y - camera.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Proyectiles de monstruos (rojos con brillo) -------------------------
  for (const pr of (game.monsterProjectiles || [])) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = projectileColor(pr).glow;
    ctx.fillStyle = projectileColor(pr).fill;
    ctx.beginPath();
    ctx.arc(pr.x - camera.x, pr.y - camera.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- Proyectiles ambientales --------------------------------------------
  for (const pr of (game.hazardProjectiles || [])) {
    ctx.save();
    ctx.shadowBlur = pr.type === "fire" ? 12 : 7;
    ctx.shadowColor = pr.type === "fire" ? "#ff6b22" : "#7bdcff";
    ctx.fillStyle = pr.type === "fire" ? "#ff4a1a" : "#77d9ff";
    ctx.beginPath();
    ctx.arc(pr.x - camera.x, pr.y - camera.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- Arco de golpe melee -------------------------------------------------
  if (player.swingUntil > game.time) drawSwing(ctx, player, camera);

  // ---- Aura de power-up ----------------------------------------------------
  const px = player.x - camera.x, py = player.y - camera.y;
  if (player.activeEffects.some((e) => e.expiresAt > game.time)) {
    ctx.strokeStyle = effectColor(player, game.time);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, player.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---- Jugador (parpadea durante i-frames) ---------------------------------
  if (!(player.invulnUntil > game.time && Math.floor(game.time * 12) % 2)) {
    drawPlayerSprite(ctx, px, py, player.radius);
  }

  if (game.isHellMode) {
    const pulse = Math.sin(game.time * 4.5) * 0.06;
    const grad = ctx.createRadialGradient(
      CANVAS.width / 2, CANVAS.height / 2, CANVAS.width * 0.35,
      CANVAS.width / 2, CANVAS.height / 2, CANVAS.width * 0.75
    );
    grad.addColorStop(0, "rgba(255, 0, 0, 0)");
    grad.addColorStop(1, `rgba(180, 0, 0, ${0.45 + pulse})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    ctx.restore();
  }

  drawMinimap(ctx, game);
}

// ---- Sprites de monstruos --------------------------------------------------

function drawMonster(ctx, m, x, y) {
  const r = m.radius;
  switch (m.type) {
    case "slime": drawSlime(ctx, x, y, r); break;
    case "bat":   drawBat(ctx, x, y, r);   break;
    case "guard": drawGuard(ctx, x, y, r); break;
    case "mage":  drawMage(ctx, x, y, r);  break;
    case "archer": drawArcher(ctx, x, y, r); break;
    case "bomber": drawBomber(ctx, x, y, r); break;
    case "frost": drawFrost(ctx, x, y, r); break;
    case "boss":  drawBoss(ctx, x, y, r);  break;
    default:      drawEmoji(ctx, m.emoji, x, y, r * 2);
  }
}

function drawSlime(ctx, x, y, r) {
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cuerpo principal
  ctx.fillStyle = "#33c944";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.88, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  // Brillo superior
  ctx.fillStyle = "#5fe870";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.18, y - r * 0.18, r * 0.42, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Núcleo oscuro
  ctx.fillStyle = "#1a8828";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ojos blancos
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Pupilas
  ctx.fillStyle = "#111122";
  ctx.beginPath();
  ctx.arc(x - r * 0.26, y - r * 0.08, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.26, y - r * 0.08, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBat(ctx, x, y, r) {
  // Alas (izquierda y derecha)
  ctx.fillStyle = "#2e1d3d";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y);
  ctx.quadraticCurveTo(x - r * 1.7, y - r * 1.1, x - r * 2.2, y + r * 0.4);
  ctx.quadraticCurveTo(x - r * 1.3, y + r * 0.55, x - r * 0.3, y + r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.3, y);
  ctx.quadraticCurveTo(x + r * 1.7, y - r * 1.1, x + r * 2.2, y + r * 0.4);
  ctx.quadraticCurveTo(x + r * 1.3, y + r * 0.55, x + r * 0.3, y + r * 0.35);
  ctx.closePath();
  ctx.fill();
  // Detalle de membrana alar
  ctx.strokeStyle = "#44285a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y);
  ctx.lineTo(x - r * 1.4, y + r * 0.1);
  ctx.moveTo(x + r * 0.3, y);
  ctx.lineTo(x + r * 1.4, y + r * 0.1);
  ctx.stroke();
  // Cuerpo central
  ctx.fillStyle = "#4a2e5e";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.52, r * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cabeza / orejas
  ctx.fillStyle = "#3d2450";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.35, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.28, y - r * 0.6);
  ctx.lineTo(x - r * 0.42, y - r * 1.05);
  ctx.lineTo(x - r * 0.1, y - r * 0.7);
  ctx.closePath();
  ctx.moveTo(x + r * 0.28, y - r * 0.6);
  ctx.lineTo(x + r * 0.42, y - r * 1.05);
  ctx.lineTo(x + r * 0.1, y - r * 0.7);
  ctx.closePath();
  ctx.fill();
  // Ojos rojos brillantes
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = "#ff0000";
  ctx.fillStyle = "#ff2222";
  ctx.beginPath();
  ctx.arc(x - r * 0.18, y - r * 0.38, r * 0.14, 0, Math.PI * 2);
  ctx.arc(x + r * 0.18, y - r * 0.38, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, x, y, r) {
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.05, r * 0.65, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cuerpo / torso blindado
  ctx.fillStyle = "#6b1a1a";
  ctx.fillRect(x - r * 0.62, y - r * 0.2, r * 1.24, r * 1.1);
  // Hombros
  ctx.fillStyle = "#8a9aaa";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.72, y - r * 0.05, r * 0.28, r * 0.22, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.72, y - r * 0.05, r * 0.28, r * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Pecho (placa)
  ctx.fillStyle = "#7a8a9a";
  ctx.fillRect(x - r * 0.38, y - r * 0.15, r * 0.76, r * 0.7);
  // Cruz en la placa
  ctx.fillStyle = "#cc2222";
  ctx.fillRect(x - r * 0.06, y - r * 0.1, r * 0.12, r * 0.6);
  ctx.fillRect(x - r * 0.3, y + r * 0.1, r * 0.6, r * 0.12);
  // Cabeza
  ctx.fillStyle = "#8a3a2a";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.5, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  // Casco
  ctx.fillStyle = "#778899";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.58, r * 0.46, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - r * 0.46, y - r * 0.58, r * 0.92, r * 0.18);
  // Visera del casco
  ctx.fillStyle = "#556677";
  ctx.fillRect(x - r * 0.32, y - r * 0.55, r * 0.64, r * 0.14);
  // Ojos amarillos brillantes
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ffaa00";
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(x - r * 0.18, y - r * 0.5, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.18, y - r * 0.5, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Arma (lanza / espada)
  ctx.strokeStyle = "#aabbcc";
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + r * 0.7, y - r * 0.7);
  ctx.lineTo(x + r * 0.7, y + r * 1.0);
  ctx.stroke();
  // Punta de lanza
  ctx.fillStyle = "#ddeeee";
  ctx.beginPath();
  ctx.moveTo(x + r * 0.7, y - r * 0.7);
  ctx.lineTo(x + r * 0.54, y - r * 0.38);
  ctx.lineTo(x + r * 0.86, y - r * 0.38);
  ctx.closePath();
  ctx.fill();
}

function drawMage(ctx, x, y, r) {
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.05, r * 0.55, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Túnica (cuerpo)
  ctx.fillStyle = "#1a1a66";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r * 0.1);
  ctx.lineTo(x - r * 0.82, y + r * 1.05);
  ctx.lineTo(x + r * 0.82, y + r * 1.05);
  ctx.lineTo(x + r * 0.55, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
  // Franja en túnica
  ctx.fillStyle = "#2a2a88";
  ctx.fillRect(x - r * 0.1, y - r * 0.05, r * 0.2, r * 1.1);
  // Cabeza
  ctx.fillStyle = "#c8a878";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.5, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  // Sombrero (ala)
  ctx.fillStyle = "#0d0d44";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.75, r * 0.58, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sombrero (cono)
  ctx.fillStyle = "#111155";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.75);
  ctx.lineTo(x + r * 0.5, y - r * 0.75);
  ctx.lineTo(x, y - r * 1.6);
  ctx.closePath();
  ctx.fill();
  // Estrella en el sombrero
  ctx.fillStyle = "#8855ff";
  drawStar(ctx, x, y - r * 1.18, r * 0.12);
  // Bastón
  ctx.strokeStyle = "#665599";
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + r * 0.65, y - r * 0.55);
  ctx.lineTo(x + r * 0.65, y + r * 1.05);
  ctx.stroke();
  // Orbe del bastón
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#aa44ff";
  ctx.fillStyle = "#cc66ff";
  ctx.beginPath();
  ctx.arc(x + r * 0.65, y - r * 0.68, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Ojos violetas
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = "#9933ff";
  ctx.fillStyle = "#bb44ff";
  ctx.beginPath();
  ctx.arc(x - r * 0.14, y - r * 0.52, r * 0.1, 0, Math.PI * 2);
  ctx.arc(x + r * 0.14, y - r * 0.52, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArcher(ctx, x, y, r) {
  ctx.fillStyle = "rgba(0,0,0,0.23)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.0, r * 0.6, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#355a32";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.1);
  ctx.lineTo(x - r * 0.68, y + r * 0.95);
  ctx.lineTo(x + r * 0.68, y + r * 0.95);
  ctx.lineTo(x + r * 0.5, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c49a6c";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.45, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#213d23";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.48, y - r * 0.55);
  ctx.lineTo(x, y - r * 1.16);
  ctx.lineTo(x + r * 0.48, y - r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d7b56d";
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x + r * 0.58, y - r * 0.05, r * 0.62, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = "#f0e0bd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.58, y - r * 0.67);
  ctx.lineTo(x + r * 0.58, y + r * 0.57);
  ctx.stroke();
}

function drawBoss(ctx, x, y, r) {
  // Alas (muy grandes)
  ctx.fillStyle = "#1a0a22";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.3);
  ctx.bezierCurveTo(x - r * 2.8, y - r * 2.2, x - r * 3.8, y + r * 0.5, x - r * 2.4, y + r * 1.6);
  ctx.lineTo(x - r * 0.5, y + r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y - r * 0.3);
  ctx.bezierCurveTo(x + r * 2.8, y - r * 2.2, x + r * 3.8, y + r * 0.5, x + r * 2.4, y + r * 1.6);
  ctx.lineTo(x + r * 0.5, y + r * 0.6);
  ctx.closePath();
  ctx.fill();
  // Nervaduras de las alas
  ctx.strokeStyle = "#330a44";
  ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i += 0.5) {
    const sign = i < 0 ? -1 : 1;
    const ax = sign * r * Math.abs(i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x + ax * 0.2, y);
    ctx.lineTo(x + sign * r * 2.2, y + r * 0.8);
    ctx.stroke();
  }
  // Cuerpo principal
  ctx.fillStyle = "#1e0a2e";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r * 0.88, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Escamas (patrón)
  ctx.strokeStyle = "#33144a";
  ctx.lineWidth = 0.8;
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      ctx.beginPath();
      ctx.arc(x + col * r * 0.38, y + r * 0.3 + row * r * 0.38, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Cabeza
  ctx.fillStyle = "#280e38";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.72, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  // Cuernos
  ctx.fillStyle = "#550000";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.38, y - r * 1.1);
  ctx.lineTo(x - r * 0.6, y - r * 2.0);
  ctx.lineTo(x - r * 0.14, y - r * 1.1);
  ctx.closePath();
  ctx.moveTo(x + r * 0.38, y - r * 1.1);
  ctx.lineTo(x + r * 0.6, y - r * 2.0);
  ctx.lineTo(x + r * 0.14, y - r * 1.1);
  ctx.closePath();
  ctx.fill();
  // Hocico
  ctx.fillStyle = "#1e0830";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.6, r * 0.38, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fosas nasales
  ctx.fillStyle = "#cc2200";
  ctx.beginPath();
  ctx.arc(x - r * 0.13, y - r * 0.62, r * 0.07, 0, Math.PI * 2);
  ctx.arc(x + r * 0.13, y - r * 0.62, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // Ojos rojos muy brillantes
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ff2200";
  ctx.fillStyle = "#ff1100";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.82, r * 0.2, r * 0.15, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.28, y - r * 0.82, r * 0.2, r * 0.15, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Pupilas verticales
  ctx.fillStyle = "#220000";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.82, r * 0.06, r * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.28, y - r * 0.82, r * 0.06, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBomber(ctx, x, y, r) {
  // Sombra proyectada
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.0, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo principal (esfera metálica oscura de bomba)
  ctx.fillStyle = "#2c2d35";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Borde/Textura de metal
  ctx.strokeStyle = "#464a56";
  ctx.lineWidth = r * 0.12;
  ctx.stroke();

  // Tapa de mecha
  ctx.fillStyle = "#cca01a";
  ctx.fillRect(x - r * 0.18, y - r * 1.05, r * 0.36, r * 0.22);

  // Mecha (curvada hacia arriba)
  ctx.strokeStyle = "#d8c395";
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.05);
  ctx.quadraticCurveTo(x + r * 0.4, y - r * 1.4, x + r * 0.5, y - r * 1.25);
  ctx.stroke();

  // Chispa brillante animada en la punta de la mecha
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff8800";
  ctx.fillStyle = "#ffdd44";
  ctx.beginPath();
  ctx.arc(x + r * 0.5, y - r * 1.25, r * 0.18 + Math.sin(Date.now() * 0.02) * r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ojos brillantes (rojos/amenazantes)
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ff2200";
  ctx.fillStyle = "#ff4422";
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.14, 0, Math.PI * 2);
  ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Grietas incandescentes en la bomba (energía inestable lista para explotar)
  ctx.strokeStyle = "#ffa200";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y + r * 0.3);
  ctx.lineTo(x - r * 0.1, y + r * 0.2);
  ctx.lineTo(x + r * 0.2, y + r * 0.45);
  ctx.stroke();
}

function drawFrost(ctx, x, y, r) {
  // Sombra translúcida
  ctx.fillStyle = "rgba(100,200,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.05, r * 0.75, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Degradado de hielo
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, "#a0f0ff");
  grad.addColorStop(0.5, "#4db2ff");
  grad.addColorStop(1, "#1a75ff");
  ctx.fillStyle = grad;

  // Cuerpo de cristal de hielo de 8 puntas
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.0);
  ctx.lineTo(x + r * 0.7, y - r * 0.5);
  ctx.lineTo(x + r * 0.9, y + r * 0.1);
  ctx.lineTo(x + r * 0.4, y + r * 0.9);
  ctx.lineTo(x, y + r * 0.7);
  ctx.lineTo(x - r * 0.4, y + r * 0.9);
  ctx.lineTo(x - r * 0.9, y + r * 0.1);
  ctx.lineTo(x - r * 0.7, y - r * 0.5);
  ctx.closePath();
  ctx.fill();

  // Líneas de faceta interna del cristal
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.0);
  ctx.lineTo(x, y + r * 0.7);
  ctx.moveTo(x - r * 0.9, y + r * 0.1);
  ctx.lineTo(x + r * 0.9, y + r * 0.1);
  ctx.stroke();

  // Ojos brillantes celestes/blancos
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.2, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- Sprite del jugador ----------------------------------------------------

function drawPlayerSprite(ctx, x, y, r) {
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.05, r * 0.55, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Túnica (azul mago)
  ctx.fillStyle = "#1e4db7";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.12);
  ctx.lineTo(x - r * 0.78, y + r * 1.0);
  ctx.lineTo(x + r * 0.78, y + r * 1.0);
  ctx.lineTo(x + r * 0.5, y - r * 0.12);
  ctx.closePath();
  ctx.fill();
  // Franja dorada en la túnica
  ctx.fillStyle = "#c8a020";
  ctx.fillRect(x - r * 0.07, y - r * 0.08, r * 0.14, r * 1.08);
  // Capa (sombra lateral)
  ctx.fillStyle = "#163a94";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.12);
  ctx.lineTo(x - r * 0.78, y + r * 1.0);
  ctx.lineTo(x - r * 0.38, y + r * 1.0);
  ctx.lineTo(x - r * 0.22, y - r * 0.12);
  ctx.closePath();
  ctx.fill();
  // Cara
  ctx.fillStyle = "#f5d0a0";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.5, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  // Cejas
  ctx.strokeStyle = "#664422";
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.22, y - r * 0.6);
  ctx.lineTo(x - r * 0.08, y - r * 0.62);
  ctx.moveTo(x + r * 0.22, y - r * 0.6);
  ctx.lineTo(x + r * 0.08, y - r * 0.62);
  ctx.stroke();
  // Ala del sombrero
  ctx.fillStyle = "#0d2280";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.74, r * 0.58, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cono del sombrero
  ctx.fillStyle = "#122aa8";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.48, y - r * 0.74);
  ctx.lineTo(x + r * 0.48, y - r * 0.74);
  ctx.lineTo(x, y - r * 1.55);
  ctx.closePath();
  ctx.fill();
  // Estrella en el sombrero
  ctx.fillStyle = "#ffe040";
  drawStar(ctx, x, y - r * 1.12, r * 0.13);
}

function drawCompanion(ctx, ally, x, y, time) {
  const bob = Math.sin(time * 5 + ally.id.charCodeAt(0)) * 2;
  const cy = y + bob;

  ctx.save();
  ctx.globalAlpha = ally.rescued ? 1 : 0.72 + Math.sin(time * 4) * 0.12;

  // Sombra proyectada en el suelo (no se desplaza con el bobbing)
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dibujar cuerpo del compañero
  const r = ally.radius;
  if (ally.key === "blade") {
    drawBladeCompanion(ctx, x, cy, r, time);
  } else if (ally.key === "rune") {
    drawRuneCompanion(ctx, x, cy, r, time);
  } else if (ally.key === "healer") {
    drawHealerCompanion(ctx, x, cy, r, time);
  } else {
    // Fallback original
    ctx.fillStyle = ally.color;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ally.rescued ? "#ffffff" : "#ffcf6a";
    ctx.lineWidth = ally.rescued ? 2 : 3;
    ctx.stroke();
    drawEmoji(ctx, ally.emoji, x, cy - 1, 18);
  }

  // Partículas y efectos tras ser rescatado
  if (ally.rescued) {
    ctx.save();
    const seed = ally.id.charCodeAt(0) * 10;
    for (let i = 0; i < 3; i++) {
      const pTime = (time + seed + i * 1.5) % 3.0;
      const progress = pTime / 3.0;
      const angle = (seed + i * 2.1) + progress * Math.PI * 2;
      const dist = 14 + progress * 10;
      const px = x + Math.cos(angle) * dist;
      const py = cy - 4 - progress * 24;
      const alpha = 1.0 - progress;

      ctx.globalAlpha = alpha;
      if (ally.key === "blade") {
        ctx.fillStyle = "#ffd24d";
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      } else if (ally.key === "rune") {
        ctx.fillStyle = "#af7ac5";
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ally.key === "healer") {
        ctx.fillStyle = "#58d68d";
        ctx.beginPath();
        ctx.ellipse(px, py, 2.5, 1.2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Burbuja mágica de contención para compañeros cautivos
  if (!ally.rescued) {
    const pulse = Math.sin(time * 3) * 0.15;
    const bubbleRadius = r + 6 + pulse * 2;
    
    const grad = ctx.createRadialGradient(x, y, bubbleRadius * 0.4, x, y, bubbleRadius);
    grad.addColorStop(0, "rgba(255, 207, 106, 0.05)");
    grad.addColorStop(0.7, "rgba(255, 207, 106, 0.25)");
    grad.addColorStop(1, "rgba(255, 170, 0, 0.7)");
    
    ctx.strokeStyle = "rgba(255, 207, 106, 0.85)";
    ctx.lineWidth = 1.5 + Math.sin(time * 5) * 0.5;
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.arc(x, y, bubbleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 170, 0, 0.4)";
    ctx.lineWidth = 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * bubbleRadius, y + Math.sin(angle) * bubbleRadius);
      ctx.lineTo(x + Math.cos(angle) * (bubbleRadius + 5), y + Math.sin(angle) * (bubbleRadius + 5) + 3);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffcf6a";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SOS", x, y - bubbleRadius - 6);
  }

  ctx.restore();
}

function drawBladeCompanion(ctx, x, y, r, time) {
  // Cuerpo / Torso (Armadura de cuero y hombreras)
  ctx.fillStyle = "#8a5229";
  ctx.fillRect(x - r * 0.6, y - r * 0.1, r * 1.2, r * 1.0);
  ctx.fillStyle = "#d5dbdb"; // Hombreras metálicas
  ctx.fillRect(x - r * 0.75, y - r * 0.2, r * 0.35, r * 0.3);
  ctx.fillRect(x + r * 0.4, y - r * 0.2, r * 0.35, r * 0.3);

  // Espada en la espalda (diagonal)
  ctx.strokeStyle = "#85929e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y + r * 0.2);
  ctx.lineTo(x + r * 0.6, y - r * 0.8);
  ctx.stroke();
  
  ctx.strokeStyle = "#f1c40f"; // Empuñadura dorada
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.6);
  ctx.lineTo(x + r * 0.8, y - r * 1.0);
  ctx.stroke();

  // Cabeza / Rostro
  ctx.fillStyle = "#f5d0a0";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.45, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Cabello naranja/rojizo largo
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.arc(x, y - r * 0.65, r * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Cinta de guerrero (diadema roja)
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(x - r * 0.38, y - r * 0.72, r * 0.76, r * 0.12);

  // Ojos decididos (azules)
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.arc(x - r * 0.15, y - r * 0.45, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + r * 0.15, y - r * 0.45, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuneCompanion(ctx, x, y, r, time) {
  // Capa / Túnica (Púrpura)
  ctx.fillStyle = "#4a154b";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y - r * 0.15);
  ctx.lineTo(x - r * 0.8, y + r * 0.9);
  ctx.lineTo(x + r * 0.8, y + r * 0.9);
  ctx.lineTo(x + r * 0.6, y - r * 0.15);
  ctx.closePath();
  ctx.fill();

  // Rostro
  ctx.fillStyle = "#f5d0a0";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.42, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Pelo púrpura oscuro
  ctx.fillStyle = "#7d3c98";
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.25, r * 0.24, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28, y - r * 0.25, r * 0.24, 0, Math.PI * 2);
  ctx.arc(x, y - r * 0.6, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Capucha (morada)
  ctx.fillStyle = "#682c6a";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.6, r * 0.46, Math.PI, 0);
  ctx.fill();

  // Ojos brillantes (morado neón)
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = "#e8daef";
  ctx.fillStyle = "#af7ac5";
  ctx.beginPath();
  ctx.arc(x - r * 0.14, y - r * 0.42, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + r * 0.14, y - r * 0.42, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Runa flotando en su mano (pequeño rombo brillante)
  const pulse = Math.sin(time * 6) * 1.5;
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#bb8fce";
  ctx.fillStyle = "#ebdef0";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y + r * 0.3 + pulse);
  ctx.lineTo(x - r * 0.3, y + r * 0.1 + pulse);
  ctx.lineTo(x - r * 0.1, y + r * 0.3 + pulse);
  ctx.lineTo(x - r * 0.3, y + r * 0.5 + pulse);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHealerCompanion(ctx, x, y, r, time) {
  // Vestido (blanco y verde)
  ctx.fillStyle = "#f2fcf9";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r * 0.1);
  ctx.lineTo(x - r * 0.75, y + r * 0.95);
  ctx.lineTo(x + r * 0.75, y + r * 0.95);
  ctx.lineTo(x + r * 0.55, y - r * 0.1);
  ctx.closePath();
  ctx.fill();

  // Detalles verdes del vestido
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(x - r * 0.18, y - r * 0.05, r * 0.36, r * 1.0);

  // Rostro
  ctx.fillStyle = "#f5d0a0";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.42, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Cabello verde suave pastel
  ctx.fillStyle = "#7dcea0";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.22, r * 0.25, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.22, r * 0.25, 0, Math.PI * 2);
  ctx.arc(x, y - r * 0.58, r * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Diadema de flores/hojas amarillas y verdes
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.62, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + r * 0.2, y - r * 0.62, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#27ae60";
  ctx.arc(x, y - r * 0.66, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Ojos (verdes y amables)
  ctx.fillStyle = "#1e8449";
  ctx.beginPath();
  ctx.arc(x - r * 0.14, y - r * 0.42, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + r * 0.14, y - r * 0.42, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Bastón de madera con hoja
  ctx.strokeStyle = "#873600";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, y - r * 0.6);
  ctx.lineTo(x + r * 0.6, y + r * 0.95);
  ctx.stroke();

  // Hoja mágica arriba del bastón
  ctx.fillStyle = "#2ecc71";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.6, y - r * 0.75, r * 0.18, r * 0.1, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Utilidades de dibujo --------------------------------------------------

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a  = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const ia = a + 2 * Math.PI / 5;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else         ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(ia) * r * 0.4, y + Math.sin(ia) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
}

// ---- Minimap ---------------------------------------------------------------

function drawMinimap(ctx, game) {
  const { map, player, monsters } = game;
  const W = 150, H = 112, pad = 10;
  const ox = pad, oy = CANVAS.height - H - pad;
  const sx = W / map.cols, sy = H / map.rows;

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#0a0c12";
  ctx.fillRect(ox - 2, oy - 2, W + 4, H + 4);

  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const id = map.get(c, r);
      if (id === T.WALL) continue;
      ctx.fillStyle = id === T.EXIT ? "#4fd06a" : "#39405c";
      ctx.fillRect(ox + c * sx, oy + r * sy, sx + 0.5, sy + 0.5);
    }
  }
  ctx.fillStyle = "#d15a5a";
  for (const m of monsters) {
    if (!m.alive) continue;
    const mc = m.x / map.widthPx * W, mr = m.y / map.heightPx * H;
    ctx.fillRect(ox + mc - 1, oy + mr - 1, m.isBoss ? 4 : 2, m.isBoss ? 4 : 2);
  }
  ctx.fillStyle = "#ffd24d";
  const pc = player.x / map.widthPx * W, pr = player.y / map.heightPx * H;
  ctx.fillRect(ox + pc - 2, oy + pr - 2, 4, 4);
  ctx.globalAlpha = 1;
}

function effectColor(player, time) {
  const e = player.activeEffects.find((x) => x.expiresAt > time);
  return e && e.type === "shield" ? "#6cc6ff"
       : e && e.type === "speed"  ? "#8cffa0"
       : "#ff9a5a";
}

function drawSwing(ctx, p, camera) {
  const w = p.weapon;
  const fa = Math.atan2(p.facing.y, p.facing.x);
  const sx = p.x - camera.x, sy = p.y - camera.y;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.arc(sx, sy, w.range, fa - w.arc / 2, fa + w.arc / 2);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,240,180,0.30)";
  ctx.fill();
}

function drawHpBar(ctx, x, y, frac) {
  const w = 28, h = 4;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = frac > 0.4 ? "#5ad15a" : "#d15a5a";
  ctx.fillRect(x - w / 2, y, w * frac, h);
}

function drawEncounterMarker(ctx, encounter, camera, time) {
  const icon = encounter.type === "treasure" ? "◆"
             : encounter.type === "hazard" ? "!"
             : encounter.type === "ranged" ? "⌖"
             : encounter.type === "ambush" ? "×"
             : encounter.type === "ice_escape" ? "✦"
             : "⚔";
  const x = (encounter.room.x + encounter.room.w / 2) * TILE - camera.x;
  const y = (encounter.room.y + encounter.room.h / 2) * TILE - camera.y;
  const pulse = 0.55 + Math.sin(time * 2) * 0.12;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = encounter.type === "treasure" ? "#ffd24d"
              : encounter.type === "hazard" ? "#ff6b32"
              : encounter.type === "ranged" ? "#8bd8ff"
              : encounter.type === "ambush" ? "#ff6f8f"
              : encounter.type === "ice_escape" ? "#bcefff"
              : "#f3e6c0";
  ctx.font = "22px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x, y);
  ctx.restore();
}

function projectileColor(pr) {
  if (pr.type === "ice") return { fill: "#9fe9ff", glow: "#bdf6ff" };
  if (pr.type === "bomb") return { fill: "#2b2430", glow: "#ffcc4d" };
  if (pr.type === "fire") return { fill: "#ff8a1f", glow: "#ff9900" };
  if (pr.type === "darkness") return { fill: "#b100ff", glow: "#da00ff" };
  if (pr.type === "blast") return { fill: "#ffea78", glow: "#ffa200" };
  return { fill: "#ff2200", glow: "#ff5500" };
}

function drawItem(ctx, it, x, y) {
  if (it.kind === "coin") {
    ctx.save();
    ctx.shadowBlur = 7;
    ctx.shadowColor = "#ffea00";
    ctx.fillStyle = "#ffe135";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9c7c00";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 2, y - 5, 4, 10);
    ctx.restore();
    return;
  }
  drawEmoji(ctx, it.emoji, x, y, it.radius * 2);
}

function drawChest(ctx, x, y, rare) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 17, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rare ? "#8f4bd6" : "#8a5522";
  ctx.fillRect(x - 15, y - 6, 30, 21);
  ctx.fillStyle = rare ? "#b980ff" : "#b46d2a";
  ctx.fillRect(x - 15, y - 13, 30, 9);
  ctx.fillStyle = "#ffd24d";
  ctx.fillRect(x - 3, y - 8, 6, 14);
  ctx.strokeStyle = "#2a1608";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 15, y - 13, 30, 28);
}

function drawEmoji(ctx, ch, x, y, size) {
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y);
}

function drawQuicksand(ctx, sx, sy, time, col, row) {
  const seed = (col * 12.9898 + row * 78.233) % 1;
  const phase = seed * Math.PI * 2;
  const cx = sx + TILE / 2;
  const cy = sy + TILE / 2;

  // Base mud color
  ctx.fillStyle = "#4a3a23";
  ctx.fillRect(sx, sy, TILE, TILE);

  // Swirling vortex layers
  ctx.save();
  // Clip to the tile boundaries
  ctx.beginPath();
  ctx.rect(sx, sy, TILE, TILE);
  ctx.clip();

  // Draw concentric animated spirals or waves sinking to the center
  const numRings = 3;
  for (let i = 0; i < numRings; i++) {
    const t = (time * 0.45 + phase + i / numRings) % 1;
    const r = (TILE * 0.72) * (1 - t);
    
    // Draw spiral arcs or textured circles
    ctx.strokeStyle = `rgba(120, 94, 60, ${t * 0.5})`; // wet sand lighter color
    ctx.lineWidth = 2;
    ctx.beginPath();
    const startAngle = time * 0.9 + phase + (1 - t) * 3.5;
    const endAngle = startAngle + Math.PI * 1.4;
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();
  }

  // Draw vortex center (darker)
  ctx.fillStyle = "rgba(45, 34, 20, 0.75)";
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * (1.0 + Math.sin(time * 2 + phase) * 0.2), 0, Math.PI * 2);
  ctx.fill();

  // Sinking sand dots
  ctx.fillStyle = "rgba(215, 185, 142, 0.45)"; // light sand color
  for (let j = 0; j < 4; j++) {
    const pSeed = (seed * 13 + j * 7) % 1;
    const pTime = (time * 0.5 + pSeed) % 1;
    const pAngle = pSeed * Math.PI * 2 + time * 1.3;
    const pDist = (TILE * 0.55) * (1 - pTime);
    const px = cx + Math.cos(pAngle) * pDist;
    const py = cy + Math.sin(pAngle) * pDist;
    
    const pSize = 1.6 * (1 - pTime);
    if (pSize > 0.2) {
      ctx.fillRect(px - pSize/2, py - pSize/2, pSize, pSize);
    }
  }

  ctx.restore();
}

