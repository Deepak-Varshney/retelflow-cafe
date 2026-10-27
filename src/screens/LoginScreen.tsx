import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { loginWithPhonePassword } from '../auth/authApi';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, isDark } = useTheme();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('Please enter mobile number');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter PIN / Password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await loginWithPhonePassword(phone.trim(), pin.trim());
      if (data?.user) {
        onLoginSuccess(data.user);
      } else {
        setError('Login failed: invalid response');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setPhone('9876543210');
    setPin('1234');
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Cafe Header */}
          <View className="items-center mb-8">
            <View
              className="w-20 h-20 rounded-3xl items-center justify-center mb-3 shadow-2xl border"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                borderColor: colors.primary,
              }}
            >
              <Text className="text-4xl">🍕</Text>
            </View>

            <Text className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>
              RetelFlow Cafe
            </Text>
            <Text className="text-xs text-center mt-1" style={{ color: colors.textSecondary }}>
              Restaurant, Cafe & Sweets Shop POS
            </Text>
          </View>

          {/* Form Card */}
          <View
            className="rounded-3xl p-6 border shadow-xl"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            {error ? (
              <View className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#f43f5e" />
                <Text className="text-xs text-rose-500 flex-1 font-medium">{error}</Text>
              </View>
            ) : null}

            {/* Mobile Field */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Mobile Number
              </Text>
              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="call-outline" size={18} color={colors.textMuted} className="mr-2" />
                <TextInput
                  placeholder="Enter 10-digit mobile"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError('');
                  }}
                  className="flex-1 text-sm font-semibold ml-2"
                  style={{ color: colors.text }}
                />
              </View>
            </View>

            {/* PIN Field */}
            <View className="mb-6">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                4-Digit PIN / Password
              </Text>
              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                  className="mr-2"
                />
                <TextInput
                  placeholder="Enter PIN"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={pin}
                  onChangeText={(t) => {
                    setPin(t);
                    setError('');
                  }}
                  className="flex-1 text-sm font-semibold ml-2 font-mono"
                  style={{ color: colors.text }}
                />
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              className="py-3.5 rounded-2xl items-center justify-center shadow-lg active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text className="text-sm font-black text-black tracking-wider uppercase">
                  Login to Counter
                </Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Fill */}
            <TouchableOpacity onPress={handleQuickDemo} className="mt-4 py-2 items-center">
              <Text className="text-xs font-medium text-amber-500 underline">
                Quick Demo Auto-Fill
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
