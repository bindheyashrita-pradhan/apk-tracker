import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getInstalledApps } from 'react-native-get-app-list';
import * as cheerio from 'cheerio';
import { addWatchlistItem } from '../database/WatchlistDao';
import { useDarkMode } from '../hooks/useDarkMode';

export const AddAppScreen = ({ navigation }: any) => {
  const [inputUrl, setInputUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const isDarkMode = useDarkMode();

  const handleAutoDetect = async () => {
    if (!inputUrl.toLowerCase().includes('apkmirror.com/apk/')) {
      Alert.alert('Invalid Link', 'Please paste a valid APKMirror app page link.');
      return;
    }
    
    setLoading(true);
    try {
      const urlParts = inputUrl.toLowerCase().split('/');
      let guessedPackage = '';
      let devName = '';
      
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'apk' && urlParts[i+2]) {
          devName = urlParts[i+1].replace('-inc', '').replace('-llc', ''); 
          guessedPackage = urlParts[i+2]; 
          break;
        }
      }

      let foundLocally = false;
      let niceAppName = devName.charAt(0).toUpperCase() + devName.slice(1) + ' ' + guessedPackage.charAt(0).toUpperCase() + guessedPackage.slice(1);

      // 1. TRY THE PHONE SCANNER
      try {
        const apps = await getInstalledApps();
        let myApp = apps.find((a: any) => {
          const pkg = (a.packageName || '').toLowerCase();
          return pkg.includes(guessedPackage) && pkg.includes(devName);
        });

        if (!myApp) {
          myApp = apps.find((a: any) => {
            const pkg = (a.packageName || '').toLowerCase();
            const name = (a.appName || '').toLowerCase();
            return pkg.includes(guessedPackage) || name.includes(guessedPackage);
          });
        }
        
        if (myApp) {
          setAppName(myApp.appName);
          setCurrentVersion(myApp.versionName);
          foundLocally = true;
          Alert.alert('Auto-Detect Success! 🎯', `Found ${myApp.appName} (v${myApp.versionName}) on your phone!`);
        }
      } catch (err) {
        console.log("Phone scan error");
      }

      // 2. IF PHONE SCAN FAILS: THE "NO TYPING" WEB FALLBACK! 🌐
      if (!foundLocally) {
        console.log("App hidden by Android. Fetching baseline from Web...");
        
        try {
          const response = await fetch(inputUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; RMX3571) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36' } 
          });
          const html = await response.text();
          
          if (!html.includes('Cloudflare') && !html.includes('Just a moment')) {
            const $ = cheerio.load(html);
            let webVersion = '';
            
            // Look at the web list and grab the first stable version number
            $('.appRow .appRowTitle a, .appRow a.fontBlack').each((_, el) => {
               const text = $(el).text();
               const lowerText = text.toLowerCase();
               if (!lowerText.includes('beta') && !lowerText.includes('alpha') && !lowerText.includes('nightly') && !lowerText.includes('wear os') && !lowerText.includes('daydream') && !lowerText.includes('tv') && !lowerText.includes('auto')) {
                  const match = text.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
                  if (match) {
                    webVersion = match[1];
                    return false; // Stop at the first good one!
                  }
               }
            });

            if (webVersion) {
              setAppName(niceAppName);
              setCurrentVersion(webVersion);
              Alert.alert('Web Sync Success 🌐', `Android hid this app, so we automatically grabbed the latest web version (v${webVersion}) for you! No typing needed.`);
            } else {
              throw new Error("No stable version found on web");
            }
          } else {
             throw new Error("Cloudflare Blocked");
          }
        } catch (webError) {
          // 3. THE ULTIMATE FALLBACK: Set to 0.0.0
          setAppName(niceAppName);
          setCurrentVersion('0.0.0');
          Alert.alert('Tracking Set! 🤖', `App hidden by Android. We set the version to 0.0.0 so the next time you tap 'Check' on the Home Screen, it will automatically find the newest update for you!`);
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!appName || !currentVersion) {
      Alert.alert('Error', 'Please ensure App Name and Version are filled out.');
      return;
    }
    const uniquePackageId = inputUrl.toLowerCase().split('apkmirror.com/apk/')[1]?.replace(/\//g, '-') || Date.now().toString();
    try {
      await addWatchlistItem({
        packageName: uniquePackageId,
        appName: appName.trim(),
        searchTerm: inputUrl.trim(), 
        currentVersion: currentVersion.trim(),
        lastNotifiedVersion: '',
        ignoredVersions: '[]',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Database Error', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000' }]}>1. Paste Direct APKMirror Link:</Text>
      <TextInput
        style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]}
        placeholder="https://www.apkmirror.com/apk/mozilla/firefox/"
        placeholderTextColor="#888"
        value={inputUrl}
        onChangeText={setInputUrl}
      />
      
      <TouchableOpacity style={styles.detectButton} onPress={handleAutoDetect} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>🔍 Auto-Detect App</Text>}
      </TouchableOpacity>

      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 25 }]}>2. App Name:</Text>
      <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} value={appName} onChangeText={setAppName} />
      
      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 15 }]}>3. Tracking Version:</Text>
      <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#00c853' : '#009624', fontWeight: 'bold' }]} value={currentVersion} onChangeText={setCurrentVersion} />
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>Save to Watchlist</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  input: { borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#444', fontSize: 14 },
  detectButton: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButton: { backgroundColor: '#FF5722', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});