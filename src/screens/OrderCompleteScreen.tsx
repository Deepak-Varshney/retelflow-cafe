import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { OrderInvoice } from '../types';

interface OrderCompleteScreenProps {
  invoice: OrderInvoice;
  onNewOrder: () => void;
}

export const OrderCompleteScreen: React.FC<OrderCompleteScreenProps> = ({
  invoice,
  onNewOrder,
}) => {
  const { colors } = useTheme();

  const tokenNumber = invoice.orderNumber || Math.floor(10 + Math.random() * 89);

  const handleShare = async () => {
    try {
      const summary = `*🍕 RetelFlow Cafe Bill Receipt*\nOrder Token #${tokenNumber}\nCustomer: ${invoice.customer?.name || 'Guest'}\n\n` +
        invoice.items.map((it) => `• ${it.qty}x ${it.name} - ₹${it.qty * it.price}`).join('\n') +
        `\n\n*Total Amount: ₹${invoice.total}*\nReceived: ₹${invoice.receivedAmount}` +
        (invoice.dueAmount > 0 ? `\n*Due / Credit: ₹${invoice.dueAmount}*` : '\n*Status: Fully Paid ✓*') +
        `\n\nThank you for dining with us!`;

      await Share.share({ message: summary });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        {/* Success Icon */}
        <View className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 items-center justify-center mt-4 mb-3">
          <Ionicons name="checkmark" size={40} color="#10b981" />
        </View>

        <Text className="text-xl font-black text-center" style={{ color: colors.text }}>
          Order Placed Successfully!
        </Text>
        <Text className="text-xs text-center mt-1 text-slate-400">
          Kitchen Order Token (KOT) Generated
        </Text>

        {/* Token # Card */}
        <View
          className="my-5 px-8 py-4 rounded-3xl border items-center shadow-xl"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.primary,
          }}
        >
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
            KOT TOKEN NUMBER
          </Text>
          <Text className="text-5xl font-black text-amber-500 font-mono my-1">
            #{tokenNumber}
          </Text>
          <Text className="text-[11px] font-semibold text-emerald-400">
            Send directly to Kitchen / Preparation Counter
          </Text>
        </View>

        {/* Receipt Details Card */}
        <View
          className="w-full rounded-3xl p-5 border mb-6"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderColor: colors.border }}>
            <View>
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                Customer: {invoice.customer?.name || 'Walk-in Guest'}
              </Text>
              {invoice.customer?.phone ? (
                <Text className="text-[11px] text-slate-400">
                  Phone: +91 {invoice.customer.phone}
                </Text>
              ) : null}
            </View>
            <Text className="text-[11px] font-mono text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Items */}
          <View className="py-3">
            {invoice.items.map((it, idx) => (
              <View key={idx} className="flex-row items-center justify-between py-1.5">
                <Text className="text-xs font-medium flex-1 pr-2" style={{ color: colors.text }}>
                  {it.qty}x {it.name} {it.selectedVariant ? `(${it.selectedVariant.name})` : ''}
                </Text>
                <Text className="text-xs font-bold font-mono text-amber-500">
                  ₹{it.qty * it.price}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View className="pt-3 border-t" style={{ borderColor: colors.border }}>
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-slate-400 font-semibold">Total Amount:</Text>
              <Text className="text-sm font-black font-mono text-white">
                ₹{invoice.total}
              </Text>
            </View>

            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-slate-400 font-semibold">Received:</Text>
              <Text className="text-xs font-bold font-mono text-emerald-400">
                ₹{invoice.receivedAmount}
              </Text>
            </View>

            {invoice.dueAmount > 0 && (
              <View className="flex-row justify-between pt-1 border-t border-dashed" style={{ borderColor: colors.border }}>
                <Text className="text-xs text-rose-500 font-extrabold">Credit / Due (Udhar):</Text>
                <Text className="text-sm font-black font-mono text-rose-500">
                  ₹{invoice.dueAmount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Buttons */}
        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={onNewOrder}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-xl active:scale-98"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text className="text-sm font-black text-black tracking-wider uppercase">
              Start Next Order
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            className="w-full py-3.5 rounded-2xl items-center justify-center flex-row gap-2 border active:scale-98"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <Ionicons name="share-social" size={18} color={colors.primary} />
            <Text className="text-xs font-bold text-amber-500">
              Share Bill / Receipt on WhatsApp
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
