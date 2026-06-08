// Estado de input consultable. No dispara lógica: solo mantiene qué está activo.
// Los sistemas leen input.axis() / input.pressed() cada update.

const keys = new Set();

// Edge events (se consumen una vez): útil para "ESC presionado este frame".
const justPressed = new Set();

const MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  Escape: "pause",
  Space: "attack",
  Digit1: "weapon1",
  Digit2: "weapon2",
  Digit3: "weapon3",
  KeyV: "buyHp",
  KeyF: "buyAmmo",
};

export function initInput() {
  window.addEventListener("keydown", (e) => {
    const action = MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!keys.has(action)) justPressed.add(action);
    keys.add(action);
  });

  window.addEventListener("keyup", (e) => {
    const action = MAP[e.code];
    if (action) keys.delete(action);
  });

  // Evita teclas "pegadas" al perder foco
  window.addEventListener("blur", () => keys.clear());
}

export const input = {
  // Vector de dirección normalizado por componente (-1..1 en cada eje)
  axis() {
    const x = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
    const y = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    return { x, y };
  },
  held(action) { return keys.has(action); },
  // True una sola vez por pulsación; consúmelo al inicio del update.
  consumePressed(action) {
    if (justPressed.has(action)) { justPressed.delete(action); return true; }
    return false;
  },
  clearFrame() { justPressed.clear(); },
};
