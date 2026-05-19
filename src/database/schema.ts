export const DATABASE_NAME = 'voiceagent_knowledge.db';
export const DATABASE_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    summary TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transcript_entries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    speaker TEXT NOT NULL CHECK(speaker IN ('user', 'other', 'ai')),
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    is_final INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS extracted_entities (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    metadata TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    source TEXT,
    confidence REAL DEFAULT 1.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    vector BLOB,
    text_chunk TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (entity_id) REFERENCES extracted_entities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

export const CREATE_INDICES = `
  CREATE INDEX IF NOT EXISTS idx_transcript_conversation ON transcript_entries(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_entities_conversation ON extracted_entities(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_entities_type ON extracted_entities(type);
  CREATE INDEX IF NOT EXISTS idx_knowledge_key ON knowledge_base(key);
  CREATE INDEX IF NOT EXISTS idx_conversation_active ON conversations(is_active);
  CREATE INDEX IF NOT EXISTS idx_transcript_timestamp ON transcript_entries(timestamp);
`;

export const DROP_TABLES = `
  DROP TABLE IF EXISTS embeddings;
  DROP TABLE IF EXISTS extracted_entities;
  DROP TABLE IF EXISTS transcript_entries;
  DROP TABLE IF EXISTS knowledge_base;
  DROP TABLE IF EXISTS conversations;
  DROP TABLE IF EXISTS app_settings;
`;
