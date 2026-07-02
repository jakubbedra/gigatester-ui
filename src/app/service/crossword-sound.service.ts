import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CrosswordSoundService {

  private ctx: AudioContext | null = null;
  muted = false;

  constructor() {
    const saved = localStorage.getItem('crossword-sound-muted');
    if (saved !== null) this.muted = saved === 'true';
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('crossword-sound-muted', String(this.muted));
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    gain = 0.3,
    fadeOut = true
  ) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    vol.gain.setValueAtTime(gain, startTime);
    if (fadeOut) vol.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  playCorrect(atTime?: number) {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = atTime ?? ctx.currentTime;
    this.tone(880, 'sine', t, 0.12, 0.25);
    this.tone(1320, 'sine', t + 0.06, 0.1, 0.15);
  }

  playWrong(atTime?: number) {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = atTime ?? ctx.currentTime;
    this.tone(180, 'sawtooth', t, 0.18, 0.2);
  }

  playResultSequence(results: { correct: boolean }[], intervalSeconds = 0.5) {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    results.forEach((r, i) => {
      if (r.correct) this.playCorrect(t + i * intervalSeconds);
      else this.playWrong(t + i * intervalSeconds);
    });
  }

  playWordComplete() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    // Rising arpeggio: C5 E5 G5 C6
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.tone(freq, 'sine', t + i * 0.08, 0.22, 0.3);
    });
  }

  playWin() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    // Triumphant fanfare
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    const times  = [0,   0.1, 0.2,  0.32, 0.46, 0.56, 0.66];
    notes.forEach((f, i) => this.tone(f, 'sine', t + times[i], 0.28, 0.35));
  }

  playLose() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    // Descending sad notes
    [523, 466, 415, 349].forEach((freq, i) => {
      this.tone(freq, 'triangle', t + i * 0.18, 0.28, 0.25);
    });
  }
}
