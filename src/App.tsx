import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'settings'>('home');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'speaking' | 'error'>('idle');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      {currentScreen === 'home' ? (
        <HomeScreen
          agentStatus={agentStatus}
          onSettingsPress={() => setCurrentScreen('settings')}
        />
      ) : (
        <SettingsScreen onBack={() => setCurrentScreen('home')} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});

export default App;
