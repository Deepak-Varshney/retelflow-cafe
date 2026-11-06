import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getInvoicesApi } from '../api/cafeApi';
import { getCachedOrders, setCachedOrders } from '../services/cacheService';
import { BillDetailModal } from '../components/BillDetailModal';
import { PrintSettings, ShopFeatures, StoreInfo } from '../types';
import { registerVoiceTarget } from '../services/voiceTargets';
import { BillFilter, BillSpec } from '../api/assistantApi';
import { normText } from '../services/voiceLocalRules';

const billName = (o: any) => String(o.customer?.name || o.customerName || '');
const billDate = (o: any) => new Date(o.createdAt || o.date || 0);
const billNo = (o: any) => String(o.invoiceNumber || o.invoiceId || o.orderNumber || '');
const isCredit = (o: any) => o.paymentMethod === 'credit' || Number(o.balanceAmount ?? o.dueAmount ?? 0) > 0;
const nameHit = (spoken: string, name: string) => {
  const want = normText(spoken).split(' ').filter(Boolean);
  const have = normText(name).split(' ');
  return want.length > 0 && want.every((w) => have.some((h) => h.startsWith(w)));
};

const PERIOD_LABEL: Record<string, string> = { today: 'Aaj', yesterday: 'Kal', week: 'Is hafte', month: 'Is mahine', all: 'Sab' };

function inPeriod(o: any, period?: string) {
  if (!period || period === 'all') return true;
  const d = billDate(o);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'today') return d >= dayStart;
  if (period === 'yesterday') return d >= new Date(dayStart.getTime() - 86400000) && d < dayStart;
  if (period === 'week') return d >= new Date(dayStart.getTime() - 6 * 86400000);
  if (period === 'month') return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  return true;
}

interface OrdersHistoryScreenProps {
  storeInfo: StoreInfo;
  printSettings: PrintSettings;
  features: ShopFeatures;
}

