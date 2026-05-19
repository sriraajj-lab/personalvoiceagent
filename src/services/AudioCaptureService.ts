import {Platform, NativeModules, NativeEventEmitter} from 'react-native';
import AudioRecord from 'react-native-audio-recorder-player';

const AudioRecordPlayer = AudioRecord;

export type AudioChunkCallback = (chunkBase64: string, timestamp: number) => void;
export type AudioLevelCallback = (level: number) => void;
export type AudioStateCallback = (state: AudioCaptureState) => void;

export type AudioCaptureState = 'idle' | 'recording' | 'encoding' | 'error';

export class AudioCaptureService {
  private static instance: AudioCaptureService;
  private isCapturing: boolean = false;
  private state: AudioCaptureState = 'idle';
  private audioLevel: number = 0;
  private onAudioChunk?: AudioChunkCallback;
  private onAudioLevel?: AudioLevelCallback;
  private onStateChange?: AudioStateCallback;
  private captureInterval?: ReturnType<typeof setInterval>;
  private currentFilePath: string = '';

  private constructor() {}

  static getInstance(): AudioCaptureService {
    if (!AudioCaptureService.instance) {
      AudioCaptureService.instance = new AudioCaptureService();
    }
    return AudioCaptureService.instance;
  }

  async startCapture(
    onChunk?: AudioChunkCallback,
    onLevel?: AudioLevelCallback,
    onState?: AudioStateCallback,
  ): Promise<boolean> {
    if (this.isCapturing) {
      console.warn('Audio capture already active');
      return false;
    }

    this.onAudioChunk = onChunk;
    this.onAudioLevel = onLevel;
    this.onStateChange = onState;

    try {
      this.setState('recording');

      const filePath = `voiceagent_capture_${Date.now()}.wav`;
      this.currentFilePath = filePath;

      const audioSet = {
        AudioSourceAndroid: Platform.OS === 'android' ? 7 : undefined, // VOICE_COMMUNICATION = 7
        AudioEncoderAndroid: AudioRecord.AudioEncoderAndroid.AAC,
        AudioEncoder: Platform.OS === 'ios'
          ? AudioRecord.AudioEncoderIOS.AAC
          : undefined,
        OutputFormatAndroid: AudioRecord.OutputFormatAndroid.AAC_ADTS,
        AudioSamplingRate: 16000,
        AudioChannels: 1,
        AudioBitRate: 32000,
      };

      const result = await AudioRecordPlayer.startRecorder(filePath, audioSet);
      this.isCapturing = true;

      // Simulate audio level monitoring via polling
      this.captureInterval = setInterval(() => {
        this.simulateAudioLevel();
      }, 100);

      console.log('Audio capture started:', result);
      return true;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      this.setState('error');
      return false;
    }
  }

  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    try {
      this.isCapturing = false;

      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = undefined;
      }

      const result = await AudioRecordPlayer.stopRecorder();
      console.log('Audio capture stopped:', result);
      this.audioLevel = 0;
      this.setState('idle');
    } catch (error) {
      console.error('Failed to stop audio capture:', error);
      this.setState('error');
    }
  }

  private simulateAudioLevel(): void {
    // Simulate audio level between 0 and 1 (in production, this comes from native module)
    this.audioLevel = Math.random() * 0.8 + 0.1;
    this.onAudioLevel?.(this.audioLevel);
  }

  private setState(state: AudioCaptureState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  getState(): AudioCaptureState {
    return this.state;
  }

  getAudioLevel(): number {
    return this.audioLevel;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  async getDuration(): Promise<number> {
    try {
      const result = await AudioRecordPlayer.getDuration();
      return result;
    } catch {
      return 0;
    }
  }

  cleanup(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }
    this.isCapturing = false;
    this.state = 'idle';
    this.audioLevel = 0;
  }
}
