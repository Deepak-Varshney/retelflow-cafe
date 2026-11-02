import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';

interface PulseMicButtonProps {
  isListening: boolean;
  isHolding: boolean;
  busy?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  idleText?: string;
  listeningText?: string;
  busyText?: string;
}

export const PulseMicButton: React.FC<PulseMicButtonProps> = ({
  isListening,
  isHolding,
  busy = false,
  onPressIn,
  onPressOut,
  idleText = 'Hold & Speak',
  listeningText = 'Listening...',
  busyText = 'Adding...',
}) => {
  const { colors, isDark } = useTheme();
  const isActive = isHolding || isListening;

  // Pulse Rings Animations
  const wave1Scale = useRef(new Animated.Value(1)).current;
  const wave1Opacity = useRef(new Animated.Value(0)).current;

  const wave2Scale = useRef(new Animated.Value(1)).current;
  const wave2Opacity = useRef(new Animated.Value(0)).current;

  const coreScale = useRef(new Animated.Value(1)).current;

  const animLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      // 1. Core gentle pulse
      const coreAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(coreScale, {
            toValue: 1.05,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(coreScale, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // 2. Continuous radiating wave 1
      const wave1 = Animated.loop(
        Animated.parallel([
          Animated.timing(wave1Scale, {
            toValue: 1.55,
            duration: 1100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(wave1Opacity, {
              toValue: 0.65,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(wave1Opacity, {
              toValue: 0,
              duration: 850,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      // 3. Staggered radiating wave 2
      const wave2 = Animated.loop(
        Animated.sequence([
          Animated.delay(350),
          Animated.parallel([
            Animated.timing(wave2Scale, {
              toValue: 1.4,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(wave2Opacity, {
                toValue: 0.5,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.timing(wave2Opacity, {
                toValue: 0,
                duration: 750,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      );

      animLoopRef.current = Animated.parallel([coreAnim, wave1, wave2]);
      animLoopRef.current.start();
    } else {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
      }
      coreScale.setValue(1);
      wave1Scale.setValue(1);
      wave1Opacity.setValue(0);
      wave2Scale.setValue(1);
      wave2Opacity.setValue(0);
    }

    return () => {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
      }
    };
  }, [isActive]);

  return (
    <View style={styles.container}>
      {/* Outer Pulse Ring 1 (Absolute, zero layout shift) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            borderColor: colors.primary,
            transform: [{ scale: wave1Scale }],
            opacity: wave1Opacity,
          },
        ]}
      />

      {/* Outer Pulse Ring 2 (Absolute, zero layout shift) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            borderColor: colors.primary,
            transform: [{ scale: wave2Scale }],
            opacity: wave2Opacity,
          },
        ]}
      />

      {/* Tactile Button Core */}
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <TouchableOpacity
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.85}
          style={[
            styles.button,
            {
              backgroundColor: isActive
                ? (isDark ? 'rgba(5, 24, 38, 0.95)' : 'rgba(2, 44, 68, 0.90)')
                : colors.primary,
              borderColor: isActive ? '#00d2ff' : colors.primary,
              shadowColor: colors.primary,
              shadowOpacity: isActive ? 0.6 : 0.25,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color={isActive ? '#00d2ff' : (isDark ? '#020617' : '#ffffff')}
              style={{ marginRight: 6 }}
            />
          ) : (
            <Ionicons
              name={isActive ? 'radio' : 'mic'}
              size={16}
              color={isActive ? '#00d2ff' : (isDark ? '#020617' : '#ffffff')}
              style={{ marginRight: 5 }}
            />
          )}

          <Text
            style={[
              styles.buttonText,
              {
                color: isActive ? '#00d2ff' : (isDark ? '#020617' : '#ffffff'),
              },
            ]}
          >
            {busy ? busyText : isActive ? listeningText : idleText}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 38,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 20,
    borderWidth: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
