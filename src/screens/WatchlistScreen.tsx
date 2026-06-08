import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as cheerio from 'cheerio';
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

  const loadApps = async () => {
    const apps = await getAllWatchlistItems();
    setSavedApps(apps);
  };

  useEffect(() => {
    loadApps();
    const unsubscribe = navigation.addListener('focus', () => loadApps());
    return unsubscribe;
  }, [navigation]);

  const handleCheckUpdate = (app: WatchlistItem) => {
    setScanningApp(app);
    setScrapeUrl(app.searchTerm); // We feed the direct URL to the invisible bot
  };

  const handleDelete = async (packageName: string) => {
    await deleteWatchlistItem(packageName);
    loadApps();
  };

  const handleBrowserMessage = (event: any) => {
    const htmlCode = event.nativeEvent.data;

    if (htmlCode === 'NO_RESULTS') {
      Alert.alert('Not Found', 'Could not find a stable release on this page.');
      setScrapeUrl(null); 
      setScanningApp(null); 
      return;
    }
    
    // Ignore Cloudflare checks
    if (htmlCode.includes('Just a moment') || htmlCode.includes('Cloudflare')) return;

    setScrapeUrl(null); 
    if (!scanningApp) return;

    const $ = cheerio.load(htmlCode);
    const variants: ApkVariant[] = [];

    // 1. Extract Version Number (Supports infinite dots, hyphens, and letters!)
    const pageTitle = $('h1').text();
    const versionMatch = pageTitle.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
    const latestVersion = versionMatch ? versionMatch[1] : null;

    if (!latestVersion) {
      Alert.alert('Scan Failed', 'Could not extract the version number from the page.');
      setScanningApp(null); 
      return;
    }

    // 2. Extract Variants and the Date (Locked specifically to the Variant Table!)
    let releaseDate = "Unknown Date";
    let rows = $('.table-row');
    if (rows.length === 0) rows = $('.variants-table .table-row');

    rows.each((_, row) => {
      const rowText = $(row).text().toLowerCase();
      const originalRowText = $(row).text(); // Keep capital letters for date matching
      
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

        // 📅 GRAB THE DATE DIRECTLY FROM THIS EXACT ROW! 
        if (releaseDate === "Unknown Date") {
          const dateMatch = originalRowText.match(/([A-Z][a-z]{2,8}\s\d{1,2},\s\d{4})/);
          if (dateMatch && dateMatch[1]) {
            releaseDate = dateMatch[1];
          }
        }

        const downloadLink = link.startsWith('http') ? link : `${APK_MIRROR_BASE_URL}${link}`;
        variants.push({ version: latestVersion, arch, dpi, downloadUrl: downloadLink });
      }
    });

    // 3. Send to the Math Brains!
    const bestMatch = findBestVariant(variants);

    if (bestMatch.variant) {
      const hasUpdate = isNewerVersion(scanningApp.currentVersion, latestVersion);
      if (hasUpdate) {
        Alert.alert(
          '🚀 UPDATE FOUND!',
          `Current: v${scanningApp.currentVersion}\nNew: v${latestVersion}\n📅 Released: ${releaseDate}\n\n${bestMatch.message}`,
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Download Update', onPress: () => Linking.openURL(bestMatch.variant!.downloadUrl) }]
        );
      } else {
        Alert.alert('Up To Date! ✅', `You already have the newest version (v${scanningApp.currentVersion}).\n📅 Latest release: ${releaseDate}`);
      }
    } else {
      Alert.alert('No Compatible APK', `Found an update (v${latestVersion}), but couldn't find an arm64-v8a version for your phone.`);
    }

    setScanningApp(null);
  };

  // 🤖 THE ULTIMATE DIRECT LINK BOT (Ignores Smartwatches, VR, Betas, Klar, etc.)
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
      <FlatList
        data={savedApps}
        keyExtractor={(item) => item.packageName}
        ListHeaderComponent={
          <Text style={{ color: isDarkMode ? '#00c853' : '#009624', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
            My Watchlist 🚀
          </Text>
        }
        ListEmptyComponent={
          <Text style={{ color: isDarkMode ? '#AAAAAA' : '#666666', textAlign: 'center', marginTop: 20 }}>
            Your watchlist is empty. Add an app below!
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appName, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>{item.appName}</Text>
              <Text style={styles.appDetails}>Version: {item.currentVersion}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => handleDelete(item.packageName)} style={{ padding: 12 }}>
                <Text style={{ color: '#FF0000' }}>🗑️</Text>
              </TouchableOpacity>
              
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
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddApp')}>
        <Text style={styles.addButtonText}>+ Add a New App</Text>
      </TouchableOpacity>

      {/* 👻 CRASH-PROOF INVISIBLE BOT */}
      {scrapeUrl && (
        <View style={{ width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
          <WebView
            source={{ uri: scrapeUrl }}
            userAgent="Mozilla/5.0 (Linux; Android 14; RMX3571) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            injectedJavaScript={autoClickerBot}
            onMessage={handleBrowserMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setScrapeUrl(null);
              setScanningApp(null);
              Alert.alert('Browser Error', `Code: ${nativeEvent.code}\nReason: ${nativeEvent.description}`);
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: { padding: 15, borderRadius: 8, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3, borderLeftWidth: 4, borderLeftColor: '#00c853' },
  appName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  appDetails: { fontSize: 12, color: '#888' },
  checkButton: { backgroundColor: '#FF5722', padding: 12, borderRadius: 6, minWidth: 70, alignItems: 'center' },
  checkButtonText: { color: '#FFF', fontWeight: 'bold' },
  addButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, marginTop: 10, width: '100%', alignItems: 'center' },
  addButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});