import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import {
  PrinterDevice,
  classifyPrinterError,
  connectPrinter,
  forgetPrinter,
  getPairedDevices,
  getSavedPrinter,
  isPrinterConnected,
  printCommands,
} from '../../modules/thermal-printer';
import { subscribeToPrinterSetup, PrinterSetupRequest } from '../services/printerSetupService';

export interface PrinterSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onPrinterChanged?: (printer: PrinterDevice | null) => void;
  onConnected?: (printer: PrinterDevice) => void;
  reason?: string;
}

export const PrinterSetupModal: React.FC<PrinterSetupModalProps> = ({
  visible,
  onClose,
  onPrinterChanged,
  onConnected,
  reason,
}) => {
  const { colors } = useTheme();
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<PrinterDevice | null>(null);
  const [connected, setConnected] = useState(false);
  const [busyAddress, setBusyAddress] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    setError('');
    try {
      setDevices(await getPairedDevices());
    } catch (err: any) {
      const classified = classifyPrinterError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSaved(getSavedPrinter());
    setConnected(isPrinterConnected());
    loadDevices();
  }, [visible]);

  const handleSelect = async (device: PrinterDevice) => {
    setBusyAddress(device.address);
    setError('');
    try {
      await connectPrinter(device.address);
      setSaved(device);
      setConnected(true);
      onPrinterChanged?.(device);
      // The parent hides the modal in onConnected; calling onClose here too
      // would cancel the pending print it is about to resume
      if (onConnected) {
        setTimeout(() => onConnected(device), 300);
      }
    } catch (err: any) {
      setConnected(false);
      const classified = classifyPrinterError(err);
      setError(classified.message);
    } finally {
      setBusyAddress(null);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await printCommands([
        { type: 'text', text: 'RETELFLOW CAFE', align: 'center', bold: true, doubleHeight: true },
        { type: 'text', text: 'Printer connected successfully', align: 'center' },
        { type: 'text', text: new Date().toLocaleString('en-IN'), align: 'center' },
        { type: 'feed', lines: 4 },
      ]);
      setConnected(true);
    } catch (err: any) {
      const classified = classifyPrinterError(err);
      Alert.alert('Test Print Failed', classified.message);
    } finally {
      setTesting(false);
    }
  };

  const handleForget = () => {
    forgetPrinter();
    setSaved(null);
    setConnected(false);
    onPrinterChanged?.(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/75 px-5">
        <View
          className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
          style={{ backgroundColor: colors.card, borderColor: colors.border, maxHeight: '85%' }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="print" size={20} color={colors.primary} />
              <Text className="text-base font-black ml-2" style={{ color: colors.text }}>
                Thermal Printer
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Context banner when opened to fulfill a print request */}
          {onConnected || reason ? (
            <View
              className="flex-row items-center gap-2 p-2.5 mb-3 rounded-2xl border"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <Ionicons name="print" size={16} color="#f59e0b" />
              <Text className="text-xs font-bold text-cyan-400 flex-1">
                {reason || 'Connect your printer to resume printing the bill automatically.'}
              </Text>
            </View>
          ) : null}

          {/* Current printer */}
          <View
            className="p-3 mb-3 rounded-2xl border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
              Selected Printer
            </Text>
            <Text className="text-sm font-bold mt-0.5" style={{ color: colors.text }}>
              {saved ? saved.name : 'None selected'}
            </Text>
            {saved ? (
              <Text className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                {saved.address} •{' '}
                <Text style={{ color: connected ? '#10b981' : colors.textMuted }}>
                  {connected ? 'Connected' : 'Not connected'}
                </Text>
              </Text>
            ) : null}
            {saved ? (
              <View className="flex-row gap-2 mt-2.5">
                <TouchableOpacity
                  onPress={handleTestPrint}
                  disabled={testing}
                  className="flex-1 py-2 rounded-xl items-center justify-center bg-cyan-500 flex-row gap-1.5"
                >
                  {testing ? <ActivityIndicator size="small" color="#000" /> : null}
                  <Text className="text-xs font-black text-black">Test Print</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleForget}
                  className="px-3 py-2 rounded-xl border items-center justify-center"
                  style={{ borderColor: colors.border }}
                >
                  <Text className="text-xs font-bold text-rose-500">Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
              Paired Bluetooth Devices
            </Text>
            <TouchableOpacity onPress={loadDevices} disabled={loading} hitSlop={10}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View className="p-2 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Text className="text-[11px] font-semibold text-rose-500">{error}</Text>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 280 }}>
            {loading ? (
              <ActivityIndicator className="my-4" color={colors.primary} />
            ) : devices.length === 0 ? (
              <Text className="text-[11px] my-3 text-center" style={{ color: colors.textMuted }}>
                No paired devices. Pair your printer in Android Bluetooth settings first, then tap refresh.
              </Text>
            ) : (
              devices.map((d) => {
                const isSelected = saved?.address === d.address;
                const isItemConnected = isSelected && connected;
                return (
                  <TouchableOpacity
                    key={d.address}
                    onPress={() => handleSelect(d)}
                    disabled={busyAddress != null}
                    className="flex-row items-center justify-between px-3 py-2.5 mb-1.5 rounded-xl border"
                    style={{
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: colors.inputBg,
                    }}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-xs font-bold" style={{ color: colors.text }}>
                        {d.name}
                      </Text>
                      <Text className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                        {d.address}
                      </Text>
                    </View>
                    {busyAddress === d.address ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : isItemConnected ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                        <Text className="text-[10px] font-bold text-emerald-500">Connected</Text>
                      </View>
                    ) : isSelected ? (
                      <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>
                        Reconnect
                      </Text>
                    ) : (
                      <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>
                        Connect
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const GlobalPrinterSetupModal: React.FC = () => {
  const [request, setRequest] = useState<PrinterSetupRequest | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPrinterSetup((req) => {
      setRequest(req);
    });
    return () => unsubscribe();
  }, []);

  if (!request) return null;

  return (
    <PrinterSetupModal
      visible={Boolean(request)}
      reason={request.reason}
      onClose={() => {
        setRequest(null);
        request.onCancel?.();
      }}
      onConnected={(device) => {
        const cb = request.onConnected;
        setRequest(null);
        cb?.(device);
      }}
    />
  );
};
