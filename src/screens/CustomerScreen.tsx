import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { CustomerInfo, CartItem } from '../types';
import { searchCustomerApi } from '../api/cafeApi';
import { useVoiceRecognition } from '../services/useVoiceRecognition';
import { parseCustomerVoice, transliterateDevanagariToLatin } from '../services/customerVoiceParser';
import { PulseMicButton } from '../components/PulseMicButton';
import { CartReviewModal } from '../components/CartReviewModal';
import { getCachedMenu } from '../services/cacheService';
import { DEFAULT_MENU_ITEMS } from '../data/defaultCatalog';

interface CustomerScreenProps {
  customer: CustomerInfo;
  setCustomer: (cust: CustomerInfo) => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onProceedToPayment: () => void;
  onBack: () => void;
}

export const CustomerScreen: React.FC<CustomerScreenProps> = ({
  customer,
  setCustomer,
  cart,
  setCart,
  onProceedToPayment,
  onBack,
}) => {
  const { colors, isDark } = useTheme();
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const menuItems = useMemo(() => {
    const cached = getCachedMenu();
    return cached && cached.length > 0 ? cached : DEFAULT_MENU_ITEMS;
  }, []);

  // Everything removed while editing: back to the menu
  useEffect(() => {
    if (cart.length === 0) onBack();
  }, [cart.length]);

  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [searching, setSearching] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [error, setError] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const pressStartRef = useRef(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const totalAmount = cart.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalQty = cart.reduce((sum, it) => sum + it.qty, 0);

  // Voice fill for customer name and/or phone
  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition({
    locale: 'en-IN',
    onPhraseSpoken: (phrase) => {
      const parsed = parseCustomerVoice(phrase);
      let noticeParts = [];

      if (parsed.phone) {
        setPhone(parsed.phone);
        noticeParts.push(`Phone: ${parsed.phone}`);
      }
      if (parsed.name) {
        setName(parsed.name);
        noticeParts.push(`Name: ${parsed.name}`);
      }

      setCustomer({
        name: parsed.name || name,
        phone: parsed.phone || phone,
      });

      if (noticeParts.length > 0) {
        setError('');
        setVoiceNotice(`Detected: ${noticeParts.join(' • ')}`);
        setTimeout(() => setVoiceNotice(null), 3500);
      }
    },
  });

  // Auto search mobile number when 10 digits are present
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    setError('');
    if (cleanPhone.length === 10) {
      setSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await searchCustomerApi(cleanPhone);
          if (res.found && res.customer) {
            setName(res.customer.name);
            setIsExistingCustomer(true);
            setCustomer({ name: res.customer.name, phone: cleanPhone });
          } else {
            setIsExistingCustomer(false);
          }
        } catch {
          setIsExistingCustomer(false);
        } finally {
          setSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsExistingCustomer(false);
    }
  }, [phone]);

  const handleContinue = () => {
    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    // Validation: Both are optional, but ONE of them is MUST
    if (!trimmedName && !cleanPhone) {
      setError('Please enter either Customer Name (e.g. Rahul / Table 4) or Mobile Number');
      return;
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      setError('Mobile number must be 10 digits if provided');
      return;
    }

    setError('');
    setCustomer({ name: trimmedName, phone: cleanPhone });
    onProceedToPayment();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="px-4 py-3 flex-row items-center justify-between border-b"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={onBack} className="p-2 -ml-2 mr-2">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
                Customer Details
              </Text>
              <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                Step 2 of 3 • Name or Mobile (At least 1 required)
              </Text>
            </View>
          </View>

          {/* Voice Auto-Detect Mic (Hold-to-Speak) with Self-Contained Pulse */}
          <PulseMicButton
            isListening={isListening}
            isHolding={isHolding}
            onPressIn={() => {
              pressStartRef.current = Date.now();
              setIsHolding(true);
              startListening();
            }}
            onPressOut={() => {
              const holdDuration = Date.now() - pressStartRef.current;
              setIsHolding(false);
              if (holdDuration < 250) {
                stopListening({ abort: true });
              } else {
                stopListening({ abort: false });
              }
            }}
            idleText="Hold & Speak"
            listeningText="Listening..."
          />
        </View>

        {/* Floating HUD Chip for Speech Preview / Feedback (Zero layout shift) */}
        {Boolean((isHolding || isListening) && transcript) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 60,
              left: 16,
              right: 16,
              zIndex: 999,
              backgroundColor: isDark ? 'rgba(5, 14, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: colors.primary,
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 8,
              shadowColor: colors.primary,
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="mic" size={14} color={colors.primary} style={{ marginRight: 8 }} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              "{transliterateDevanagariToLatin(transcript)}"
            </Text>
          </View>
        )}

        {Boolean(!isListening && voiceNotice) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 60,
              left: 16,
              right: 16,
              zIndex: 999,
              backgroundColor: isDark ? 'rgba(5, 14, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 8,
              shadowColor: '#10b981',
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginRight: 8 }} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: '#10b981',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {voiceNotice}
            </Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={{ padding: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Items Preview Card */}
          <View
            className="rounded-3xl p-4 mb-4 border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-2.5 border-b" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text className="text-xs font-black uppercase tracking-wider ml-1.5 text-cyan-400">
                  Items in this Order ({cart.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCartModalVisible(true)}
                className="flex-row items-center px-2.5 py-1 rounded-xl border"
                style={{ borderColor: colors.primary }}
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text className="text-xs font-black ml-1" style={{ color: colors.primary }}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <View className="pt-2">
              {cart.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between py-1.5 border-b border-dashed"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      className="px-2 py-0.5 rounded-md mr-2"
                      style={{ backgroundColor: isDark ? 'rgba(0, 210, 255, 0.15)' : '#e0f2fe' }}
                    >
                      <Text className="text-xs font-black text-cyan-400 font-mono">
                        {item.qty}x
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold" style={{ color: colors.text }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.selectedVariant ? (
                        <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                          Size: {item.selectedVariant.name}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className="text-xs font-black text-cyan-400 font-mono">
                    ₹{item.qty * item.price}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row justify-end pt-2">
              <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                Total: <Text className="font-mono font-black text-cyan-400">₹{totalAmount.toLocaleString()}</Text>
              </Text>
            </View>
          </View>

          {/* Validation Error Banner */}
          {error ? (
            <View className="p-3 mb-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#f43f5e" />
              <Text className="text-xs text-rose-500 flex-1 font-semibold">{error}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View
            className="rounded-3xl p-5 border shadow-xl"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Text className="text-xs font-extrabold uppercase tracking-wider mb-4 text-cyan-400">
              Customer Info (Either is Required)
            </Text>

            {/* Customer Name */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                  Customer Name / Table #
                </Text>
                <Text className="text-[10px] text-slate-400">Optional if phone provided</Text>
              </View>

              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
              >
                <Ionicons name="person-outline" size={18} color={colors.textMuted} className="mr-2" />
                <TextInput
                  placeholder="e.g. Rahul Sharma or Table 4"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError('');
                  }}
                  className="flex-1 text-sm font-bold ml-2"
                  style={{ color: colors.text }}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                  Mobile Number
                </Text>
                <Text className="text-[10px] text-cyan-400 font-medium">
                  {isExistingCustomer ? 'Registered Customer' : 'Required for Credit / Khata'}
                </Text>
              </View>

              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: isExistingCustomer ? '#10b981' : colors.border,
                }}
              >
                <Text className="text-sm font-bold mr-2" style={{ color: colors.primary }}>+91</Text>
                <TextInput
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError('');
                  }}
                  className="flex-1 text-sm font-bold ml-1 font-mono"
                  style={{ color: colors.text }}
                />
                {searching ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isExistingCustomer ? (
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                ) : null}
              </View>
            </View>

            {/* Quick Table Presets */}
            <View className="pt-2 border-t" style={{ borderColor: colors.border }}>
              <Text className="text-[11px] font-semibold mb-2" style={{ color: colors.textMuted }}>
                Quick Table Presets:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Takeaway', 'Parcel'].map((tbl) => (
                  <TouchableOpacity
                    key={tbl}
                    onPress={() => {
                      setName(tbl);
                      setError('');
                    }}
                    className="px-3 py-1.5 rounded-xl border active:scale-95"
                    style={{
                      backgroundColor: name === tbl ? colors.badgeBg : colors.surface,
                      borderColor: name === tbl ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: name === tbl ? colors.primary : colors.textSecondary }}
                    >
                      {tbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Proceed Button */}
        <View
          className="p-4 border-t"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-xl active:scale-98"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-black text-slate-950 tracking-wider uppercase">
              Proceed to Payment (₹{totalAmount.toLocaleString()})
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#020617" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CartReviewModal
        visible={cartModalVisible}
        cart={cart}
        setCart={setCart}
        menuItems={menuItems}
        onClose={() => setCartModalVisible(false)}
      />
    </SafeAreaView>
  );
};
