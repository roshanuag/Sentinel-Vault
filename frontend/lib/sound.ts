/**
 * Cyberpunk SOC Audio Synthesizer via Web Audio API.
 * Zero external audio assets needed; works 100% offline.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Reference to the siren that is currently playing (if any), so it can be
// stopped on mute or before a new siren starts.
let activeSiren: { osc: OscillatorNode; gain: GainNode } | null = null;

function stopSiren() {
  if (!activeSiren || !audioCtx) {
    activeSiren = null;
    return;
  }
  const { osc, gain } = activeSiren;
  activeSiren = null;
  try {
    const now = audioCtx.currentTime;
    // Quick fade (~0.05s) from the current level to avoid a click, then stop.
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.stop(now + 0.06);
  } catch {
    // Ignore if the node has already stopped.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  // Muting while a siren is playing stops it immediately.
  if (!enabled) stopSiren();
}

export function playClick() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function playSuccess() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.05, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  } catch {
    // Audio restriction bypass
  }
}

export function playAlarm() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // If a siren is already playing, stop it first so they never overlap.
    stopSiren();

    const now = ctx.currentTime;
    const duration = 3;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";

    // Police-style siren: sweep up and down between ~600 Hz and ~1200 Hz
    // (about four wails across the 3s), driven by one continuous frequency curve.
    const low = 600;
    const high = 1200;
    const leg = 0.375; // seconds per up/down sweep leg (8 legs => ~4 wails over 3s)
    const legs = Math.round(duration / leg);
    osc.frequency.setValueAtTime(low, now);
    for (let i = 1; i <= legs; i++) {
      osc.frequency.linearRampToValueAtTime(i % 2 === 1 ? high : low, now + leg * i);
    }

    // Medium volume with a quick fade-in and fade-out (no harsh click).
    const peak = 0.12;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.08);
    gain.gain.setValueAtTime(peak, now + duration - 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    activeSiren = { osc, gain };
    osc.onended = () => {
      // Clear the reference when the siren ends on its own (not when it has
      // already been replaced by a newer siren).
      if (activeSiren && activeSiren.osc === osc) activeSiren = null;
    };

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Audio restriction bypass
  }
}
