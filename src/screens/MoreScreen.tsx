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
import { updateShopSettingsApi, getAppConfigApi, getInvoicesApi, getCustomersWithDueApi } from '../api/cafeApi';
import { getCurrentUser } from '../auth/authApi';
import {
  getCachedConfig,
  setCachedConfig,
  getCachedMetrics,
  setCachedMetrics,
  CafeAppConfig,
} from '../services/cacheService';
import { SupportTicketsModal } from '../components/SupportTicketsModal';
import { PrinterSetupModal } from '../components/PrinterSetupModal';
import { getSavedPrinter, isPrinterSdkAvailable } from '../../modules/thermal-printer';

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
  const { colors } = useTheme();

  const [currentUser, setCurrentUser] = useState<any>(user || {});

  // Admin Config state (Dynamic Support & Helpline, strictly NO hardcoded fallback)
  const [appConfig, setAppConfig] = useState<CafeAppConfig | null>(() => getCachedConfig());

  // Quick stats state (Loaded from cache first, refreshed silently)
  const [metrics, setMetrics] = useState(() => {
    return getCachedMetrics() || { todaySales: 0, totalOrders: 0, totalDue: 0, lastUpdated: '' };
  });

  // Edit Store Details Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || '');
  const [editShopName, setEditShopName] = useState(currentUser.shopName || currentUser.businessName || '');
  const [editAddress, setEditAddress] = useState(currentUser.address || '');
  const [editGst, setEditGst] = useState(currentUser.gstNumber || '');
  const [savingSettings, setSavingSettings] = useState(false);

  // Plans Modal
  const [plansModalVisible, setPlansModalVisible] = useState(false);

  // Bluetooth Thermal Printer
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [savedPrinter, setSavedPrinter] = useState(() => getSavedPrinter());

  // Support Tickets Modal
  const [ticketsModalVisible, setTicketsModalVisible] = useState(false);

  // Refresh user data & config silently
  useEffect(() => {
    // 1. Refresh user
    getCurrentUser()
      .then((fresh) => {
        if (fresh) {
          setCurrentUser(fresh);
          onUserUpdated?.(fresh);
        }
      })
      .catch(() => {});

    // 2. Fetch official admin helpline & branding config
    getAppConfigApi()
      .then((cfg) => {
        const cafeCfg: CafeAppConfig = {
          helpPhone: cfg?.cafe?.helpPhone || cfg?.branding?.helpPhone || '',
          whatsappPhone: cfg?.cafe?.whatsappPhone || cfg?.branding?.whatsappPhone || '',
          helpEmail: cfg?.cafe?.helpEmail || cfg?.branding?.helpEmail || '',
          logoUrl: cfg?.cafe?.logoUrl || cfg?.branding?.appLogoUrl || '',
          splashUrl: cfg?.cafe?.splashUrl || '',
        };
        setAppConfig(cafeCfg);
        setCachedConfig(cafeCfg);
      })
      .catch(() => {});

    // 3. Compute live counter metrics
    Promise.all([getInvoicesApi(), getCustomersWithDueApi()])
      .then(([invoices, customers]) => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let salesToday = 0;
        let totalCount = Array.isArray(invoices) ? invoices.length : 0;

        if (Array.isArray(invoices)) {
          for (const inv of invoices) {
            const invTime = new Date(inv.date || inv.createdAt).getTime();
            if (invTime >= startOfDay) {
              salesToday += Number(inv.totalAmount || inv.total || 0);
            }
          }
        }

        let dueSum = 0;
        if (Array.isArray(customers)) {
          for (const c of customers) {
            dueSum += Number(c.dueAmount || c.totalDue || 0);
          }
        }

        const freshMetrics = {
          todaySales: salesToday,
          totalOrders: totalCount,
          totalDue: dueSum,
          lastUpdated: new Date().toISOString(),
        };
        setMetrics(freshMetrics);
        setCachedMetrics(freshMetrics);
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

  const supportPhone = appConfig?.helpPhone || '';
  const whatsappPhone = appConfig?.whatsappPhone || supportPhone;

  const handleOpenWhatsApp = (customMessage?: string) => {
    if (!whatsappPhone) {
      setTicketsModalVisible(true);
      return;
    }
    // Admin may store it with or without the 91 prefix
    const cleanNumber = whatsappPhone.replace(/\D/g, '').slice(-10);
    const text = encodeURIComponent(
      customMessage || `Hi RetelFlow Support, I need help with my counter billing account (${currentUser.shopName || currentUser.name || 'Cafe'}).`
    );
    Linking.openURL(`https://wa.me/91${cleanNumber}?text=${text}`).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp on this device.');
    });
  };

  const handleCallSupport = () => {
    if (!supportPhone) {
      setTicketsModalVisible(true);
      return;
    }
    Linking.openURL(`tel:+91${supportPhone.replace(/\D/g, '').slice(-10)}`).catch(() => {
      Alert.alert('Error', 'Unable to place a phone call from this device.');
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'RC';
    return (
      name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'RC'
    );
  };

  const access = currentUser?.access;
  const isTrial = access?.status === 'trial';
  const planName = access?.planName || (isTrial ? 'RetelFlow Cafe Trial' : 'RetelFlow Cafe Pro');
  const daysLeft = access?.daysLeft ?? 28;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      {/* Top Header */}
      <View
        className="px-5 py-3.5 border-b flex-row items-center justify-between"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View>
          <Text className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.primaryText }}>
            Counter Management
          </Text>
          <Text className="text-xl font-black mt-0.5" style={{ color: colors.text }}>
            Store & Settings
          </Text>
        </View>

        <View
          className="px-3 py-1.5 rounded-2xl border flex-row items-center gap-1.5"
          style={{
            backgroundColor: colors.badgeBg,
            borderColor: colors.primary,
          }}
        >
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text className="text-[11px] font-black" style={{ color: colors.primary }}>
            POS Active
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* 1. STORE PROFILE HERO CARD */}
        <View
          className="rounded-3xl p-5 border shadow-xl mb-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center mb-4">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mr-3.5 border"
              style={{
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
              }}
            >
              <Text className="text-lg font-black" style={{ color: colors.primaryText }}>
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
                    backgroundColor: colors.badgeBg,
                    borderColor: colors.primary,
                  }}
                >
                  <Text className="text-[9px] font-black uppercase" style={{ color: colors.primaryText }}>
                    {currentUser.role || 'COUNTER'}
                  </Text>
                </View>
              </View>

              <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.textSecondary }}>
                Manager: <Text className="font-bold" style={{ color: colors.text }}>{currentUser.name || 'Cashier'}</Text>
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons name="call" size={11} color={colors.primary} />
                <Text className="text-xs font-bold font-mono" style={{ color: colors.primaryText }}>
                  {currentUser.phone ? `+91 ${currentUser.phone}` : 'No phone linked'}
                </Text>
              </View>
            </View>
          </View>

          {/* Edit Store Info Button */}
          <TouchableOpacity
            onPress={openEditModal}
            activeOpacity={0.8}
            className="w-full py-2.5 rounded-2xl border items-center justify-center flex-row gap-2 active:scale-98"
            style={{
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text className="text-xs font-bold" style={{ color: colors.text }}>
              Edit Cafe Name, Address & GSTIN
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. LIVE COUNTER STATS (Fast Offline Cache) */}
        <View className="flex-row gap-2.5 mb-4">
          <View
            className="flex-1 p-3.5 rounded-2xl border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Text className="text-[10px] font-black uppercase" style={{ color: colors.textSecondary }}>Today&apos;s Sales</Text>
            <Text className="text-base font-black font-mono mt-0.5" style={{ color: colors.primaryText }}>
              ₹{metrics.todaySales.toLocaleString()}
            </Text>
          </View>

          <View
            className="flex-1 p-3.5 rounded-2xl border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Text className="text-[10px] font-black uppercase" style={{ color: colors.textSecondary }}>Total Bills</Text>
            <Text className="text-base font-black font-mono mt-0.5" style={{ color: colors.success }}>
              {metrics.totalOrders}
            </Text>
          </View>

          <View
            className="flex-1 p-3.5 rounded-2xl border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Text className="text-[10px] font-black uppercase" style={{ color: colors.textSecondary }}>Total Khata Due</Text>
            <Text className="text-base font-black font-mono mt-0.5" style={{ color: colors.danger }}>
              ₹{metrics.totalDue.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* 3. SUBSCRIPTION & LICENSE CARD */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: colors.textSecondary }}>
          POS License & Validity
        </Text>
        <TouchableOpacity
          onPress={() => setPlansModalVisible(true)}
          activeOpacity={0.8}
          className="rounded-3xl p-4 border mb-4 flex-row items-center shadow-lg active:scale-98"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center mr-3.5 border"
            style={{
              backgroundColor: colors.badgeBg,
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
                style={{ backgroundColor: isTrial ? colors.warningSoft : colors.successSoft }}
              >
                <Text
                  className="text-[9px] font-black uppercase"
                  style={{ color: isTrial ? colors.warning : colors.success }}
                >
                  {isTrial ? 'Trial Active' : 'Active'}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
              {daysLeft > 0 ? `${daysLeft} Days remaining • Unlimited voice POS` : 'Active POS billing access'}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-black" style={{ color: colors.primaryText }}>Upgrade</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* 4. BILLING & HARDWARE PREFERENCES */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: colors.textSecondary }}>
          Hardware & Printing Config
        </Text>
        <View
          className="rounded-3xl border p-4 mb-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <TouchableOpacity
            onPress={() =>
              isPrinterSdkAvailable
                ? setPrinterModalVisible(true)
                : Alert.alert('Not Available', 'Direct Bluetooth printing works in the Android app only.')
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between pb-3 border-b mb-3"
            style={{ borderColor: colors.border }}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="print-outline" size={18} color={colors.primary} className="mr-2" />
              <View className="flex-1">
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  Thermal Receipt Printer
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {savedPrinter ? savedPrinter.name : 'Tap to select Bluetooth printer'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-bold font-mono" style={{ color: colors.primaryText }}>
                {savedPrinter ? 'Change' : 'Setup'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="mic-outline" size={18} color={colors.primary} className="mr-2" />
              <View>
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  AI Voice Engine
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                  Multi-item speech detection
                </Text>
              </View>
            </View>
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successSoft }}>
              <Text className="text-[10px] font-black" style={{ color: colors.success }}>Gemini 2.0</Text>
            </View>
          </View>
        </View>

        {/* 5. SUPPORT & CUSTOMER CARE */}
        <Text className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: colors.textSecondary }}>
          Official Support & Helpdesk
        </Text>
        <View
          className="rounded-3xl border p-2 mb-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {/* Raise Support Ticket (In-App) */}
          <TouchableOpacity
            onPress={() => setTicketsModalVisible(true)}
            activeOpacity={0.8}
            className="flex-row items-center p-3 rounded-2xl border mb-1.5"
            style={{
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
            }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: colors.primarySoftBorder }}
            >
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-black" style={{ color: colors.text }}>
                  Raise Support Ticket
                </Text>
                <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-[8px] font-black uppercase" style={{ color: colors.onPrimary }}>Direct</Text>
                </View>
              </View>
              <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                Report issues, track admin replies & chat directly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* WhatsApp Support (only when a number is set in the admin) */}
          {whatsappPhone ? (
          <TouchableOpacity
            onPress={() => handleOpenWhatsApp()}
            className="flex-row items-center p-3 rounded-2xl"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: colors.successSoft }}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                WhatsApp Support
              </Text>
              <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                +91 {whatsappPhone.replace(/\D/g, '').slice(-10)} • Instant WhatsApp Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          ) : null}

          {/* Helpline Phone Call (only when a number is set in the admin) */}
          {supportPhone ? (
          <TouchableOpacity
            onPress={handleCallSupport}
            className="flex-row items-center p-3 rounded-2xl"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: colors.badgeBg }}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                Helpline Phone Call
              </Text>
              <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                +91 {supportPhone.replace(/\D/g, '').slice(-10)} • Voice Call Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          ) : null}
        </View>

        {/* 6. LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.7}
          style={{
            width: '100%',
            paddingVertical: 15,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: colors.danger,
            backgroundColor: colors.dangerSoft,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            overflow: 'hidden',
            marginBottom: 24,
            elevation: 0,
            shadowOpacity: 0,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '900',
              color: colors.danger,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            Logout Counter Session
          </Text>
        </TouchableOpacity>

        {/* App Version Stamp */}
        <Text className="text-[11px] text-center font-bold mb-4" style={{ color: colors.textSecondary }}>
          RetelFlow Cafe & Sweets POS • Version 1.0.0
        </Text>
      </ScrollView>

      {/* EDIT STORE DETAILS MODAL (Mobile Number Locked & Read Only) */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setEditModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 w-full self-center"
            style={{ maxHeight: '85%', maxWidth: 640, backgroundColor: colors.panel, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  Edit Store & Counter Profile
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                  Update cafe branding and tax info for invoices
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Cafe Name */}
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

              {/* Owner Name */}
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  Owner / Incharge Name
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Deepak"
                  placeholderTextColor={colors.textMuted}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              {/* LOCKED MOBILE NUMBER (Read-Only) */}
              <View className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                    Registered Mobile Number
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="lock-closed" size={11} color={colors.warning} />
                    <Text className="text-[10px] font-bold" style={{ color: colors.primaryText }}>Locked / Read Only</Text>
                  </View>
                </View>
                <TextInput
                  value={currentUser.phone ? `+91 ${currentUser.phone}` : 'Not available'}
                  editable={false}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold opacity-60 font-mono"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                />
                <Text className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                  Primary mobile number is tied to your store account and cannot be modified from counter.
                </Text>
              </View>

              {/* Store Address */}
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                  Store Address (Printed on Bills)
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

              {/* GSTIN */}
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
                className="py-3.5 rounded-2xl items-center justify-center shadow-lg active:scale-98"
                style={{ backgroundColor: colors.primary }}
              >
                {savingSettings ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.onPrimary }}>
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
        <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setPlansModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 w-full self-center"
            style={{ maxHeight: '88%', maxWidth: 640, backgroundColor: colors.panel, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  RetelFlow Cafe Plans
                </Text>
                <Text className="text-[11px] font-bold" style={{ color: colors.primaryText }}>
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
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-black" style={{ color: colors.text }}>
                    Pro Monthly
                  </Text>
                  <Text className="text-lg font-black font-mono" style={{ color: colors.primaryText }}>
                    ₹299<Text className="text-xs font-normal" style={{ color: colors.textMuted }}> / month</Text>
                  </Text>
                </View>
                <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
                  Full billing, KOT printer, inventory & khata management.
                </Text>
                {['Unlimited Gemini AI Voice Orders', 'KOT & Customer Bill Printing', '26+ Indian Cafe & Sweets Menu', 'Automatic Khata & Due Ledger'].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2 mb-1.5">
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text className="text-xs font-semibold" style={{ color: colors.text }}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Yearly Plan (Best Value) */}
              <View
                className="p-4 rounded-3xl border mb-4 relative overflow-hidden"
                style={{
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                }}
              >
                <View className="absolute top-2 right-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-[9px] font-black uppercase tracking-wider" style={{ color: colors.onPrimary }}>
                    Save ₹589
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-black" style={{ color: colors.text }}>
                    Pro Annual (1 Year)
                  </Text>
                  <Text className="text-lg font-black font-mono" style={{ color: colors.primaryText }}>
                    ₹2,999<Text className="text-xs font-normal" style={{ color: colors.textMuted }}> / year</Text>
                  </Text>
                </View>
                <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
                  Everything in Pro with 12 months uninterrupted access & VIP onboarding.
                </Text>
                {['All Pro Features Included', '2 Months Free Included', 'Priority 24/7 WhatsApp Support', 'Free Catalog Setup & Customization'].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2 mb-1.5">
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text className="text-xs font-semibold" style={{ color: colors.text }}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenWhatsApp('Hi RetelFlow Team, I want to upgrade/renew my RetelFlow Cafe subscription plan.')}
                activeOpacity={0.8}
                className="py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-xl active:scale-98"
                style={{ backgroundColor: '#25D366' }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text className="text-xs font-black text-white uppercase tracking-wider">
                  Contact on WhatsApp to Upgrade
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SUPPORT TICKETS & HELPDESK MODAL */}
      <SupportTicketsModal
        visible={ticketsModalVisible}
        onClose={() => setTicketsModalVisible(false)}
      />

      {/* BLUETOOTH THERMAL PRINTER SETUP (vendor SDK) */}
      <PrinterSetupModal
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
        onPrinterChanged={setSavedPrinter}
      />
    </SafeAreaView>
  );
};