export const OrdersHistoryScreen: React.FC<OrdersHistoryScreenProps> = ({
  storeInfo,
  printSettings,
  features,
}) => {
  const { colors } = useTheme();
  const [openBill, setOpenBill] = useState<any | null>(null);
  const [billAction, setBillAction] = useState<'print' | 'whatsapp' | null>(null);
  // Set by voice: "aaj ke udhaar wale bills"
  const [voiceFilter, setVoiceFilter] = useState<BillFilter | null>(null);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>(() => getCachedOrders());
  const [loading, setLoading] = useState(() => getCachedOrders().length === 0);

  const loadOrders = async () => {
    try {
      if (orders.length === 0) setLoading(true);
      const data = await getInvoicesApi();
      if (Array.isArray(data)) {
        setOrders(data);
        setCachedOrders(data);
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const totalSales = orders.reduce(
    (sum, o) => sum + (Number(o.totalAmount ?? o.grandTotal ?? o.total) || 0),
    0
  );
  const totalOrders = orders.length;

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders;
    if (voiceFilter) {
      list = list.filter(
        (o) =>
          inPeriod(o, voiceFilter.period) &&
          (!voiceFilter.paymentMethod ||
            voiceFilter.paymentMethod === 'any' ||
            (voiceFilter.paymentMethod === 'credit' ? isCredit(o) : o.paymentMethod === voiceFilter.paymentMethod)) &&
          (!voiceFilter.customerName || nameHit(voiceFilter.customerName, billName(o)))
      );
    }
    if (!q) return list;
    return list.filter((o) =>
      [o.customer?.name, o.customerName, o.customer?.phone, o.customerPhone, o.invoiceNumber, String(o.orderNumber || '')]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [orders, search, voiceFilter]);

  // ── voice: open / reprint / WhatsApp a bill, filter the list ──
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  useEffect(() => {
    const findBill = (spec: BillSpec) => {
      const newestFirst = [...ordersRef.current].sort((a, b) => billDate(b).getTime() - billDate(a).getTime());
      let list = newestFirst;
      if (spec.billNumber) {
        const digits = String(spec.billNumber).replace(/\D/g, '');
        list = list.filter((o) => billNo(o).replace(/\D/g, '').endsWith(digits));
      }
      if (spec.customerName) list = list.filter((o) => nameHit(spec.customerName!, billName(o)));
      return spec.which === 'first' ? list[list.length - 1] : list[0];
    };
    const reg = registerVoiceTarget({
      screen: 'orders_history',
      handleAction: (a) => {
        if (a.type === 'open_bill') {
          const bill = findBill(a.bill);
          if (!bill) return 'Aisa bill nahi mila.';
          const then = a.bill.then === 'print' || a.bill.then === 'whatsapp' ? a.bill.then : null;
          if (then && !features.reprintBills) {
            setBillAction(null);
            setOpenBill(bill);
            return 'Reprint is shop ke liye on nahi hai — bill khol diya.';
          }
          setBillAction(then);
          setOpenBill(bill);
          return `Bill ${billNo(bill)}${billName(bill) ? ` · ${billName(bill)}` : ''}${then === 'print' ? ' · print ho raha hai' : then === 'whatsapp' ? ' · WhatsApp' : ''}`;
        }
        if (a.type === 'filter_bills') {
          setSearch('');
          setVoiceFilter(a.filter);
          return 'Bills filter kar diye';
        }
        return false;
      },
    });
    return () => reg.remove();
  }, [features.reprintBills]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View>
          <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
            Orders & Sales
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            All bills • Tap a bill to view
          </Text>
        </View>

        <TouchableOpacity onPress={loadOrders} className="p-2 rounded-xl bg-slate-800/40">
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Metrics Header */}
      <View className="flex-row gap-3 p-4">
        <View
          className="flex-1 p-4 rounded-3xl border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-[11px] font-bold text-slate-400">Total Sales</Text>
          <Text className="text-xl font-black text-cyan-400 font-mono mt-1">
            ₹{totalSales.toLocaleString()}
          </Text>
        </View>

        <View
          className="flex-1 p-4 rounded-3xl border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-[11px] font-bold text-slate-400">Total Orders</Text>
          <Text className="text-xl font-black font-mono mt-1" style={{ color: colors.text }}>
            {totalOrders}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 pb-2">
        <View
          className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
          style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Search name, mobile or bill no..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs font-semibold ml-2"
            style={{ color: colors.text }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Orders List */}
      {voiceFilter ? (
        <View className="mx-4 mt-2 px-3 py-2 rounded-2xl border flex-row items-center" style={{ borderColor: colors.primary }}>
          <Ionicons name="mic" size={13} color={colors.primary} />
          <Text className="text-xs font-bold ml-1.5 flex-1" style={{ color: colors.text }} numberOfLines={1}>
            {[
              PERIOD_LABEL[voiceFilter.period || 'all'],
              voiceFilter.paymentMethod && voiceFilter.paymentMethod !== 'any' ? voiceFilter.paymentMethod : '',
              voiceFilter.customerName || '',
            ]
              .filter(Boolean)
              .join(' · ')}{' '}
            · {visibleOrders.length} bills
          </Text>
          <TouchableOpacity onPress={() => setVoiceFilter(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          refreshing={false}
          onRefresh={loadOrders}
          keyExtractor={(item, index) => item._id || item.id || item.invoiceId || String(index)}
          renderItem={({ item }) => {
            const billAmount = Number(item.totalAmount ?? item.grandTotal ?? item.total) || 0;
            const dueAmt = Number(item.balanceAmount ?? item.dueAmount) || 0;
            const custName = item.customer?.name || item.customerName || 'Walk-in Guest';
            const custPhone = item.customer?.phone || item.customerPhone || '';
            const paymentMode = (item.paymentMethod || 'cash').toUpperCase();
            const when = item.createdAt || item.date ? new Date(item.createdAt || item.date) : null;
            const orderTime = when
              ? `${when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '';

            return (
              <TouchableOpacity
                onPress={() => setOpenBill(item)}
                activeOpacity={0.75}
                className="p-3.5 mb-2.5 mx-4 rounded-2xl border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2 flex-1 pr-2 flex-wrap">
                    <View className="px-2 py-0.5 rounded-md bg-cyan-500/20">
                      <Text className="text-[10px] font-black text-cyan-400">
                        Token #{item.orderNumber || item.invoiceNumber?.slice(-3) || item.id?.slice(-3) || '01'}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold flex-shrink" style={{ color: colors.text }} numberOfLines={1}>
                      {custName}
                    </Text>
                    <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.surface }}>
                      <Text className="text-[9px] font-semibold" style={{ color: colors.textSecondary }}>
                        {paymentMode}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-sm font-black text-cyan-400 font-mono">
                      ₹{billAmount.toLocaleString()}
                    </Text>
                    {orderTime ? (
                      <Text className="text-[9px] text-slate-400 font-mono">{orderTime}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Items */}
                <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>
                  {item.items?.map((it: any) => `${it.qty}x ${it.name}`).join(', ') || 'Item list'}
                </Text>

                {dueAmt > 0 && (
                  <View
                    className="mt-2 pt-1 border-t flex-row justify-between"
                    style={{ borderColor: colors.border }}
                  >
                    <Text className="text-[10px] text-rose-500 font-bold">
                      Credit / Due: ₹{dueAmt.toLocaleString()}
                    </Text>
                    <Text className="text-[10px] text-slate-400">
                      Phone: {custPhone ? `+91 ${custPhone}` : 'N/A'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Ionicons name="receipt-outline" size={30} color={colors.textMuted} />
              </View>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {search.trim() ? `No bills match "${search}"` : 'No orders placed yet'}
              </Text>
            </View>
          }
        />
      )}

      {openBill ? (
        <BillDetailModal
          invoice={openBill}
          storeInfo={storeInfo}
          printSettings={printSettings}
          features={features}
          autoAction={billAction}
          onClose={() => {
            setOpenBill(null);
            setBillAction(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};
