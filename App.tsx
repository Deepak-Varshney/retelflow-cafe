import React, { useState, useEffect } from 'react';
import { View, StatusBar, Alert, TouchableOpacity, Text, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import { BottomNavBar, CafeTab } from './src/components/BottomNavBar';

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
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      await logout();
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
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
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text className="text-2xl mb-2">🍕</Text>
        <Text className="text-xs font-bold text-amber-500">Loading RetelFlow Cafe...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LoginScreen onLoginSuccess={(u) => setUser(u)} />
      </SafeAreaProvider>
    );
  }

  // Active Billing Flow (Customer -> Payment -> Complete)
  if (currentTab === 'order') {
    if (orderStep === 'customer') {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <CustomerScreen
            customer={customer}
            setCustomer={setCustomer}
            cart={cart}
            onProceedToPayment={() => setOrderStep('payment')}
            onBack={() => setOrderStep('menu')}
          />
        </SafeAreaProvider>
      );
    }

    if (orderStep === 'payment') {
      return (
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      );
    }

    if (orderStep === 'complete' && completedInvoice) {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <OrderCompleteScreen
            invoice={completedInvoice}
            onNewOrder={resetOrder}
          />
        </SafeAreaProvider>
      );
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
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

        {currentTab === 'history' && <OrdersHistoryScreen />}

        {currentTab === 'khata' && <CustomersKhataScreen />}

        {currentTab === 'more' && (
          <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
            <View
              className="px-4 py-3 flex-row items-center border-b"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
                Cafe Settings & Profile
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {/* Profile Card */}
              <View
                className="p-5 mb-5 rounded-3xl border shadow-xl flex-row items-center"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 items-center justify-center mr-3.5">
                  <Text className="text-2xl">☕</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black" style={{ color: colors.text }}>
                    {user.businessName || 'RetelFlow Cafe'}
                  </Text>
                  <Text className="text-xs text-amber-500 font-semibold">
                    {user.phone || '+91 98765 43210'}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    Restaurant & Sweets Edition
                  </Text>
                </View>
              </View>

              {/* Theme Toggle */}
              <TouchableOpacity
                onPress={toggleTheme}
                className="p-4 mb-3 rounded-2xl border flex-row items-center justify-between"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={20}
                    color={colors.primary}
                  />
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    Theme: {isDark ? 'Dark Mode (Night)' : 'Light Mode (Day)'}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-amber-500">Toggle ⇄</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                onPress={handleLogout}
                className="p-4 mt-4 rounded-2xl border flex-row items-center justify-center gap-2"
                style={{ borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
              >
                <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                <Text className="text-xs font-black text-rose-500">
                  Logout Counter
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
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
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
