import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StatusBar } from 'react-native';
import Constants from 'expo-constants';
import { getCachedConfig } from '../services/cacheService';

// Same navy as the native splash + launcher icon (app.json), so the hand-off
// from the native splash to this screen is invisible
const NAVY = '#0f172a';
const BRAND_GREEN = '#14f5a0';

/**
 * Launch screen while the app checks the session. Branding matches the main
 * RetelFlow app: navy background, green voice-bubble mark + white wordmark.
 */
export const CafeSplashScreen: React.FC<{ onReady?: () => void }> = ({ onReady }) => {
  const rise = useRef(new Animated.Value(0)).current;
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  const config = getCachedConfig();
  const customLogoUrl = config?.splashUrl || config?.logoUrl;
  const version = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 360, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View
      style={{ flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 56 }}
      // First frame on screen: the native splash can go now
      onLayout={onReady}
    >
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View />

      <Animated.View
        style={{
          alignItems: 'center',
          // Content eases in, the background never flashes
          opacity: rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        {customLogoUrl ? (
          <Image source={{ uri: customLogoUrl }} style={{ width: 120, height: 120, borderRadius: 28 }} resizeMode="contain" />
        ) : (
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 230, height: 230 * (388 / 1381) }}
            resizeMode="contain"
          />
        )}

        <View
          style={{
            marginTop: 18,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(20, 245, 160, 0.45)',
            backgroundColor: 'rgba(20, 245, 160, 0.10)',
          }}
        >
          <Text style={{ color: BRAND_GREEN, fontSize: 12, fontWeight: '900', letterSpacing: 4 }}>CAFE</Text>
        </View>

        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 14 }}>
          Voice billing for cafes & restaurants
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 28 }}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_GREEN, opacity: d }}
            />
          ))}
        </View>
      </Animated.View>

      <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600' }}>v{version} · RetelFlow</Text>
    </View>
  );
};
