import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { getInstalledApps } from 'react-native-get-app-list';
import * as cheerio from 'cheerio';
import { addWatchlistItem } from '../database/WatchlistDao';
import { useDarkMode } from '../hooks/useDarkMode';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AddAppScreen = ({ navigation }: any) => {
  const isDarkMode = useDarkMode();
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number} | null>(null);

  // 🧹 THE NAME CLEANER
  const extractInfoFromUrl = (url: string) => {
    const urlParts = url.toLowerCase().split('/');
    let guessedPackage = ''; let devName = '';
    
    for (let i = 0; i < urlParts.length; i++) {
      if (urlParts[i] === 'apk' && urlParts[i+2]) {
        devName = urlParts[i+1].replace('-inc', '').replace('-llc', '').replace('-ltd', ''); 
        guessedPackage = urlParts[i+2]; 
        break;
      }
    }

    // Fix the weird "Google Messenger Google Inc" and "Files Go" bugs!
    guessedPackage = guessedPackage.replace(new RegExp(`-${devName}$`, 'i'), ''); 
    if (guessedPackage === 'files-go') guessedPackage = 'files';

    let cleanDev = devName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let cleanApp = guessedPackage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let niceAppName = cleanApp;
    if (cleanDev && cleanApp) {
      const devFirstWord = cleanDev.split(' ')[0].toLowerCase();
      const appFirstWord = cleanApp.split(' ')[0].toLowerCase();
      if (devFirstWord !== appFirstWord) niceAppName = `${cleanDev} ${cleanApp}`;
    }

    return { guessedPackage, devName, niceAppName };
  };

  // 🕵️ THE REVANCED DODGER
  const scanPhoneLocally = async (guessedPackage: string, devName: string) => {
    try {
      const apps = await getInstalledApps();
      let myApp = apps.find((a: any) => {
        const pkg = (a.packageName || '').toLowerCase();
        const simplePkg = pkg.split('.').pop() || ''; 
        
        // If the dev is Google, strictly enforce "com.google" so it ignores ReVanced!
        const isOfficialDev = devName === 'google' ? pkg.includes('com.google') : pkg.includes(devName);
        return isOfficialDev && (guessedPackage.includes(simplePkg) || pkg.includes(guessedPackage));
      });

      if (!myApp) {
        myApp = apps.find((a: any) => (a.packageName || '').toLowerCase().includes(guessedPackage));
      }
      return myApp;
    } catch (err) { return null; }
  };

  const handleAutoDetect = async () => {
    if (!inputUrl.toLowerCase().includes('apkmirror.com/apk/')) return Alert.alert('Invalid Link', 'Please paste a valid APKMirror app page link.');
    setLoading(true);
    try {
      const { guessedPackage, devName, niceAppName } = extractInfoFromUrl(inputUrl);
      let foundLocally = false;

      const myApp = await scanPhoneLocally(guessedPackage, devName);
      if (myApp) {
        setAppName(niceAppName); setCurrentVersion(myApp.versionName); foundLocally = true;
        Alert.alert('Auto-Detect Success! 🎯', `Found ${niceAppName} (v${myApp.versionName}) on your phone!`);
      }

      if (!foundLocally) {
        try {
          const response = await fetch(inputUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' } });
          const html = await response.text();
          if (!html.includes('Cloudflare') && !html.includes('Just a moment')) {
            const $ = cheerio.load(html);
            let webVersion = '';
            $('.appRow .appRowTitle a, .appRow a.fontBlack').each((_, el) => {
               const text = $(el).text().toLowerCase();
               if (!text.includes('beta') && !text.includes('nightly') && !text.includes('wear os') && !text.includes('tv')) {
                  const match = text.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
                  if (match) { webVersion = match[1]; return false; }
               }
            });
            if (webVersion) {
              setAppName(niceAppName); setCurrentVersion(webVersion);
              Alert.alert('Web Sync Success 🌐', `Android hid this app, so we grabbed the latest web version (v${webVersion})!`);
            } else throw new Error("No stable version");
          } else throw new Error("Cloudflare Blocked");
        } catch (error) {
          setAppName(niceAppName); setCurrentVersion('0.0.0');
          Alert.alert('Tracking Set! 🤖', `App hidden by Android. Version set to 0.0.0.`);
        }
      }
    } catch (error) {}
    setLoading(false);
  };

  const handleSaveSingle = async () => {
    if (!appName || !currentVersion) return Alert.alert('Error', 'Ensure App Name and Version are filled out.');
    const uniquePackageId = inputUrl.toLowerCase().split('apkmirror.com/apk/')[1]?.replace(/\//g, '-') || Date.now().toString();
    try {
      await addWatchlistItem({ packageName: uniquePackageId, appName: appName.trim(), searchTerm: inputUrl.trim(), currentVersion: currentVersion.trim(), lastNotifiedVersion: '', ignoredVersions: '[]', enabled: true, createdAt: Date.now(), updatedAt: Date.now() });
      navigation.goBack();
    } catch (error: any) { Alert.alert('Database Error', error.message); }
  };

  const processBatchLink = async (url: string) => {
    try {
      const { guessedPackage, devName, niceAppName } = extractInfoFromUrl(url);
      if (!guessedPackage) return false;

      let finalVersion = '0.0.0';
      let foundLocally = false;

      const myApp = await scanPhoneLocally(guessedPackage, devName);
      if (myApp) { finalVersion = myApp.versionName; foundLocally = true; }

      if (!foundLocally) {
        try {
          const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' } });
          const html = await response.text();
          if (!html.includes('Cloudflare')) {
            const $ = cheerio.load(html);
            $('.appRow .appRowTitle a, .appRow a.fontBlack').each((_, el) => {
               const text = $(el).text().toLowerCase();
               if (!text.includes('beta') && !text.includes('nightly') && !text.includes('wear os') && !text.includes('tv')) {
                  const match = text.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
                  if (match) { finalVersion = match[1]; return false; }
               }
            });
          }
        } catch(e) {}
      }

      const uniquePackageId = url.toLowerCase().split('apkmirror.com/apk/')[1]?.replace(/\//g, '-') || Date.now().toString();
      await addWatchlistItem({ packageName: uniquePackageId, appName: niceAppName.trim(), searchTerm: url.trim(), currentVersion: finalVersion.trim(), lastNotifiedVersion: '', ignoredVersions: '[]', enabled: true, createdAt: Date.now(), updatedAt: Date.now() });
      return true;
    } catch (error) { return false; }
  };

  const handleBatchImport = async () => {
    const links = batchInput.split('\n').map(l => l.trim()).filter(l => l.includes('apkmirror.com/apk/'));
    if (links.length === 0) return Alert.alert('Invalid', 'No valid APKMirror links found.');

    setLoading(true);
    let successCount = 0;
    for (let i = 0; i < links.length; i++) {
      setBatchProgress({ current: i + 1, total: links.length });
      const success = await processBatchLink(links[i]);
      if (success) successCount++;
      if (i < links.length - 1) await sleep(1500); 
    }
    setLoading(false); setBatchProgress(null); setBatchInput('');
    Alert.alert('Batch Complete! 🎉', `Successfully added ${successCount} out of ${links.length} apps.`);
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleButton, !isBatchMode && styles.toggleActive]} onPress={() => setIsBatchMode(false)} disabled={loading}>
          <Text style={[styles.toggleText, !isBatchMode && styles.toggleTextActive]}>Single App</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, isBatchMode && styles.toggleActive]} onPress={() => setIsBatchMode(true)} disabled={loading}>
          <Text style={[styles.toggleText, isBatchMode && styles.toggleTextActive]}>Batch Import</Text>
        </TouchableOpacity>
      </View>

      {!isBatchMode ? (
        <View>
          <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000' }]}>1. Paste Direct APKMirror Link:</Text>
          <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} placeholder="https://www.apkmirror.com/apk/mozilla/firefox/" placeholderTextColor="#888" value={inputUrl} onChangeText={setInputUrl} />
          <TouchableOpacity style={styles.detectButton} onPress={handleAutoDetect} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>🔍 Auto-Detect App</Text>}
          </TouchableOpacity>
          <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 25 }]}>2. App Name:</Text>
          <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} value={appName} onChangeText={setAppName} />
          <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 15 }]}>3. Tracking Version:</Text>
          <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#00c853' : '#009624', fontWeight: 'bold' }]} value={currentVersion} onChangeText={setCurrentVersion} />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSingle}>
            <Text style={styles.buttonText}>Save to Watchlist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000' }]}>Paste Multiple Links (One per line):</Text>
          <TextInput style={[styles.input, { height: 250, textAlignVertical: 'top', backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} multiline={true} placeholderTextColor="#888" value={batchInput} onChangeText={setBatchInput} editable={!loading} />
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: loading ? '#888' : '#673AB7' }]} onPress={handleBatchImport} disabled={loading}>
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><ActivityIndicator color="#FFF" style={{ marginRight: 10 }}/><Text style={styles.buttonText}>Processing {batchProgress?.current} of {batchProgress?.total}...</Text></View>
            ) : (<Text style={styles.buttonText}>🚀 Start Batch Scan</Text>)}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  toggleContainer: { flexDirection: 'row', marginBottom: 25, backgroundColor: '#333', borderRadius: 8, padding: 4 },
  toggleButton: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: '#2196F3' },
  toggleText: { color: '#AAA', fontWeight: 'bold' },
  toggleTextActive: { color: '#FFF' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  input: { borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#444', fontSize: 14 },
  detectButton: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButton: { backgroundColor: '#FF5722', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});