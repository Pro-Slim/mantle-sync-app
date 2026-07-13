// Lightweight, dependency-free sound effects synthesized via the Web Audio API.
// No audio files needed — sounds are generated on the fly.

import type { MouseEvent as ReactMouseEvent } from 'react';

const MUTE_STORAGE_KEY = 'mantle_sound_muted';

let audioCtx: AudioContext | null = null;
let muted = typeof window !== 'undefined' && localStorage.getItem(MUTE_STORAGE_KEY) === 'true';

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(value: boolean) {
  muted = value;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  }
}

export function toggleSoundMuted(): boolean {
  setSoundMuted(!muted);
  return muted;
}

// `ignoreMute`: some sounds (timeline recenter whoosh, event hover) stay
// audible even when the user mutes sound effects — only the button hover
// blip is silenced by the mute toggle.
function getContext(ignoreMute = false): AudioContext | null {
  if ((muted && !ignoreMute) || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  // Browsers suspend the context until a user gesture resumes it.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Short, soft futuristic blip for button hovers. */
export function playHoverSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(1900, now + 0.06);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/** Mechanical gear-turning "ratchet" sound for the Settings icon click. */
export function playGearTurnSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const clickCount = 6;
  const clickSpacing = 0.045;

  for (let i = 0; i < clickCount; i++) {
    const t = now + i * clickSpacing;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    // Each click lands a bit higher, like a ratchet winding up.
    osc.frequency.setValueAtTime(180 + i * 22, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }
}

/**
 * Delegated onMouseOver handler: attach once to a container and every
 * descendant `<button>` gets a hover sound, without wiring a listener onto
 * each button individually.
 */
export function handleButtonHoverSound(e: ReactMouseEvent) {
  // Bail before the closest('button') DOM walk when muted — this handler is
  // delegated to a whole-page root, so it runs on every mouseover bubble.
  if (muted) return;
  const target = (e.target as HTMLElement).closest('button');
  if (!target) return;
  const related = e.relatedTarget as HTMLElement | null;
  if (related && target.contains(related)) return;
  playHoverSound();
}

/** Warm, mellow "pluck" for hovering timeline events — groovier and softer than the button blip. Not affected by mute. */
export function playEventHoverSound() {
  const ctx = getContext(true);
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(165, now + 0.16);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, now);
  filter.Q.setValueAtTime(1, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

/** Windy whoosh sound for "center on today" / timeline recenter actions. Not affected by mute. */
export function playWhooshSound() {
  const ctx = getContext(true);
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.55;

  // Filtered noise buffer gives the "wind" texture.
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(0.8, now);
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.55);
  filter.frequency.exponentialRampToValueAtTime(400, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + duration * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + duration);
}
