export class VoiceAgentService {
  private static instance: VoiceAgentService;
  private isActive: boolean = false;
  private agentId: string;

  private constructor(agentId: string) {
    this.agentId = agentId;
  }

  static getInstance(agentId: string): VoiceAgentService {
    if (!VoiceAgentService.instance) {
      VoiceAgentService.instance = new VoiceAgentService(agentId);
    }
    return VoiceAgentService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // ElevenLabs SDK initialization will be added here
      console.log('VoiceAgent initialized with agentId:', this.agentId);
      return true;
    } catch (error) {
      console.error('Failed to initialize VoiceAgent:', error);
      return false;
    }
  }

  async startListening(): Promise<void> {
    this.isActive = true;
    console.log('Started listening...');
  }

  async stopListening(): Promise<void> {
    this.isActive = false;
    console.log('Stopped listening.');
  }

  async speakResponse(text: string): Promise<void> {
    console.log('Speaking:', text);
  }

  isAgentActive(): boolean {
    return this.isActive;
  }
}
