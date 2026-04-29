/**
 * Detector de actividad de voz (VAD) sencillo y reproductor de SFX.
 * Detecta si el usuario está hablando midiendo el RMS del micrófono.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private rafId = 0;
  private speakingCb: ((s: boolean) => void) | null = null;
  private lastSpeaking = false;
  private threshold = 18;       // RMS mínimo
  private holdMs = 600;         // tiempo que se mantiene el "hablando"
  private lastSpeakTs = 0;

  private sfxBuffers: Map<string, AudioBuffer> = new Map();

  attachStream(stream: MediaStream, onSpeaking: (speaking: boolean) => void) {
    this.detach();
    const Ctx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.buffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.source.connect(this.analyser);
    this.speakingCb = onSpeaking;
    this.tick();
  }

  detach() {
    cancelAnimationFrame(this.rafId);
    try { this.source?.disconnect(); } catch {}
    try { this.analyser?.disconnect(); } catch {}
    this.source = null;
    this.analyser = null;
    this.buffer = null;
    this.speakingCb = null;
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.ctx = null;
    this.lastSpeaking = false;
  }

  private tick = () => {
    if (!this.analyser || !this.buffer) return;
    this.analyser.getByteTimeDomainData(this.buffer);
    let sumSq = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = (this.buffer[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / this.buffer.length) * 100;
    const now = performance.now();
    if (rms > this.threshold) this.lastSpeakTs = now;
    const speaking = now - this.lastSpeakTs < this.holdMs;
    if (speaking !== this.lastSpeaking) {
      this.lastSpeaking = speaking;
      this.speakingCb?.(speaking);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  setThreshold(t: number) { this.threshold = Math.max(1, t); }

  // -----------------------------------------------------------------
  // SFX (procedural beeps; sin necesidad de assets)
  // -----------------------------------------------------------------
  playBeep(freq = 600, durationMs = 80, volume = 0.05) {
    try {
      const Ctx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
      setTimeout(() => ctx.close().catch(() => {}), 500);
    } catch {}
  }

  playJoin() { this.playBeep(880, 120); }
  playLeave() { this.playBeep(440, 120); }
  playMessage() { this.playBeep(700, 60, 0.04); }
}
