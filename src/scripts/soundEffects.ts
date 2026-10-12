// Web Audio API Synthesizer (0 KB external audio files)
class SoundManager {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMutedState = false;
  private isInitialized = false;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      this.isMutedState = localStorage.getItem('porto_muted') === 'true';
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this.setupEngineSound();
    } catch {
      // AudioContext not supported or blocked
    }
  }

  private setupEngineSound() {
    if (!this.ctx) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low purr
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch {
      // Ignore background oscillator setup failures
    }
  }

  public updateEngine(speedNormalized: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || this.isMutedState) return;

    const absSpeed = Math.abs(speedNormalized);
    if (absSpeed > 0.05) {
      const targetFreq = 55 + absSpeed * 110;
      const targetVol = Math.min(0.045, absSpeed * 0.05);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    } else {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  public playHonk() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    // Real automotive horn frequencies (Standard dual-tone: Low ~420Hz, High ~505Hz)
    const lowFreq = 415;
    const highFreq = 505;

    // Resonant acoustic chamber filter (metal diaphragm horn sound)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.Q.setValueAtTime(2.2, t);

    const masterGain = this.ctx.createGain();
    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    // Realistic car horn envelope: double burst "TIN - TIN!"
    // Burst 1: 0.10s, Pause: 0.05s, Burst 2: 0.18s
    const bursts = [
      { start: t, duration: 0.10, vol: 0.22 },
      { start: t + 0.14, duration: 0.18, vol: 0.25 },
    ];

    masterGain.gain.setValueAtTime(0, t);
    bursts.forEach(({ start, duration, vol }) => {
      // Instant punchy attack
      masterGain.gain.setValueAtTime(0, start);
      masterGain.gain.linearRampToValueAtTime(vol, start + 0.008);
      masterGain.gain.setValueAtTime(vol, start + duration - 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    });

    const totalEndTime = t + 0.34;

    // Low tone oscillator (sawtooth for brassy horn buzz)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(lowFreq, t);
    // Slight authentic diaphragm voltage sag
    osc1.frequency.linearRampToValueAtTime(lowFreq - 6, totalEndTime);

    // High tone oscillator (sawtooth for dissonance chord)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(highFreq, t);
    osc2.frequency.linearRampToValueAtTime(highFreq - 8, totalEndTime);

    // Triangle undertone/body
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(lowFreq * 2, t);

    const osc3Gain = this.ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.3, t);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(osc3Gain);
    osc3Gain.connect(filter);

    osc1.start(t);
    osc2.start(t);
    osc3.start(t);

    osc1.stop(totalEndTime);
    osc2.stop(totalEndTime);
    osc3.stop(totalEndTime);
  }

  public playArrive() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Friendly 3-tone chime (F5 -> A5 -> C6)
    const tones = [698.46, 880, 1046.5];
    const startTime = this.ctx.currentTime;

    tones.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = startTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.07, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  public playBump() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playBoost() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.28);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.33);
  }

  public playHop() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.14);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  public playCollect() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const tones = [523.25, 659.25, 783.99, 1046.5];
    const t = this.ctx.currentTime;

    tones.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.055;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.08, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  public playDrift() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(650, t + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playPaint() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.15);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playClick() {
    if (!this.ctx || this.isMutedState) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  public toggleMute(): boolean {
    this.isMutedState = !this.isMutedState;
    if (typeof window !== 'undefined') {
      localStorage.setItem('porto_muted', String(this.isMutedState));
    }
    if (this.isMutedState && this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    return this.isMutedState;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }
}

export const soundFx = new SoundManager();
