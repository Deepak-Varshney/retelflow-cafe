import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  const luminousBorder = colors.glassBorder;
  const dockIconBg = colors.badgeBg;
  const dockIconBorder = colors.glassBorderActive;
  const glowShadow = colors.primary;

  return (
    <View
      className="absolute bottom-4 left-4 right-4 rounded-[26px] overflow-hidden border"
      style={{
        borderColor: luminousBorder,
        borderTopColor: isDark ? colors.glassBorderActive : 'rgba(255, 255, 255, 0.90)',
        shadowColor: glowShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.3 : 0.18,
        shadowRadius: 18,
        elevation: 12,
      }}
    >

      <View
        className="p-3 flex-row items-center justify-between"
        style={{
          backgroundColor: colors.panel,
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
                color={colors.primary}
              />
            </View>

            {/* Tactile Bouncy Badge for item count */}
            <View
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full items-center justify-center border shadow-sm"
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.panel,
              }}
            >
              <Text className="text-[10px] font-black" style={{ color: colors.onPrimary }}>
                {totalQty}
              </Text>
            </View>
          </View>

          {/* Luminous Info & Price Pill */}
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: colors.textSecondary }}
              >
                {totalQty} {totalQty === 1 ? 'Item' : 'Items'}
              </Text>
              {onViewCart ? (
                <View
                  className="px-1.5 py-0.2 rounded-md border flex-row items-center"
                  style={{
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primarySoftBorder,
                  }}
                >
                  <Text
                    className="text-[9px] font-bold"
                    style={{ color: colors.primaryText }}
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

        {/* Right: Tactile Liquid Glass Checkout Button */}
        <View className="flex-row items-center gap-2">
          {onClearCart && (
            <TouchableOpacity
              onPress={onClearCart}
              activeOpacity={0.7}
              className="p-2.5 rounded-2xl border"
              style={{
                backgroundColor: colors.dangerSoft,
                borderColor: colors.dangerSoft,
              }}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onProceed}
            activeOpacity={0.8}
            className="px-4 py-2.5 rounded-2xl flex-row items-center gap-1.5 active:scale-95"
            style={{
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text className="text-xs font-black tracking-wider uppercase" style={{ color: colors.onPrimary }}>
              Next
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
