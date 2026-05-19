import {KnowledgeBaseService} from './KnowledgeBaseService';
import {Conversation, TakeoverState} from '../types';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export type TakeoverCallback = {
  onStateChange: (state: TakeoverState) => void;
  onResponseGenerated: (response: string) => void;
  onError: (error: string) => void;
};

export class TakeoverService {
  private static instance: TakeoverService;
  private state: TakeoverState = 'inactive';
  private activeConversationId: string | null = null;
  private callbacks?: TakeoverCallback;
  private agentId: string = '';
  private apiKey: string = '';

  private constructor() {}

  static getInstance(): TakeoverService {
    if (!TakeoverService.instance) {
      TakeoverService.instance = new TakeoverService();
    }
    return TakeoverService.instance;
  }

  configure(agentId: string, apiKey: string): void {
    this.agentId = agentId;
    this.apiKey = apiKey;
  }

  async initiateTakeover(
    conversationId: string,
    callbacks: TakeoverCallback,
  ): Promise<boolean> {
    if (this.state !== 'inactive') {
      callbacks.onError('Takeover already in progress');
      return false;
    }

    this.callbacks = callbacks;
    this.activeConversationId = conversationId;

    try {
      this.setState('requesting');

      // Get full conversation context
      const kbService = KnowledgeBaseService.getInstance();
      const conversation = await kbService.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Build context from transcript and knowledge base
      const context = await this.buildContext(conversation);

      // Generate response using ElevenLabs conversational AI
      const response = await this.generateResponse(context);

      this.setState('active');
      this.callbacks?.onResponseGenerated(response);

      // Store AI response in transcript
      await kbService.addTranscriptEntry(conversationId, 'ai', response, true);

      return true;
    } catch (error) {
      console.error('Takeover initiation failed:', error);
      this.callbacks?.onError('Failed to initiate takeover: ' + String(error));
      this.setState('inactive');
      return false;
    }
  }

  async generateResponse(context: string): Promise<string> {
    try {
      // In production, this calls the ElevenLabs Conversational AI SDK
      // For now, generate a context-aware response based on conversation history
      
      const systemPrompt = `You are Aria, an AI voice assistant for Rajesh Kantubhukta, Director of Revenue Cycle Operations at Dharma Solutions. You handle client escalation calls, process issue investigations, and new client onboarding. Your communication style is: relationship-first, listen carefully, take ownership of issues, never commit to solutions on the spot, always say you'll review with the team and get back to them. If it's a blunder on our end, apologize and ask for time to investigate. You have comprehensive knowledge of medical revenue cycle management including: claim denials and how to fix them, billing scenarios, HIPAA compliance, insurance types, appeal processes, and RCM terminology.

Conversation Context:
${context}

Generate a natural spoken response that continues the conversation:`;

      // Placeholder - will be replaced with actual ElevenLabs SDK call
      console.log('Generating response with context length:', context.length);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = `I understand your points. Let me address each of them based on our conversation so far. ` +
        `Based on what we've discussed, I think the best path forward would be to schedule a follow-up ` +
        `where we can dive deeper into the specifics. How does that sound?`;

      return response;
    } catch (error) {
      console.error('Response generation failed:', error);
      throw error;
    }
  }

  async speakResponse(text: string): Promise<void> {
    this.setState('responding');

    try {
      // In production, this uses @11labs/client-react-native ElevenLabs SDK
      // to speak the response through the device speaker
      console.log('Speaking response:', text.substring(0, 100) + '...');
      
      // Simulate speaking delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.setState('active');
    } catch (error) {
      console.error('Failed to speak response:', error);
      this.callbacks?.onError('Failed to speak response');
      this.setState('active');
    }
  }

  async endTakeover(): Promise<void> {
    try {
      // End the current conversation segment
      if (this.activeConversationId) {
        const kbService = KnowledgeBaseService.get_instance();
        
        // Extract entities from the conversation
        const transcript = await kbService.getFullTranscriptText(this.activeConversationId);
        await kbService.extractAndStoreEntities(this.activeConversationId, transcript);
      }

      this.setState('inactive');
      this.activeConversationId = null;
      console.log('Takeover ended');
    } catch (error) {
      console.error('Failed to end takeover:', error);
    }
  }

  private async buildContext(conversation: Conversation): Promise<string> {
    const kbService = KnowledgeBaseService.getInstance();
    
    // Get full transcript
    const transcript = await kbService.getFullTranscriptText(conversation.id);
    
    // Get relevant knowledge
    const knowledgeEntries = await kbService.getAllKnowledge();
    const knowledgeStr = knowledgeEntries
      .map(k => `${k.key}: ${k.value}`)
      .join('\n');

    return `
=== Conversation Transcript ===
${transcript}

=== Known Information ===
${knowledgeStr}

=== Extracted Entities ===
${conversation.entities.map(e => `${e.type}: ${e.value}`).join('\n')}
    `.trim();
  }

  private setState(state: TakeoverState): void {
    this.state = state;
    this.callbacks?.onStateChange(state);
  }

  getState(): TakeoverState {
    return this.state;
  }

  getActiveConversationId(): string | null {
    return this.activeConversationId;
  }

  isTakeoverActive(): boolean {
    return this.state === 'active' || this.state === 'responding';
  }
}
