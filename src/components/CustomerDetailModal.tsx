import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { ShopFeatures } from '../types';
import { CustomerLedger, LedgerEntry, getCustomerLedgerApi, settleCustomerDueApi } from '../api/cafeApi';
import { friendlyError } from '../utils/errorMessage';

interface CustomerDetailModalProps {
  customer: any | null;
  features: ShopFeatures;
  onClose: () => void;
  /** Called after a payment is recorded so the list can refresh its dues. */
  onChanged: () => void;
}

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
const fmtTime = (d?: string) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
const rs = (n?: number) => `₹${(Number(n) || 0).toLocaleString()}`;

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, features, onClose, onChanged }) => {
  const { colors } = useTheme();
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [saving, setSaving] = useState(false);

  const phone = String(customer?.phone || '').replace(/\D/g, '').slice(-10);
  const hasPhone = phone.length === 10;

  const load = async () => {
    if (!customer) return;
    setLoading(true);
    setError('');
    try {
      setLedger(await getCustomerLedgerApi(phone, phone ? '' : customer.name));
    } catch (err) {
      setError(friendlyError(err, 'Could not load customer history.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customer?.id, customer?.phone]);

  if (!customer) return null;

  const bills = (ledger?.entries || []).filter((e) => e.type === 'bill');
  const due = ledger ? ledger.due : Number(customer.dueAmount ?? customer.totalDue) || 0;
  const lastBill = bills[0];

  const handleReceive = async () => {
    const amount = Math.round(Number(payAmount) || 0);
    if (amount <= 0) {
      Alert.alert('Enter amount', 'Enter how much the customer is paying.');
      return;
    }
    if (amount > due) {
      Alert.alert('Too much', `Pending due is only ${rs(due)}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await settleCustomerDueApi({ phone: phone || customer.name, amount, paymentMethod: payMethod });
      setPayAmount('');
      Alert.alert('Payment saved', `${rs(res.settledAmount)} received. Remaining due: ${rs(res.remainingDue)}.`);
      await load();
      onChanged();
    } catch (err) {
      Alert.alert('Could not save', friendlyError(err, 'Payment was not saved. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const renderEntry = (e: LedgerEntry) =>
    e.type === 'bill' ? (
      <View key={e.id} className="flex-row items-start py-2.5 border-b" style={{ borderColor: colors.border }}>
        <View className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 bg-cyan-500/15">
          <Ionicons name="receipt-outline" size={15} color="#f59e0b" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-xs font-bold" style={{ color: colors.text }}>
            Bill #{e.id}
          </Text>
          <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
            {fmtDate(e.date)} {fmtTime(e.date)} • {e.items || 0} items • Paid {rs(e.paidAtBill)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-black font-mono" style={{ color: colors.text }}>
            {rs(e.total)}
          </Text>
          {(e.dueNow || 0) > 0 ? (
            <Text className="text-[10px] font-bold text-rose-500">Due {rs(e.dueNow)}</Text>
          ) : (
            <Text className="text-[10px] font-bold text-emerald-500">Paid</Text>
          )}
        </View>
      </View>
    ) : (
      <View key={e.id} className="flex-row items-start py-2.5 border-b" style={{ borderColor: colors.border }}>
        <View className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 bg-emerald-500/15">
          <Ionicons name="cash-outline" size={15} color="#10b981" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-xs font-bold" style={{ color: colors.text }}>
            Payment received ({String(e.paymentMethod || 'cash').toUpperCase()})
          </Text>
          <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
            {e.approximateDate ? 'Date not recorded' : `${fmtDate(e.date)} ${fmtTime(e.date)}`}
            {e.dueAfter !== undefined ? ` • Due after: ${rs(e.dueAfter)}` : ''}
          </Text>
        </View>
        <Text className="text-xs font-black font-mono text-emerald-500">+{rs(e.amount)}</Text>
      </View>
    );

  const Tile = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View className="flex-1 min-w-[45%] p-3 rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <Text className="text-sm font-black font-mono mt-0.5" style={{ color: color || colors.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          className="rounded-t-3xl border-t px-4 pt-4 pb-5 w-full self-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border, height: '88%', maxWidth: 640 }}
        >
          {/* Header */}
          <View className="flex-row items-center pb-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-1 pr-2">
              <Text className="text-base font-black" style={{ color: colors.text }} numberOfLines={1}>
                {customer.name || 'Customer'}
              </Text>
              <Text className="text-[11px] font-mono" style={{ color: colors.textSecondary }}>
                {hasPhone ? `+91 ${phone}` : 'No phone linked'}
              </Text>
            </View>
            {hasPhone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} className="p-2 mr-1" hitSlop={6}>
                <Ionicons name="call" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} hitSlop={10} className="p-1">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 12 }} keyboardShouldPersistTaps="handled">
            {/* Summary */}
            <View className="flex-row flex-wrap gap-2 mb-3">
              <Tile label="Udhar / Due now" value={rs(due)} color={due > 0 ? '#f43f5e' : '#10b981'} />
              <Tile label="Total bills" value={rs(ledger?.billed ?? customer.total)} />
              <Tile label="Visits" value={String(bills.length || customer.visits || 0)} />
              <Tile label="Last order" value={fmtDate(lastBill?.date || customer.lastSaleDate)} />
            </View>

            {/* Receive payment */}
            {due > 0 ? (
              <View className="p-3 rounded-2xl border mb-3" style={{ borderColor: '#f43f5e55', backgroundColor: colors.surface }}>
                <Text className="text-xs font-black mb-2" style={{ color: colors.text }}>
                  Receive payment
                </Text>
                <View className="flex-row items-center gap-2">
                  <View
                    className="flex-1 flex-row items-center px-3 py-2 rounded-xl border"
                    style={{ borderColor: colors.border, backgroundColor: colors.inputBg }}
                  >
                    <Text className="text-sm font-bold text-cyan-400 mr-1">₹</Text>
                    <TextInput
                      value={payAmount}
                      onChangeText={setPayAmount}
                      keyboardType="numeric"
                      placeholder={String(due)}
                      placeholderTextColor={colors.textMuted}
                      className="flex-1 text-sm font-bold font-mono"
                      style={{ color: colors.text }}
                    />
                  </View>
                  {(['cash', 'online'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setPayMethod(m)}
                      className="px-3 py-2 rounded-xl border"
                      style={{
                        backgroundColor: payMethod === m ? colors.primary : colors.card,
                        borderColor: payMethod === m ? colors.primary : colors.border,
                      }}
                    >
                      <Text className="text-[11px] font-black" style={{ color: payMethod === m ? '#000' : colors.text }}>
                        {m === 'cash' ? 'Cash' : 'UPI'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => setPayAmount(String(due))}
                    className="px-3 py-2 rounded-xl border"
                    style={{ borderColor: colors.border }}
                  >
                    <Text className="text-[11px] font-bold" style={{ color: colors.textSecondary }}>
                      Full {rs(due)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReceive}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl items-center justify-center bg-emerald-500"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-xs font-black text-white">Save payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator className="my-6" color={colors.primary} />
            ) : error ? (
              <TouchableOpacity onPress={load} className="items-center my-6">
                <Text className="text-xs text-rose-500 font-semibold text-center">{error}</Text>
                <Text className="text-xs font-bold mt-1" style={{ color: colors.primary }}>
                  Tap to retry
                </Text>
              </TouchableOpacity>
            ) : features.khataStatement ? (
              <>
                <Text className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                  Khata statement
                </Text>
                {ledger && ledger.entries.length > 0 ? (
                  ledger.entries.map(renderEntry)
                ) : (
                  <Text className="text-xs text-center py-4" style={{ color: colors.textMuted }}>
                    No bills or payments yet.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                  Recent orders
                </Text>
                {bills.slice(0, 5).map(renderEntry)}
                {bills.length === 0 ? (
                  <Text className="text-xs text-center py-4" style={{ color: colors.textMuted }}>
                    No orders yet.
                  </Text>
                ) : null}
                <View className="mt-3 p-3 rounded-2xl border flex-row items-center gap-2" style={{ borderColor: colors.border }}>
                  <Ionicons name="lock-closed" size={15} color={colors.primary} />
                  <Text className="text-[11px] flex-1" style={{ color: colors.textSecondary }}>
                    Full khata statement (every bill and payment with dates) is not active for your shop. Contact support to enable it.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
