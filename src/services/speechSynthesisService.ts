/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class SpeechSynthesisManager {
  private isEnabled: boolean = false;
  private queue: string[] = [];
  private isSpeaking: boolean = false;
  private currentLanguage: string = 'en-US';
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private volume: number = 1.0;
  private unlocked: boolean = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private watchdogTimer: any = null;
  private resumeInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Warm up voices
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          try {
            window.speechSynthesis.getVoices();
          } catch {}
        };
      } catch {}
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Unlock speech synthesis in mobile browsers (must be called from a user gesture)
   */
  public unlockAudio(sampleConfirmationText?: string) {
    if (!this.isSupported()) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Clear any stuck utterances
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.queue = [];
      this.unlocked = true;

      if (sampleConfirmationText && sampleConfirmationText.trim()) {
        this.speak(sampleConfirmationText);
      }
    } catch (e) {
      console.warn('Speech unlock error:', e);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setLanguage(ttsCode: string) {
    this.currentLanguage = ttsCode;
  }

  public setParams(rate: number, pitch: number, volume: number) {
    this.rate = rate;
    this.pitch = pitch;
    this.volume = volume;
  }

  public speak(text: string) {
    if (!this.isEnabled || !this.isSupported() || !text || !text.trim()) return;

    const cleanText = text.trim();

    // Mobile browser resume safeguard
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    // Safeguard: Reconcile browser native state with our state
    if (!window.speechSynthesis.speaking && this.isSpeaking) {
      this.isSpeaking = false;
      this.activeUtterance = null;
    }

    // Drop ancient queue items if speaker is talking fast
    if (this.queue.length > 4) {
      this.queue.shift();
    }

    this.queue.push(cleanText);
    this.processQueue();
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0 || !this.isEnabled) return;

    const nextText = this.queue.shift();
    if (!nextText || !nextText.trim()) return;

    this.isSpeaking = true;

    try {
      const utterance = new SpeechSynthesisUtterance(nextText);
      utterance.lang = this.currentLanguage;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      this.activeUtterance = utterance;

      // Match best voice
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const target = this.currentLanguage.toLowerCase().replace('_', '-');
          const exactMatch = voices.find(v => v.lang.toLowerCase().replace('_', '-') === target);
          const prefixMatch = voices.find(v => v.lang.toLowerCase().startsWith(target.slice(0, 2)));
          if (exactMatch) {
            utterance.voice = exactMatch;
          } else if (prefixMatch) {
            utterance.voice = prefixMatch;
          }
        }
      } catch {}

      // Clear previous watchdog/resume timers
      if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
      if (this.resumeInterval) clearInterval(this.resumeInterval);

      // Watchdog timeout to prevent browser freeze on stuck utterance
      this.watchdogTimer = setTimeout(() => {
        if (this.isSpeaking && this.activeUtterance === utterance) {
          console.warn('Speech synthesis watchdog: unblocking queue');
          this.cleanupCurrent();
          this.processQueue();
        }
      }, 10000);

      // Mobile Chrome / Safari workaround: pulse resume every 3.5s to prevent pausing
      this.resumeInterval = setInterval(() => {
        if (this.isSpeaking) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {}
        }
      }, 3500);

      utterance.onend = () => {
        this.cleanupCurrent();
        this.processQueue();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        this.cleanupCurrent();
        this.processQueue();
      };

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis speak failed:', err);
        this.cleanupCurrent();
      }
    } catch (e) {
      console.warn('Failed to create SpeechSynthesisUtterance:', e);
      this.cleanupCurrent();
    }
  }

  private cleanupCurrent() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
    this.activeUtterance = null;
    this.isSpeaking = false;
  }

  public testVoice(phrase?: string) {
    const testPhrase = phrase || (
      this.currentLanguage.startsWith('it')
        ? 'Prova audio completata. La sintesi vocale è attiva.'
        : this.currentLanguage.startsWith('es')
        ? 'Prueba de audio completada. La voz en vivo está activa.'
        : this.currentLanguage.startsWith('fr')
        ? 'Test audio réussi. La synthèse vocale est active.'
        : this.currentLanguage.startsWith('ro')
        ? 'Test audio reușit. Sinteza vocală este activă.'
        : 'Audio test successful. Live speech is active.'
    );
    this.unlockAudio();
    this.speak(testPhrase);
  }

  public cancel() {
    this.queue = [];
    this.cleanupCurrent();
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const speechSynthesizer = new SpeechSynthesisManager();
