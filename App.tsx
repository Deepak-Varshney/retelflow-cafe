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

      {currentTab === 'history' && <OrdersHistoryScreen />}

      {currentTab === 'khata' && <CustomersKhataScreen />}

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
