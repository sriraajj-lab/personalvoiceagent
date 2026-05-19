import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {TakeoverState} from '../types';

interface FloatingTakeoverButtonProps {
  takeoverState: TakeoverState;
  onTakeoverPress: () => void;
  onEndTakeoverPress: () => void;
  isVisible: boolean;
}

const FloatingTakeoverButton: React.FC<FloatingTakeoverButtonProps> = ({
  takeoverState,
  onTakeoverPress,
  onEndTakeoverPress,
  isVisible,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (takeoverState === 'requesting' || takeoverState === 'responding') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [takeoverState, pulseAnim]);

  if (!isVisible) return null;

  const isActive = takeoverState === 'active' || takeoverState === 'responding';

  const getButtonLabel = () => {
    switch (takeoverState) {
      case 'requesting':
        return '🤖 Thinking...';
      case 'active':
        return '⚡ AI Active';
      case 'responding':
        return '🔊 Speaking...';
      case 'ended':
        return '✅ Done';
      default:
        return '🤖 Take Over';
    }
  };

  const getButtonColor = () => {
    if (isActive) return '#ff4444';
    if (takeoverState === 'requesting') return '#ff9900';
    return '#7C3AED';
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isActive ? (
        <TouchableOpacity
          style={[styles.button, {backgroundColor: getButtonColor()}]}
          onPress={onEndTakeoverPress}
          activeOpacity={0.8}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: Animated.subtract(1, pulseAnim),
                transform: [{scale: pulseAnim}],
              },
            ]}
          />
          <Text style={styles.buttonText}>{getButtonLabel()}</Text>
          <Text style={styles.subText}>Tap to end</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, {backgroundColor: getButtonColor()}]}
          onPress={onTakeoverPress}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>{getButtonLabel()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    zIndex: 9999,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    marginTop: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C3AED',
  },
});

export default FloatingTakeoverButton;
