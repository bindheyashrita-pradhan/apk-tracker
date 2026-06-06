import { initDatabase } from './Database';
import { WatchlistItem } from '../types';

export const getAllWatchlistItems = async (): Promise<WatchlistItem[]> => {
  // Wait for the database to be fully awake before reading
  const db = await initDatabase(); 
  const results = await db.executeSql('SELECT * FROM watchlist ORDER BY appName ASC');
  const items: WatchlistItem[] = [];
  
  for (let i = 0; i < results[0].rows.length; i++) {
    const row = results[0].rows.item(i);
    items.push({
      id: row.id,
      packageName: row.packageName,
      appName: row.appName,
      searchTerm: row.searchTerm,
      currentVersion: row.currentVersion,
      lastNotifiedVersion: row.lastNotifiedVersion,
      ignoredVersions: row.ignoredVersions,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }
  return items;
};

export const addWatchlistItem = async (item: Omit<WatchlistItem, 'id'>): Promise<number> => {
  // Wait for the database to be fully awake before writing
  const db = await initDatabase();
  const now = Date.now();
  const result = await db.executeSql(
    `INSERT INTO watchlist (
      packageName, appName, searchTerm, currentVersion, 
      lastNotifiedVersion, ignoredVersions, enabled, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.packageName, 
      item.appName, 
      item.searchTerm, 
      item.currentVersion,
      item.lastNotifiedVersion || '', 
      item.ignoredVersions, 
      item.enabled ? 1 : 0, 
      now, 
      now
    ]
  );
  return result[0].insertId;
};

export const deleteWatchlistItem = async (packageName: string): Promise<void> => {
  const db = await initDatabase();
  await db.executeSql('DELETE FROM watchlist WHERE packageName = ?', [packageName]);
};

export const toggleWatchlistItem = async (packageName: string, enabled: boolean): Promise<void> => {
  const db = await initDatabase();
  await db.executeSql('UPDATE watchlist SET enabled = ?, updatedAt = ? WHERE packageName = ?', [enabled ? 1 : 0, Date.now(), packageName]);
};