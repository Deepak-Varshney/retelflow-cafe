import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getInvoicesApi } from '../api/cafeApi';
import { getCachedOrders, setCachedOrders } from '../services/cacheService';

export const OrdersHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
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
            Today&apos;s Cafe & Restaurant Sales
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
          <Text className="text-xl font-black text-amber-500 font-mono mt-1">
            ₹{totalSales.toLocaleString()}
          </Text>
        </View>

        <View
          className="flex-1 p-4 rounded-3xl border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-[11px] font-bold text-slate-400">Total Orders</Text>
          <Text className="text-xl font-black text-white font-mono mt-1">
            {totalOrders}
          </Text>
        </View>
      </View>

      {/* Orders List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item._id || item.id || item.invoiceId || String(index)}
          renderItem={({ item }) => {
            const billAmount = Number(item.totalAmount ?? item.grandTotal ?? item.total) || 0;
            const dueAmt = Number(item.balanceAmount ?? item.dueAmount) || 0;
            const custName = item.customer?.name || item.customerName || 'Walk-in Guest';
            const custPhone = item.customer?.phone || item.customerPhone || '';
            const paymentMode = (item.paymentMethod || 'cash').toUpperCase();
            const orderTime = item.createdAt || item.date
              ? new Date(item.createdAt || item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <View
                className="p-3.5 mb-2.5 mx-4 rounded-2xl border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="px-2 py-0.5 rounded-md bg-amber-500/20">
                      <Text className="text-[10px] font-black text-amber-500">
                        Token #{item.orderNumber || item.invoiceNumber?.slice(-3) || item.id?.slice(-3) || '01'}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      {custName}
                    </Text>
                    <View className="px-1.5 py-0.2 rounded bg-slate-700/50">
                      <Text className="text-[9px] font-semibold text-slate-300">
                        {paymentMode}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-sm font-black text-amber-500 font-mono">
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
              </View>
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
                No orders placed yet today
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};
