import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import {AppSettings} from '../types';

interface SettingsScreenProps {
  onBack: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearHistory: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  settings,
  onSaveSettings,
  onClearHistory,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    Alert.alert('Saved', 'Settings have been saved successfully.');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all conversation history and extracted knowledge. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            onClearHistory();
            Alert.alert('Cleared', 'All conversation history has been deleted.');
          },
        },
      ],
    );
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    secure = false,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    secure?: boolean;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6c757d"
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* API Configuration */}
        <Text style={styles.sectionTitle}>API Configuration</Text>
        <View style={styles.section}>
          <InputField
            label="Deepgram API Key"
            value={localSettings.deepgramApiKey}
            onChangeText={text =>
              setLocalSettings(prev => ({...prev, deepgramApiKey: text}))
            }
            placeholder="Enter Deepgram API key"
            secure
          />
          <InputField
            label="ElevenLabs Agent ID"
            value={localSettings.elevenLabsAgentId}
            onChangeText={text =>
              setLocalSettings(prev => ({...prev, elevenLabsAgentId: text}))
            }
            placeholder="Enter ElevenLabs Agent ID"
          />
          <InputField
            label="ElevenLabs API Key"
            value={localSettings.elevenLabsApiKey}
            onChangeText={text =>
              setLocalSettings(prev => ({...prev, elevenLabsApiKey: text}))
            }
            placeholder="Enter ElevenLabs API key"
            secure
          />
        </View>

        {/* Listening Configuration */}
        <Text style={styles.sectionTitle}>Listening Configuration</Text>
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Passive Listening</Text>
              <Text style={styles.switchDescription}>
                Continuously listen and transcribe conversations
              </Text>
            </View>
            <Switch
              value={localSettings.passiveListeningEnabled}
              onValueChange={value =>
                setLocalSettings(prev => ({
                  ...prev,
                  passiveListeningEnabled: value,
                }))
              }
              trackColor={{false: '#3a3a5a', true: '#7C3AED'}}
              thumbColor={localSettings.passiveListeningEnabled ? '#ffffff' : '#6c757d'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Auto-Answer Work Calls</Text>
              <Text style={styles.switchDescription}>
                Automatically answer incoming work calls
              </Text>
            </View>
            <Switch
              value={localSettings.autoAnswerWorkCalls}
              onValueChange={value =>
                setLocalSettings(prev => ({
                  ...prev,
                  autoAnswerWorkCalls: value,
                }))
              }
              trackColor={{false: '#3a3a5a', true: '#7C3AED'}}
              thumbColor={localSettings.autoAnswerWorkCalls ? '#ffffff' : '#6c757d'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Trigger Phrase</Text>
            <TextInput
              style={styles.textInput}
              value={localSettings.triggerPhrase}
              onChangeText={text =>
                setLocalSettings(prev => ({...prev, triggerPhrase: text}))
              }
              placeholder="Trigger phrase for takeover"
              placeholderTextColor="#6c757d"
            />
          </View>
        </View>

        {/* Data Management */}
        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearHistory}>
            <Text style={styles.dangerButtonText}>
              🗑 Clear All Conversation History
            </Text>
          </TouchableOpacity>
          <Text style={styles.infoText}>
            All data is stored locally on your device. Nothing is sent to the
            cloud except audio transcription (via Deepgram) and AI response
            generation (via ElevenLabs).
          </Text>
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.1.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Architecture</Text>
            <Text style={styles.infoValue}>Passive Listen + Takeover</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage</Text>
            <Text style={styles.infoValue}>Local SQLite</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  backText: {
    fontSize: 18,
    color: '#00d4ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveText: {
    fontSize: 18,
    color: '#00ff88',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d4ff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#4a0000',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: '#8b949e',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  infoLabel: {
    fontSize: 14,
    color: '#cccccc',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default SettingsScreen;
