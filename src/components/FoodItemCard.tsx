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
  onLongPress?: (item: MenuItem) => void;
  isGrid?: boolean;
}

export const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  currentQty,
  onAddPress,
  onRemovePress,
  onLongPress,
  isGrid = false,
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

  // -------------------------------------------------------------
  // GRID VIEW CARD (2 Columns Swiggy / Zomato Kiosk Style)
  // -------------------------------------------------------------
  if (isGrid) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => onLongPress?.(item)}
        delayLongPress={300}
        className="flex-1 m-1 p-2.5 rounded-2xl border justify-between"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Food Image with Top Badges */}
        <View className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-900 mb-2">
          <Image
            source={{
              uri:
                item.imageUrl ||
                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
            }}
            className="w-full h-full"
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

          {/* Hint to Long Press for info */}
          <View className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60">
            <Text className="text-[8px] font-bold text-white">Hold for info</Text>
          </View>
        </View>

        {/* Item Info */}
        <View className="flex-1 justify-between">
          <View>
            <Text
              className="text-xs font-black leading-tight mb-1"
              style={{ color: colors.text }}
              numberOfLines={2}
            >
              {item.name}
            </Text>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-black text-amber-500 font-mono">
                {priceLabel}
              </Text>
              {hasVariants ? (
                <Text className="text-[9px] font-bold text-amber-500/90">
                  Options ▾
                </Text>
              ) : null}
            </View>
          </View>

          {/* Quantity Controls */}
          {currentQty === 0 ? (
            <TouchableOpacity
              onPress={() => onAddPress(item, hasVariants ? undefined : defaultVariant)}
              activeOpacity={0.8}
              className="w-full py-2 rounded-xl border flex-row items-center justify-center gap-1 active:scale-95"
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
              className="flex-row items-center justify-between rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              }}
            >
              <TouchableOpacity
                onPress={() => onRemovePress(item)}
                className="p-1.5 active:bg-red-500/10 flex-1 items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={14} color="#ef4444" />
              </TouchableOpacity>
              <Text
                className="font-black text-xs font-mono px-1"
                style={{ color: colors.text }}
              >
                {currentQty}
              </Text>
              <TouchableOpacity
                onPress={() => onAddPress(item, defaultVariant)}
                className="p-1.5 active:bg-amber-500/10 flex-1 items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW CARD (Horizontal Row)
  // -------------------------------------------------------------
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={300}
      className="flex-row items-center p-3 mb-2.5 rounded-2xl border"
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
          className="w-20 h-20 rounded-2xl bg-slate-800"
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
      <View className="flex-1 ml-3 justify-between py-0.5">
        <View>
          <Text
            className="text-xs font-black leading-snug"
            style={{ color: colors.text }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.description ? (
            <Text
              className="text-[10px] mt-0.5"
              style={{ color: colors.textSecondary }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}

          <View className="flex-row items-center mt-1 gap-2">
            <Text className="text-xs font-extrabold text-amber-500 font-mono">
              {priceLabel}
            </Text>
            {item.unit && (
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                / {item.unit}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Actions: Customise hint & ADD button */}
        <View className="flex-row items-center justify-between mt-1.5 pt-0.5">
          {hasVariants ? (
            <Text className="text-[9px] font-bold text-amber-500/90">
              Customisable ▾
            </Text>
          ) : (
            <Text className="text-[9px] text-slate-400">Hold for details</Text>
          )}

          {currentQty === 0 ? (
            <TouchableOpacity
              onPress={() => onAddPress(item, hasVariants ? undefined : defaultVariant)}
              activeOpacity={0.8}
              className="px-3.5 py-1 rounded-xl border flex-row items-center gap-1 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                borderColor: colors.primary,
              }}
            >
              <Text
                className="text-[11px] font-black tracking-wider"
                style={{ color: colors.primary }}
              >
                ADD
              </Text>
              <Ionicons name="add" size={13} color={colors.primary} />
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
                className="px-2 py-1 active:bg-red-500/10"
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={13} color="#ef4444" />
              </TouchableOpacity>
              <Text
                className="px-1.5 font-black text-xs font-mono"
                style={{ color: colors.text }}
              >
                {currentQty}
              </Text>
              <TouchableOpacity
                onPress={() => onAddPress(item, defaultVariant)}
                className="px-2 py-1 active:bg-amber-500/10"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};