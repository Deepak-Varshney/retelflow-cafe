import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * LiquidGlassBackground
 * Continuous organic flowing luminous gradient mesh with authentic liquid glass translucency.
 * Powered by native SVG gradients (100% compatible with Android Fabric) and hardware-accelerated physics loops.
 */
export const LiquidGlassBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();

  // Floating Orb 1: Luminous Cyan
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb1Scale = useRef(new Animated.Value(1)).current;

  // Floating Orb 2: Prismatic Electric Violet
  const orb2X = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(1)).current;

  // Floating Orb 3: Deep Sapphire / Azure
  const orb3X = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;
  const orb3Scale = useRef(new Animated.Value(1)).current;

  // Ambient Sheen Pulse
  const sheenOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // 1. Orb 1 Animation Loop (Top-Right Cyan Drift)
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb1X, {
            toValue: 45,
            duration: 8500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Y, {
            toValue: 60,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1.18,
            duration: 7500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, {
            toValue: -30,
            duration: 9500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Y, {
            toValue: -20,
            duration: 8000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 0.95,
            duration: 8500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, {
            toValue: 0,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Y, {
            toValue: 0,
            duration: 7500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1,
            duration: 7000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 2. Orb 2 Animation Loop (Center-Left Violet Drift)
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb2X, {
            toValue: -50,
            duration: 11000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Y, {
            toValue: -40,
            duration: 10000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 1.22,
            duration: 9000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb2X, {
            toValue: 35,
            duration: 10500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Y, {
            toValue: 50,
            duration: 11500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 0.92,
            duration: 10000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb2X, {
            toValue: 0,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Y, {
            toValue: 0,
            duration: 8500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 1,
            duration: 8000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 3. Orb 3 Animation Loop (Bottom Dock Sapphire Pulse)
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb3X, {
            toValue: 40,
            duration: 12000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Y, {
            toValue: -45,
            duration: 11000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Scale, {
            toValue: 1.15,
            duration: 9500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb3X, {
            toValue: -35,
            duration: 11500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Y, {
            toValue: 30,
            duration: 12500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Scale, {
            toValue: 0.9,
            duration: 10500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb3X, {
            toValue: 0,
            duration: 8500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Y, {
            toValue: 0,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Scale, {
            toValue: 1,
            duration: 8500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 4. Subtle Sheen Breathing
    const animSheen = Animated.loop(
      Animated.sequence([
        Animated.timing(sheenOpacity, {
          toValue: 0.65,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sheenOpacity, {
          toValue: 0.3,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();
    animSheen.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      animSheen.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Liquid Light Orbs Container */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Orb 1: theme tint (Top-Right); colours come from the active theme */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: SCREEN_WIDTH * 0.85,
              height: SCREEN_WIDTH * 0.85,
              top: -SCREEN_WIDTH * 0.2,
              right: -SCREEN_WIDTH * 0.2,
              opacity: isDark ? 0.22 : 0.25,
              transform: [
                { translateX: orb1X },
                { translateY: orb1Y },
                { scale: orb1Scale },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="cyanOrb" cx="50%" cy="50%" rx="50%" ry="50%" fx="40%" fy="40%">
                <Stop offset="0%" stopColor={colors.orbA} stopOpacity={isDark ? "0.75" : "0.55"} />
                <Stop offset="55%" stopColor={colors.orbA} stopOpacity={isDark ? "0.28" : "0.20"} />
                <Stop offset="100%" stopColor={colors.orbA} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cyanOrb)" rx={SCREEN_WIDTH} />
          </Svg>
        </Animated.View>

        {/* Orb 2: secondary theme tint (Center-Left) */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: SCREEN_WIDTH * 0.95,
              height: SCREEN_WIDTH * 0.95,
              top: SCREEN_HEIGHT * 0.28,
              left: -SCREEN_WIDTH * 0.35,
              opacity: isDark ? 0.18 : 0.20,
              transform: [
                { translateX: orb2X },
                { translateY: orb2Y },
                { scale: orb2Scale },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="violetOrb" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={colors.orbB} stopOpacity={isDark ? "0.65" : "0.45"} />
                <Stop offset="55%" stopColor={colors.orbB} stopOpacity={isDark ? "0.25" : "0.18"} />
                <Stop offset="100%" stopColor={colors.orbB} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#violetOrb)" rx={SCREEN_WIDTH} />
          </Svg>
        </Animated.View>

        {/* Orb 3: Deep Sapphire / Azure (Bottom-Right near Nav Dock) */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: SCREEN_WIDTH * 0.9,
              height: SCREEN_WIDTH * 0.9,
              bottom: -SCREEN_WIDTH * 0.25,
              right: -SCREEN_WIDTH * 0.2,
              opacity: isDark ? 0.22 : 0.24,
              transform: [
                { translateX: orb3X },
                { translateY: orb3Y },
                { scale: orb3Scale },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="sapphireOrb" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDark ? "0.45" : "0.30"} />
                <Stop offset="60%" stopColor={colors.primary} stopOpacity={isDark ? "0.18" : "0.10"} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#sapphireOrb)" rx={SCREEN_WIDTH} />
          </Svg>
        </Animated.View>

        {/* Top Liquid Specular Light Sheen */}
        <Animated.View
          style={[
            styles.topSheen,
            {
              opacity: sheenOpacity,
            },
          ]}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="topSheen" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={isDark ? colors.primary : "#ffffff"} stopOpacity={isDark ? "0.12" : "0.85"} />
                <Stop offset="100%" stopColor={isDark ? colors.primary : "#ffffff"} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#topSheen)" />
          </Svg>
        </Animated.View>
      </View>

      {/* Children content rendered on top of the liquid glass mesh */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    pointerEvents: 'none',
  },
});
