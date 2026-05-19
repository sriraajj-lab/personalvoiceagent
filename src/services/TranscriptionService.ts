import {Platform} from 'react-native';
import Voice from 'react-native-voice';
import {getDatabase} from '../database/init';

export type TranscriptionCallback = {
  onPartialResult: (text: string, timestamp: number) => void;
  onFinalResult: (text: string, timestamp: number) => void;
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

  private constructor() {
    this.setupVoiceListeners();
  }

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  private setupVoiceListeners(): void {
    Voice.onSpeechStart = () => {
      this.setStatus('listening');
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
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

    try {
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error('Speech recognition not available on this device');
      }

      await Voice.start(Platform.OS === 'ios' ? 'en-US' : 'en-US');
      this.isListening = true;
      this.setStatus('listening');
      console.log('Transcription started');
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
      await Voice.stop();
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

  async cancelListening(): Promise<void> {
    try {
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
    // In production, this sends audio chunks to Deepgram API for streaming transcription
    // Placeholder implementation for now
    console.log('Audio chunk received for transcription, length:', audioBase64.length);
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
    Voice.removeAllListeners();
    this.isListening = false;
    this.status = 'idle';
    this.accumulatedText = '';
    this.currentTranscript = '';
  }
}
