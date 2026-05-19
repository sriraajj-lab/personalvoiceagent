import {Platform} from 'react-native';
import Voice from 'react-native-voice';
import {APP_CONFIG} from '../config';
import {TranscriptionLanguage, SupportedLanguage} from '../types';

export type TranscriptionCallback = {
  onPartialResult: (text: string, timestamp: number, language?: string) => void;
  onFinalResult: (text: string, timestamp: number, language?: string) => void;
  onError: (error: string) => void;
  onStatusChange: (status: TranscriptionStatus) => void;
};

export type TranscriptionStatus = 'idle' | 'listening' | 'processing' | 'error';

export class TranscriptionService {
  private static instance: TranscriptionService;
  private isListening: boolean = false;
  private status: TranscriptionStatus = 'idle';
  private callbacks?: TranscriptionCallback;
  private accumulatedText: string = '';
  private currentTranscript: string = '';
  private currentLanguage: TranscriptionLanguage = 'auto';
  private detectedLanguage: string = 'en';
  private deepgramSocket: WebSocket | null = null;
  private useDeepgram: boolean = true;
  private deepgramApiKey: string = '';

  private constructor() {
    this.setupVoiceListeners();
  }

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  setLanguage(language: TranscriptionLanguage): void {
    this.currentLanguage = language;
    console.log('Transcription language set to:', language);
  }

  getLanguage(): TranscriptionLanguage {
    return this.currentLanguage;
  }

  getDetectedLanguage(): string {
    return this.detectedLanguage;
  }

  configure(apiKey: string): void {
    this.deepgramApiKey = apiKey;
    this.useDeepgram = apiKey.length > 0 && apiKey !== '__DEEPGRAM_API_KEY__';
  }

  private getDeepgramLanguageParam(): string {
    if (this.currentLanguage === 'auto') {
      // Deepgram nova-2 multilingual supports en, hi, te
      // Use 'multi' for auto-detection between supported languages
      return 'multi';
    }
    return this.currentLanguage;
  }

