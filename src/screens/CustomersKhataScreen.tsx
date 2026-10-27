import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getCustomersWithDueApi } from '../api/cafeApi';
import { Buyer } from '../types';

export const CustomersKhataScreen: React.FC = () => {
  const { colors } = useTheme();
  const [customers, setCustomers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKhata = async () => {
    try {
      setLoading(true);
      const data = await getCustomersWithDueApi();
      setCustomers(data);
    } catch (e) {
      console.warn('Failed to load customers khata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKhata();
  }, []);

  const totalDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = (phone: string, name: string, due: number) => {
    if (phone) {
      const msg = encodeURIComponent(
        `Hello ${name}, warm greetings from RetelFlow Cafe! Your pending credit balance is ₹${due}. Kindly clear at your convenience. Thank you!`
      );
      Linking.openURL(`whatsapp://send?phone=91${phone}&text=${msg}`);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View>
          <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
            Customer Khata & Credit
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            Registered Mobile Udhar Ledger
          </Text>
        </View>

        <TouchableOpacity onPress={loadKhata} className="p-2 rounded-xl bg-slate-800/40">
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Total Due Banner */}
      <View className="p-4">
        <View
          className="p-5 rounded-3xl border flex-row items-center justify-between shadow-xl"
          style={{
            backgroundColor: colors.card,
            borderColor: '#f43f5e',
          }}
        >
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Market Due (Udhar)
            </Text>
            <Text className="text-2xl font-black text-rose-500 font-mono mt-1">
              ₹{totalDue.toLocaleString()}
            </Text>
          </View>

          <View className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 items-center justify-center">
            <Ionicons name="wallet-outline" size={24} color="#f43f5e" />
          </View>
        </View>
      </View>

      {/* Customers List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id || item._id || item.phone}
          renderItem={({ item }) => (
            <View
              className="p-3.5 mb-2.5 mx-4 rounded-2xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-sm font-bold" style={{ color: colors.text }}>
                    {item.name || 'Customer'}
                  </Text>
                  <Text className="text-xs font-mono text-slate-400">
                    +91 {item.phone}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-[10px] text-slate-400 font-semibold">Due Balance</Text>
                  <Text className="text-base font-black text-rose-500 font-mono">
                    ₹{item.totalDue?.toLocaleString() || 0}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <TouchableOpacity
                  onPress={() => handleCall(item.phone)}
                  className="flex-1 py-2 rounded-xl border flex-row items-center justify-center gap-1 active:scale-95"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Ionicons name="call" size={14} color={colors.primary} />
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    Call
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleWhatsApp(item.phone, item.name, item.totalDue)}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 flex-row items-center justify-center gap-1 active:scale-95 shadow-sm"
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                  <Text className="text-xs font-black text-white">
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-2">🎉</Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                No pending customer credits! All bills settled.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};
