// Bootstrap: arma canvas, input, Game, pantallas y arranca el loop.

import { Game } from "./Game.js";
import { startLoop } from "./core/loop.js";
import { initInput } from "./core/input.js";
import { initAudio } from "./core/audio.js";
import { initScreens } from "./ui/screens.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

initInput();
initAudio();

const game = new Game(ctx);
const screens = initScreens(game);

// Hook de depuración solo con ?debug en la URL
if (new URLSearchParams(location.search).has("debug")) window.__game = game;

startLoop({
  update: (dt) => game.update(dt),
  render: () => {
    game.render();
    screens.sync();
  },
});

// Registrar el Service Worker para soporte sin conexión (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registrado con éxito:', reg.scope))
      .catch((err) => console.error('Error al registrar el Service Worker:', err));
  });
}

