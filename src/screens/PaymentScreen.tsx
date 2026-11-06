import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { CustomerInfo, CartItem } from '../types';
import { createOrderInvoiceApi } from '../api/cafeApi';
import { CreditMobileModal } from '../components/CreditMobileModal';
import { friendlyError } from '../utils/errorMessage';

interface PaymentScreenProps {
  cart: CartItem[];
  customer: CustomerInfo;
  setCustomer: (cust: CustomerInfo) => void;
  onOrderCompleted: (invoice: any) => void;
  onBack: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  cart,
  customer,
  setCustomer,
  onOrderCompleted,
  onBack,
}) => {
  const { colors } = useTheme();

  // Subtotal from cart items
  const subtotal = cart.reduce((sum, it) => sum + it.qty * it.price, 0);

  // Discount state with % vs ₹ toggle badge
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountInput, setDiscountInput] = useState<string>('');

  // Kitchen notes
  const [notes, setNotes] = useState<string>('');

  // Payment Mode: Cash or UPI/Online (Credit is automatic if received < total)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');

  // Compute discount amount
  const rawDiscountNum = Math.max(0, Number(discountInput) || 0);
  const discountAmount =
    discountType === 'percent'
      ? Math.round((subtotal * Math.min(100, rawDiscountNum)) / 100)
      : Math.min(subtotal, rawDiscountNum);

  // Net payable after discount
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Received amount state
  const [receivedInput, setReceivedInput] = useState<string>(String(finalTotal));
  const [loading, setLoading] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Blank / garbled input must not silently turn into full credit
  const receivedText = receivedInput.trim();
  const isReceivedValid = /^\d+(\.\d+)?$/.test(receivedText);
  const receivedAmount = Math.max(0, Number(receivedText) || 0);
  const dueAmount = Math.max(0, finalTotal - receivedAmount);
  // Extra cash is change returned, not money paid against the bill
  const billReceivedAmount = Math.min(receivedAmount, finalTotal);

  // Synchronous guard: a second tap before `loading` re-renders must not save again
  const inFlightRef = useRef(false);
  // One key per order: a retried save returns the invoice the server already has
  const clientRefRef = useRef('');
  if (!clientRefRef.current) {
    clientRefRef.current = `cafe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Toggle between % and ₹ discount mode
  const handleToggleDiscountType = () => {
    const nextType = discountType === 'percent' ? 'amount' : 'percent';
    setDiscountType(nextType);
    if (discountInput) {
      const nextNum = Math.max(0, Number(discountInput) || 0);
      const nextDisc =
        nextType === 'percent'
          ? Math.round((subtotal * Math.min(100, nextNum)) / 100)
          : Math.min(subtotal, nextNum);
      const nextTotal = Math.max(0, subtotal - nextDisc);
      setReceivedInput(String(nextTotal));
    }
  };

  const handleDiscountChange = (text: string) => {
    setDiscountInput(text);
    const num = Math.max(0, Number(text) || 0);
    const disc =
      discountType === 'percent'
        ? Math.round((subtotal * Math.min(100, num)) / 100)
        : Math.min(subtotal, num);
    const newTotal = Math.max(0, subtotal - disc);
    setReceivedInput(String(newTotal));
  };

  const handleQuickAmount = (amt: number) => {
    setReceivedInput(String(amt));
  };

  const handleProcessPayment = async (overridePhone?: string, dueConfirmed = false) => {
    if (inFlightRef.current) return;
    const activePhone = overridePhone || customer.phone || '';

    if (!isReceivedValid) {
      Alert.alert('Amount received?', 'Enter the amount received from the customer (0 for full credit / udhar).');
      return;
    }

    // A due goes to the customer's khata: confirm unless ₹0 (full credit) was entered on purpose
    if (dueAmount > 0 && !dueConfirmed && receivedAmount > 0) {
      Alert.alert(
        'Add due to Khata?',
        `Received ₹${receivedAmount.toLocaleString()} of ₹${finalTotal.toLocaleString()}. ₹${dueAmount.toLocaleString()} will be added to ${customer.name || 'this customer'}'s Credit/Khata.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add to Khata', onPress: () => handleProcessPayment(overridePhone, true) },
        ]
      );
      return;
    }

    // STRICT CREDIT VALIDATION: If credit / due exists and phone is missing, open modal!
    if (dueAmount > 0 && (!activePhone || activePhone.length !== 10)) {
      setShowCreditModal(true);
      return;
    }

    inFlightRef.current = true;
    let saved = false;
    try {
      setLoading(true);

      // Determine backend payment method
      const effectivePaymentMethod =
        dueAmount > 0
          ? receivedAmount > 0
            ? 'split'
            : 'credit'
          : paymentMethod;

      const res = await createOrderInvoiceApi({
        items: cart,
        customer: {
          name: (customer.name || '').trim(),
          phone: activePhone,
        },
        paymentMethod: effectivePaymentMethod,
        receivedAmount: billReceivedAmount,
        dueAmount,
        total: finalTotal,
        subtotal,
        discount: discountAmount,
        notes: notes.trim(),
        clientRef: clientRefRef.current,
      });

      const savedInvoice = res?.invoice || res;
      if (savedInvoice) {
        // Stay locked: this screen is done once the order is saved
        saved = true;
        onOrderCompleted(savedInvoice);
      } else {
        Alert.alert('Error', 'Failed to save order invoice');
      }
    } catch (err: any) {
      console.warn('Order completion failed:', err);
      // Unsaved bill = missing from sales and khata. Tell the cashier and let
      // them retry; "Continue" still gives a KOT for the kitchen.
      const localInvoice = {
        id: `kot-${Date.now()}`,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        orderNumber: Math.floor(10 + Math.random() * 89), // e.g. Token #42
        items: cart,
        subtotal,
        discount: discountAmount,
        total: finalTotal,
        receivedAmount: billReceivedAmount,
        dueAmount,
        paymentMethod: dueAmount > 0 ? (receivedAmount > 0 ? 'split' : 'credit') : paymentMethod,
        notes: notes.trim(),
        customer: {
          name: customer.name || 'Walk-in Guest',
          phone: activePhone,
        },
        date: new Date().toISOString(),
      };
      Alert.alert(
        'Order not saved',
        `${friendlyError(err, 'Could not reach the server.')}\n\nThis bill will not appear in Orders or Khata if you continue without saving.`,
        [
          { text: 'Retry', onPress: () => handleProcessPayment(activePhone, true) },
          { text: 'Continue without saving', style: 'destructive', onPress: () => onOrderCompleted(localInvoice) },
        ]
      );
    } finally {
      if (!saved) inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <View
        className="px-4 py-3 flex-row items-center border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2 mr-2">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
            Payment & Settlement
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            Step 3 of 3 • Collect Payment & Print KOT
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        {/* Total Bill Display Card */}
        <View
          className="rounded-3xl p-5 mb-4 border items-center shadow-xl"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <Text className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>
            Total Payable Amount
          </Text>
          <Text className="text-4xl font-black font-mono tracking-tight" style={{ color: colors.primaryText }}>
            ₹{finalTotal.toLocaleString()}
          </Text>

          {discountAmount > 0 ? (
            <View className="flex-row items-center mt-1">
              <Text className="text-xs line-through mr-2" style={{ color: colors.textMuted }}>
                Subtotal: ₹{subtotal}
              </Text>
              <Text className="text-xs font-bold" style={{ color: colors.success }}>
                Saved: ₹{discountAmount} ({discountType === 'percent' ? `${rawDiscountNum}%` : `₹${rawDiscountNum}`})
              </Text>
            </View>
          ) : null}

          <View className="mt-2 flex-row items-center">
            <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
            <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
              <Text className="font-bold" style={{ color: colors.text }}>{customer.name || 'Walk-in Guest'}</Text>
              {customer.phone ? ` • +91 ${customer.phone}` : ''}
            </Text>
          </View>
        </View>

        {/* Payment Modes (Cash vs UPI - Credit is automatic) */}
        <View className="mb-4">
          <Text className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
            Payment Mode (Received Amount)
          </Text>

          <View className="flex-row gap-2.5">
            {[
              { id: 'cash', label: 'Cash Payment', icon: 'cash' },
              { id: 'online', label: 'UPI / Online QR', icon: 'qr-code' },
            ].map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  onPress={() => setPaymentMethod(pm.id as 'cash' | 'online')}
                  activeOpacity={0.7}
                  className="flex-1 py-3.5 px-3 rounded-2xl border items-center justify-center active:scale-95 flex-row gap-2"
                  style={{
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <Ionicons
                    name={pm.icon as any}
                    size={20}
                    color={isSelected ? colors.onPrimary : colors.primary}
                  />
                  <Text
                    className="text-xs font-black"
                    style={{ color: isSelected ? colors.onPrimary : colors.text }}
                  >
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Discount Card with % vs ₹ Toggle Badge */}
        <View
          className="rounded-3xl p-4 mb-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
              Order Discount
            </Text>
            <TouchableOpacity
              onPress={handleToggleDiscountType}
              activeOpacity={0.8}
              className="flex-row items-center px-2.5 py-1 rounded-xl border active:scale-95"
              style={{
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
              }}
            >
              <Text className="text-xs font-black mr-1 font-mono" style={{ color: colors.primaryText }}>
                {discountType === 'percent' ? '% Percentage' : '₹ Direct Rupees'}
              </Text>
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View
            className="flex-row items-center px-4 py-2.5 rounded-2xl border"
            style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
          >
            <Text className="text-base font-bold mr-2 font-mono" style={{ color: colors.primaryText }}>
              {discountType === 'percent' ? '%' : '₹'}
            </Text>
            <TextInput
              keyboardType="numeric"
              placeholder={discountType === 'percent' ? 'e.g. 10 (for 10% off)' : 'e.g. 50 (for ₹50 off)'}
              placeholderTextColor={colors.textMuted}
              value={discountInput}
              onChangeText={handleDiscountChange}
              className="flex-1 text-base font-bold font-mono"
              style={{ color: colors.text }}
            />
            {discountAmount > 0 ? (
              <TouchableOpacity onPress={() => handleDiscountChange('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Amount Received Input & Auto Udhar / Credit Calculation */}
        <View
          className="rounded-3xl p-4 mb-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
              Amount Received
            </Text>
            {dueAmount > 0 ? (
              <View className="px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
                <Text className="text-[10px] font-black" style={{ color: colors.danger }}>
                  Credit / Khata (Due): ₹{dueAmount.toLocaleString()}
                </Text>
              </View>
            ) : (
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successSoft }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.success }}>Full Paid</Text>
              </View>
            )}
          </View>

          <View
            className="flex-row items-center px-4 py-3 rounded-2xl border"
            style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
          >
            <Text className="text-xl font-bold mr-2" style={{ color: colors.primaryText }}>₹</Text>
            <TextInput
              keyboardType="numeric"
              value={receivedInput}
              onChangeText={setReceivedInput}
              className="flex-1 text-2xl font-black font-mono"
              style={{ color: colors.text }}
            />
            {receivedAmount === finalTotal && finalTotal > 0 ? (
              <View className="px-2.5 py-1 rounded-xl flex-row items-center" style={{ backgroundColor: colors.successSoft }}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text className="text-[11px] font-bold ml-1" style={{ color: colors.success }}>Exact Paid</Text>
              </View>
            ) : null}
          </View>

          {/* Quick Amount Pills */}
          <View className="flex-row gap-2 mt-3">
            {[finalTotal, 0].map((amt, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleQuickAmount(amt)}
                className="px-3 py-1.5 rounded-xl border active:scale-95"
                style={{
                  backgroundColor: receivedAmount === amt ? colors.badgeBg : colors.surface,
                  borderColor: receivedAmount === amt ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: receivedAmount === amt ? colors.primary : colors.textSecondary }}
                >
                  {amt === 0 ? '₹0 (Full Credit / Udhar)' : `₹${amt} (Full Paid)`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Automatic Credit Notification */}
          {dueAmount > 0 && (
            <View className="mt-3.5 p-3 rounded-2xl border flex-row items-center gap-2" style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoftBorder }}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text className="text-[11px] flex-1 font-medium" style={{ color: colors.primaryText }}>
                Remaining <Text className="font-bold">₹{dueAmount.toLocaleString()}</Text> will automatically be added to {customer.name || 'this customer'}&apos;s Credit/Khata ledger.
              </Text>
            </View>
          )}
        </View>

        {/* Kitchen Notes / Special Instructions */}
        <View
          className="rounded-3xl p-4 mb-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.primary} />
              <Text className="text-xs font-black uppercase tracking-wider ml-1.5" style={{ color: colors.textMuted }}>
                Kitchen Instructions / Notes
              </Text>
            </View>
            <Text className="text-[10px]" style={{ color: colors.textMuted }}>Printed on KOT</Text>
          </View>

          <TextInput
            placeholder="e.g. Table 4, less spicy, extra oregano, no onions..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            className="px-3.5 py-2.5 rounded-2xl border text-xs font-semibold"
            style={{
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
              color: colors.text,
            }}
          />
        </View>

        {/* Itemized Order Review */}
        <View
          className="rounded-3xl p-4 border mb-6"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between pb-2 border-b mb-2" style={{ borderColor: colors.border }}>
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Items in this Order ({cart.length})
            </Text>
            <Text className="text-xs font-bold" style={{ color: colors.primaryText }}>
              Subtotal: ₹{subtotal}
            </Text>
          </View>

          {cart.map((it, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-1.5 border-b border-dashed"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-xs font-semibold flex-1 pr-2" style={{ color: colors.text }}>
                {it.qty}x {it.name} {it.selectedVariant ? `(${it.selectedVariant.name})` : ''}
              </Text>
              <Text className="text-xs font-bold font-mono" style={{ color: colors.primaryText }}>
                ₹{it.qty * it.price}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Complete Order Button */}
      <View
        className="p-4 border-t"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <TouchableOpacity
          onPress={() => handleProcessPayment()}
          disabled={loading}
          activeOpacity={0.8}
          className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-2xl active:scale-98"
          style={{ backgroundColor: colors.primary }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color={colors.onPrimary} />
              <Text className="text-sm font-black tracking-wider uppercase" style={{ color: colors.onPrimary }}>
                Complete Order & Generate KOT (₹{finalTotal.toLocaleString()})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Credit Mobile Number Mandatory Modal */}
      <CreditMobileModal
        visible={showCreditModal}
        customerName={customer.name}
        dueAmount={dueAmount}
        onSaveMobile={(phone) => {
          setCustomer({ ...customer, phone });
          setShowCreditModal(false);
          // Due was already confirmed (or ₹0 credit chosen) before the mobile prompt
          handleProcessPayment(phone, true);
        }}
        onCancel={() => setShowCreditModal(false)}
      />
    </SafeAreaView>
  );
};
