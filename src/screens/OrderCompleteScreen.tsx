import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../services/ThemeContext';
import { OrderInvoice, PrintSettings, StoreInfo } from '../types';
import { BillReceiptView } from '../components/BillReceiptView';
import { toReceiptData, buildBillText } from '../utils/receipt';
import { DEFAULT_PRINT_SETTINGS } from '../utils/shopSettings';
import { printBill, openWhatsAppBill, saveBillImageToGallery } from '../services/billActions';
import { PrinterSetupModal } from '../components/PrinterSetupModal';

interface OrderCompleteScreenProps {
  invoice: OrderInvoice;
  onNewOrder: () => void;
  storeInfo?: StoreInfo;
  printSettings?: PrintSettings;
}

export const OrderCompleteScreen: React.FC<OrderCompleteScreenProps> = ({
  invoice,
  onNewOrder,
  storeInfo = {},
  printSettings = DEFAULT_PRINT_SETTINGS,
}) => {
  const { colors } = useTheme();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [onConnectedCallback, setOnConnectedCallback] = useState<(() => void) | null>(null);
  const receiptRef = useRef<View>(null);

  const receipt = useMemo(() => toReceiptData(invoice), [invoice]);
  const hasPhone = Boolean(receipt.customerPhone);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const handlePrintReceipt = async () => {
    setIsPrinting(true);
    try {
      await printBill(receipt, storeInfo, printSettings, {
        onRequirePrinterSetup: (resume) => {
          setOnConnectedCallback(() => resume);
          setPrinterModalVisible(true);
        },
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Capture the bill image first (needs the view on screen), open WhatsApp
  // right away, and save the image to the gallery in the background so it can
  // be attached from inside the chat.
  const handleSaveGalleryOnly = async () => {
    setIsSavingImage(true);
    try {
      if (receiptRef.current) {
        const uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
        if (uri) {
          const saved = await saveBillImageToGallery(uri);
          if (saved) {
            showNotice('Bill image saved to gallery successfully!');
            return uri;
          }
        }
      }
      showNotice('Could not save to gallery. Check permissions.');
    } catch (e) {
      console.warn('Gallery save error:', e);
      showNotice('Could not save to gallery.');
    } finally {
      setIsSavingImage(false);
    }
    return null;
  };

  const handleSendWhatsApp = async () => {
    setIsSavingImage(true);
    try {
      let uri: string | null = null;
      if (receiptRef.current) {
        try {
          uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
        } catch (err) {
          console.warn('Bill capture failed:', err);
        }
      }
      // Save image to gallery automatically BEFORE launching WhatsApp
      if (uri) {
        const saved = await saveBillImageToGallery(uri);
        if (saved) {
          showNotice('Bill image saved to gallery! Attach it in WhatsApp.');
        }
      }
      await openWhatsAppBill(receipt, storeInfo, printSettings.footerText);
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleGenericShare = async () => {
    try {
      await Share.share({ message: buildBillText(receipt, storeInfo, printSettings.footerText) });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        <View className="w-full max-w-md items-center">
          {/* Success Icon */}
          <View className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 items-center justify-center mt-2 mb-2">
            <Ionicons name="checkmark" size={34} color="#10b981" />
          </View>

          <Text className="text-xl font-black text-center" style={{ color: colors.text }}>
            Order Placed Successfully!
          </Text>
          <Text className="text-xs text-center mt-0.5 mb-4" style={{ color: colors.textSecondary }}>
            Kitchen Order Token (KOT) #{receipt.token} generated
          </Text>

          {/* Paper bill (also captured for WhatsApp / gallery) */}
          <View className="w-full mb-5 rounded-2xl border" style={{ borderColor: colors.border }}>
            <BillReceiptView ref={receiptRef} receipt={receipt} store={storeInfo} footerText={printSettings.footerText} />
          </View>

          {notice ? (
            <View className="w-full mb-3 px-3 py-2 rounded-xl bg-emerald-500/15 flex-row items-center gap-2">
              <Ionicons name="images-outline" size={16} color="#10b981" />
              <Text className="text-xs font-bold text-emerald-500">{notice}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={onNewOrder}
              activeOpacity={0.8}
              className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-xl"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="home" size={20} color="#020617" />
              <Text className="text-sm font-black text-slate-950 tracking-wider uppercase">Back to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrintReceipt}
              disabled={isPrinting}
              activeOpacity={0.8}
              className="w-full py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-md"
              style={{ backgroundColor: 'rgba(7, 15, 36, 0.9)', borderWidth: 1.5, borderColor: '#00d2ff' }}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <Ionicons name="print" size={19} color="#38bdf8" />
              )}
              <Text className="text-xs font-black text-sky-400 uppercase tracking-wider">
                {isPrinting ? 'Printing Receipt...' : 'Print Receipt'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendWhatsApp}
              disabled={isSavingImage}
              activeOpacity={0.8}
              className="w-full py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-md px-3"
              style={{ backgroundColor: '#25D366' }}
            >
              {isSavingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              )}
              <Text className="text-xs font-black text-white uppercase tracking-wider" numberOfLines={1}>
                {receipt.customerPhone
                  ? `Send Bill on WhatsApp (+91 ${receipt.customerPhone})`
                  : 'Share Bill on WhatsApp'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveGalleryOnly}
              disabled={isSavingImage}
              activeOpacity={0.8}
              className="w-full py-3 rounded-2xl items-center justify-center flex-row gap-2 border"
              style={{ borderColor: colors.primary, backgroundColor: colors.surface }}
            >
              {isSavingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="images" size={17} color={colors.primary} />
              )}
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                Save Bill Image to Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGenericShare}
              className="w-full py-2.5 rounded-2xl items-center justify-center flex-row gap-1.5"
            >
              <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
              <Text className="text-[11px] font-bold" style={{ color: colors.textSecondary }}>
                Share via Other Apps / SMS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Printer Setup Connection Modal with auto-resume */}
      <PrinterSetupModal
        visible={printerModalVisible}
        onClose={() => {
          setPrinterModalVisible(false);
          setOnConnectedCallback(null);
        }}
        onConnected={() => {
          setPrinterModalVisible(false);
          const cb = onConnectedCallback;
          setOnConnectedCallback(null);
          cb?.();
        }}
        reason="Connect your printer to print this receipt automatically."
      />
    </SafeAreaView>
  );
};
