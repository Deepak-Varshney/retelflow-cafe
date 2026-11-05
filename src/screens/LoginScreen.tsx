import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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


  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={Platform.OS === 'ios' ? 40 : 25}
      >
          {/* Logo & Cafe Header */}
          <View className="items-center mb-8">
            <View
              className="w-20 h-20 rounded-[22px] items-center justify-center mb-3.5 border shadow-lg bg-white"
              style={{
                borderColor: 'rgba(2, 132, 199, 0.25)',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Image
                source={require('../../assets/app-icon/icon.png')}
                style={{ width: 64, height: 64, borderRadius: 18 }}
                resizeMode="contain"
              />
            </View>

            <View className="flex-row items-center">
              <Text className="text-3xl font-black tracking-tight" style={{ color: colors.text }}>
                Retel
              </Text>
              <Text className="text-3xl font-black tracking-tight" style={{ color: colors.primary }}>
                Flow
              </Text>
              <View className="ml-2 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200">
                <Text className="text-[11px] font-black text-sky-600 uppercase tracking-wider">
                  Cafe
                </Text>
              </View>
            </View>
            <Text className="text-xs text-center mt-1.5" style={{ color: colors.textSecondary }}>
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
                <Text className="text-sm font-black text-slate-950 tracking-wider uppercase">
                  Login to Counter
                </Text>
              )}
            </TouchableOpacity>


          </View>
        </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};
