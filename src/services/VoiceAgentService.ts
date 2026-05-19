import {Platform} from 'react-native';
import {AudioCaptureService} from './AudioCaptureService';
import {TranscriptionService} from './TranscriptionService';
import {KnowledgeBaseService} from './KnowledgeBaseService';
import {TakeoverService} from './TakeoverService';
import {APP_CONFIG} from '../config';
import {AgentStatus, TakeoverState, TranscriptEntry, TranscriptionLanguage, SupportedLanguage} from '../types';

type StatusCallback = (status: AgentStatus) => void;
type TranscriptCallback = (entries: TranscriptEntry[], partial: string) => void;
type TakeoverStateCallback = (state: TakeoverState) => void;

let currentStatus: AgentStatus = 'idle';
let statusCallbacks: StatusCallback[] = [];
let transcriptCallbacks: TranscriptCallback[] = [];
let takeoverStateCallbacks: TakeoverStateCallback[] = [];

let activeConversationId: string | null = null;
let transcriptEntries: TranscriptEntry[] = [];
let partialTranscript: string = '';
let detectedLanguage: string = 'en';

export function onStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.push(callback);
  // Immediately send current status
  callback(currentStatus);
  return () => {
    statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
  };
}

export function onTranscriptUpdate(callback: TranscriptCallback): () => void {
  transcriptCallbacks.push(callback);
  callback(transcriptEntries, partialTranscript);
  return () => {
    transcriptCallbacks = transcriptCallbacks.filter(cb => cb !== callback);
  };
}

export function onTakeoverStateChange(callback: TakeoverStateCallback): () => void {
  takeoverStateCallbacks.push(callback);
  callback(TakeoverService.getInstance().getState());
  return () => {
    takeoverStateCallbacks = takeoverStateCallbacks.filter(cb => cb !== callback);
  };
}

function setStatus(status: AgentStatus): void {
  currentStatus = status;
  statusCallbacks.forEach(cb => cb(status));
}

function notifyTranscriptUpdate(): void {
  transcriptCallbacks.forEach(cb => cb(transcriptEntries, partialTranscript));
}

function notifyTakeoverState(state: TakeoverState): void {
  takeoverStateCallbacks.forEach(cb => cb(state));
}

export async function initializeVoiceAgent(): Promise<boolean> {
  try {
    console.log('Initializing VoiceAgent...');

    // Configure services with saved settings
    const kbService = KnowledgeBaseService.getInstance();

    // Load settings from database
    const savedAgentId = await kbService.getSetting('elevenLabsAgentId');
    const savedApiKey = await kbService.getSetting('elevenLabsApiKey');

    TakeoverService.getInstance().configure(
      savedAgentId || APP_CONFIG.elevenLabs.agentId,
      savedApiKey || APP_CONFIG.elevenLabs.apiKey,
    );

    setStatus('idle');
    console.log('VoiceAgent initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize VoiceAgent:', error);
    setStatus('error');
    return false;
  }
}

export async function startPassiveListening(): Promise<boolean> {
  try {
    // Create a new conversation in the knowledge base
    const kbService = KnowledgeBaseService.getInstance();
    activeConversationId = await kbService.createConversation();

    // Start audio capture
    const audioCapture = AudioCaptureService.getInstance();
    await audioCapture.startCapture();

    // Start transcription
    const transcription = TranscriptionService.getInstance();

    // Get language preference from settings
    const preferredLanguage = await kbService.getSetting('preferredLanguage') || 'auto';
    transcription.setLanguage(preferredLanguage as TranscriptionLanguage);

    // Configure Deepgram API key
    const deepgramApiKey = await kbService.getSetting('deepgramApiKey');
    if (deepgramApiKey) {
      transcription.configure(deepgramApiKey);
    }

    await transcription.startListening({
      onPartialResult: (text, timestamp, language) => {
        partialTranscript = text;
        if (language) {
          detectedLanguage = language;
        }
        notifyTranscriptUpdate();
      },
      onFinalResult: async (text, timestamp, language) => {
        partialTranscript = '';
        if (language) {
          detectedLanguage = language;
        }

        if (activeConversationId) {
          const entryId = await kbService.addTranscriptEntry(
            activeConversationId,
            'other',
            text,
            true,
          );

          const entry: TranscriptEntry = {
            id: entryId,
            conversationId: activeConversationId,
            speaker: 'other',
            text,
            timestamp: new Date().toISOString(),
            isFinal: true,
          };

          transcriptEntries.push(entry);
          notifyTranscriptUpdate();

          // Extract entities from speech
          await kbService.extractAndStoreEntities(activeConversationId, text);
        }
      },
      onError: error => {
        console.error('Transcription error:', error);
        setStatus('error');
      },
      onStatusChange: status => {
        if (status === 'listening') {
          setStatus('passive_listening');
        }
      },
    });

    setStatus('passive_listening');
    console.log('Passive listening started');
    return true;
  } catch (error) {
    console.error('Failed to start passive listening:', error);
    setStatus('error');
    return false;
  }
}

