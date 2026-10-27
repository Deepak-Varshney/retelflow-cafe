import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getInvoicesApi } from '../api/cafeApi';

export const OrdersHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getInvoicesApi();
      setOrders(data);
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.total) || 0), 0);
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
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          renderItem={({ item }) => (
            <View
              className="p-3.5 mb-2.5 mx-4 rounded-2xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-2">
                  <View className="px-2 py-0.5 rounded-md bg-amber-500/20">
                    <Text className="text-[10px] font-black text-amber-500">
                      Token #{item.orderNumber || item.invoiceNumber?.slice(-3) || '01'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    {item.customer?.name || 'Guest'}
                  </Text>
                </View>

                <Text className="text-sm font-black text-amber-500 font-mono">
                  ₹{Number(item.grandTotal ?? item.total) || 0}
                </Text>
              </View>

              <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                {item.items?.map((it: any) => `${it.qty}x ${it.name}`).join(', ')}
              </Text>

              {item.dueAmount > 0 && (
                <View className="mt-2 pt-1 border-t flex-row justify-between" style={{ borderColor: colors.border }}>
                  <Text className="text-[10px] text-rose-500 font-bold">
                    Credit / Due: ₹{item.dueAmount}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    Phone: {item.customer?.phone || 'N/A'}
                  </Text>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-2">🧾</Text>
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
