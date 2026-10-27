import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../types';
import { useTheme } from '../services/ThemeContext';

interface FloatingCartBarProps {
  items: CartItem[];
  onProceed: () => void;
  onClearCart?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  items,
  onProceed,
  onClearCart,
}) => {
  const { colors } = useTheme();

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const totalPrice = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  if (items.length === 0) return null;

  return (
    <View
      className="absolute bottom-4 left-4 right-4 rounded-3xl p-3.5 flex-row items-center justify-between shadow-2xl border"
      style={{
        backgroundColor: '#0f172a',
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      {/* Left: Items Summary */}
      <View className="flex-row items-center flex-1">
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderColor: colors.primary,
          }}
        >
          <Ionicons name="cart" size={20} color={colors.primary} />
        </View>

        <View>
          <Text className="text-xs font-semibold text-slate-300">
            {totalQty} {totalQty === 1 ? 'Item' : 'Items'} in Order
          </Text>
          <Text className="text-base font-black text-white font-mono">
            ₹{totalPrice.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Right: Proceed Button */}
      <TouchableOpacity
        onPress={onProceed}
        activeOpacity={0.8}
        className="px-5 py-2.5 rounded-2xl flex-row items-center gap-1.5 shadow-md active:scale-95"
        style={{
          backgroundColor: colors.primary,
        }}
      >
        <Text className="text-xs font-black text-black tracking-wider uppercase">
          Next
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};
