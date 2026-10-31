import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GeminiVoiceOrbProps {
  isListening: boolean;
  size?: number;
  heardText?: string;
  hintText?: string;
  style?: ViewStyle;
}

/**
 * High-tech Gemini-style glowing pulsing voice orb.
 * Replaces the old plain red recording bar with an organic multi-ring
 * glowing sphere that animates with soundwave pulses and gradient rings.
 */
export const GeminiVoiceOrb: React.FC<GeminiVoiceOrbProps> = ({
  isListening,
  size = 72,
  heardText,
  hintText = 'Hold and speak freely in Hindi or English...',
  style,
}) => {
  // Animation drivers
  const corePulse = useRef(new Animated.Value(1)).current;
  const outerRipple1 = useRef(new Animated.Value(1)).current;
  const outerRipple2 = useRef(new Animated.Value(1)).current;
  const opacityRipple1 = useRef(new Animated.Value(0.6)).current;
  const opacityRipple2 = useRef(new Animated.Value(0.4)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    let rotateLoop: Animated.CompositeAnimation | null = null;

    if (isListening) {
      // 1. Organic Core Breathing Animation
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(corePulse, {
              toValue: 1.18,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(outerRipple1, {
              toValue: 1.55,
              duration: 1100,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityRipple1, {
              toValue: 0.1,
              duration: 1100,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(outerRipple2, {
              toValue: 1.85,
              duration: 1300,
              delay: 200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityRipple2, {
              toValue: 0,
              duration: 1300,
              delay: 200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(corePulse, {
              toValue: 1.0,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(outerRipple1, {
              toValue: 1.0,
              duration: 400,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityRipple1, {
              toValue: 0.7,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(outerRipple2, {
              toValue: 1.0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacityRipple2, {
              toValue: 0.5,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loopAnim.start();

      // 2. Continuous Organic Spin
      rotateLoop = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 5000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.start();
    } else {
      corePulse.setValue(1);
      outerRipple1.setValue(1);
      outerRipple2.setValue(1);
      opacityRipple1.setValue(0);
      opacityRipple2.setValue(0);
      rotation.setValue(0);
    }

    return () => {
      loopAnim?.stop();
      rotateLoop?.stop();
    };
  }, [isListening]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isListening) return null;

  return (
    <View style={[styles.container, style]}>
      {/* Outer Glow Halo 2 */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: (size * 1.5) / 2,
            backgroundColor: '#00d2ff',
            opacity: opacityRipple2,
            transform: [{ scale: outerRipple2 }],
          },
        ]}
      />

      {/* Outer Glow Halo 1 */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: (size * 1.25) / 2,
            backgroundColor: '#0df2a4',
            opacity: opacityRipple1,
            transform: [{ scale: outerRipple1 }],
          },
        ]}
      />

      {/* Rotating Accent Ring */}
      <Animated.View
        style={[
          styles.rotatingAura,
          {
            width: size * 1.12,
            height: size * 1.12,
            borderRadius: (size * 1.12) / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      />

      {/* Central Glowing Core Sphere */}
      <Animated.View
        style={[
          styles.coreSphere,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: corePulse }],
          },
        ]}
      >
        <Ionicons name="mic" size={size * 0.42} color="#ffffff" />
      </Animated.View>

      {/* Floating Status & Heard Text Banner */}
      <View style={styles.textContainer}>
        <Text style={styles.hintText}>{hintText}</Text>
        {Boolean(heardText) && (
          <View style={styles.heardBox}>
            <Text style={styles.heardText} numberOfLines={2}>
              "{heardText}"
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  outerRing: {
    position: 'absolute',
    filter: 'blur(16px)' as any,
  },
  rotatingAura: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#0df2a4',
    borderTopColor: '#00d2ff',
    borderRightColor: '#a855f7',
    borderBottomColor: '#f59e0b',
  },
  coreSphere: {
    backgroundColor: '#0a192f',
    borderWidth: 2,
    borderColor: '#00d2ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 12,
  },
  textContainer: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 340,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00d2ff',
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 210, 255, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heardBox: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
  },
  heardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
