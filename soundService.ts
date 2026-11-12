/**
 * Web Audio API based Sound Service
 * Pure synthesized gentle & clear digital chime bell (no external sound files required)
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private repeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private isPreviewPlaying = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on first user interaction
   */
  public initUnlock(): void {
    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  /**
   * Play a soft, crystal-clear 3-note digital chime bell (C5 -> E5 -> G5)
   * High-resonance harmonic chime with exponential decay
   */
  public playChime(volume: number = 0.8): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz), C6 (1046.50 Hz)
      const notes = [
        { freq: 523.25, time: now + 0.00, duration: 0.9 },
        { freq: 659.25, time: now + 0.14, duration: 0.9 },
        { freq: 783.99, time: now + 0.28, duration: 1.2 },
        { freq: 1046.50, time: now + 0.42, duration: 1.5 },
      ];

      notes.forEach(({ freq, time, duration }) => {
        // Fundamental Tone (Sine wave)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Overtone for bell-like brightness (harmonics)
        const overtoneOsc = ctx.createOscillator();
        const overtoneGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        overtoneOsc.type = 'triangle';
        overtoneOsc.frequency.setValueAtTime(freq * 2, time);

        // Gain envelope: fast attack, exponential natural decay
        const safeVolume = Math.max(0.05, Math.min(volume, 1.0));
        const noteGainVal = safeVolume * 0.35;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(noteGainVal, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        overtoneGain.gain.setValueAtTime(0.0001, time);
        overtoneGain.gain.linearRampToValueAtTime(noteGainVal * 0.25, time + 0.015);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.7);

        // Connections
        osc.connect(gain);
        gain.connect(ctx.destination);

        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + duration);

        overtoneOsc.start(time);
        overtoneOsc.stop(time + duration * 0.7);
      });
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  /**
   * Start loop alert (repeats every intervalMs until stopLoopAlert is called)
   */
  public startLoopAlert(intervalMs: number = 7000, volume: number = 0.8): void {
    this.stopLoopAlert();
    // Play immediately first time
    this.playChime(volume);
    this.repeatIntervalId = setInterval(() => {
      this.playChime(volume);
    }, intervalMs);
  }

  /**
   * Stop any active looping alert
   */
  public stopLoopAlert(): void {
    if (this.repeatIntervalId) {
      clearInterval(this.repeatIntervalId);
      this.repeatIntervalId = null;
    }
  }

  /**
   * Preview chime for the settings dialog
   */
  public previewChime(volume: number = 0.8, onEnd?: () => void): void {
    if (this.isPreviewPlaying) return;
    this.isPreviewPlaying = true;
    this.playChime(volume);
    setTimeout(() => {
      this.isPreviewPlaying = false;
      if (onEnd) onEnd();
    }, 2000);
  }

  public isPreviewing(): boolean {
    return this.isPreviewPlaying;
  }
}

export const soundService = new SoundService();
