import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as cheerio from 'cheerio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDarkMode } from '../hooks/useDarkMode';
import { getAllWatchlistItems, deleteWatchlistItem } from '../database/WatchlistDao';
import { WatchlistItem, ApkVariant } from '../types';
import { findBestVariant } from '../services/PriorityMatcher';
import { isNewerVersion } from '../services/VersionComparator';
import { APK_MIRROR_BASE_URL } from '../utils/constants';

export const WatchlistScreen = ({ navigation }: any) => {
  const isDarkMode = useDarkMode();
  const [savedApps, setSavedApps] = useState<WatchlistItem[]>([]);
  
  const [scanningApp, setScanningApp] = useState<WatchlistItem | null>(null);
  const [scrapeUrl, setScrapeUrl] = useState<string | null>(null);

  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkQueue, setCheckQueue] = useState<WatchlistItem[]>([]);
  
  // 💾 PERMANENT MEMORY FOR UPDATES
  const [updatesFound, setUpdatesFound] = useState<Record<string, {version: string, url: string, date: string}>>({});

  const loadApps = async () => {
    const apps = await getAllWatchlistItems();
    setSavedApps(apps);
  };

  // Load apps AND saved updates when the screen opens
  useEffect(() => {
    loadApps();
    
    // Load the saved Green Buttons from memory!
    AsyncStorage.getItem('pendingUpdates').then(data => {
      if (data) setUpdatesFound(JSON.parse(data));
    });

    const unsubscribe = navigation.addListener('focus', () => loadApps());
    return unsubscribe;
  }, [navigation]);

  // 🛡️ THE FAILSAFE: If a page freezes, skip it after 20 seconds so the queue doesn't get stuck!
  useEffect(() => {
    let failsafe: NodeJS.Timeout;
    if (scanningApp) {
      failsafe = setTimeout(() => {
        if (isCheckingAll) advanceQueue(); // Force it to move to the next app
        else { setScrapeUrl(null); setScanningApp(null); Alert.alert('Timeout', 'The scan took too long and was aborted.'); }
      }, 20000);
    }
    return () => clearTimeout(failsafe);
  }, [scanningApp, isCheckingAll]);

  // 🔄 THE QUEUE ENGINE
  useEffect(() => {
    if (isCheckingAll && !scanningApp) {
      if (checkQueue.length > 0) {
        const nextApp = checkQueue[0];
        setScanningApp(nextApp);
        setScrapeUrl(nextApp.searchTerm);
      } else {
        setIsCheckingAll(false);
        Alert.alert('Batch Scan Complete! 🎉', `Finished checking all apps in your Watchlist.`);
      }
    }
  }, [checkQueue, isCheckingAll, scanningApp]);

  const advanceQueue = () => {
    setScrapeUrl(null);
    // ⏱️ CLOUDFLARE COOL-DOWN: Wait 2.5 seconds before checking the next app to prevent IP bans!
    setTimeout(() => {
      setScanningApp(null);
      if (isCheckingAll) {
        setCheckQueue(prev => prev.slice(1));
      }
    }, 2500); 
  };

  const handleCheckUpdate = (app: WatchlistItem) => {
    if (isCheckingAll) return; 
    setScanningApp(app);
    setScrapeUrl(app.searchTerm); 
  };

  const startBatchCheck = () => {
    if (savedApps.length === 0) return Alert.alert('Empty', 'Add some apps first!');
    setIsCheckingAll(true);
    setCheckQueue([...savedApps]);
  };

  const handleDelete = async (packageName: string) => {
    await deleteWatchlistItem(packageName);
    // Also clear any pending updates for this deleted app
    const newUpdates = { ...updatesFound };
    delete newUpdates[packageName];
    setUpdatesFound(newUpdates);
    AsyncStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
    loadApps();
  };

  // 🗑️ CLEAR UPDATE NOTIFICATION
  const handleDownload = (packageName: string, url: string) => {
    Linking.openURL(url);
    Alert.alert(
      "Download Started ⬇️",
      "Did you successfully install this update? If yes, we can clear this notification.",
      [
        { text: "Not Yet", style: "cancel" },
        { 
          text: "Yes, Clear It!", 
          onPress: () => {
            const newUpdates = { ...updatesFound };
            delete newUpdates[packageName];
            setUpdatesFound(newUpdates);
            AsyncStorage.setItem('pendingUpdates', JSON.stringify(newUpdates)); // Save cleared state
          }
        }
      ]
    );
  };

  const handleBrowserMessage = (event: any) => {
    const htmlCode = event.nativeEvent.data;

    if (htmlCode === 'NO_RESULTS') {
      if (!isCheckingAll) Alert.alert('Not Found', 'Could not find a stable release on this page.');
      advanceQueue(); return;
    }
    
    if (htmlCode.includes('Just a moment') || htmlCode.includes('Cloudflare')) return;

    if (!scanningApp) { advanceQueue(); return; }

    const $ = cheerio.load(htmlCode);
    const variants: ApkVariant[] = [];

    const pageTitle = $('h1').text();
    const versionMatch = pageTitle.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
    let latestVersion = versionMatch ? versionMatch[1] : null;

    if (!latestVersion) {
      if (!isCheckingAll) Alert.alert('Scan Failed', 'Could not extract the version number.');
      advanceQueue(); return;
    }

    let releaseDate = "Unknown Date";
    let rows = $('.table-row');
    if (rows.length === 0) rows = $('.variants-table .table-row');

    rows.each((_, row) => {
      const rowText = $(row).text().toLowerCase();
      const originalRowText = $(row).text(); 
      let link = null;
      $(row).find('a').each((_, aTag) => {
        const href = $(aTag).attr('href');
        if (href && !href.includes('#')) link = href;
      });

      if (link) {
        let arch = 'universal';
        if (rowText.includes('arm64-v8a')) arch = 'arm64-v8a';
        else if (rowText.includes('armeabi-v7a')) arch = 'armeabi-v7a';
        else if (rowText.includes('x86')) arch = 'x86';
        
        let dpi = 'nodpi';
        if (rowText.includes('480dpi')) dpi = '480dpi';
        else if (rowText.includes('400dpi')) dpi = '400dpi';
        else if (rowText.includes('320dpi')) dpi = '320dpi';

        if (releaseDate === "Unknown Date") {
          const dateMatch = originalRowText.match(/([A-Z][a-z]{2,8}\s\d{1,2},\s\d{4})/);
          if (dateMatch && dateMatch[1]) releaseDate = dateMatch[1];
        }

        const downloadLink = link.startsWith('http') ? link : `${APK_MIRROR_BASE_URL}${link}`;
        variants.push({ version: latestVersion, arch, dpi, downloadUrl: downloadLink });
      }
    });

    const bestMatch = findBestVariant(variants);

    if (bestMatch.variant) {
      const hasUpdate = isNewerVersion(scanningApp.currentVersion, latestVersion);
      if (hasUpdate) {
        
        // 💾 SAVE THE UPDATE PERMANENTLY!
        const newUpdates = { ...updatesFound, [scanningApp.packageName]: { version: latestVersion, url: bestMatch.variant!.downloadUrl, date: releaseDate } };
        setUpdatesFound(newUpdates);
        AsyncStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));

        if (!isCheckingAll) {
          Alert.alert(
            '🚀 UPDATE FOUND!',
            `Current: v${scanningApp.currentVersion}\nNew: v${latestVersion}\n📅 Released: ${releaseDate}\n\n${bestMatch.message}`,
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Download Update', onPress: () => handleDownload(scanningApp!.packageName, bestMatch.variant!.downloadUrl) }]
          );
        }
      } else {
        if (!isCheckingAll) Alert.alert('Up To Date! ✅', `You already have the newest version (v${scanningApp.currentVersion}).\n📅 Latest release: ${releaseDate}`);
      }
    } else {
      if (!isCheckingAll) Alert.alert('No Compatible APK', `Found an update (v${latestVersion}), but couldn't find an arm64-v8a version.`);
    }

    advanceQueue();
  };

  const autoClickerBot = `
    setTimeout(function() {
      if (!window.location.href.includes('-release/')) {
        var titles = document.querySelectorAll('.appRow .appRowTitle a, .appRow a.fontBlack');
        var stableLink = null;
        for (var i = 0; i < titles.length; i++) {
          var text = titles[i].textContent.toLowerCase();
          if (!text.includes('beta') && !text.includes('alpha') && !text.includes('developer') && 
              !text.includes('nightly') && !text.includes('wear os') && !text.includes('daydream') && 
              !text.includes('tv') && !text.includes('auto') && !text.includes('klar') && !text.includes('lite')) {
            stableLink = titles[i];
            break; 
          }
        }
        if (stableLink) {
          window.location.href = stableLink.href; 
        } else {
          window.ReactNativeWebView.postMessage('NO_RESULTS');
        }
      } 
      else {
        window.ReactNativeWebView.postMessage(document.documentElement.outerHTML);
      }
    }, 4500); 
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      
      <View style={[styles.topHeader, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.mainTitle, { color: isDarkMode ? '#FFFFFF' : '#222222' }]}>
          <Text style={{ color: '#2196F3' }}>APK</Text> Tracker
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={savedApps}
        keyExtractor={(item) => item.packageName}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginLeft: 5 }}>
            <Text style={{ color: isDarkMode ? '#00c853' : '#009624', fontSize: 18, fontWeight: 'bold' }}>
              My Watchlist 🚀
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#673AB7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', elevation: 2 }}
              onPress={startBatchCheck}
              disabled={scanningApp !== null}
            >
              {isCheckingAll ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{checkQueue.length} LEFT</Text>
                </>
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
                
                {/* 🌟 GREEN PERMANENT DOWNLOAD BUTTON */}
                {update ? (
                  <TouchableOpacity 
                    style={[styles.checkButton, { backgroundColor: '#00c853' }]}
                    onPress={() => handleDownload(item.packageName, update.url)}
                  >
                    <Text style={styles.checkButtonText}>⬇️ Download</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.checkButton, scanningApp?.packageName === item.packageName && { backgroundColor: '#888' }]}
                    onPress={() => handleCheckUpdate(item)}
                    disabled={scanningApp !== null}
                  >
                    {scanningApp?.packageName === item.packageName ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.checkButtonText}>Check</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <View style={{ padding: 20, paddingTop: 0 }}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddApp')} disabled={scanningApp !== null}>
          <Text style={styles.addButtonText}>+ Add a New App</Text>
        </TouchableOpacity>
      </View>

      {scrapeUrl && (
        <View style={{ width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
          <WebView
            source={{ uri: scrapeUrl }}
            userAgent="Mozilla/5.0 (Linux; Android 14; RMX3571) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            injectedJavaScript={autoClickerBot}
            onMessage={handleBrowserMessage}
            onError={() => advanceQueue()} // On Internet loss, skip gracefully!
          />
        </View>
      )}
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