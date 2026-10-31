import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../types';
import { useTheme } from '../services/ThemeContext';

interface FloatingCartBarProps {
  items: CartItem[];
  onProceed: () => void;
  onClearCart?: () => void;
  /** Opens the full order list (edit size / qty / remove). */
  onViewCart?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  items,
  onProceed,
  onClearCart,
  onViewCart,
}) => {
  const { colors, isDark } = useTheme();

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const totalPrice = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  if (items.length === 0) return null;

  const glassBg = isDark ? 'rgba(10, 16, 30, 0.94)' : 'rgba(255, 255, 255, 0.95)';
  const luminousBorder = isDark ? 'rgba(0, 210, 255, 0.35)' : 'rgba(245, 158, 11, 0.35)';
  const dockIconBg = isDark ? 'rgba(0, 210, 255, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const dockIconBorder = isDark ? 'rgba(0, 210, 255, 0.28)' : 'rgba(245, 158, 11, 0.28)';
  const glowShadow = isDark ? '#00d2ff' : '#f59e0b';

  return (
    <View
      className="absolute bottom-4 left-4 right-4 rounded-[26px] p-3 flex-row items-center justify-between border"
      style={{
        backgroundColor: glassBg,
        borderColor: luminousBorder,
        shadowColor: glowShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.32 : 0.18,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Left: Tactile Dock Summary (tap to view / edit order in Neo-Bento Sheet) */}
      <TouchableOpacity
        onPress={onViewCart}
        disabled={!onViewCart}
        activeOpacity={0.7}
        className="flex-row items-center flex-1 pr-2"
      >
        {/* Tactile Dock Icon with Bouncy Badge */}
        <View className="relative mr-3">
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center border"
            style={{
              backgroundColor: dockIconBg,
              borderColor: dockIconBorder,
            }}
          >
            <Ionicons
              name="cart"
              size={21}
              color={isDark ? '#00d2ff' : colors.primary}
            />
          </View>

          {/* Tactile Bouncy Badge for item count */}
          <View
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full items-center justify-center border border-black/30 shadow-sm"
            style={{
              backgroundColor: isDark ? '#00d2ff' : '#f59e0b',
            }}
          >
            <Text className="text-[10px] font-black text-black">
              {totalQty}
            </Text>
          </View>
        </View>

        {/* Luminous Info & Price Pill */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {totalQty} {totalQty === 1 ? 'Item' : 'Items'}
            </Text>
            {onViewCart ? (
              <View
                className="px-1.5 py-0.2 rounded-md border flex-row items-center"
                style={{
                  backgroundColor: isDark ? 'rgba(0, 210, 255, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  borderColor: isDark ? 'rgba(0, 210, 255, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                }}
              >
                <Text
                  className="text-[9px] font-bold"
                  style={{ color: isDark ? '#38bdf8' : '#d97706' }}
                >
                  Edit ▴
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-baseline gap-1 mt-0.5">
            <Text
              className="text-lg font-black font-mono tracking-tight"
              style={{ color: colors.text }}
            >
              ₹{totalPrice.toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Tactile Neo-Bento Checkout Button */}
      <View className="flex-row items-center gap-2">
        {onClearCart && (
          <TouchableOpacity
            onPress={onClearCart}
            activeOpacity={0.7}
            className="p-2.5 rounded-2xl border"
            style={{
              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.1)' : 'rgba(244, 63, 94, 0.08)',
              borderColor: 'rgba(244, 63, 94, 0.25)',
            }}
          >
            <Ionicons name="trash-outline" size={17} color="#f43f5e" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onProceed}
          activeOpacity={0.8}
          className="px-4 py-2.5 rounded-2xl flex-row items-center gap-1.5 border border-white/20 active:scale-95"
          style={{
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-xs font-black text-black tracking-wider uppercase">
            Next
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#000000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
