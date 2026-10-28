import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getCustomersWithDueApi } from '../api/cafeApi';
import { getCachedCustomers, setCachedCustomers } from '../services/cacheService';

export const CustomersKhataScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [customers, setCustomers] = useState<any[]>(() => getCachedCustomers());
  const [loading, setLoading] = useState(() => getCachedCustomers().length === 0);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'due'>('all');

  const loadKhata = async () => {
    try {
      if (customers.length === 0) setLoading(true);
      const data = await getCustomersWithDueApi();
      if (Array.isArray(data)) {
        setCustomers(data);
        setCachedCustomers(data);
      }
    } catch (e) {
      console.warn('Failed to load customers khata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKhata();
  }, []);

  // Calculate metrics
  const totalDue = useMemo(() => {
    return customers.reduce((sum, c) => sum + (Number(c.dueAmount ?? c.totalDue) || 0), 0);
  }, [customers]);

  const creditCustomerCount = useMemo(() => {
    return customers.filter((c) => (Number(c.dueAmount ?? c.totalDue) || 0) > 0).length;
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (tabFilter === 'due') {
      list = list.filter((c) => (Number(c.dueAmount ?? c.totalDue) || 0) > 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q)
      );
    }

    return list;
  }, [customers, tabFilter, search]);

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = (phone?: string, name?: string, due?: number) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const dueText = due && due > 0 ? `Your pending credit balance is ₹${due.toLocaleString()}.` : '';
      const msg = encodeURIComponent(
        `Hello ${name || 'Customer'}, greetings from RetelFlow Cafe! ${dueText} Thank you for your visit.`
      );
      Linking.openURL(`whatsapp://send?phone=91${cleanPhone}&text=${msg}`);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* 1. Header Toolbar */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View>
          <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
            Customers & Khata
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            Customer Directory & Credit Ledger
          </Text>
        </View>

        <TouchableOpacity onPress={loadKhata} className="p-2 rounded-xl bg-slate-800/40">
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 2. Metrics Banners */}
      <View className="flex-row gap-3 px-4 pt-3.5 pb-2">
        {/* Total Due Banner */}
        <View
          className="flex-1 p-3.5 rounded-2xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: totalDue > 0 ? '#f43f5e' : colors.border,
          }}
        >
          <Text className="text-[10px] font-bold uppercase text-slate-400">Total Udhar / Due</Text>
          <Text className="text-lg font-black text-rose-500 font-mono mt-0.5">
            ₹{totalDue.toLocaleString()}
          </Text>
        </View>

        {/* Total Registered Customers */}
        <View
          className="flex-1 p-3.5 rounded-2xl border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-[10px] font-bold uppercase text-slate-400">All Customers</Text>
          <Text className="text-lg font-black text-white font-mono mt-0.5">
            {customers.length}
          </Text>
        </View>
      </View>

      {/* 3. Search Bar */}
      <View className="px-4 py-2">
        <View
          className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
          style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Search by name or mobile number..."
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

      {/* 4. Tab Filter Pills */}
      <View className="flex-row px-4 pb-2.5 gap-2">
        <TouchableOpacity
          onPress={() => setTabFilter('all')}
          activeOpacity={0.8}
          className="px-3.5 py-1.5 rounded-xl border flex-row items-center gap-1.5"
          style={{
            backgroundColor: tabFilter === 'all' ? colors.primary : colors.surface,
            borderColor: tabFilter === 'all' ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-xs font-black"
            style={{ color: tabFilter === 'all' ? '#000000' : colors.text }}
          >
            All Customers ({customers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTabFilter('due')}
          activeOpacity={0.8}
          className="px-3.5 py-1.5 rounded-xl border flex-row items-center gap-1.5"
          style={{
            backgroundColor: tabFilter === 'due' ? '#f43f5e' : colors.surface,
            borderColor: tabFilter === 'due' ? '#f43f5e' : colors.border,
          }}
        >
          <Text
            className="text-xs font-black"
            style={{ color: tabFilter === 'due' ? '#ffffff' : colors.text }}
          >
            Credit / Udhar ({creditCustomerCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Customer List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item, index) => item.id || item._id || item.phone || String(index)}
          renderItem={({ item }) => {
            const dueAmt = Number(item.dueAmount ?? item.totalDue) || 0;
            const totalSpent = Number(item.total) || 0;
            const hasPhone = Boolean(item.phone && item.phone.replace(/\D/g, '').length >= 10);

            return (
              <View
                className="p-3.5 mb-2.5 mx-4 rounded-2xl border"
                style={{
                  backgroundColor: colors.card,
                  borderColor: dueAmt > 0 ? 'rgba(244, 63, 94, 0.4)' : colors.border,
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 pr-2">
                    {/* Avatar Badge */}
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center mr-2.5 border"
                      style={{
                        backgroundColor: colors.badgeBg,
                        borderColor: colors.primary,
                      }}
                    >
                      <Text className="text-xs font-black text-amber-500">
                        {item.avatar || (item.name ? item.name.slice(0, 2).toUpperCase() : 'CU')}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-xs font-black"
                        style={{ color: colors.text }}
                        numberOfLines={1}
                      >
                        {item.name || 'Walk-in Guest'}
                      </Text>
                      <Text className="text-[11px] font-mono text-slate-400">
                        {item.phone ? `+91 ${item.phone}` : 'No phone linked'}
                      </Text>
                    </View>
                  </View>

                  {/* Due Amount or Fully Paid */}
                  <View className="items-end">
                    {dueAmt > 0 ? (
                      <>
                        <Text className="text-[10px] text-rose-500 font-bold uppercase">
                          Credit Due
                        </Text>
                        <Text className="text-sm font-black text-rose-500 font-mono">
                          ₹{dueAmt.toLocaleString()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View className="px-2 py-0.5 rounded-full bg-emerald-500/20 flex-row items-center">
                          <Ionicons name="checkmark-circle" size={11} color="#10b981" />
                          <Text className="text-[10px] font-bold text-emerald-400 ml-1">
                            All Paid
                          </Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Spent: ₹{totalSpent.toLocaleString()}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Action Buttons for Phone Linked Customers */}
                {hasPhone ? (
                  <View
                    className="flex-row gap-2 pt-2 border-t"
                    style={{ borderColor: colors.border }}
                  >
                    <TouchableOpacity
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.7}
                      className="flex-1 py-1.5 rounded-xl border flex-row items-center justify-center gap-1 active:scale-95"
                      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                    >
                      <Ionicons name="call" size={13} color={colors.primary} />
                      <Text className="text-xs font-bold" style={{ color: colors.text }}>
                        Call
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleWhatsApp(item.phone, item.name, dueAmt)}
                      activeOpacity={0.7}
                      className="flex-1 py-1.5 rounded-xl flex-row items-center justify-center gap-1 active:scale-95"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#ffffff" />
                      <Text className="text-xs font-black text-white">
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Ionicons name="people-outline" size={30} color={colors.textMuted} />
              </View>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {search.trim()
                  ? `No customer matches "${search}"`
                  : tabFilter === 'due'
                  ? 'No pending customer credit! All bills settled.'
                  : 'No customers recorded yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};
