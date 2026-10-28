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
    <View className="flex-1 items-center justify-between py-12 px-6" style={{ backgroundColor: '#070a13' }}>
      <StatusBar barStyle="light-content" backgroundColor="#070a13" />

      {/* Top spacer */}
      <View className="w-full items-center pt-8">
        <View className="px-3.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10">
          <Text className="text-[10px] font-black uppercase tracking-widest text-amber-500">
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
              backgroundColor: '#0f172a',
              borderColor: '#f59e0b',
              shadowColor: '#f59e0b',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 18,
            }}
          >
            <Ionicons name="restaurant" size={44} color="#f59e0b" />
          </View>
        )}

        <Text className="text-2xl font-black text-white tracking-wider mt-5">
          RETEL<Text className="text-amber-500">FLOW</Text> CAFE
        </Text>

        <Text className="text-xs font-semibold text-slate-400 mt-1 tracking-wide">
          Restaurants, Cafes & Sweets POS
        </Text>

        {/* Pulse loading pill */}
        <View className="flex-row items-center gap-2 mt-6 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          <View className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <Text className="text-[11px] font-bold text-slate-300">
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
