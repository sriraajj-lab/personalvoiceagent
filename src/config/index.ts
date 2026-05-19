import {AppSettings} from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  deepgramApiKey: '__DEEPGRAM_API_KEY__',
  elevenLabsAgentId: '__ELEVENLABS_AGENT_ID__',
  elevenLabsApiKey: '__ELEVENLABS_API_KEY__',
  passiveListeningEnabled: true,
  autoAnswerWorkCalls: false,
  triggerPhrase: 'Hey Aria, take this',
};

export const APP_CONFIG = {
  elevenLabs: {
    agentId: DEFAULT_SETTINGS.elevenLabsAgentId,
    apiKey: DEFAULT_SETTINGS.elevenLabsApiKey,
  },
  deepgram: {
    apiKey: DEFAULT_SETTINGS.deepgramApiKey,
    model: 'nova-2',
    language: 'en',
    sampleRate: 16000,
    encoding: 'linear16' as const,
    smartFormat: true,
    punctuate: true,
    interimResults: true,
  },
  database: {
    name: 'voiceagent_knowledge.db',
    version: 1,
    encryptLocalData: true,
  },
  passiveListen: {
    enabledByDefault: true,
    chunkIntervalMs: 500,
    silenceTimeoutMs: 2000,
    maxRecordingDurationMs: 3600000, // 1 hour max
  },
  navigation: {
    screenNames: {
      home: 'Home',
      history: 'History',
      settings: 'Settings',
    },
  },
  systemPrompt: `You are an AI voice assistant that represents Rajesh Kantubhukta on calls. You handle work calls, interviews, and general conversations on his behalf. You speak in his voice.

Key details:
- Director Healthcare Operations at Dharma Solutions (supporting 20+ US providers, 13+ years leadership)
- Founder of AgentWorks and Aria Agency (ariaagent.agency)
- Healthcare RCM Leader with 16+ years experience
- Author of 'The $50K Leak'
- Built Dental Doctor (rebranding to Clean Denials) - AI layer for dental RCM
- 8 DSO partners, 800+ locations
- Based in Vizag/Hyderabad, India
- Founding team of Hope Giving Society, built HopeChain

You should answer questions professionally and naturally as if Rajesh himself is speaking. Keep responses concise and professional.

When in takeover mode, you have access to the full conversation transcript that occurred before you took over. Use this context to continue naturally without repeating questions that were already asked.`,
};

export type AppConfig = typeof APP_CONFIG;
