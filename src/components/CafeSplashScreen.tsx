import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCachedConfig } from '../services/cacheService';

export const CafeSplashScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const config = getCachedConfig();
  const customSplashUrl = config?.splashUrl;
  const customLogoUrl = config?.logoUrl;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 items-center justify-between py-12 px-6" style={{ backgroundColor: '#030712' }}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Top spacer */}
      <View className="w-full items-center pt-8">
        <View className="px-3.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
            Smart Counter Billing
          </Text>
        </View>
      </View>

      {/* Center Branding Hero */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        {customSplashUrl ? (
          <Image
            source={{ uri: customSplashUrl }}
            style={{ width: 140, height: 140, borderRadius: 28 }}
            resizeMode="contain"
          />
        ) : customLogoUrl ? (
          <Image
            source={{ uri: customLogoUrl }}
            style={{ width: 110, height: 110, borderRadius: 24 }}
            resizeMode="contain"
          />
        ) : (
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center border shadow-2xl relative"
            style={{
              backgroundColor: 'rgba(7, 15, 36, 0.95)',
              borderColor: 'rgba(0, 210, 255, 0.45)',
              borderTopColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#00d2ff',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 22,
            }}
          >
            <Ionicons name="restaurant" size={44} color="#00d2ff" />
          </View>
        )}

        <Text className="text-2xl font-black text-white tracking-wider mt-5">
          RETEL<Text className="text-cyan-400">FLOW</Text> CAFE
        </Text>

        <Text className="text-xs font-semibold text-slate-400 mt-1 tracking-wide">
          Restaurants, Cafes & Sweets POS
        </Text>

        {/* Pulse loading pill */}
        <View className="flex-row items-center gap-2 mt-6 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/25 shadow-sm">
          <View className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <Text className="text-[11px] font-bold text-slate-200">
            Starting counter terminal...
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Footer */}
      <View className="items-center">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Powered by Gemini AI Voice
        </Text>
        <Text className="text-[9px] text-slate-600 mt-0.5">
          Version 1.0.0 • RetelFlow Cloud
        </Text>
      </View>
    </View>
  );
};
