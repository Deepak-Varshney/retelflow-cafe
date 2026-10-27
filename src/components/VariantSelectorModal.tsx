import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem, ItemVariant } from '../types';
import { useTheme } from '../services/ThemeContext';

interface VariantSelectorModalProps {
  visible: boolean;
  item: MenuItem | null;
  onSelectVariant: (item: MenuItem, variant: ItemVariant) => void;
  onClose: () => void;
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  visible,
  item,
  onSelectVariant,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  if (!item) return null;

  const variants = item.variants && item.variants.length > 0
    ? item.variants
    : [{ name: 'Standard', price: item.price, unit: item.unit }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="rounded-t-3xl border-t p-5 max-h-[80%]"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center flex-1 pr-3">
              <Image
                source={{
                  uri:
                    item.imageUrl ||
                    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80',
                }}
                className="w-12 h-12 rounded-xl mr-3 bg-slate-800"
              />
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: colors.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Select size / portion
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-slate-800/40">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Variants List */}
          <ScrollView className="my-3" showsVerticalScrollIndicator={false}>
            {variants.map((v, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectVariant(item, v);
                  onClose();
                }}
                className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl border active:scale-98"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: v.isDefault ? colors.primary : colors.border,
                }}
              >
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold" style={{ color: colors.text }}>
                      {v.name}
                    </Text>
                    {v.isDefault && (
                      <View className="px-2 py-0.5 rounded-md bg-amber-500/20">
                        <Text className="text-[10px] font-bold text-amber-500">Popular</Text>
                      </View>
                    )}
                  </View>
                  {v.unit && (
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                      Unit: {v.unit}
                    </Text>
                  )}
                </View>

                <View className="flex-row items-center gap-3">
                  <Text className="text-base font-extrabold text-amber-500 font-mono">
                    ₹{v.price}
                  </Text>
                  <View
                    className="w-8 h-8 rounded-xl items-center justify-center border"
                    style={{
                      backgroundColor: colors.badgeBg,
                      borderColor: colors.primary,
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-center text-[11px] pb-1" style={{ color: colors.textMuted }}>
            Tap any size to add directly to order
          </Text>
        </View>
      </View>
    </Modal>
  );
};
