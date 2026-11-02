import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem, ItemVariant } from '../types';
import { useTheme } from '../services/ThemeContext';
import { getFoodImageUrl, DEFAULT_FOOD_PLACEHOLDER } from '../utils/imageHelper';

interface FoodItemDetailModalProps {
  visible: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant?: ItemVariant) => void;
}

export const FoodItemDetailModal: React.FC<FoodItemDetailModalProps> = ({
  visible,
  item,
  onClose,
  onAddToCart,
}) => {
  const { colors, isDark } = useTheme();

  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(undefined);

  // Sync default variant when item changes
  React.useEffect(() => {
    if (item?.variants && item.variants.length > 0) {
      const def = item.variants.find((v) => v.isDefault) || item.variants[0];
      setSelectedVariant(def);
    } else {
      setSelectedVariant(undefined);
    }
  }, [item]);

  if (!item) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : item.price;
  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;

  const handleAdd = () => {
    onAddToCart(item, selectedVariant);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/80 p-4">
        <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={onClose} />

        <View
          className="w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {/* Hero Image */}
          <View className="relative w-full h-52 bg-slate-900">
            <Image
              source={{
                uri: getFoodImageUrl(item.imageUrl, item.category),
              }}
              className="w-full h-full"
              resizeMode="cover"
            />

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 items-center justify-center border border-white/20"
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Category Pill */}
            <View className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/70 border border-white/20">
              <Text className="text-[11px] font-bold text-white tracking-wide">
                {item.category}
              </Text>
            </View>

            {/* Veg / Non-Veg Indicator */}
            <View
              className="absolute top-3 left-3 w-5 h-5 bg-white rounded-md items-center justify-center border"
              style={{ borderColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
            >
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
              />
            </View>
          </View>

          {/* Details Body */}
          <ScrollView contentContainerStyle={{ padding: 18 }} style={{ maxHeight: 260 }}>
            {/* Title & Price */}
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-base font-black flex-1 mr-2" style={{ color: colors.text }}>
                {item.name}
              </Text>
              <Text className="text-xl font-black text-cyan-400 font-mono">
                ₹{currentPrice}
              </Text>
            </View>

            {/* Description */}
            <Text className="text-xs leading-relaxed mb-4" style={{ color: colors.textSecondary }}>
              {item.description || 'Specially crafted with genuine fresh ingredients and authentic recipe.'}
            </Text>

            {/* Variants / Sizes Selection */}
            {hasVariants && (
              <View className="mb-3">
                <Text className="text-xs font-black uppercase tracking-wider mb-2 text-slate-400">
                  Select Size / Portion:
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {item.variants?.map((v, i) => {
                    const isSelected = selectedVariant?.name === v.name;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setSelectedVariant(v)}
                        activeOpacity={0.8}
                        className="px-3.5 py-2 rounded-2xl border flex-row items-center gap-1.5"
                        style={{
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : '#f1f5f9',
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text
                          className="text-xs font-black"
                          style={{ color: isSelected ? '#000000' : colors.text }}
                        >
                          {v.name}
                        </Text>
                        <Text
                          className="text-xs font-bold font-mono ml-1"
                          style={{ color: isSelected ? '#000000' : colors.primary }}
                        >
                          ₹{v.price}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Add Action */}
          <View
            className="p-4 border-t flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View>
              <Text className="text-[10px] text-slate-400 font-bold uppercase">
                Item Total
              </Text>
              <Text className="text-lg font-black text-cyan-400 font-mono">
                ₹{currentPrice}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.8}
              className="px-6 py-3 rounded-2xl flex-row items-center gap-2 bg-cyan-500 shadow-lg active:scale-95"
            >
              <Ionicons name="cart" size={16} color="#000" />
              <Text className="text-xs font-black text-black uppercase tracking-wider">
                Add to Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};