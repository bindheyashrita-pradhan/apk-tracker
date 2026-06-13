import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDarkMode } from '../hooks/useDarkMode';
import { getAllWatchlistItems, deleteWatchlistItem } from '../database/WatchlistDao';
import { WatchlistItem } from '../types';
import { findBestVariant } from '../services/PriorityMatcher';
import { isNewerVersion } from '../services/VersionComparator';
import { fetchLatestVersion } from '../services/ApkMirrorService';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const WatchlistScreen = ({ navigation }: any) => {
  const isDarkMode = useDarkMode();
  const [savedApps, setSavedApps] = useState<WatchlistItem[]>([]);
  
  const [scanningApp, setScanningApp] = useState<WatchlistItem | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [updatesFound, setUpdatesFound] = useState<Record<string, {version: string, url: string, date: string}>>({});

  const loadApps = async () => {
    const apps = await getAllWatchlistItems();
    setSavedApps(apps);
  };

  useEffect(() => {
    loadApps();
    AsyncStorage.getItem('pendingUpdates').then(data => {
      if (data) setUpdatesFound(JSON.parse(data));
    });
    const unsubscribe = navigation.addListener('focus', () => loadApps());
    return unsubscribe;
  }, [navigation]);

  const handleDelete = async (packageName: string) => {
    await deleteWatchlistItem(packageName);
    const newUpdates = { ...updatesFound };
    delete newUpdates[packageName];
    setUpdatesFound(newUpdates);
    AsyncStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
    loadApps();
  };

  const handleDownload = (packageName: string, url: string) => {
    Linking.openURL(url);
    Alert.alert(
      "Download Started ⬇️", "Did you successfully install this update?",
      [
        { text: "Not Yet", style: "cancel" },
        { 
          text: "Yes, Clear It!", 
          onPress: () => {
            const newUpdates = { ...updatesFound };
            delete newUpdates[packageName];
            setUpdatesFound(newUpdates);
            AsyncStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
          }
        }
      ]
    );
  };

  // ⚡ THE LIGHTNING SCANNER (No WebView Needed!)
  const performCheck = async (app: WatchlistItem, isBatch: boolean) => {
    setScanningApp(app);
    
    // Call our new super-fast background fetcher!
    const result = await fetchLatestVersion(app.searchTerm);

    if (!result) {
      if (!isBatch) Alert.alert('Scan Failed', 'Could not fetch data from APKMirror. Cloudflare might be active.');
      setScanningApp(null);
      return;
    }

    const bestMatch = findBestVariant(result.variants);

    if (bestMatch.variant) {
      const hasUpdate = isNewerVersion(app.currentVersion, result.latestVersion);
      if (hasUpdate) {
        
        // Save the update permanently!
        setUpdatesFound(prev => {
          const updated = { ...prev, [app.packageName]: { version: result.latestVersion!, url: bestMatch.variant!.downloadUrl, date: result.releaseDate } };
          AsyncStorage.setItem('pendingUpdates', JSON.stringify(updated));
          return updated;
        });

        if (!isBatch) {
          Alert.alert(
            '🚀 UPDATE FOUND!',
            `Current: v${app.currentVersion}\nNew: v${result.latestVersion}\n📅 Released: ${result.releaseDate}\n\n${bestMatch.message}`,
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Download Update', onPress: () => handleDownload(app.packageName, bestMatch.variant!.downloadUrl) }]
          );
        }
      } else {
        if (!isBatch) Alert.alert('Up To Date! ✅', `You already have the newest version (v${app.currentVersion}).`);
      }
    } else {
      if (!isBatch) Alert.alert('No Match', bestMatch.message);
    }
    
    setScanningApp(null);
  };

  // 🚀 THE BATCH SCANNER (Lightning Fast)
  const startBatchCheck = async () => {
    if (savedApps.length === 0) return Alert.alert('Empty', 'Add some apps first!');
    setIsCheckingAll(true);

    for (let i = 0; i < savedApps.length; i++) {
      await performCheck(savedApps[i], true);
      // Wait 1.5 seconds between apps so APKMirror doesn't IP Ban us for spamming!
      if (i < savedApps.length - 1) await sleep(1500); 
    }

    setIsCheckingAll(false);
    Alert.alert('Batch Scan Complete! 🎉', `Finished checking all apps in your Watchlist.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      <View style={[styles.topHeader, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.mainTitle, { color: isDarkMode ? '#FFFFFF' : '#222222' }]}><Text style={{ color: '#2196F3' }}>APK</Text> Tracker</Text>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={savedApps}
        keyExtractor={(item) => item.packageName}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginLeft: 5 }}>
            <Text style={{ color: isDarkMode ? '#00c853' : '#009624', fontSize: 18, fontWeight: 'bold' }}>My Watchlist 🚀</Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#673AB7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', elevation: 2 }}
              onPress={startBatchCheck}
              disabled={isCheckingAll}
            >
              {isCheckingAll ? (
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>⏳ SCANNING...</Text>
              ) : (
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>🔄 CHECK ALL</Text>
              )}
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={<Text style={{ color: isDarkMode ? '#AAAAAA' : '#666666', textAlign: 'center', marginTop: 20 }}>Your watchlist is empty. Add an app below!</Text>}
        renderItem={({ item }) => {
          const update = updatesFound[item.packageName];

          return (
            <View style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }, update && { borderLeftColor: '#FF5722', borderLeftWidth: 6 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>{item.appName}</Text>
                {update ? (
                  <View>
                    <Text style={[styles.appDetails, { color: '#FF5722', fontWeight: 'bold' }]}>Update Available: v{update.version}</Text>
                    <Text style={[styles.appDetails, { fontSize: 10, marginTop: 2 }]}>📅 {update.date}</Text>
                  </View>
                ) : (
                  <Text style={styles.appDetails}>Version: {item.currentVersion}</Text>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => handleDelete(item.packageName)} style={{ padding: 12 }} disabled={scanningApp !== null}>
                  <Text style={{ color: scanningApp ? '#ccc' : '#FF0000' }}>🗑️</Text>
                </TouchableOpacity>
                
                {update ? (
                  <TouchableOpacity style={[styles.checkButton, { backgroundColor: '#00c853' }]} onPress={() => handleDownload(item.packageName, update.url)}>
                    <Text style={styles.checkButtonText}>⬇️ Download</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.checkButton, scanningApp?.packageName === item.packageName && { backgroundColor: '#888' }]} onPress={() => performCheck(item, false)} disabled={scanningApp !== null || isCheckingAll}>
                    {scanningApp?.packageName === item.packageName ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.checkButtonText}>Check</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <View style={{ padding: 20, paddingTop: 0 }}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddApp')} disabled={isCheckingAll}>
          <Text style={styles.addButtonText}>+ Add a New App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingTop: 50, paddingBottom: 20, alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  mainTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  card: { padding: 15, borderRadius: 8, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderLeftWidth: 4, borderLeftColor: '#00c853' },
  appName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  appDetails: { fontSize: 12, color: '#888' },
  checkButton: { backgroundColor: '#FF5722', padding: 12, borderRadius: 6, minWidth: 70, alignItems: 'center' },
  checkButtonText: { color: '#FFF', fontWeight: 'bold' },
  addButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  addButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});