import React, { useState, useEffect } from 'react';
import { View, StatusBar, Alert, TouchableOpacity, Text, ScrollView, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import './global.css';

import { ThemeProvider, useTheme } from './src/services/ThemeContext';
import { authStorage, onSessionExpired } from './src/auth/authStorage';
import { getCurrentUser, logout } from './src/auth/authApi';
import { CartItem, CustomerInfo, OrderInvoice } from './src/types';

import { LoginScreen } from './src/screens/LoginScreen';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { CustomerScreen } from './src/screens/CustomerScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { OrderCompleteScreen } from './src/screens/OrderCompleteScreen';
import { MenuInventoryScreen } from './src/screens/MenuInventoryScreen';
import { OrdersHistoryScreen } from './src/screens/OrdersHistoryScreen';
import { CustomersKhataScreen } from './src/screens/CustomersKhataScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { BottomNavBar, CafeTab } from './src/components/BottomNavBar';
import { CafeSplashScreen } from './src/components/CafeSplashScreen';
import { clearCache, initCache, setCachedConfig, syncMenu } from './src/services/cacheService';
import { getAppConfigApi } from './src/api/cafeApi';
import { getPrintSettings, getShopFeatures, getStoreInfo } from './src/utils/shopSettings';
import { GlobalPrinterSetupModal } from './src/components/PrinterSetupModal';
import { LiquidGlassBackground } from './src/components/LiquidGlassBackground';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { ForceUpdateModal } from './src/components/ForceUpdateModal';
import { GlobalVoiceBubble } from './src/components/GlobalVoiceBubble';
import { setAnalyticsDisplay, setBaseVoiceScreen, setVoiceNavigator } from './src/services/voiceTargets';
import { isVersionOlder } from './src/utils/versionCheck';
import { setTtsEngine } from './src/services/tts';

// Keep the native splash up until the first real screen can render. Without
// this it hides on the first JS frame and an empty white root view flashes
// (then the JS splash fades in) before the app appears.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });
const hideNativeSplash = () => SplashScreen.hideAsync().catch(() => {});

type OrderStep = 'menu' | 'customer' | 'payment' | 'complete';

function AppContent() {
  const { colors, isDark, setPreset } = useTheme();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (user?.themePreset) {
      setPreset(user.themePreset);
    }
  }, [user?.themePreset]);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<CafeTab>('order');
  const [orderStep, setOrderStep] = useState<OrderStep>('menu');

  // Active Order state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', phone: '' });
  const [completedInvoice, setCompletedInvoice] = useState<OrderInvoice | null>(null);
  const currentAppVersion = Constants.expoConfig?.version || '1.0.0';
  const [updateInfo, setUpdateInfo] = useState<{
    visible: boolean;
    latestVersion: string;
    apkUrl: string;
    title?: string;
    message?: string;
    releaseNotes?: string;
  }>({
    visible: false,
    latestVersion: currentAppVersion,
    apkUrl: '',
  });

  const resetOrder = () => {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setCompletedInvoice(null);
    setOrderStep('menu');
  };

  const checkAuth = async () => {
    try {
      const [token] = await Promise.all([authStorage.getToken(), initCache()]);
      if (!token) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      // Open instantly with the saved profile; verify with the server behind it
      const cachedUser = await authStorage.getUser();
      if (cachedUser) {
        setUser(cachedUser);
        setAuthLoading(false);
      }

      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error('User not found');
        setUser(currentUser);
        await authStorage.saveUser(currentUser);
      } catch (err: any) {
        // Only a rejected session logs out. No internet / slow or failing
        // server keeps the cashier signed in on the saved profile.
        if (err?.response?.status === 401 || err?.message === 'User not found' || !cachedUser) {
          if (err?.response?.status === 401 || err?.message === 'User not found') {
            await authStorage.removeToken();
            await authStorage.removeUser();
          }
          setUser(null);
          if (err?.response?.status === 401) {
            Alert.alert(
              'Session Expired',
              'You have been logged out because your account was logged in from another device.'
            );
          }
        }
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Voice assistant: shop settings + tab switching by voice
  useEffect(() => {
    setAnalyticsDisplay(user?.cafe?.analyticsDisplay);
  }, [user?.cafe?.analyticsDisplay]);

  useEffect(() => {
    setTtsEngine(user?.cafe?.ttsEngine);
  }, [user?.cafe?.ttsEngine]);

  useEffect(() => {
    setVoiceNavigator((tab) => {
      setCurrentTab(tab);
      if (tab === 'order') setOrderStep('menu');
    });
    return () => setVoiceNavigator(null);
  }, []);

  useEffect(() => {
    const names: Record<string, string> = { history: 'orders_history', khata: 'customers_khata', more: 'more' };
    setBaseVoiceScreen(currentTab === 'order' ? `order_${orderStep}` : names[currentTab] || currentTab);
  }, [currentTab, orderStep]);

  // Android back: step back through the billing flow instead of leaving the app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentTab !== 'order') {
        setCurrentTab('order');
        setOrderStep('menu');
        return true;
      }
      if (orderStep === 'payment') {
        setOrderStep('customer');
        return true;
      }
      if (orderStep === 'customer') {
        setOrderStep('menu');
        return true;
      }
      if (orderStep === 'complete') {
        resetOrder();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentTab, orderStep]);

  // As soon as a shop is signed in (app open or fresh login): check the menu
  // against the server in the background; the cache only updates if it changed
  useEffect(() => {
    if (user) syncMenu();
  }, [user ? user._id || user.id || 'signed-in' : null]);

  // Real screen (login or app) is ready: drop the native splash
  useEffect(() => {
    if (!authLoading || updateInfo.visible) hideNativeSplash();
  }, [authLoading, updateInfo.visible]);

  useEffect(() => {
    // Slow network on a first login check: fall back to the JS splash
    const fallback = setTimeout(hideNativeSplash, 4000);

    // 1. Initialize local cache from persistent disk storage
    initCache();

    // 2. Load remote branding and check force update from superadmin
    getAppConfigApi()
      .then((cfg: any) => {
        if (cfg) {
          setCachedConfig({
            helpPhone: cfg.cafe?.helpPhone || cfg.branding?.helpPhone || '',
            whatsappPhone: cfg.cafe?.whatsappPhone || cfg.branding?.whatsappPhone || '',
            helpEmail: cfg.cafe?.helpEmail || cfg.branding?.helpEmail || '',
            logoUrl: cfg.cafe?.logoUrl || cfg.branding?.appLogoUrl || '',
            splashUrl: cfg.cafe?.splashUrl || '',
          });

          const cafeUpdate = cfg?.updates?.cafe;
          if (cafeUpdate && cafeUpdate.forceUpdate) {
            const isOlder = isVersionOlder(currentAppVersion, cafeUpdate.latestVersion);
            if (isOlder) {
              setUpdateInfo({
                visible: true,
                latestVersion: cafeUpdate.latestVersion,
                apkUrl: cafeUpdate.apkUrl || 'https://downloads.retelflow.in/retelflow-cafe-latest.apk',
                title: cafeUpdate.title || 'Update Required',
                message: cafeUpdate.message || 'A new version of RetelFlow Cafe is available. Please update to continue.',
                releaseNotes: cafeUpdate.releaseNotes,
              });
            }
          }
        }
      })
      .catch(() => {});

    checkAuth();
    const unsub = onSessionExpired(() => {
      setUser(null);
      Alert.alert(
        'Session Expired',
        'You have been logged out because your account was logged in from another device.'
      );
    });
    return () => {
      clearTimeout(fallback);
      unsub();
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the counter?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await clearCache();
          setUser(null);
          resetOrder();
        },
      },
    ]);
  };

    if (updateInfo.visible) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ForceUpdateModal
          visible={true}
          currentVersion={currentAppVersion}
          latestVersion={updateInfo.latestVersion}
          apkUrl={updateInfo.apkUrl}
          title={updateInfo.title}
          message={updateInfo.message}
          releaseNotes={updateInfo.releaseNotes}
        />
      </View>
    );
  }

  if (authLoading) {
    return <CafeSplashScreen />;
  }

  if (!user) {
    return (
      <LiquidGlassBackground>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LoginScreen onLoginSuccess={(u) => setUser(u)} />
      </LiquidGlassBackground>
    );
  }

  // Active Billing Flow (Customer -> Payment -> Complete)
  if (currentTab === 'order') {
    if (orderStep === 'customer') {
      return (
        <LiquidGlassBackground>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <CustomerScreen
            customer={customer}
            setCustomer={setCustomer}
            cart={cart}
            setCart={setCart}
            onProceedToPayment={() => setOrderStep('payment')}
            onBack={() => setOrderStep('menu')}
          />
          <GlobalVoiceBubble />
        </LiquidGlassBackground>
      );
    }

    if (orderStep === 'payment') {
      return (
        <LiquidGlassBackground>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <PaymentScreen
            cart={cart}
            customer={customer}
            setCustomer={setCustomer}
            onOrderCompleted={(inv) => {
              setCompletedInvoice(inv);
              setOrderStep('complete');
            }}
            onBack={() => setOrderStep('customer')}
          />
        </LiquidGlassBackground>
      );
    }

    if (orderStep === 'complete' && completedInvoice) {
      return (
        <LiquidGlassBackground>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <OrderCompleteScreen
            invoice={completedInvoice}
            onNewOrder={resetOrder}
            storeInfo={getStoreInfo(user)}
            printSettings={getPrintSettings(user)}
          />
        </LiquidGlassBackground>
      );
    }
  }

  return (
    <LiquidGlassBackground>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Main Tab Content */}
      {currentTab === 'order' && (
        <NewOrderScreen
          cart={cart}
          setCart={setCart}
          onProceedToCustomer={() => setOrderStep('customer')}
          shopName={user.businessName || user.name || 'RetelFlow Cafe'}
          voiceMode={user?.cafe?.voiceMode || 'stream'}
        />
      )}

      {currentTab === 'menu' && <MenuInventoryScreen />}

      {currentTab === 'history' && (
        <OrdersHistoryScreen
          storeInfo={getStoreInfo(user)}
          printSettings={getPrintSettings(user)}
          features={getShopFeatures(user)}
        />
      )}

      {currentTab === 'khata' && <CustomersKhataScreen features={getShopFeatures(user)} />}

      {currentTab === 'more' && (
        <MoreScreen
          user={user}
          onLogout={handleLogout}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}

      {/* Global Bottom Tab Bar */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'order') {
            setOrderStep('menu');
          }
        }}
        cartCount={cart.reduce((sum, it) => sum + it.qty, 0)}
      />
      <GlobalVoiceBubble />
    </LiquidGlassBackground>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <AppContent />
          <GlobalPrinterSetupModal />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
