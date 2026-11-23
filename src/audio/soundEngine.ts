import type { WeatherType } from '../types/game';

class WarnetSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientStarted = false;
  private musicTimer: number | null = null;
  private typingTimer: number | null = null;
  private neighborhoodTimer: number | null = null;
  private chordStep = 0;

  public muted = false;
  public musicEnabled = true;
  public ambientEnabled = true;
  public masterVolume = 0.55;
  private activePcCount = 0;
  private currentWeather: WeatherType = 'sunny';

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.08;
      this.ambientGain.connect(this.masterGain);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.14 : 0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndStart() {
    const ctx = this.ensureContext();
    if (!ctx || this.ambientStarted) return;
    this.ambientStarted = true;

    // Subtle PC fan + AC room drone using filtered noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 1.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    noise.connect(filter);
    if (this.ambientGain) filter.connect(this.ambientGain);
    noise.start();

    // Rain ambience noise loop (bandpassed shower texture)
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buffer;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1150;
    rainFilter.Q.value = 0.6;
    rainSrc.connect(rainFilter);
    if (this.rainGain) rainFilter.connect(this.rainGain);
    rainSrc.start();

    // Subtle lo-fi nostalgic warnet chords every 2.8s
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 349.23], // Fmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
    ];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || !this.musicEnabled || this.ctx.state !== 'running') return;
      const chord = chords[this.chordStep % chords.length];
      this.chordStep++;
      const now = this.ctx.currentTime;
      for (const freq of chord) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.045, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
        osc.connect(g);
        if (this.musicGain) g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 2.7);
      }
    }, 2800);

    // Subtle typing/clicking chatter proportional to occupied PCs
    this.typingTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || !this.ambientEnabled || this.activePcCount <= 0) return;
      if (this.ctx.state !== 'running') return;
      const chance = Math.min(0.85, 0.2 + this.activePcCount * 0.14);
      if (Math.random() > chance) return;
      this.playKeyboardTap();
    }, 340);

    // Neighborhood passing motorcycle hum + occasional customer sip/murmur
    this.neighborhoodTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || !this.ambientEnabled || this.ctx.state !== 'running') return;
      const roll = Math.random();
      if (roll < 0.35) {
        this.playDistantMotorPass();
      } else if (this.activePcCount > 0 && roll < 0.55) {
        this.playSipSfx();
      }
    }, 5200);
  }

  public setActivePcCount(count: number) {
    this.activePcCount = count;
    if (this.ambientGain && this.ctx) {
      const target = this.ambientEnabled ? Math.min(0.16, 0.03 + count * 0.012) : 0;
      this.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
    }
  }

  public setWeather(weather: WeatherType) {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    if (this.rainGain && this.ctx) {
      const target = this.ambientEnabled && !this.muted && weather === 'rain' ? 0.12 : 0;
      this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6);
    }
  }

  public setSettings(opts: { muted?: boolean; musicEnabled?: boolean; ambientEnabled?: boolean; masterVolume?: number }) {
    if (opts.muted !== undefined) this.muted = opts.muted;
    if (opts.musicEnabled !== undefined) this.musicEnabled = opts.musicEnabled;
    if (opts.ambientEnabled !== undefined) this.ambientEnabled = opts.ambientEnabled;
    if (opts.masterVolume !== undefined) this.masterVolume = opts.masterVolume;

    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.08);
    }
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.14 : 0, this.ctx.currentTime, 0.15);
    }
    if (this.ctx && this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(this.ambientEnabled ? 0.08 : 0, this.ctx.currentTime, 0.15);
    }
    if (this.ctx && this.rainGain) {
      const rainTarget = this.ambientEnabled && !this.muted && this.currentWeather === 'rain' ? 0.12 : 0;
      this.rainGain.gain.setTargetAtTime(rainTarget, this.ctx.currentTime, 0.25);
    }
  }

  private playKeyboardTap() {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900 + Math.random() * 900, now);
    g.gain.setValueAtTime(0.015, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  private playDistantMotorPass() {
    const ctx = this.ctx;
    if (!ctx || !this.ambientGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(88, now);
    osc.frequency.linearRampToValueAtTime(118, now + 0.45);
    osc.frequency.linearRampToValueAtTime(72, now + 1.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  public playSipSfx() {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
    g.gain.setValueAtTime(0.025, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCctvAlert() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    [1046.5, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      g.gain.setValueAtTime(0.08, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.16);
    });
  }

  public playDoorChime() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    [880, 698.46].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.13);
      g.gain.setValueAtTime(0.07, now + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.13 + 0.32);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.35);
    });
  }

  public playCashRegister() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    [1318.5, 1975.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      g.gain.setValueAtTime(0.11, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.25);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.26);
    });
  }

  public playBuildPlace() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playError() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playStageUp() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      g.gain.setValueAtTime(0.12, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.38);
    });
  }

  public dispose() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.typingTimer) clearInterval(this.typingTimer);
    if (this.neighborhoodTimer) clearInterval(this.neighborhoodTimer);
  }
}

export const soundEngine = new WarnetSoundEngine();
