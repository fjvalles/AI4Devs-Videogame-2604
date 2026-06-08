// Game loop con timestep fijo + acumulador.
// update(STEP) corre a paso constante => física determinista, independiente del FPS.
// render(alpha) corre una vez por frame.

import { STEP_MS } from "../config.js";

export function startLoop({ update, render }) {
  let last = performance.now();
  let acc = 0;
  let running = true;

  function frame(now) {
    if (!running) return;

    let dt = now - last;
    last = now;
    // Clamp anti "spiral of death" (pestaña en background, breakpoint, etc.)
    if (dt > 250) dt = 250;

    acc += dt;
    while (acc >= STEP_MS) {
      update(STEP_MS / 1000); // segundos
      acc -= STEP_MS;
    }

    render(acc / STEP_MS); // alpha de interpolación (0..1)
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    stop() { running = false; },
  };
}
