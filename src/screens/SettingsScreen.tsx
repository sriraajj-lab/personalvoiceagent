import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({onBack}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agent Config</Text>
        <Text style={styles.info}>Connected to ElevenLabs</Text>
        <Text style={styles.info}>Voice: Rajesh (Cloned)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Knowledge Base</Text>
        <Text style={styles.info}>Loaded: Rajesh's profile, experience, projects</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calls</Text>
        <Text style={styles.info}>Trigger phrase: "Hey Aria, take this"</Text>
        <Text style={styles.info}>Auto-answer for: Work calls, Interviews</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  backText: {fontSize: 18, color: '#00d4ff'},
  title: {fontSize: 24, fontWeight: 'bold', color: '#ffffff'},
  section: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8},
  info: {fontSize: 14, color: '#cccccc', marginBottom: 4},
});

export default SettingsScreen;
