import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  AppState,
  AppStateStatus,
  LogBox,
} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import HistoryScreen from './screens/HistoryScreen';
import {AgentStatus, TakeoverState, TranscriptEntry, AppSettings} from './types';
import {DEFAULT_SETTINGS} from './config';
import {
  initializeVoiceAgent,
  startPassiveListening,
  stopPassiveListening,
  activateTakeover,
  endTakeover,
  onStatusChange,
  onTranscriptUpdate,
  onTakeoverStateChange,
  cleanupVoiceAgent,
  getTranscriptEntries,
} from './services/VoiceAgentService';
import {KnowledgeBaseService} from './services/KnowledgeBaseService';

LogBox.ignoreLogs(['Reanimated']);

type Screen = 'home' | 'settings' | 'history';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [takeoverState, setTakeoverState] = useState<TakeoverState>('inactive');
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const appState = useRef(AppState.currentState);

  // Initialize app on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize database and load settings
        const kbService = KnowledgeBaseService.getInstance();
        const savedDeepgram = await kbService.getSetting('deepgramApiKey');
        const savedAgentId = await kbService.getSetting('elevenLabsAgentId');
        const savedApiKey = await kbService.getSetting('elevenLabsApiKey');
        const savedPassiveListen = await kbService.getSetting('passiveListeningEnabled');

        setSettings(prev => ({
          ...prev,
          deepgramApiKey: savedDeepgram || prev.deepgramApiKey,
          elevenLabsAgentId: savedAgentId || prev.elevenLabsAgentId,
          elevenLabsApiKey: savedApiKey || prev.elevenLabsApiKey,
          passiveListeningEnabled: savedPassiveListen !== null
            ? savedPassiveListen === 'true'
            : prev.passiveListeningEnabled,
        }));

        // Initialize voice agent
        await initializeVoiceAgent();

        // Auto-start passive listening if enabled
        const isEnabled = savedPassiveListen !== null
          ? savedPassiveListen === 'true'
          : DEFAULT_SETTINGS.passiveListeningEnabled;

        if (isEnabled) {
          await startListening();
        }
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    init();

    // Subscribe to status changes
    const unsubStatus = onStatusChange(status => {
      setAgentStatus(status);
      if (status === 'passive_listening') {
        setIsListening(true);
      } else if (status === 'idle') {
        setIsListening(false);
      }
    });

    // Subscribe to transcript updates
    const unsubTranscript = onTranscriptUpdate((entries, partial) => {
      setTranscriptEntries(entries);
      setPartialTranscript(partial);
    });

    // Subscribe to takeover state changes
    const unsubTakeover = onTakeoverStateChange(state => {
      setTakeoverState(state);
    });

    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubStatus();
      unsubTranscript();
      unsubTakeover();
      subscription.remove();
      cleanupVoiceAgent();
    };
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // App going to background - keep listening if passive mode is on
      console.log('App moved to background, keeping passive listen active');
    } else if (nextAppState === 'active') {
      // App coming to foreground
      console.log('App came to foreground');
    }
    appState.current = nextAppState;
  }, []);

  const startListening = async () => {
    const success = await startPassiveListening();
    if (success) {
      setIsListening(true);
    }
  };

  const stopListening = async () => {
    await stopPassiveListening();
    setIsListening(false);
    setTranscriptEntries([]);
    setPartialTranscript('');
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTakeover = async () => {
    await activateTakeover();
  };

  const handleEndTakeover = async () => {
    await endTakeover();
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);

    try {
      const kbService = KnowledgeBaseService.getInstance();
      await kbService.saveSetting('deepgramApiKey', newSettings.deepgramApiKey);
      await kbService.saveSetting('elevenLabsAgentId', newSettings.elevenLabsAgentId);
      await kbService.saveSetting('elevenLabsApiKey', newSettings.elevenLabsApiKey);
      await kbService.saveSetting('passiveListeningEnabled', String(newSettings.passiveListeningEnabled));

      // Restart listening if setting changed
      if (newSettings.passiveListeningEnabled !== settings.passiveListeningEnabled) {
        if (newSettings.passiveListeningEnabled) {
          await startListening();
        } else {
          await stopListening();
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      const kbService = KnowledgeBaseService.getInstance();
      await kbService.clearAllData();
      setTranscriptEntries([]);
      setPartialTranscript('');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            agentStatus={agentStatus}
            takeoverState={takeoverState}
            transcriptEntries={transcriptEntries}
            partialTranscript={partialTranscript}
            onSettingsPress={() => setCurrentScreen('settings')}
            onHistoryPress={() => setCurrentScreen('history')}
            onTakeoverPress={handleTakeover}
            onEndTakeoverPress={handleEndTakeover}
            onToggleListening={handleToggleListening}
            isListening={isListening}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => setCurrentScreen('home')}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearHistory={handleClearHistory}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            onBack={() => setCurrentScreen('home')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      {renderScreen()}
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