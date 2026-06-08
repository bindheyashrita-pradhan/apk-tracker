import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getInstalledApps } from 'react-native-get-app-list';
import { addWatchlistItem } from '../database/WatchlistDao';
import { useDarkMode } from '../hooks/useDarkMode';

export const AddAppScreen = ({ navigation }: any) => {
  const [inputUrl, setInputUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const isDarkMode = useDarkMode();

  // 💥 NEW: Auto-Scan the phone when they paste the link!
  const handleAutoDetect = async () => {
    if (!inputUrl.includes('apkmirror.com/apk/')) {
      Alert.alert('Invalid Link', 'Please paste a valid APKMirror app page link.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Guess the package name from the URL
      const urlParts = inputUrl.split('/');
      let guessedPackage = '';
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'apk' && urlParts[i+2]) {
          guessedPackage = urlParts[i+2]; // Grabs "firefox" or "whatsapp"
          break;
        }
      }

      // 2. Scan the phone's hard drive!
      const apps = await getInstalledApps();
      
      // 3. Find the matching app
      const myApp = apps.find((a: any) => a.packageName.toLowerCase().includes(guessedPackage.toLowerCase()));
      
      if (myApp) {
        setAppName(myApp.appName);
        setCurrentVersion(myApp.versionName);
        Alert.alert('Auto-Detect Success! 🎯', `Found ${myApp.appName} (v${myApp.versionName}) on your phone!`);
      } else {
        Alert.alert('Not Installed', `Could not find this app currently installed on your phone. You can type it manually.`);
        setAppName(guessedPackage);
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
    const uniquePackageId = inputUrl.split('apkmirror.com/apk/')[1]?.replace(/\//g, '-') || Date.now().toString();
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
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>🔍 Auto-Detect App on Phone</Text>}
      </TouchableOpacity>

      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 25 }]}>2. App Name:</Text>
      <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} value={appName} onChangeText={setAppName} />
      
      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 15 }]}>3. Your Installed Version:</Text>
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