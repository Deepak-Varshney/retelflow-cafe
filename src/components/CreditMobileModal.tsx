import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';

interface CreditMobileModalProps {
  visible: boolean;
  customerName?: string;
  dueAmount: number;
  onSaveMobile: (phone: string) => void;
  onCancel: () => void;
}

export const CreditMobileModal: React.FC<CreditMobileModalProps> = ({
  visible,
  customerName,
  dueAmount,
  onSaveMobile,
  onCancel,
}) => {
  const { colors } = useTheme();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const clean = mobile.replace(/\D/g, '');
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    onSaveMobile(clean);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center items-center bg-black/75 px-5">
        <View
          className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
          style={{
            backgroundColor: colors.card,
            borderColor: '#f59e0b',
          }}
        >
          {/* Icon & Title */}
          <View className="items-center mb-3">
            <View className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 items-center justify-center mb-2">
              <Ionicons name="alert-circle" size={32} color="#f59e0b" />
            </View>
            <Text className="text-base font-black text-center" style={{ color: colors.text }}>
              Mobile Number Required
            </Text>
            <Text className="text-xs text-center mt-1 px-2" style={{ color: colors.textSecondary }}>
              Credit / Udhar cannot be given without a registered mobile number.
            </Text>
          </View>

          {/* Details Pill */}
          <View
            className="p-3 mb-4 rounded-2xl border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            {customerName ? (
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs font-medium" style={{ color: colors.textMuted }}>
                  Customer Name:
                </Text>
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  {customerName}
                </Text>
              </View>
            ) : null}
            <View className="flex-row justify-between">
              <Text className="text-xs font-medium" style={{ color: colors.textMuted }}>
                Credit Amount (Udhar):
              </Text>
              <Text className="text-sm font-extrabold text-rose-500 font-mono">
                ₹{dueAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Mobile Input */}
          <View className="mb-2">
            <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
              Enter 10-Digit Mobile Number
            </Text>
            <View
              className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
              style={{
                backgroundColor: colors.inputBg,
                borderColor: error ? '#f43f5e' : colors.border,
              }}
            >
              <Text className="text-sm font-bold text-amber-500 mr-2">+91</Text>
              <TextInput
                placeholder="98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(t) => {
                  setMobile(t);
                  setError('');
                }}
                className="flex-1 text-sm font-bold font-mono"
                style={{ color: colors.text }}
                autoFocus
              />
            </View>
            {error ? (
              <Text className="text-[11px] text-rose-500 mt-1">{error}</Text>
            ) : null}
          </View>

          {/* Buttons */}
          <View className="flex-row gap-2.5 mt-4">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-3 rounded-xl border items-center justify-center"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-xs font-bold" style={{ color: colors.textMuted }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-1 py-3 rounded-xl items-center justify-center bg-amber-500 shadow-md"
            >
              <Text className="text-xs font-black text-black">
                Confirm & Bill
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
