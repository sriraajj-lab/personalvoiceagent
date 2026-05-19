import SQLite from 'react-native-sqlite-storage';
import {DATABASE_NAME, CREATE_TABLES, CREATE_INDICES} from './schema';
import {RCMKnowledgeBase} from '../knowledge/rcm-knowledge-base';

SQLite.enablePromise(true);

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    const db = await SQLite.openDatabase({
      name: DATABASE_NAME,
      location: 'default',
    });

    await initializeDatabase(db);
    dbInstance = db;
    return db;
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.executeSql(CREATE_TABLES);
    await db.executeSql(CREATE_INDICES);
    await seedKnowledgeBase(db);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
      dbInstance = null;
      console.log('Database closed');
    } catch (error) {
      console.error('Failed to close database:', error);
    }
  }
}

export async function executeQuery(
  query: string,
  params: any[] = [],
): Promise<SQLite.ResultSet[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(query, params);
  return [results];
}

export async function executeTransaction(
  operations: Array<{query: string; params: any[]}>,
): Promise<void> {
  const db = await getDatabase();

  try {
    await db.transaction(async tx => {
      for (const op of operations) {
        await tx.executeSql(op.query, op.params);
      }
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

export async function getAllRows(
  query: string,
  params: any[] = [],
): Promise<any[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(query, params);

  const rows: any[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    rows.push(results.rows.item(i));
  }
  return rows;
}

export async function getFirstRow(
  query: string,
  params: any[] = [],
): Promise<any | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(query, params);

  if (results.rows.length > 0) {
    return results.rows.item(0);
  }
  return null;
}

async function seedKnowledgeBase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const [rows] = await db.executeSql(
      "SELECT value FROM app_settings WHERE key = 'rcm_knowledge_seeded'",
    );
    if (rows.rows.length > 0) {
      console.log('RCM knowledge base already seeded');
      return;
    }

    // Seed denial codes
    for (const [category, codes] of Object.entries(RCMKnowledgeBase.denialCodes)) {
      for (const code of codes) {
        await db.executeSql(
          'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
          [
            `denial_code_${code.code}`,
            JSON.stringify({category, ...code}),
            'rcm_knowledge_base',
            1.0,
          ],
        );
      }
    }

    // Seed billing scenarios
    for (const scenario of RCMKnowledgeBase.billingScenarios) {
      await db.executeSql(
        'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
        [
          `billing_scenario_${scenario.scenario.replace(/\s+/g, '_').toLowerCase()}`,
          JSON.stringify(scenario),
          'rcm_knowledge_base',
          1.0,
        ],
      );
    }

    // Seed RCM workflow
    for (const step of RCMKnowledgeBase.rcmWorkflow) {
      await db.executeSql(
        'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
        [
          `rcm_workflow_step_${step.step}`,
          JSON.stringify(step),
          'rcm_knowledge_base',
          1.0,
        ],
      );
    }

    // Seed KPIs
    for (const [kpi, data] of Object.entries(RCMKnowledgeBase.kpis)) {
      await db.executeSql(
        'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
        [
          `kpi_${kpi}`,
          JSON.stringify(data),
          'rcm_knowledge_base',
          1.0,
        ],
      );
    }

    // Seed HIPAA compliance
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'hipaa_compliance',
        JSON.stringify(RCMKnowledgeBase.hipaaCompliance),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed insurance types
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'insurance_types',
        JSON.stringify(RCMKnowledgeBase.insuranceTypes),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed appeal process
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'appeal_process',
        JSON.stringify(RCMKnowledgeBase.appealProcess),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed payer specific info
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'payer_specific',
        JSON.stringify(RCMKnowledgeBase.payerSpecific),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed scripts
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'scripts',
        JSON.stringify(RCMKnowledgeBase.scripts),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed payment plans
    await db.executeSql(
      'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
      [
        'payment_plans',
        JSON.stringify(RCMKnowledgeBase.paymentPlans),
        'rcm_knowledge_base',
        1.0,
      ],
    );

    // Seed glossary
    for (const entry of RCMKnowledgeBase.glossary) {
      await db.executeSql(
        'INSERT OR IGNORE INTO knowledge_base (key, value, source, confidence) VALUES (?, ?, ?, ?)',
        [
          `glossary_${entry.term.replace(/\s+/g, '_').toLowerCase()}`,
          JSON.stringify(entry),
          'rcm_knowledge_base',
          1.0,
        ],
      );
    }

    // Mark as seeded
    await db.executeSql(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
      ['rcm_knowledge_seeded', 'true'],
    );

    console.log('RCM knowledge base seeded successfully');
  } catch (error) {
    console.error('Failed to seed knowledge base:', error);
    throw error;
  }
}