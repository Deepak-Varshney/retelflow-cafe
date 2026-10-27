import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';

export interface DisambiguationItem {
  itemName: string;
  qty?: number;
  availableVariants?: Array<{ name: string; price: number; unit?: string }>;
}

interface DisambiguationModalProps {
  visible: boolean;
  data: DisambiguationItem | null;
  onSelect: (variantName: string, price: number, unit?: string) => void;
  onClose: () => void;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  visible,
  data,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/70 px-5">
        <View
          className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.primary,
          }}
        >
          {/* Header */}
          <View className="items-center pb-3 border-b" style={{ borderColor: colors.border }}>
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mb-2"
              style={{ backgroundColor: colors.badgeBg }}
            >
              <Text className="text-2xl">❓</Text>
            </View>
            <Text className="text-base font-black text-center" style={{ color: colors.text }}>
              Which {data.itemName}?
            </Text>
            <Text className="text-xs text-center mt-1" style={{ color: colors.textSecondary }}>
              Multiple options found. Please pick the correct size/portion:
            </Text>
          </View>

          {/* Options */}
          <ScrollView className="max-h-60 my-3">
            {(data.availableVariants || []).map((v, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  onSelect(v.name, v.price, v.unit);
                  onClose();
                }}
                activeOpacity={0.7}
                className="flex-row items-center justify-between p-3.5 mb-2 rounded-2xl border active:scale-98"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
              >
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: colors.text }}>
                    {v.name}
                  </Text>
                  {data.qty && data.qty > 1 ? (
                    <Text className="text-[11px] text-amber-500 font-medium">
                      Qty: {data.qty} (Total: ₹{data.qty * v.price})
                    </Text>
                  ) : null}
                </View>
                <Text className="text-base font-extrabold text-amber-500 font-mono">
                  ₹{v.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            className="w-full py-2.5 rounded-xl border items-center justify-center mt-1"
            style={{ borderColor: colors.border }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
