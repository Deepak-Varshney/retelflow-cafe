import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing, StatusBar, StyleSheet } from 'react-native';

// Same background + logo as the phone's own splash (app.json), so the intro
// starts on exactly the frame the phone was showing — like YouTube / Netflix
const APP_BG = '#f1f5f9';
const NAVY = '#0f172a';
const BRAND_GREEN = '#10b981';
const SKY = '#0284c7';
const MARK = 200; // logo size, matches the phone splash
const STAGE = 320; // room for the logo + name side by side
const IMAGE_SHOW_MS = 1200; // admin splash image on screen
const IMAGE_TIMEOUT_MS = 1500; // admin image not loaded by then: skip it

/**
 * App intro.
 *  - Default: the logo pops, slides left and the "RetelFlow CAFE" name comes
 *    in beside it (~1s, plays while the app checks the session).
 *  - Superadmin → Branding → "Cafe App Splash Screen Image" set: that image
 *    full screen for a moment instead (skipped if it can't load quickly).
 * Calls onDone when finished; the app opens once both this and the session
 * check are done.
 */
export const CafeSplashScreen: React.FC<{
  imageUrl?: string;
  onReady?: () => void;
  onDone?: () => void;
}> = ({ imageUrl, onReady, onDone }) => {
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone?.();
  };

  // ── admin image ──
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!imageUrl) return;
    const giveUp = setTimeout(() => !loadedRef.current && finish(), IMAGE_TIMEOUT_MS);
    return () => clearTimeout(giveUp);
  }, [imageUrl]);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(finish, IMAGE_SHOW_MS);
    return () => clearTimeout(t);
  }, [loaded]);

  // ── intro animation ──
  const pop = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current; // 0 = centred like the phone splash
  const name = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (imageUrl) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.08, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0.62, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(name, { toValue: 1, duration: 360, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(250),
    ]).start(() => finish());
  }, [imageUrl]);

  // Logo moves left by about half the name's width; the name comes in from the right
  const logoShift = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -86] });
  const nameShift = name.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: APP_BG, alignItems: 'center', justifyContent: 'center' }} onLayout={onReady}>
      <StatusBar barStyle="dark-content" />

      <View style={{ width: STAGE, height: MARK, justifyContent: 'center' }}>
        <Animated.Image
          source={require('../../assets/app-icon/splash-mark.png')}
          style={{
            position: 'absolute',
            left: (STAGE - MARK) / 2,
            width: MARK,
            height: MARK,
            transform: [{ translateX: logoShift }, { scale: pop }],
          }}
          resizeMode="contain"
        />
        <Animated.View
          style={{
            position: 'absolute',
            left: STAGE / 2 - 30,
            opacity: name,
            transform: [{ translateX: nameShift }],
          }}
        >
          <Text style={{ fontSize: 30, fontWeight: '900', color: NAVY, letterSpacing: -0.5 }}>
            Retel<Text style={{ color: BRAND_GREEN }}>Flow</Text>
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: SKY, letterSpacing: 3 }}>CAFE</Text>
          </View>
        </Animated.View>
      </View>

      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          onLoad={() => {
            loadedRef.current = true;
            setLoaded(true);
          }}
          onError={finish}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
};
