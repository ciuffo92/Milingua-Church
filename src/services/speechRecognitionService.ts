/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Global declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognitionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onStatusChange?: (isListening: boolean) => void;
}

export class SpeechRecognitionManager {
  private recognition: any = null;
  private isListeningRequested: boolean = false;
  private currentLanguage: string = 'it-IT';
  private callbacks: SpeechRecognitionCallbacks;
  public selectedDeviceId: string = '';
  
  // Audio Metering
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  constructor(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  public static async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const hasLabels = audioInputs.some(d => d.label);

      // If permissions not yet granted, labels are blank. Briefly request access to obtain device names
      if (!hasLabels && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(t => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
        } catch {}
      }

      return devices.filter(d => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async start(languageCode: string = 'it-IT', deviceId?: string): Promise<boolean> {
    this.currentLanguage = languageCode;
    if (deviceId !== undefined) {
      this.selectedDeviceId = deviceId;
    }
    this.isListeningRequested = true;

    // Check support
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.callbacks.onError('Il tuo browser non supporta il riconoscimento vocale Web Speech. Usa Google Chrome, Edge o Safari.');
      return false;
    }

    try {
      // Start Audio Level Metering via getUserMedia with selected deviceId
      await this.startAudioMeter(this.selectedDeviceId);

      // Initialize Speech Recognition
      this.initRecognition(SpeechRec);
      this.recognition.start();
      this.callbacks.onStatusChange?.(true);
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message?.includes('denied')) {
        this.callbacks.onError('Permesso microfono negato. Consenti l\'accesso al microfono nelle impostazioni del browser.');
      } else {
        this.callbacks.onError(`Errore avvio microfono: ${err.message || 'Sconosciuto'}`);
      }
      this.stop();
      return false;
    }
  }

  private initRecognition(SpeechRec: any) {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          if (transcript.trim()) {
            this.callbacks.onFinal(transcript.trim());
          }
        } else {
          interim += transcript;
        }
      }
      if (interim.trim()) {
        this.callbacks.onInterim(interim.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' is normal during silence, don't crash
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.callbacks.onError('Accesso al microfono negato.');
        this.stop();
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if broadcaster still wants to listen (handles browser timeout after silence)
      if (this.isListeningRequested) {
        try {
          this.recognition?.start();
        } catch {
          // If rapid restart fails, retry shortly
          setTimeout(() => {
            if (this.isListeningRequested) {
              try {
                this.recognition?.start();
              } catch {}
            }
          }, 300);
        }
      } else {
        this.callbacks.onStatusChange?.(false);
      }
    };
  }

  private async startAudioMeter(deviceId?: string) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      
      const targetId = deviceId || this.selectedDeviceId;
      const audioConstraint = targetId ? { deviceId: { exact: targetId } } : true;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!this.analyser || !this.isListeningRequested) return;
        this.analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize 0 to 100
        const level = Math.min(100, Math.round((average / 128) * 100));
        this.callbacks.onAudioLevel?.(level);

        this.animationFrameId = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // Audio meter optional, non-blocking
    }
  }

  public setLanguage(langSpeechCode: string) {
    this.currentLanguage = langSpeechCode;
    if (this.isListeningRequested && this.recognition) {
      try {
        this.recognition.lang = langSpeechCode;
        this.recognition.abort();
      } catch {}
    }
  }

  public async setAudioDevice(deviceId: string) {
    this.selectedDeviceId = deviceId;
    if (this.isListeningRequested) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          await this.audioContext.close();
        } catch {}
        this.audioContext = null;
      }
      await this.startAudioMeter(deviceId);
    }
  }

  public stop() {
    this.isListeningRequested = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.callbacks.onAudioLevel?.(0);
    this.callbacks.onStatusChange?.(false);
  }
}
