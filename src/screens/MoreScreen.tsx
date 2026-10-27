import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { updateShopSettingsApi } from '../api/cafeApi';
import { getCurrentUser } from '../auth/authApi';

interface MoreScreenProps {
  user: any;
  onLogout: () => void;
  onUserUpdated?: (user: any) => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  user,
  onLogout,
  onUserUpdated,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<any>(user || {});

  // Edit Store Details Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || '');
  const [editShopName, setEditShopName] = useState(currentUser.shopName || currentUser.businessName || '');
  const [editAddress, setEditAddress] = useState(currentUser.address || '');
  const [editGst, setEditGst] = useState(currentUser.gstNumber || '');
  const [savingSettings, setSavingSettings] = useState(false);

  // Plans Modal
  const [plansModalVisible, setPlansModalVisible] = useState(false);

  // Refresh user data silently
  useEffect(() => {
    getCurrentUser()
      .then((fresh) => {
        if (fresh) {
          setCurrentUser(fresh);
          onUserUpdated?.(fresh);
        }
      })
      .catch(() => {});
  }, []);

  const openEditModal = () => {
    setEditName(currentUser.name || '');
    setEditShopName(currentUser.shopName || currentUser.businessName || '');
    setEditAddress(currentUser.address || '');
    setEditGst(currentUser.gstNumber || '');
    setEditModalVisible(true);
  };

