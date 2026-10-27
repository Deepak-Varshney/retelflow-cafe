import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem, ItemVariant } from '../types';
import { useTheme } from '../services/ThemeContext';

interface FoodItemCardProps {
  item: MenuItem;
  currentQty: number;
  onAddPress: (item: MenuItem, variant?: ItemVariant) => void;
  onRemovePress: (item: MenuItem) => void;
}

export const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  currentQty,
  onAddPress,
  onRemovePress,
}) => {
  const { colors, isDark } = useTheme();

  const hasVariants = Array.isArray(item.variants) && item.variants.length > 1;

  // Price label calculation
  let priceLabel = `₹${item.price}`;
  if (hasVariants && item.variants) {
    const prices = item.variants.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    priceLabel = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
  }

  const defaultVariant = item.variants?.find((v) => v.isDefault) || item.variants?.[0];

  return (
    <View
      className="flex-row items-center p-3.5 mb-3 rounded-2xl border"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Food Image with Veg Badge */}
      <View className="relative">
        <Image
          source={{
            uri:
              item.imageUrl ||
              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
          }}
          className="w-24 h-24 rounded-2xl bg-slate-800"
          resizeMode="cover"
        />

        {/* Veg / Non-Veg Indicator */}
        <View
          className="absolute top-1.5 left-1.5 w-4 h-4 bg-white/95 rounded-sm items-center justify-center border"
          style={{ borderColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
        >
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
          />
        </View>
      </View>

      {/* Info Column */}
      <View className="flex-1 ml-3.5 justify-between py-0.5">
        <View>
          <Text
            className="text-sm font-bold leading-snug"
            style={{ color: colors.text }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.description ? (
            <Text
              className="text-[11px] mt-0.5"
              style={{ color: colors.textSecondary }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          <View className="flex-row items-center mt-1.5 gap-2">
            <Text className="text-sm font-extrabold text-amber-500 font-mono">
              {priceLabel}
            </Text>
            {item.unit && (
              <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                / {item.unit}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Actions: Customise hint & ADD button */}
        <View className="flex-row items-center justify-between mt-2 pt-1">
          {hasVariants ? (
            <Text className="text-[10px] font-semibold text-amber-500/90">
              Customisable ▾
            </Text>
          ) : (
            <View />
          )}

          {currentQty === 0 ? (
            <TouchableOpacity
              onPress={() => onAddPress(item, hasVariants ? undefined : defaultVariant)}
              activeOpacity={0.8}
              className="px-4 py-1.5 rounded-xl border flex-row items-center gap-1 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                borderColor: colors.primary,
              }}
            >
              <Text
                className="text-xs font-black tracking-wider"
                style={{ color: colors.primary }}
              >
                ADD
              </Text>
              <Ionicons name="add" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View
              className="flex-row items-center rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              }}
            >
              <TouchableOpacity
                onPress={() => onRemovePress(item)}
                className="px-2.5 py-1.5 active:bg-red-500/10"
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={14} color="#ef4444" />
              </TouchableOpacity>
              <Text
                className="px-2 font-black text-xs font-mono"
                style={{ color: colors.text }}
              >
                {currentQty}
              </Text>
              <TouchableOpacity
                onPress={() => onAddPress(item, defaultVariant)}
                className="px-2.5 py-1.5 active:bg-amber-500/10"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
