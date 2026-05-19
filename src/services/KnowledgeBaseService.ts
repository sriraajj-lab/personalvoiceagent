import {getDatabase, getAllRows, getFirstRow, executeQuery} from '../database/init';
import {Conversation, TranscriptEntry, ExtractedEntity, KnowledgeEntry} from '../types';

const UUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  private constructor() {}

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  // === Conversation Management ===

  async createConversation(): Promise<string> {
    const id = UUID();
    const now = new Date().toISOString();

    await executeQuery(
      `INSERT INTO conversations (id, started_at, is_active) VALUES (?, ?, 1)`,
      [id, now],
    );

    return id;
  }

  async endConversation(conversationId: string, summary?: string): Promise<void> {
    const now = new Date().toISOString();
    await executeQuery(
      `UPDATE conversations SET ended_at = ?, summary = ?, is_active = 0 WHERE id = ?`,
      [now, summary || null, conversationId],
    );
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const row = await getFirstRow(
      `SELECT * FROM conversations WHERE id = ?`,
      [conversationId],
    );

    if (!row) return null;

    const transcriptEntries = await this.getTranscriptEntries(conversationId);
    const entities = await this.getEntities(conversationId);

    return {
      id: row.id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      transcript: transcriptEntries,
      summary: row.summary,
      entities: entities,
      isActive: row.is_active === 1,
    };
  }

  async getAllConversations(limit: number = 50, offset: number = 0): Promise<Conversation[]> {
    const rows = await getAllRows(
      `SELECT * FROM conversations ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    const conversations: Conversation[] = [];
    for (const row of rows) {
      const transcriptEntries = await this.getTranscriptEntries(row.id);
      const entities = await this.getEntities(row.id);

      conversations.push({
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        transcript: transcriptEntries,
        summary: row.summary,
        entities: entities,
        isActive: row.is_active === 1,
      });
    }

    return conversations;
  }

  async getActiveConversation(): Promise<Conversation | null> {
    const row = await getFirstRow(
      `SELECT * FROM conversations WHERE is_active = 1 ORDER BY started_at DESC LIMIT 1`,
    );

    if (!row) return null;
    return this.getConversation(row.id);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await executeQuery(`DELETE FROM conversations WHERE id = ?`, [conversationId]);
  }

  // === Transcript Management ===

  async addTranscriptEntry(
    conversationId: string,
    speaker: 'user' | 'other' | 'ai',
    text: string,
    isFinal: boolean = false,
  ): Promise<string> {
    const id = UUID();
    const timestamp = new Date().toISOString();

    await executeQuery(
      `INSERT INTO transcript_entries (id, conversation_id, speaker, text, timestamp, is_final) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, conversationId, speaker, text, timestamp, isFinal ? 1 : 0],
    );

    return id;
  }

  async getTranscriptEntries(conversationId: string): Promise<TranscriptEntry[]> {
    const rows = await getAllRows(
      `SELECT * FROM transcript_entries WHERE conversation_id = ? ORDER BY timestamp ASC`,
      [conversationId],
    );

    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      speaker: row.speaker as 'user' | 'other' | 'ai',
      text: row.text,
      timestamp: row.timestamp,
      isFinal: row.is_final === 1,
    }));
  }

  async getFullTranscriptText(conversationId: string): Promise<string> {
    const entries = await this.getTranscriptEntries(conversationId);
    return entries.map(e => `[${e.speaker}] ${e.text}`).join('\n');
  }

  // === Entity Extraction ===

  async extractAndStoreEntities(
    conversationId: string,
    text: string,
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const timestamp = new Date().toISOString();

    // Simple entity extraction patterns
    const patterns: Array<{type: ExtractedEntity['type']; regex: RegExp}> = [
      {type: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g},
      {type: 'phone_number', regex: /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g},
      {type: 'person_name', regex: /(?:my name is|I'm|I am|this is|Mr\.|Ms\.|Mrs\.) ([A-Z][a-z]+ [A-Z][a-z]+)/g},
      {type: 'company_name', regex: /(?:at|for|with|from) ([A-Z][A-Za-z0-9]+(?: [A-Z][A-Za-z0-9]+)*)/g},
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const value = match[1] || match[0];

        // Check if entity already exists
        const existing = await getFirstRow(
          `SELECT id FROM extracted_entities WHERE conversation_id = ? AND type = ? AND value = ?`,
          [conversationId, pattern.type, value],
        );

        if (!existing) {
          const id = UUID();
          await executeQuery(
            `INSERT INTO extracted_entities (id, conversation_id, type, value, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [id, conversationId, pattern.type, value, timestamp],
          );

          entities.push({
            id,
            conversationId,
            type: pattern.type,
            value,
            timestamp,
          });
        }
      }
    }

    return entities;
  }

  async getEntities(conversationId: string): Promise<ExtractedEntity[]> {
    const rows = await getAllRows(
      `SELECT * FROM extracted_entities WHERE conversation_id = ? ORDER BY timestamp ASC`,
      [conversationId],
    );

    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      type: row.type as ExtractedEntity['type'],
      value: row.value,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.timestamp,
    }));
  }

  // === Knowledge Base ===

  async addKnowledge(key: string, value: string, source: string = 'conversation'): Promise<void> {
    const now = new Date().toISOString();

    const existing = await getFirstRow(
      `SELECT id FROM knowledge_base WHERE key = ?`,
      [key],
    );

    if (existing) {
      await executeQuery(
        `UPDATE knowledge_base SET value = ?, source = ?, updated_at = ? WHERE key = ?`,
        [value, source, now, key],
      );
    } else {
      await executeQuery(
        `INSERT INTO knowledge_base (id, key, value, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [UUID(), key, value, source, now, now],
      );
    }
  }

  async getKnowledge(key: string): Promise<KnowledgeEntry | null> {
    const row = await getFirstRow(
      `SELECT * FROM knowledge_base WHERE key = ?`,
      [key],
    );

    if (!row) return null;

    return {
      id: row.id,
      key: row.key,
      value: row.value,
      source: row.source,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
    const rows = await getAllRows(
      `SELECT * FROM knowledge_base WHERE key LIKE ? OR value LIKE ? ORDER BY confidence DESC`,
      [`%${query}%`, `%${query}%`],
    );

    return rows.map(row => ({
      id: row.id,
      key: row.key,
      value: row.value,
      source: row.source,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async semanticSearch(query: string): Promise<string[]> {
    // Simple keyword-based search (can be upgraded to vector search)
    const results = await this.searchKnowledge(query);
    return results.map(r => `${r.key}: ${r.value}`);
  }

  async getAllKnowledge(): Promise<KnowledgeEntry[]> {
    const rows = await getAllRows(
      `SELECT * FROM knowledge_base ORDER BY updated_at DESC`,
    );

    return rows.map(row => ({
      id: row.id,
      key: row.key,
      value: row.value,
      source: row.source,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // === Settings ===

  async saveSetting(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = await getFirstRow(
      `SELECT key FROM app_settings WHERE key = ?`,
      [key],
    );

    if (existing) {
      await executeQuery(
        `UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?`,
        [value, now, key],
      );
    } else {
      await executeQuery(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, value, now],
      );
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await getFirstRow(
      `SELECT value FROM app_settings WHERE key = ?`,
      [key],
    );

    return row ? row.value : null;
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await getAllRows(`SELECT * FROM app_settings`);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  // === Cleanup ===

  async clearAllData(): Promise<void> {
    await executeQuery(`DELETE FROM embeddings`);
    await executeQuery(`DELETE FROM extracted_entities`);
    await executeQuery(`DELETE FROM transcript_entries`);
    await executeQuery(`DELETE FROM conversations`);
    await executeQuery(`DELETE FROM knowledge_base`);
  }
}
