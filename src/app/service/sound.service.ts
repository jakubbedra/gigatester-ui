import { Injectable } from '@angular/core';

const MUTE_KEY = 'sound:muted';

/** Tiny sound effects synthesised with the Web Audio API — no audio files to ship. */
@Injectable({ providedIn: 'root' })
export class SoundService {

  private ctx: AudioContext | null = null;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage unavailable */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (!this.muted) this.click();
  }

  private audio(): AudioContext | null {
    if (this.muted) return null;
    try {
      this.ctx = this.ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.12, slideTo?: number) {
    const ctx = this.audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  click() { this.tone(520, 0, 0.06, 'triangle', 0.08); }

  /** A single test passed. */
  pass() { this.tone(660, 0, 0.09, 'sine', 0.12); this.tone(880, 0.07, 0.12, 'sine', 0.12); }

  /** A single test failed. */
  fail() { this.tone(220, 0, 0.18, 'sawtooth', 0.07, 140); }

  /** Some, but not all, tests passed. */
  partial() { this.tone(440, 0, 0.12, 'triangle', 0.1); this.tone(554, 0.11, 0.12, 'triangle', 0.1); this.tone(659, 0.22, 0.2, 'triangle', 0.1); }

  /** Everything passed. */
  success() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.22, 'triangle', 0.13));
    this.tone(1319, 0.42, 0.45, 'sine', 0.11);
  }

}
