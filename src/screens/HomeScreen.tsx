import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
} from 'react-native';
import {AgentStatus, TakeoverState, TranscriptEntry} from '../types';
import LiveTranscript from '../components/LiveTranscript';
import FloatingTakeoverButton from '../components/FloatingTakeoverButton';

interface HomeScreenProps {
  agentStatus: AgentStatus;
  takeoverState: TakeoverState;
  transcriptEntries: TranscriptEntry[];
  partialTranscript: string;
  onSettingsPress: () => void;
  onHistoryPress: () => void;
  onTakeoverPress: () => void;
  onEndTakeoverPress: () => void;
  onToggleListening: () => void;
  isListening: boolean;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  agentStatus,
  takeoverState,
  transcriptEntries,
  partialTranscript,
  onSettingsPress,
  onHistoryPress,
  onTakeoverPress,
  onEndTakeoverPress,
  onToggleListening,
  isListening,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();

      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      wave.start();

      return () => {
        pulse.stop();
        wave.stop();
      };
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening, pulseAnim, waveAnim]);

  const getStatusLabel = () => {
    switch (agentStatus) {
      case 'idle':
        return 'Idle';
      case 'passive_listening':
        return 'Listening...';
      case 'transcribing':
        return 'Processing...';
      case 'takeover_active':
        return 'AI Takeover Active';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'idle':
        return '#6c757d';
      case 'passive_listening':
        return '#00d4ff';
      case 'transcribing':
        return '#ff9900';
      case 'takeover_active':
        return '#ff4444';
      case 'speaking':
        return '#00ff88';
      case 'error':
        return '#ff4444';
      default:
        return '#6c757d';
    }
  };

  const micScale = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.8, 1.2],
  });

  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Aria Voice Agent</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onHistoryPress} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSettingsPress} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <View style={styles.statusContainer}>
          <Animated.View
            style={[
              styles.micContainer,
              {
                transform: [{scale: micScale}],
                borderColor: getStatusColor(),
              },
            ]}>
            <Text style={[styles.micIcon, {color: getStatusColor()}]}>
              {isListening ? '🎤' : '🎧'}
            </Text>
          </Animated.View>

          <View style={styles.waveformContainer}>
            {isListening && (
              <Animated.View
                style={[
                  styles.waveformBar,
                  {
                    transform: [{translateX: waveTranslateX}],
                    opacity: pulseAnim,
                  },
                ]}
              />
            )}
          </View>

          <Text style={[styles.statusLabel, {color: getStatusColor()}]}>
            {getStatusLabel()}
          </Text>
        </View>

        {/* Toggle Listening Button */}
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            {backgroundColor: isListening ? '#ff4444' : '#7C3AED'},
          ]}
          onPress={onToggleListening}>
          <Text style={styles.toggleBtnText}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Transcript */}
      <View style={styles.transcriptSection}>
        <LiveTranscript
          entries={transcriptEntries}
          partialTranscript={partialTranscript}
          isListening={isListening}
        />
      </View>

      {/* Floating Takeover Button */}
      <FloatingTakeoverButton
        takeoverState={takeoverState}
        onTakeoverPress={onTakeoverPress}
        onEndTakeoverPress={onEndTakeoverPress}
        isVisible={isListening || takeoverState !== 'inactive'}
      />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 20,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  micContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a4a',
    marginBottom: 12,
  },
  micIcon: {
    fontSize: 36,
  },
  waveformContainer: {
    height: 4,
    width: 200,
    backgroundColor: '#2a2a4a',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  waveformBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00d4ff',
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  toggleBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transcriptSection: {
    flex: 1,
    paddingBottom: 80,
  },
});

export default HomeScreen;