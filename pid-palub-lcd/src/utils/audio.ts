/**
 * Web Audio API synthesizer for Prague Integrated Transport (PID) chime/gong
 * and optional SpeechSynthesis voice announcements in Czech.
 */

class TransitAudioManager {
  private audioCtx: AudioContext | null = null;
  public soundEnabled = true;
  public voiceEnabled = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Authentic two-tone melodic chime used in Czech transit vehicle LCD systems
   */
  public playChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Tone 1: high gong note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: resolution chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6

      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Audio might be blocked until user gesture, safe to ignore
    }
  }

  /**
   * Optional Czech voice announcement
   */
  public announceStop(stopName: string, isTerminus = false, transfers: string[] = []): void {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      let text = isTerminus ? `Konečná zastávka: ${stopName}. Prosíme vystupte.` : `Příští zastávka: ${stopName}.`;

      if (transfers.includes('metro-a')) text += ' Přestup na metro A.';
      if (transfers.includes('metro-b')) text += ' Přestup na metro B.';
      if (transfers.includes('metro-c')) text += ' Přestup na metro C.';
      if (transfers.includes('metro-d')) text += ' Přestup na metro D.';
      if (transfers.includes('train')) text += ' Přestup na vlak.';
      if (transfers.includes('airport')) text += ' Letiště.';

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'cs-CZ';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try finding Czech voice if available
      const voices = window.speechSynthesis.getVoices();
      const csVoice = voices.find(v => v.lang.startsWith('cs') || v.lang.startsWith('sk'));
      if (csVoice) {
        utterance.voice = csVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // safe fallback
    }
  }
}

export const transitAudio = new TransitAudioManager();
