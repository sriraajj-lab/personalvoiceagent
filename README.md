# Aria Voice Agent

Personal AI voice co-pilot that passively listens to conversations and takes over on demand — speaking in your cloned voice.

## Architecture: Passive Listen + On-Demand Takeover

This app has been redesigned from a standard conversational AI to a **passive listen + on-demand takeover** architecture:

1. **Passive Listening** - Continuously captures microphone audio when the app is active, transcribes speech-to-text in real-time, and stores conversation history locally.
2. **Knowledge Base** - Extracts entities (names, companies, issues, resolutions) from every conversation and builds a local knowledge base in SQLite.
3. **On-Demand Takeover** - A floating action button lets you hand the conversation over to the AI. The AI gets full conversation context, generates a response using ElevenLabs, and speaks it through the speaker.
4. **Local-First** - All conversation data stays on-device. No cloud backend.

## Setup
1. Clone this repo
2. Run `npm install`
3. Add your ElevenLabs Agent ID and Deepgram API key in Settings
4. Run `npx react-native run-android` or `npx react-native run-ios`

## Features
- Passive microphone listening with real-time transcription
- Multilingual transcription support (English, Hindi, Telugu) with auto-detect
- Local SQLite knowledge base with entity extraction
- On-demand AI takeover during active calls
- Floating overlay button for takeover control
- Conversation history browser with search
- Real-time live transcript display
- Configurable Deepgram + ElevenLabs integration
- All data stays local on device

## New Architecture Files

```
src/
├── App.tsx                        # Main app with screen navigation + services
├── config/index.ts                # Deepgram, ElevenLabs, DB config
├── types/index.ts                 # All TypeScript type definitions
├── database/
│   ├── schema.ts                  # SQLite schema (conversations, transcripts, entities, knowledge)
│   └── init.ts                    # Database initialization helpers
├── services/
│   ├── AudioCaptureService.ts     # Background mic capture with VOICE_COMMUNICATION source
│   ├── TranscriptionService.ts    # Real-time speech-to-text (react-native-voice)
│   ├── KnowledgeBaseService.ts    # Local SQLite storage + entity extraction + semantic search
│   ├── TakeoverService.ts         # On-demand AI takeover with full conversation context
│   └── VoiceAgentService.ts       # Orchestrator: wires capture → transcription → knowledge → takeover
├── screens/
│   ├── HomeScreen.tsx             # Passive listen dashboard with mic/waveform/live transcript
│   ├── SettingsScreen.tsx         # API keys, passive listening toggle, data management
│   └── HistoryScreen.tsx          # Conversation history browser with search & detail view
├── components/
│   ├── FloatingTakeoverButton.tsx # Animated floating overlay button during calls
│   └── LiveTranscript.tsx         # Real-time transcript display with speaker labels
```

## Version
1.1.0 - Passive Listen + On-Demand Takeover Architecture
