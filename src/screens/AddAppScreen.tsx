import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { addWatchlistItem } from '../database/WatchlistDao';
import { useDarkMode } from '../hooks/useDarkMode';

export const AddAppScreen = ({ navigation }: any) => {
  const [inputUrl, setInputUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const isDarkMode = useDarkMode();

  const handleSave = async () => {
    // 1. Ensure it is a direct APKMirror link
    if (!inputUrl.includes('apkmirror.com/apk/')) {
      Alert.alert('Invalid Link', 'Please paste a valid APKMirror app page link.\n\nExample:\nhttps://www.apkmirror.com/apk/mozilla/firefox/');
      return;
    }
    
    if (!appName || !currentVersion) {
      Alert.alert('Error', 'Please type an App Name and your Current Version.');
      return;
    }

    // Generate a unique ID from the URL (e.g. "mozilla-firefox")
    const uniquePackageId = inputUrl.split('apkmirror.com/apk/')[1]?.replace(/\//g, '-') || Date.now().toString();
    
    try {
      await addWatchlistItem({
        packageName: uniquePackageId,
        appName: appName.trim(),
        searchTerm: inputUrl.trim(), // 💥 WE SAVE THE FULL DIRECT URL HERE!
        currentVersion: currentVersion.trim(),
        lastNotifiedVersion: '',
        ignoredVersions: '[]',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      Alert.alert('Saved!', `${appName} added to your Watchlist!`);
      navigation.goBack();
      
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE')) {
        Alert.alert('Already Saved', 'This link is already in your Watchlist!');
      } else {
        Alert.alert('Database Error', error.message);
      }
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
      
      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 25 }]}>2. App Name:</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} 
        placeholder="e.g. Firefox"
        placeholderTextColor="#888"
        value={appName} 
        onChangeText={setAppName} 
      />
      
      <Text style={[styles.label, { color: isDarkMode ? '#FFF' : '#000', marginTop: 25 }]}>3. Your Installed Version:</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF', color: isDarkMode ? '#FFF' : '#000' }]} 
        placeholder="e.g. 151.0.2"
        placeholderTextColor="#888"
        value={currentVersion} 
        onChangeText={setCurrentVersion} 
      />
      
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save to Watchlist</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  input: { borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#444', fontSize: 14 },
  button: { backgroundColor: '#FF5722', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 35 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});