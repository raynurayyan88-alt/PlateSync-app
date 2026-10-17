/**
 * Web Audio API Notification Chime for Kitchen Display System (KDS)
 * Synthesizes an authentic, high-contrast two-tone kitchen order bell (D5 -> A5).
 * Zero external audio files, zero network delay.
 */

class KdsAudioChime {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {
        // Autoplay policy may require user interaction first
      });
    }

    return this.audioCtx;
  }

  /**
   * Play a crisp, pleasant 2-tone kitchen ticket notification chime
   */
  public playNewOrderChime(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5) - warm restaurant bell tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.46);

      // Note 2: 880 Hz (A5) - bright higher bell tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, now + 0.12);

      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.76);
    } catch (err) {
      console.warn("[KDS Chime] Unable to play audio chime:", err);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public unlockAudio(): void {
    this.getAudioContext();
  }
}

export const kdsChime = new KdsAudioChime();
