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
import { registerVoiceTarget } from '../services/voiceTargets';
import { parseCustomerVoice, transliterateDevanagariToLatin } from '../services/customerVoiceParser';
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
  const { colors } = useTheme();
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
  // Name we filled in from a phone lookup (cleared if the phone is corrected)
  const autoFilledNameRef = useRef('');

  const totalAmount = cart.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalQty = cart.reduce((sum, it) => sum + it.qty, 0);

  // Global mic on this screen fills customer name and/or phone
  const nameRef = useRef(name);
  nameRef.current = name;
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  // Fields fill while the cashier is still speaking, one letter at a time
  const typingTimers = useRef<{ name?: ReturnType<typeof setInterval>; phone?: ReturnType<typeof setInterval> }>({});
  const typeInto = (field: 'name' | 'phone', target: string) => {
    const setter = field === 'name' ? setName : setPhone;
    const ref = field === 'name' ? nameRef : phoneRef;
    if (!target || ref.current === target) return;
    clearInterval(typingTimers.current[field]);
    typingTimers.current[field] = setInterval(() => {
      const cur = ref.current;
      let keep = 0;
      while (keep < cur.length && cur[keep] === target[keep]) keep++;
      // Words changed mid-sentence: back off to what still matches, then type on
      const next = keep < cur.length ? target.slice(0, keep) : target.slice(0, cur.length + 1);
      ref.current = next;
      setter(next);
      if (next === target) clearInterval(typingTimers.current[field]);
    }, 28);
  };
  useEffect(
    () => () => {
      clearInterval(typingTimers.current.name);
      clearInterval(typingTimers.current.phone);
    },
    []
  );

  useEffect(() => {
    const reg = registerVoiceTarget({
      screen: 'customer_details',
      locale: 'en-IN',
      // Partial words: "98765…" / "Deepak Var…" appear as they are spoken
      onInterim: (text) => {
        const parsed = parseCustomerVoice(text);
        const digits = parsed.phone || parsed.phonePartial;
        if (digits) typeInto('phone', digits);
        if (parsed.name) typeInto('name', parsed.name);
      },
      onTranscript: (text) => {
        const parsed = parseCustomerVoice(text);
        const parts: string[] = [];
        if (parsed.phone) {
          typeInto('phone', parsed.phone);
          parts.push(`Phone: ${parsed.phone}`);
        }
        if (parsed.name) {
          typeInto('name', parsed.name);
          autoFilledNameRef.current = '';
          parts.push(`Name: ${parsed.name}`);
        }
        if (!parts.length) return 'Naam ya mobile number boliye.';
        setError('');
        setCustomer({ name: parsed.name || nameRef.current, phone: parsed.phone || phoneRef.current });
        return `Detected: ${parts.join(' • ')}`;
      },
    });
    return () => reg.remove();
  }, []);

  const clearAutoFilledName = () => {
    if (autoFilledNameRef.current && nameRef.current === autoFilledNameRef.current) setName('');
    autoFilledNameRef.current = '';
  };

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
            autoFilledNameRef.current = res.customer.name;
            setIsExistingCustomer(true);
            setCustomer({ name: res.customer.name, phone: cleanPhone });
          } else {
            clearAutoFilledName();
            setIsExistingCustomer(false);
          }
        } catch {
          setIsExistingCustomer(false);
        } finally {
          setSearching(false);
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        setSearching(false);
      };
    } else {
      // Phone edited away from a looked-up customer: drop their name
      clearAutoFilledName();
      setSearching(false);
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
          className="px-4 py-2.5 flex-row items-center justify-between border-b"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-row items-center flex-1 mr-3 min-w-0">
            <TouchableOpacity onPress={onBack} className="p-2 -ml-2 mr-1">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View className="flex-1 min-w-0">
              <Text numberOfLines={1} className="text-base font-black tracking-tight" style={{ color: colors.text }}>
                Customer Details
              </Text>
              <Text numberOfLines={1} className="text-[11px]" style={{ color: colors.textSecondary }}>
                Step 2 of 3 • Name or Mobile
              </Text>
            </View>
          </View>

        </View>

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
                <Text className="text-xs font-black uppercase tracking-wider ml-1.5" style={{ color: colors.primaryText }}>
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
                      style={{ backgroundColor: colors.primarySoft }}
                    >
                      <Text className="text-xs font-black font-mono" style={{ color: colors.primaryText }}>
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
                  <Text className="text-xs font-black font-mono" style={{ color: colors.primaryText }}>
                    ₹{item.qty * item.price}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row justify-end pt-2">
              <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                Total: <Text className="font-mono font-black" style={{ color: colors.primaryText }}>₹{totalAmount.toLocaleString()}</Text>
              </Text>
            </View>
          </View>

          {/* Validation Error Banner */}
          {error ? (
            <View
              className="p-3 mb-4 rounded-2xl border flex-row items-center gap-2"
              style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text className="text-xs flex-1 font-semibold" style={{ color: colors.danger }}>{error}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View
            className="rounded-3xl p-5 border shadow-xl"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Text className="text-xs font-extrabold uppercase tracking-wider mb-4" style={{ color: colors.primaryText }}>
              Customer Info (Either is Required)
            </Text>

            {/* Customer Name */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                  Customer Name / Table #
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textMuted }}>Optional if phone provided</Text>
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
                <Text className="text-[10px] font-medium" style={{ color: colors.primaryText }}>
                  {isExistingCustomer ? 'Registered Customer' : 'Required for Credit / Khata'}
                </Text>
              </View>

              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: isExistingCustomer ? colors.success : colors.border,
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
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
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
            <Text className="text-sm font-black tracking-wider uppercase" style={{ color: colors.onPrimary }}>
              Proceed to Payment (₹{totalAmount.toLocaleString()})
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
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
