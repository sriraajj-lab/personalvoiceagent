import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

type AgentStatus = 'idle' | 'listening' | 'speaking' | 'error';

interface HomeScreenProps {
  agentStatus: AgentStatus;
  onSettingsPress: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({agentStatus, onSettingsPress}) => {
  const [isActivated, setIsActivated] = useState(false);

  const statusColors: Record<AgentStatus, string> = {
    idle: '#6c757d',
    listening: '#00d4ff',
    speaking: '#00ff88',
    error: '#ff4444',
  };

  const statusLabels: Record<AgentStatus, string> = {
    idle: 'Ready',
    listening: 'Listening...',
    speaking: 'Speaking...',
    error: 'Error',
  };

  const toggleAgent = () => {
    setIsActivated(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aria Voice Agent</Text>
        <TouchableOpacity onPress={onSettingsPress} style={styles.settingsBtn}>
          <Text style={styles.settingsText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <View style={[styles.statusDot, {backgroundColor: statusColors[agentStatus]}]} />
        <Text style={styles.statusLabel}>{statusLabels[agentStatus]}</Text>
        
        <TouchableOpacity
          style={[styles.activationBtn, isActivated && styles.activationBtnActive]}
          onPress={toggleAgent}>
          <Text style={styles.activationBtnText}>
            {isActivated ? 'DEACTIVATE' : 'ACTIVATE'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isActivated
            ? 'Agent is active on calls. Tap to deactivate.'
            : 'Activate to start handling calls with your voice.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  title: {fontSize: 24, fontWeight: 'bold', color: '#ffffff'},
  settingsBtn: {padding: 8},
  settingsText: {fontSize: 24, color: '#ffffff'},
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusLabel: {fontSize: 18, color: '#ffffff', marginBottom: 30},
  activationBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  activationBtnActive: {backgroundColor: '#ff4444'},
  activationBtnText: {color: '#ffffff', fontSize: 18, fontWeight: 'bold'},
  hint: {color: '#a0a0a0', fontSize: 14, textAlign: 'center', marginTop: 20},
});

export default HomeScreen;