  private connectDeepgramSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const language = this.getDeepgramLanguageParam();
        const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=${language}&encoding=linear16&sample_rate=16000&smart_format=true&punctuate=true&interim_results=true&endpointing=200`;

        this.deepgramSocket = new WebSocket(wsUrl, [
          'token',
          this.deepgramApiKey,
        ]);

        this.deepgramSocket.onopen = () => {
          console.log('Deepgram WebSocket connected');
          resolve();
        };

        this.deepgramSocket.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string);

            if (data.type === 'Results') {
              const channel = data.channel;
              if (channel && channel.alternatives && channel.alternatives.length > 0) {
                const alternative = channel.alternatives[0];
                const transcript = alternative.transcript;
                const confidence = alternative.confidence || 0;

                // Detect language from Deepgram response if available
                if (channel.language) {
                  this.detectedLanguage = channel.language;
                } else if (data.language) {
                  this.detectedLanguage = data.language;
                }

                if (transcript && transcript.trim().length > 0) {
                  const timestamp = Date.now();

                  if (data.is_final) {
                    this.currentTranscript = transcript;
                    this.accumulatedText += ' ' + transcript;
                    this.callbacks?.onFinalResult(transcript, timestamp, this.detectedLanguage);
                  } else {
                    this.currentTranscript = transcript;
                    this.callbacks?.onPartialResult(transcript, timestamp, this.detectedLanguage);
                  }
                }
              }
            } else if (data.type === 'Metadata') {
              console.log('Deepgram metadata:', data);
            }
          } catch (parseError) {
            console.error('Failed to parse Deepgram message:', parseError);
          }
        };

        this.deepgramSocket.onerror = (error: Event) => {
          console.error('Deepgram WebSocket error:', error);
          reject(new Error('Deepgram WebSocket error'));
        };

        this.deepgramSocket.onclose = (event: CloseEvent) => {
          console.log('Deepgram WebSocket closed:', event.code, event.reason);
          this.deepgramSocket = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendAudioChunkToDeepgram(chunkBase64: string): void {
    if (this.deepgramSocket && this.deepgramSocket.readyState === WebSocket.OPEN) {
      try {
        const binaryData = Uint8Array.from(atob(chunkBase64), c => c.charCodeAt(0));
        this.deepgramSocket.send(binaryData);
      } catch (error) {
        console.error('Failed to send audio chunk to Deepgram:', error);
      }
    }
  }

  private setupVoiceListeners(): void {
    Voice.onSpeechStart = () => {
      this.setStatus('listening');
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech ended (react-native-voice)');
    };

    Voice.onSpeechResults = (event: any) => {
      if (event.value && event.value.length > 0) {
        const text = event.value[0];
        this.currentTranscript = text;
        this.callbacks?.onFinalResult(text, Date.now());
        this.accumulatedText += ' ' + text;
      }
    };

    Voice.onSpeechPartialResults = (event: any) => {
      if (event.value && event.value.length > 0) {
        const partial = event.value[0];
        this.currentTranscript = partial;
        this.callbacks?.onPartialResult(partial, Date.now());
      }
    };

    Voice.onSpeechError = (event: any) => {
      const errorMsg = event.error?.message || 'Unknown speech error';
      console.error('Speech error:', errorMsg);
      this.callbacks?.onError(errorMsg);
      this.setStatus('error');
    };
  }

  async startListening(callbacks: TranscriptionCallback): Promise<boolean> {
    if (this.isListening) {
      return false;
    }

    this.callbacks = callbacks;
    this.accumulatedText = '';

    // Try Deepgram first if configured
    if (this.useDeepgram) {
      try {
        await this.connectDeepgramSocket();
        this.isListening = true;
        this.setStatus('listening');
        console.log('Deepgram transcription started, language:', this.getDeepgramLanguageParam());
        return true;
      } catch (deepgramError) {
        console.warn('Deepgram connection failed, falling back to react-native-voice:', deepgramError);
        this.useDeepgram = false;
      }
    }

    // Fall back to react-native-voice
    try {
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error('Speech recognition not available on this device');
      }

      // Set locale based on language preference
      let locale = 'en-US';
      if (this.currentLanguage === 'hi') {
        locale = 'hi-IN';
      } else if (this.currentLanguage === 'te') {
        locale = 'te-IN';
      }

      await Voice.start(locale);
      this.isListening = true;
      this.setStatus('listening');
      console.log('Voice transcription started with locale:', locale);
      return true;
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.callbacks?.onError('Failed to start: ' + String(error));
      this.setStatus('error');
      return false;
    }
  }

  async stopListening(): Promise<string> {
    this.isListening = false;

    try {
      // Close Deepgram WebSocket
      if (this.deepgramSocket) {
        try {
          // Send close message to Deepgram
          this.deepgramSocket.close(1000, 'Client stopping');
        } catch (wsError) {
          console.warn('Error closing Deepgram socket:', wsError);
        }
        this.deepgramSocket = null;
      }

      // Also stop react-native-voice if it was running
      try {
        await Voice.stop();
      } catch (voiceError) {
        console.warn('Error stopping voice:', voiceError);
      }

      const finalTranscript = this.accumulatedText.trim();
      this.accumulatedText = '';
      this.currentTranscript = '';
      this.setStatus('idle');
      return finalTranscript;
    } catch (error) {
      console.error('Failed to stop transcription:', error);
      this.setStatus('error');
      return this.accumulatedText.trim();
    }
  }

  sendAudioData(audioBase64: string): void {
    if (this.isListening && this.deepgramSocket) {
      this.sendAudioChunkToDeepgram(audioBase64);
    }
  }

  async cancelListening(): Promise<void> {
    try {
      if (this.deepgramSocket) {
        this.deepgramSocket.close(1000, 'Client cancelling');
        this.deepgramSocket = null;
      }
      await Voice.cancel();
      this.isListening = false;
      this.accumulatedText = '';
      this.currentTranscript = '';
      this.setStatus('idle');
    } catch (error) {
      console.error('Failed to cancel transcription:', error);
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.deepgramSocket) {
        this.deepgramSocket.close(1000, 'Client destroying');
        this.deepgramSocket = null;
      }
      await Voice.destroy();
      this.isListening = false;
      this.accumulatedText = '';
      this.currentTranscript = '';
      this.setStatus('idle');
    } catch (error) {
      console.error('Failed to destroy transcription service:', error);
    }
  }

  async transcribeAudioChunk(audioBase64: string): Promise<string> {
    if (this.useDeepgram && this.deepgramSocket) {
      this.sendAudioChunkToDeepgram(audioBase64);
      return ''; // Results come via WebSocket callbacks
    }
    console.log('Audio chunk received for fallback transcription, length:', audioBase64.length);
    return '';
  }

  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  getAccumulatedText(): string {
    return this.accumulatedText;
  }

  isActive(): boolean {
    return this.isListening;
  }

  getStatus(): TranscriptionStatus {
    return this.status;
  }

  private setStatus(status: TranscriptionStatus): void {
    this.status = status;
    this.callbacks?.onStatusChange(status);
  }

  cleanup(): void {
    if (this.deepgramSocket) {
      this.deepgramSocket.close(1000, 'Cleanup');
      this.deepgramSocket = null;
    }
    Voice.removeAllListeners();
    this.isListening = false;
    this.status = 'idle';
    this.accumulatedText = '';
    this.currentTranscript = '';
  }
}
