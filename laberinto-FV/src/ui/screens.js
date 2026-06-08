// Conecta las pantallas/HUD del DOM con el estado del Game.
// Muestra una pantalla a la vez y sincroniza el HUD cada frame.

import { STATE, LEVELS } from "../config.js";

const EFFECT_ICON = { speed: "👟", damage: "💪", shield: "🛡️" };

const SCREENS = {
  [STATE.MENU]: "screen-menu",
  [STATE.PAUSED]: "screen-paused",
  [STATE.GAME_OVER]: "screen-gameover",
  [STATE.VICTORY]: "screen-victory",
};

export function initScreens(game) {
  const all = [
    "screen-menu", "screen-paused", "screen-gameover", "screen-victory",
  ].map((id) => document.getElementById(id));
  const hud = document.getElementById("hud");
  const floorVisualizer = document.getElementById("floor-visualizer");

  const levelSelect = document.getElementById("level-select");
  const btnContinue = document.getElementById("btn-continue");

  // Crear nodos del visualizador de pisos
  if (floorVisualizer) {
    floorVisualizer.innerHTML = "";
  }

  // Delegación: cualquier botón con data-action despacha al Game
  document.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    game.dispatch(btn.dataset.action);
  });

  return {
    sync() {
      syncLevelSelect(game, levelSelect);
      const visibleId = SCREENS[game.state] || null;
      for (const el of all) el.classList.toggle("hidden", el.id !== visibleId);

      // Mostrar/ocultar el botón Continuar si hay una partida guardada
      if (game.state === STATE.MENU && btnContinue) {
        const hasSaved = localStorage.getItem("laberinto.savedRun") !== null;
        btnContinue.classList.toggle("hidden", !hasSaved);
      }

      hud.classList.toggle("hidden", game.state !== STATE.PLAYING);
      if (floorVisualizer) {
        floorVisualizer.classList.toggle("hidden", game.state !== STATE.PLAYING);
      }

      if (game.state === STATE.PLAYING && game.player) {
        const p = game.player;

        const timerContainer = document.getElementById("hud-timer-container");
        const timerIcon = document.getElementById("hud-timer-icon");
        const timerText = document.getElementById("hud-timer-text");

        if (timerContainer && timerText && timerIcon) {
          if (game.isHellMode) {
            timerContainer.classList.add("hell-mode");
            timerContainer.classList.remove("low-time");
            timerIcon.textContent = "👹";
            timerText.textContent = "INFIERNO";
          } else {
            timerContainer.classList.remove("hell-mode");
            const secs = Math.ceil(game.levelTimeLeft);
            const mm = String(Math.floor(secs / 60)).padStart(2, "0");
            const ss = String(secs % 60).padStart(2, "0");
            timerText.textContent = `${mm}:${ss}`;
            
            if (secs <= 10) {
              timerContainer.classList.add("low-time");
              timerIcon.textContent = "⚠️";
            } else {
              timerContainer.classList.remove("low-time");
              timerIcon.textContent = "⏱️";
            }
          }
        }
        
        // Sincronizar el visualizador de pisos
        // Sincronizar el visualizador de pisos dinámicamente para evitar que estén muy pegados
        if (floorVisualizer) {
          const currentLevelStr = String(game.level);
          if (floorVisualizer.dataset.renderedLevel !== currentLevelStr) {
            floorVisualizer.dataset.renderedLevel = currentLevelStr;
            floorVisualizer.innerHTML = "";

            // Mostrar un rango de 5 pisos alrededor del actual
            let start = Math.max(1, game.level - 2);
            let end = Math.min(LEVELS.total, start + 4);
            if (end - start < 4) {
              start = Math.max(1, end - 4);
            }

            if (start > 1) {
              const dots = document.createElement("div");
              dots.className = "floor-dots";
              dots.textContent = "···";
              floorVisualizer.appendChild(dots);
            }

            for (let f = start; f <= end; f++) {
              const node = document.createElement("div");
              node.className = "floor-node";
              if (f === LEVELS.total) node.classList.add("final-floor");
              if (f === game.level) {
                node.classList.add("current");
              } else if (f < game.level) {
                node.classList.add("visited");
              }
              node.id = `floor-node-${f}`;
              node.textContent = String(f);
              floorVisualizer.appendChild(node);
            }

            if (end < LEVELS.total) {
              const dots = document.createElement("div");
              dots.className = "floor-dots";
              dots.textContent = "···";
              floorVisualizer.appendChild(dots);
            }
          }
        }

        document.getElementById("hud-hp").textContent = `❤️ ${Math.ceil(p.hp)}`;
        document.getElementById("hud-coins").innerHTML = `<span class="yellow-coin">🪙</span> ${p.inventory.coins}`;
        document.getElementById("hud-ammo").textContent = `🏹 ${p.inventory.ammo}`;
        document.getElementById("hud-keys").textContent = `🌀 ${p.inventory.keys}`;
        document.getElementById("hud-weapon").textContent = `${p.weapon.emoji} ${p.weapon.name.toUpperCase()}`;

        const xpPercent = Math.min(100, Math.floor((p.xp / p.xpNext) * 100));
        document.getElementById("hud-level").innerHTML = `
          <div class="level-info">
            <span class="level-badge">⭐ Nivel ${p.level}</span>
            <span class="xp-ratio">${p.xp}/${p.xpNext} XP</span>
          </div>
          <div class="xp-bar-container" title="Siguiente nivel otorga: +10 Max HP, +8% Daño, +3.5% Resistencia">
            <div class="xp-bar-fill" style="width: ${xpPercent}%"></div>
          </div>
          <div class="level-implication">
            Siguiente: +10 HP · +8% Daño · +3.5% Def
          </div>
        `;

        // Iconos de power-ups activos con segundos restantes
        const fx = p.activeEffects
          .filter((e) => e.expiresAt > game.time)
          .map((e) => `${EFFECT_ICON[e.type] || "✨"}${Math.ceil(e.expiresAt - game.time)}`)
          .join(" ");
        document.getElementById("hud-effects").textContent = fx;

        const banner = document.getElementById("hud-banner");
        banner.textContent = game.bannerMessage();
        banner.classList.toggle("hidden", !game.blockedMessageActive());

        const pickup = document.getElementById("hud-pickup");
        pickup.innerHTML = game.pickupMessage();
        pickup.classList.toggle("hidden", !game.pickupMessageActive());

        const tutorial = document.getElementById("hud-tutorial");
        const tutorialText = game.tutorialMessage();
        tutorial.textContent = tutorialText;
        tutorial.classList.toggle("hidden", !tutorialText);
      }

      if (game.state === STATE.GAME_OVER || game.state === STATE.VICTORY) {
        const s = game.summary();
        const text = `⚔️ ${s.kills} bajas · <span class="yellow-coin">🪙</span> ${s.coins} · 🏛️ Piso ${s.level} · ⏱️ ${s.time}`;
        const id = game.state === STATE.VICTORY ? "stats-victory" : "stats-gameover";
        document.getElementById(id).innerHTML = text;
      }
    },
  };
}

function syncLevelSelect(game, container) {
  if (!container) return;
  if (container.dataset.highest === String(game.highestUnlocked) && container.dataset.selected === String(game.selectedLevel)) return;
  container.dataset.highest = String(game.highestUnlocked);
  container.dataset.selected = String(game.selectedLevel);
  container.innerHTML = "";
  for (let level = 1; level <= LEVELS.total; level++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = `level:${level}`;
    btn.textContent = String(level);
    btn.disabled = level > game.highestUnlocked;
    btn.className = level === game.selectedLevel ? "selected" : "";
    container.appendChild(btn);
  }
}
