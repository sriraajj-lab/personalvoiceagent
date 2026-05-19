export type SupportedLanguage = 'en' | 'hi' | 'te';
export type TranscriptionLanguage = SupportedLanguage | 'auto';

export interface Conversation {
  id: string;
  startedAt: string;
  endedAt: string | null;
  transcript: TranscriptEntry[];
  summary: string | null;
  entities: ExtractedEntity[];
  isActive: boolean;
}

export interface TranscriptEntry {
  id: string;
  conversationId: string;
  speaker: 'user' | 'other' | 'ai';
  text: string;
  timestamp: string;
  isFinal: boolean;
}

export interface ExtractedEntity {
  id: string;
  conversationId: string;
  type: EntityType;
  value: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

export type EntityType = 'person_name' | 'company_name' | 'phone_number' | 'email' | 'issue' | 'resolution' | 'date' | 'location' | 'key_topic' | 'other';

export type AgentStatus = 'idle' | 'passive_listening' | 'transcribing' | 'takeover_active' | 'speaking' | 'error';

export type TakeoverState = 'inactive' | 'requesting' | 'active' | 'responding' | 'ended';

export interface AppSettings {
  deepgramApiKey: string;
  elevenLabsAgentId: string;
  elevenLabsApiKey: string;
  passiveListeningEnabled: boolean;
  autoAnswerWorkCalls: boolean;
  triggerPhrase: string;
  preferredLanguage: TranscriptionLanguage;
}

export interface KnowledgeEntry {
  id: string;
  key: string;
  value: string;
  source: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceCallState {
  isInCall: boolean;
  callState: 'idle' | 'ringing' | 'offhook' | 'connected' | 'disconnected';
  incomingNumber?: string;
}
