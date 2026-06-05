// Web Audio API Sound Synthesizer
// Lazily initializes AudioContext on user interaction to comply with browser autoplay policies.

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

// 1. Light click/tick for clicking squares and menu items
export function playClick() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Short, high-frequency pop
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn("Audio click failed", e);
  }
}

// 2. Short, crisp tick for turn timer countdown
export function playTick() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {
    console.warn("Audio tick failed", e);
  }
}

// 3. Higher pitch timer alert for when time is running out (<= 3 seconds)
export function playTimerAlert() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio timer alert failed", e);
  }
}

// 4. Low buzzing sound for timeout
export function playTimeout() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(110, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.45);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(112, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(82, ctx.currentTime + 0.45);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio timeout failed", e);
  }
}

// 5. Retro arpeggio (C major chord) for win victory
export function playWin() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    const noteDuration = 0.08;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * noteDuration);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + index * noteDuration);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * noteDuration + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * noteDuration + 0.3);

      osc.start(ctx.currentTime + index * noteDuration);
      osc.stop(ctx.currentTime + index * noteDuration + 0.3);
    });
  } catch (e) {
    console.warn("Audio win failed", e);
  }
}

// 6. Descending, slightly discordant melody for draw/tie
export function playDraw() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const notes = [349.23, 329.63, 311.13, 293.66]; // F4, E4, Eb4, D4
    const noteDuration = 0.12;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * noteDuration);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime + index * noteDuration);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * noteDuration + 0.25);

      osc.start(ctx.currentTime + index * noteDuration);
      osc.stop(ctx.currentTime + index * noteDuration + 0.25);
    });
  } catch (e) {
    console.warn("Audio draw failed", e);
  }
}
