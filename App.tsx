import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WatchlistScreen } from './src/screens/WatchlistScreen';
import { AddAppScreen } from './src/screens/AddAppScreen';
import { useDarkMode } from './src/hooks/useDarkMode';
import { initDatabase } from './src/database/Database';

const Stack = createNativeStackNavigator();

const App = () => {
  const isDarkMode = useDarkMode();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((error) => setDbError(error.toString()));
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>Database Error:</Text>
        <Text style={{ marginTop: 10 }}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#00c853" />
        <Text style={{ marginTop: 20, color: isDarkMode ? '#FFF' : '#000' }}>Turning on Database...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
          headerTintColor: isDarkMode ? '#FFFFFF' : '#000000',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* 🛑 WE TURN OFF THE DEFAULT HEADER HERE */}
        <Stack.Screen 
          name="Watchlist" 
          component={WatchlistScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen name="AddApp" component={AddAppScreen} options={{ title: 'Add New App' }} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;