export async function stopPassiveListening(): Promise<void> {
  try {
    const audioCapture = AudioCaptureService.getInstance();
    await audioCapture.stopCapture();

    const transcription = TranscriptionService.getInstance();
    await transcription.stopListening();

    if (activeConversationId) {
      const kbService = KnowledgeBaseService.getInstance();
      await kbService.endConversation(activeConversationId);
      activeConversationId = null;
    }

    setStatus('idle');
    console.log('Passive listening stopped');
  } catch (error) {
    console.error('Failed to stop passive listening:', error);
  }
}

export async function activateTakeover(): Promise<boolean> {
  try {
    if (!activeConversationId) {
      // Start a new conversation if none active
      const kbService = KnowledgeBaseService.getInstance();
      activeConversationId = await kbService.createConversation();
    }

    setStatus('takeover_active');

    const takeoverService = TakeoverService.getInstance();
    const success = await takeoverService.initiateTakeover(
      activeConversationId,
      {
        onStateChange: state => {
          notifyTakeoverState(state);
          if (state === 'active') {
            setStatus('takeover_active');
          } else if (state === 'responding') {
            setStatus('speaking');
          } else if (state === 'inactive') {
            setStatus('passive_listening');
          }
        },
        onResponseGenerated: async response => {
          await takeoverService.speakResponse(response);
        },
        onError: error => {
          console.error('Takeover error:', error);
          setStatus('error');
        },
      },
    );

    return success;
  } catch (error) {
    console.error('Failed to activate takeover:', error);
    setStatus('error');
    return false;
  }
}

export async function endTakeover(): Promise<void> {
  try {
    const takeoverService = TakeoverService.getInstance();
    await takeoverService.endTakeover();
    setStatus('passive_listening');
    console.log('Takeover ended');
  } catch (error) {
    console.error('Failed to end takeover:', error);
  }
}

export function getCurrentStatus(): AgentStatus {
  return currentStatus;
}

export function getActiveConversationId(): string | null {
  return activeConversationId;
}

export function getTranscriptEntries(): TranscriptEntry[] {
  return [...transcriptEntries];
}

export function getDetectedLanguage(): string {
  return detectedLanguage;
}

export async function setTranscriptionLanguage(language: TranscriptionLanguage): Promise<void> {
  const transcription = TranscriptionService.getInstance();
  transcription.setLanguage(language);

  // Save to settings
  const kbService = KnowledgeBaseService.getInstance();
  await kbService.saveSetting('preferredLanguage', language);

  // If currently listening, restart with new language
  if (transcription.isActive()) {
    await transcription.stopListening();
    await transcription.startListening({
      onPartialResult: (text, timestamp, lang) => {
        partialTranscript = text;
        if (lang) detectedLanguage = lang;
        notifyTranscriptUpdate();
      },
      onFinalResult: async (text, timestamp, lang) => {
        partialTranscript = '';
        if (lang) detectedLanguage = lang;
        if (activeConversationId) {
          const entryId = await kbService.addTranscriptEntry(
            activeConversationId, 'other', text, true,
          );
          transcriptEntries.push({
            id: entryId,
            conversationId: activeConversationId,
            speaker: 'other',
            text,
            timestamp: new Date().toISOString(),
            isFinal: true,
          });
          notifyTranscriptUpdate();
          await kbService.extractAndStoreEntities(activeConversationId, text);
        }
      },
      onError: error => {
        console.error('Transcription error:', error);
        setStatus('error');
      },
      onStatusChange: status => {
        if (status === 'listening') {
          setStatus('passive_listening');
        }
      },
    });
  }

  console.log('Transcription language set to:', language);
}

export async function cleanupVoiceAgent(): Promise<void> {
  try {
    await stopPassiveListening();
    AudioCaptureService.getInstance().cleanup();
    TranscriptionService.getInstance().cleanup();
    transcriptEntries = [];
    partialTranscript = '';
    activeConversationId = null;
    statusCallbacks = [];
    transcriptCallbacks = [];
    takeoverStateCallbacks = [];
    detectedLanguage = 'en';
    setStatus('idle');
    console.log('VoiceAgent cleaned up');
  } catch (error) {
    console.error('Failed to cleanup VoiceAgent:', error);
  }
}
