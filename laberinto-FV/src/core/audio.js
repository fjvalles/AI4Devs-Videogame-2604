// Audio mínimo con WebAudio (sin archivos). Beeps cortos por evento.
// El contexto se crea al primer gesto del usuario (política de autoplay).

let ctx = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Despierta el audio en la primera interacción (requerido por navegadores)
export function initAudio() {
  const wake = () => ensure();
  window.addEventListener("keydown", wake, { once: true });
  window.addEventListener("pointerdown", wake, { once: true });
}

function beep(freq, durMs, type = "square", gain = 0.04) {
  const ac = ensure();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ac.destination);
  const t = ac.currentTime;
  osc.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
  osc.stop(t + durMs / 1000);
}

let musicInterval = null;
let currentMusicMode = null; // 'calm', 'hell', or null
let stepIndex = 0;

// Calm scale: E minor pentatonic / Dreamy elven vibes
const calmScale = [
  164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00 // E3, G3, A3, B3, D4, E4, G4, A4
];

// Hell bass pattern (driving minor/dissonant)
const hellBass = [
  55.00, 55.00, 58.27, 61.74, 55.00, 55.00, 58.27, 49.00 // A1, A1, A#1, B1, A1, A1, A#1, G1
];

export function setMusicLevel(level, isHellMode = false) {
  if (level === 0) {
    stopMusic();
    return;
  }

  const desiredMode = isHellMode ? "hell" : "calm";
  if (currentMusicMode === desiredMode) return;

  stopMusic();
  currentMusicMode = desiredMode;
  ensure();
  
  if (desiredMode === "calm") {
    playCalm();
  } else {
    playHell();
  }
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  currentMusicMode = null;
}

function playCalm() {
  stepIndex = 0;
  musicInterval = setInterval(() => {
    const ac = ensure();
    if (!ac || ac.state === "suspended") return;
    
    // Arpeggiator / Melody
    if (stepIndex % 2 === 0) {
      // Base note (chords)
      const baseNote = stepIndex % 8 === 0 ? 110.00 : 130.81; // A2 or C3
      playSynthNote(baseNote, 2.5, "sine", 0.025);
    }
    
    const randomNote = calmScale[Math.floor(Math.random() * calmScale.length)];
    playSynthNote(randomNote, 2.0, "triangle", 0.012);
    
    stepIndex++;
  }, 800);
}

function playHell() {
  stepIndex = 0;
  musicInterval = setInterval(() => {
    const ac = ensure();
    if (!ac || ac.state === "suspended") return;
    
    const bassFreq = hellBass[stepIndex % hellBass.length];
    playSynthNote(bassFreq, 0.25, "sawtooth", 0.035);
    
    if (stepIndex % 16 === 0) {
      playSynthNote(880, 0.4, "sawtooth", 0.012);
    } else if (stepIndex % 16 === 8) {
      playSynthNote(784, 0.3, "sawtooth", 0.012);
    }
    
    if (stepIndex % 8 === 4) {
      playSynthNote(120, 0.1, "triangle", 0.02);
    }
    
    stepIndex++;
  }, 160);
}

function playSynthNote(freq, durSec, type = "triangle", gainValue = 0.04) {
  const ac = ensure();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gainValue;
  osc.connect(g).connect(ac.destination);
  const t = ac.currentTime;
  osc.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
  osc.stop(t + durSec);
}

export const sfx = {
  attack: () => beep(220, 60, "square", 0.025),
  hit: () => beep(140, 80, "sawtooth", 0.05),
  pickup: () => beep(660, 70, "triangle", 0.05),
  chest: () => { beep(392, 70, "triangle", 0.04); setTimeout(() => beep(784, 90, "triangle", 0.04), 80); },
  monsterShoot: () => beep(310, 55, "square", 0.025),
  bossShoot: () => { beep(92, 120, "sawtooth", 0.05); setTimeout(() => beep(184, 80, "square", 0.035), 55); },
  fire: () => beep(120, 45, "sawtooth", 0.018),
  water: () => beep(520, 45, "sine", 0.015),
  mazeShift: () => { beep(82, 120, "sawtooth", 0.028); setTimeout(() => beep(164, 80, "triangle", 0.022), 110); },
  levelUp: () => { beep(523, 80, "triangle", 0.045); setTimeout(() => beep(880, 120, "triangle", 0.045), 90); },
  death: (boss = false) => boss ? beep(73, 360, "sawtooth", 0.07) : beep(110, 180, "sawtooth", 0.06),
  victory: () => { beep(523, 120); setTimeout(() => beep(659, 120), 120); setTimeout(() => beep(784, 200), 240); },
  gameover: () => { beep(196, 200); setTimeout(() => beep(147, 300), 180); },
  level: () => { beep(440, 90); setTimeout(() => beep(660, 120), 90); },
};
