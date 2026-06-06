import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  try {
    const db = await SQLite.openDatabase({ name: 'apk_tracker.db', location: 'default' });
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        packageName TEXT UNIQUE NOT NULL,
        appName TEXT NOT NULL,
        searchTerm TEXT NOT NULL,
        currentVersion TEXT NOT NULL,
        lastNotifiedVersion TEXT,
        ignoredVersions TEXT DEFAULT '[]',
        enabled INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);
    dbInstance = db;
    return db;
  } catch (error) {
    console.error('DB Init Error:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) throw new Error('DB not initialized.');
  return dbInstance;
};