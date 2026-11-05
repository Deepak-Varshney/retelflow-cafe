import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StatusBar } from 'react-native';
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
    <View className="flex-1 items-center justify-between py-12 px-6" style={{ backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top spacer */}
      <View className="w-full items-center pt-8">
        <View className="px-3.5 py-1 rounded-full border border-sky-500/20 bg-sky-50 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-sky-600">
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
            className="w-24 h-24 rounded-3xl items-center justify-center border shadow-lg bg-white"
            style={{
              borderColor: 'rgba(2, 132, 199, 0.25)',
              shadowColor: '#0284c7',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <Image
              source={require('../../assets/app-icon/icon.png')}
              style={{ width: 76, height: 76, borderRadius: 20 }}
              resizeMode="contain"
            />
          </View>
        )}

        <View className="flex-row items-center mt-5">
          <Text className="text-2xl font-black text-slate-900 tracking-wider">
            RETEL<Text className="text-sky-600">FLOW</Text>
          </Text>
          <View className="ml-2 px-2 py-0.5 rounded-full bg-sky-100 border border-sky-300">
            <Text className="text-[11px] font-black text-sky-700 uppercase tracking-wider">
              CAFE
            </Text>
          </View>
        </View>

        <Text className="text-xs font-semibold text-slate-500 mt-1 tracking-wide">
          Restaurants, Cafes & Sweets POS
        </Text>

        {/* Pulse loading pill */}
        <View className="flex-row items-center gap-2 mt-6 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
          <View className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <Text className="text-[11px] font-bold text-slate-700">
            Starting counter terminal...
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Footer */}
      <View className="items-center">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Powered by Gemini AI Voice
        </Text>
        <Text className="text-[9px] text-slate-500 mt-0.5">
          Version 1.0.0 • RetelFlow Cloud
        </Text>
      </View>
    </View>
  );
};
