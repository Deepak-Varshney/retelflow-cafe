import React, { useState, useEffect } from 'react';
import { View, StatusBar, Alert, TouchableOpacity, Text, ScrollView } from 'react-native';
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
import { initCache, setCachedConfig } from './src/services/cacheService';
import { getAppConfigApi } from './src/api/cafeApi';
import { getPrintSettings, getShopFeatures, getStoreInfo } from './src/utils/shopSettings';

type OrderStep = 'menu' | 'customer' | 'payment' | 'complete';

function AppContent() {
  const { colors, isDark, toggleTheme } = useTheme();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<CafeTab>('order');
  const [orderStep, setOrderStep] = useState<OrderStep>('menu');

  // Active Order state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', phone: '' });
  const [completedInvoice, setCompletedInvoice] = useState<OrderInvoice | null>(null);

  const resetOrder = () => {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setCompletedInvoice(null);
    setOrderStep('menu');
  };

  const checkAuth = async () => {
    try {
      const token = await authStorage.getToken();
      if (!token) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      // 1. Instant Fast Path: Load cached user so the app opens in under 100ms
      const cachedUser = await authStorage.getUser();
      if (cachedUser) {
        setUser(cachedUser);
        setAuthLoading(false);
      }

      // 2. Background Refresh: Validate session and update profile silently
      getCurrentUser()
        .then((fresh) => {
          if (fresh) {
            setUser(fresh);
            authStorage.saveUser(fresh);
          }
        })
        .catch(() => {})
        .finally(() => {
          setAuthLoading(false);
        });
    } catch {
      await logout();
      setUser(null);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initialize local cache from persistent disk storage
    initCache().catch(() => {});

    // 2. Load remote branding and support numbers from superadmin
    getAppConfigApi()
      .then((cfg) => {
        if (cfg) {
          setCachedConfig({
            helpPhone: cfg.cafe?.helpPhone || cfg.branding?.helpPhone || '',
            whatsappPhone: cfg.cafe?.whatsappPhone || cfg.branding?.whatsappPhone || '',
            helpEmail: cfg.cafe?.helpEmail || cfg.branding?.helpEmail || '',
            logoUrl: cfg.cafe?.logoUrl || cfg.branding?.appLogoUrl || '',
            splashUrl: cfg.cafe?.splashUrl || '',
          });
        }
      })
      .catch(() => {});

    checkAuth();
    const unsub = onSessionExpired(() => {
      setUser(null);
      Alert.alert('Session Expired', 'Please login again to continue.');
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the counter?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setUser(null);
          resetOrder();
        },
      },
    ]);
  };

  if (authLoading) {
    return <CafeSplashScreen />;
  }

  if (!user) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LoginScreen onLoginSuccess={(u) => setUser(u)} />
      </View>
    );
  }

  // Active Billing Flow (Customer -> Payment -> Complete)
  if (currentTab === 'order') {
    if (orderStep === 'customer') {
      return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <CustomerScreen
            customer={customer}
            setCustomer={setCustomer}
            cart={cart}
            setCart={setCart}
            onProceedToPayment={() => setOrderStep('payment')}
            onBack={() => setOrderStep('menu')}
          />
        </View>
      );
    }

    if (orderStep === 'payment') {
      return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
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
        </View>
      );
    }

    if (orderStep === 'complete' && completedInvoice) {
      return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <OrderCompleteScreen
            invoice={completedInvoice}
            onNewOrder={resetOrder}
            storeInfo={getStoreInfo(user)}
            printSettings={getPrintSettings(user)}
          />
        </View>
      );
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Main Tab Content */}
      {currentTab === 'order' && (
        <NewOrderScreen
          cart={cart}
          setCart={setCart}
          onProceedToCustomer={() => setOrderStep('customer')}
          shopName={user.businessName || user.name || 'RetelFlow Cafe'}
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
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