  const handleSaveStoreDetails = async () => {
    if (!editShopName.trim()) {
      Alert.alert('Error', 'Cafe / Restaurant name is required');
      return;
    }

    try {
      setSavingSettings(true);
      const res = await updateShopSettingsApi({
        name: editName.trim(),
        shopName: editShopName.trim(),
        address: editAddress.trim(),
        gstNumber: editGst.trim(),
      });

      const updatedUser = res.user || {
        ...currentUser,
        name: editName.trim(),
        shopName: editShopName.trim(),
        address: editAddress.trim(),
        gstNumber: editGst.trim(),
      };

      setCurrentUser(updatedUser);
      onUserUpdated?.(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Store details updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update store settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenWhatsApp = (message?: string) => {
    const text = encodeURIComponent(message || 'Hi RetelFlow Cafe Team, I need support for my counter billing system.');
    Linking.openURL(`https://wa.me/917251830075?text=${text}`).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp on this device.');
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'RF';
    return name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'RF';
  };

  const access = currentUser?.access;
  const isTrial = access?.status === 'trial';
  const planName = access?.planName || (isTrial ? 'RetelFlow Cafe Trial' : 'RetelFlow Cafe Pro');
  const daysLeft = access?.daysLeft ?? 28;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-5 py-3.5 border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
          Account & Counter Management
        </Text>
        <Text className="text-xl font-black mt-0.5" style={{ color: colors.text }}>
          Profile & Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* 1. STORE PROFILE HERO CARD */}
        <View
          className="rounded-3xl p-4.5 border shadow-xl mb-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center mb-3.5">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mr-3.5 border"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                borderColor: colors.primary,
              }}
            >
              <Text className="text-lg font-black text-amber-500">
                {getInitials(currentUser.shopName || currentUser.name)}
              </Text>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-black" style={{ color: colors.text }} numberOfLines={1}>
                  {currentUser.shopName || currentUser.businessName || 'RetelFlow Cafe'}
                </Text>
                <View
                  className="px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: colors.primary,
                  }}
                >
                  <Text className="text-[9px] font-black text-amber-500 uppercase">
                    {currentUser.role || 'OWNER'}
                  </Text>
                </View>
              </View>

              <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.textSecondary }}>
                Owner: <Text className="font-bold" style={{ color: colors.text }}>{currentUser.name || 'Deepak'}</Text>
              </Text>
              <Text className="text-xs font-bold text-amber-500 mt-0.5">
                +91 {currentUser.phone || '7251830075'}
              </Text>
            </View>
          </View>

          {/* Edit Store Info Button */}
          <TouchableOpacity
            onPress={openEditModal}
            activeOpacity={0.8}
            className="w-full py-2.5 rounded-2xl border items-center justify-center flex-row gap-1.5 active:scale-98"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
              borderColor: colors.border,
            }}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text className="text-xs font-bold" style={{ color: colors.text }}>
              Edit Store Name, Address & GST
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. SUBSCRIPTION & LICENSE CARD (RetelFlow Pro) */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1 text-slate-400">
          Subscription & License
        </Text>
        <TouchableOpacity
          onPress={() => setPlansModalVisible(true)}
          activeOpacity={0.8}
          className="rounded-3xl p-4 border mb-5 flex-row items-center shadow-lg active:scale-98"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center mr-3.5 border"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderColor: colors.primary,
            }}
          >
            <Ionicons name="diamond" size={20} color={colors.primary} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-black" style={{ color: colors.text }}>
                {planName}
              </Text>
              <View
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: isTrial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}
              >
                <Text
                  className="text-[9px] font-black uppercase"
                  style={{ color: isTrial ? '#f59e0b' : '#10b981' }}
                >
                  {isTrial ? 'Trial Active' : 'Active Plan'}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
              {daysLeft > 0 ? `${daysLeft} Days remaining • Tap to renew` : 'Unlimited voice & KOT billing'}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-black text-amber-500">Plans</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* 3. THEME & DISPLAY SETTINGS */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1 text-slate-400">
          Theme & Display
        </Text>
        <View
          className="rounded-3xl border p-4 mb-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe' }}
              >
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color="#38bdf8" />
              </View>
              <View>
                <Text className="text-sm font-bold" style={{ color: colors.text }}>
                  Appearance Mode
                </Text>
                <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                  Current: {isDark ? 'Dark (Night Mode)' : 'Light (Day Mode)'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.8}
              className="px-4 py-2 rounded-xl border flex-row items-center gap-1.5 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                borderColor: colors.primary,
              }}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
              <Text className="text-xs font-black text-amber-500">Switch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. RECEIPT & KOT PRINTER PREFERENCES */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1 text-slate-400">
          Billing & KOT Engine
        </Text>
        <View
          className="rounded-3xl border p-4 mb-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center">
              <Ionicons name="print-outline" size={18} color={colors.primary} className="mr-2" />
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                KOT Format
              </Text>
            </View>
            <Text className="text-xs font-bold text-amber-500">
              Kitchen Token + Slip (58mm/80mm)
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="mic-outline" size={18} color={colors.primary} className="mr-2" />
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                Voice Engine
              </Text>
            </View>
            <Text className="text-xs font-bold text-emerald-500">
              Gemini 2.0 Flash (Online)
            </Text>
          </View>
        </View>

        {/* 5. SUPPORT & HELP */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1 text-slate-400">
          Help & Customer Care
        </Text>
        <View
          className="rounded-3xl border p-2 mb-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <TouchableOpacity
            onPress={() => handleOpenWhatsApp()}
            className="flex-row items-center p-3 rounded-2xl active:bg-emerald-500/10"
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-500/15 items-center justify-center mr-3">
              <Ionicons name="logo-whatsapp" size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                WhatsApp Support
              </Text>
              <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                Chat directly with our tech support team
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('tel:7251830075')}
            className="flex-row items-center p-3 rounded-2xl active:bg-amber-500/10"
          >
            <View className="w-10 h-10 rounded-xl bg-amber-500/15 items-center justify-center mr-3">
              <Ionicons name="call-outline" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                Call Helpline
              </Text>
              <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                +91 72518 30075 (9 AM - 9 PM)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 6. LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.8}
          className="w-full py-4 rounded-3xl border items-center justify-center flex-row gap-2 shadow-lg active:scale-98 mb-6"
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            borderColor: '#f43f5e',
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
          <Text className="text-xs font-black text-rose-500 uppercase tracking-wider">
            Logout Counter Session
          </Text>
        </TouchableOpacity>

        {/* App Version Stamp */}
        <Text className="text-[11px] text-center font-bold text-slate-500 mb-4">
          RetelFlow Cafe & Sweets • Version 1.0.0
        </Text>
      </ScrollView>

      {/* EDIT STORE DETAILS MODAL */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/75">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setEditModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 max-h-[85%]"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <Text className="text-base font-black" style={{ color: colors.text }}>
                Edit Store & Counter Profile
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  Cafe / Restaurant Name *
                </Text>
                <TextInput
                  value={editShopName}
                  onChangeText={setEditShopName}
                  placeholder="e.g. Chai & Pizza Cafe"
                  placeholderTextColor={colors.textMuted}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  Owner / Incharge Name
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Deepak"
                  placeholderTextColor={colors.textMuted}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  Store Address
                </Text>
                <TextInput
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="e.g. Shop 4, Main Market, Sector 15"
                  placeholderTextColor={colors.textMuted}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-medium"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  GST Number (Optional)
                </Text>
                <TextInput
                  value={editGst}
                  onChangeText={setEditGst}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveStoreDetails}
                disabled={savingSettings}
                className="py-3.5 rounded-2xl items-center justify-center bg-amber-500 shadow-lg active:scale-98"
              >
                {savingSettings ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-xs font-black text-black uppercase tracking-wider">
                    Save Profile Changes
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PLANS & SUBSCRIPTION MODAL */}
      <Modal visible={plansModalVisible} transparent animationType="slide" onRequestClose={() => setPlansModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/80">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setPlansModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 max-h-[88%]"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  RetelFlow Cafe Plans
                </Text>
                <Text className="text-[11px] text-amber-500 font-bold">
                  All-in-One Restaurant, Cafe & Sweets POS
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPlansModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Monthly Plan */}
              <View
                className="p-4 rounded-3xl border mb-3 relative overflow-hidden"
                style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc', borderColor: colors.border }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-black" style={{ color: colors.text }}>
                    Pro Monthly
                  </Text>
                  <Text className="text-lg font-black text-amber-500 font-mono">
                    ₹299<Text className="text-xs text-slate-400 font-normal"> / month</Text>
                  </Text>
                </View>
                <Text className="text-xs text-slate-400 mb-3">
                  Full billing, KOT printer, inventory & khata management.
                </Text>
                {['Unlimited Gemini AI Voice Orders', 'KOT & Customer Bill Printing', '26+ Indian Cafe & Sweets Menu', 'Automatic Khata & Due Ledger'].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2 mb-1.5">
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text className="text-xs font-semibold" style={{ color: colors.text }}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Yearly Plan (Best Value) */}
              <View
                className="p-4 rounded-3xl border mb-4 relative overflow-hidden"
                style={{
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                  borderColor: colors.primary,
                }}
              >
                <View className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500">
                  <Text className="text-[9px] font-black text-black uppercase tracking-wider">
                    Save ₹589
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-black" style={{ color: colors.text }}>
                    Pro Annual (1 Year)
                  </Text>
                  <Text className="text-lg font-black text-amber-500 font-mono">
                    ₹2,999<Text className="text-xs text-slate-400 font-normal"> / year</Text>
                  </Text>
                </View>
                <Text className="text-xs text-slate-400 mb-3">
                  Everything in Pro with 12 months uninterrupted access & VIP onboarding.
                </Text>
                {['All Pro Features Included', '2 Months Free Included', 'Priority 24/7 WhatsApp Support', 'Free Catalog Setup & Customization'].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2 mb-1.5">
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text className="text-xs font-semibold" style={{ color: colors.text }}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenWhatsApp('Hi RetelFlow Team, I want to upgrade/renew my RetelFlow Cafe subscription plan.')}
                activeOpacity={0.8}
                className="py-3.5 rounded-2xl items-center justify-center bg-emerald-500 flex-row gap-2 shadow-xl active:scale-98"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#000" />
                <Text className="text-xs font-black text-black uppercase tracking-wider">
                  Contact on WhatsApp to Upgrade
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};