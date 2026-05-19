import SQLite from 'react-native-sqlite-storage';
import {DATABASE_NAME, CREATE_TABLES, CREATE_INDICES} from './schema';

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
