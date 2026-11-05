import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../services/ThemeContext';
import { PrintSettings, ShopFeatures, StoreInfo } from '../types';
import { BillReceiptView } from './BillReceiptView';
import { toReceiptData, buildBillText } from '../utils/receipt';
import { printBill, openWhatsAppBill, saveBillImageToGallery } from '../services/billActions';
import { PrinterSetupModal } from './PrinterSetupModal';

interface BillDetailModalProps {
  invoice: any | null;
  storeInfo: StoreInfo;
  printSettings: PrintSettings;
  features: ShopFeatures;
  onClose: () => void;
}

/** Full view of an old bill. Print / resend only when the shop has reprint enabled. */
export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  invoice,
  storeInfo,
  printSettings,
  features,
  onClose,
}) => {
  const { colors } = useTheme();
  const receiptRef = useRef<View>(null);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  // Pending print waiting on the printer picker (a ref, so connect/close
  // always see the latest one without waiting for a re-render)
  const printerSetupRef = useRef<{ resume: () => void; cancel: () => void } | null>(null);

  const receipt = useMemo(() => (invoice ? toReceiptData(invoice) : null), [invoice]);

  if (!receipt) return null;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printBill(receipt, storeInfo, printSettings, {
        onRequirePrinterSetup: (resume, cancel) => {
          printerSetupRef.current = { resume, cancel };
          setPrinterModalVisible(true);
        },
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleWhatsApp = async () => {
    let uri: string | null = null;
    try {
      if (receiptRef.current) uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
    } catch {}
    openWhatsAppBill(receipt, storeInfo, printSettings.footerText);
    if (uri) {
      saveBillImageToGallery(uri).then((saved) => {
        if (saved) {
          setNotice('Bill image saved to gallery');
          setTimeout(() => setNotice(null), 3500);
        }
      });
    }
  };

  const handleShare = () => {
    Share.share({ message: buildBillText(receipt, storeInfo, printSettings.footerText) }).catch(() => {});
  };

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
          style={{ backgroundColor: colors.card, borderColor: colors.border, maxHeight: '90%', maxWidth: 640 }}
        >
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-1 pr-2">
              <Text className="text-base font-black" style={{ color: colors.text }}>
                Bill #{receipt.billNo || receipt.token}
              </Text>
              <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                {receipt.customerName} • ₹{receipt.total.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View className="rounded-2xl border" style={{ borderColor: colors.border }}>
              <BillReceiptView ref={receiptRef} receipt={receipt} store={storeInfo} footerText={printSettings.footerText} />
            </View>
          </ScrollView>

          {notice ? (
            <Text className="text-xs font-bold text-emerald-500 text-center mt-2">{notice}</Text>
          ) : null}

          {features.reprintBills ? (
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={handlePrint}
                disabled={printing}
                className="flex-1 py-3 rounded-2xl flex-row items-center justify-center gap-1.5"
                style={{ backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#38bdf8' }}
              >
                {printing ? <ActivityIndicator size="small" color="#38bdf8" /> : <Ionicons name="print" size={17} color="#38bdf8" />}
                <Text className="text-xs font-black text-sky-400 uppercase">Reprint</Text>
              </TouchableOpacity>
              {receipt.customerPhone ? (
                <TouchableOpacity
                  onPress={handleWhatsApp}
                  className="flex-1 py-3 rounded-2xl flex-row items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#fff" />
                  <Text className="text-xs font-black text-white uppercase">WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={handleShare}
                className="px-4 py-3 rounded-2xl border items-center justify-center"
                style={{ borderColor: colors.border }}
              >
                <Ionicons name="share-outline" size={17} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-3 p-3 rounded-2xl border flex-row items-center gap-2" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text className="text-[11px] flex-1" style={{ color: colors.textSecondary }}>
                Reprinting and resending old bills is not active for your shop. Contact support to enable it.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Printer Setup Connection Modal with auto-resume */}
      <PrinterSetupModal
        visible={printerModalVisible}
        onClose={() => {
          setPrinterModalVisible(false);
          const pending = printerSetupRef.current;
          printerSetupRef.current = null;
          pending?.cancel();
        }}
        onConnected={() => {
          setPrinterModalVisible(false);
          const pending = printerSetupRef.current;
          printerSetupRef.current = null;
          pending?.resume();
        }}
        reason="Connect your printer to reprint this receipt automatically."
      />
    </Modal>
  );
};
