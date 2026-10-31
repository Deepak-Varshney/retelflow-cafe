import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { CartItem, ItemVariant, MenuItem } from '../types';

interface CartReviewModalProps {
  visible: boolean;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  menuItems: MenuItem[];
  onClose: () => void;
  /** Optional primary action at the bottom (e.g. "Next"). */
  onProceed?: () => void;
  proceedLabel?: string;
}

const cartIdFor = (name: string, variant?: ItemVariant) => `${name}-${variant?.name || 'default'}`;

/**
 * Bottom sheet with the whole order: change size, change quantity, remove.
 * Used from the cart bar on the menu screen and from the customer step.
 */
export const CartReviewModal: React.FC<CartReviewModalProps> = ({
  visible,
  cart,
  setCart,
  menuItems,
  onClose,
  onProceed,
  proceedLabel = 'Next',
}) => {
  const { colors, isDark } = useTheme();
  const total = cart.reduce((s, it) => s + it.qty * it.price, 0);
  const totalQty = cart.reduce((s, it) => s + it.qty, 0);

  const menuFor = (item: CartItem) =>
    menuItems.find((m) => (item.menuItemId && m.id === item.menuItemId) || m.name === item.name);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const remove = (id: string) => setCart((prev) => prev.filter((it) => it.id !== id));

  // Switching to a size that is already in the cart merges the two lines
  const changeVariant = (item: CartItem, variant: ItemVariant) => {
    const newId = cartIdFor(item.name, variant);
    if (newId === item.id) return;
    setCart((prev) => {
      const existing = prev.find((it) => it.id === newId);
      if (existing) {
        return prev
          .filter((it) => it.id !== item.id)
          .map((it) => (it.id === newId ? { ...it, qty: it.qty + item.qty } : it));
      }
      return prev.map((it) =>
        it.id === item.id
          ? { ...it, id: newId, selectedVariant: variant, price: variant.price, unit: variant.unit || it.unit }
          : it
      );
    });
  };

  const clearAll = () => {
    Alert.alert('Clear order?', 'Remove all items from this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setCart([]);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          className="rounded-t-3xl border-t px-4 pt-4 pb-5 w-full self-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border, maxHeight: '85%', maxWidth: 640 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-1 pr-2">
              <Text className="text-base font-black" style={{ color: colors.text }}>
                Your Order ({totalQty} {totalQty === 1 ? 'item' : 'items'})
              </Text>
              <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                Change size, quantity or remove items
              </Text>
            </View>
            {cart.length > 0 ? (
              <TouchableOpacity onPress={clearAll} className="px-2.5 py-1.5 mr-1" hitSlop={8}>
                <Text className="text-xs font-bold text-rose-500">Clear all</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-2" showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {cart.length === 0 ? (
              <Text className="text-xs text-center py-8" style={{ color: colors.textMuted }}>
                No items in this order.
              </Text>
            ) : (
              cart.map((item) => {
                const variants = menuFor(item)?.variants || [];
                return (
                  <View key={item.id} className="py-3 border-b" style={{ borderColor: colors.border }}>
                    <View className="flex-row items-start">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-bold" style={{ color: colors.text }} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text className="text-[11px] font-mono" style={{ color: colors.textSecondary }}>
                          ₹{item.price} each{item.selectedVariant ? ` • ${item.selectedVariant.name}` : ''}
                        </Text>
                      </View>
                      <Text className="text-sm font-black font-mono text-amber-500">
                        ₹{(item.qty * item.price).toLocaleString()}
                      </Text>
                    </View>

                    {/* Size chips */}
                    {variants.length > 1 ? (
                      <View className="flex-row flex-wrap gap-1.5 mt-2">
                        {variants.map((v) => {
                          const active = item.selectedVariant?.name === v.name;
                          return (
                            <TouchableOpacity
                              key={v.name}
                              onPress={() => changeVariant(item, v)}
                              className="px-2.5 py-1 rounded-lg border"
                              style={{
                                backgroundColor: active ? colors.primary : colors.surface,
                                borderColor: active ? colors.primary : colors.border,
                              }}
                            >
                              <Text
                                className="text-[11px] font-bold"
                                style={{ color: active ? '#000000' : colors.text }}
                              >
                                {v.name} • ₹{v.price}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* Qty stepper + remove */}
                    <View className="flex-row items-center justify-between mt-2">
                      <View
                        className="flex-row items-center rounded-xl border"
                        style={{ borderColor: colors.border, backgroundColor: isDark ? colors.surface : '#f8fafc' }}
                      >
                        <TouchableOpacity onPress={() => changeQty(item.id, -1)} className="px-3 py-1.5" hitSlop={6}>
                          <Ionicons name="remove" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <Text className="text-sm font-black font-mono min-w-[28px] text-center" style={{ color: colors.text }}>
                          {item.qty}
                        </Text>
                        <TouchableOpacity onPress={() => changeQty(item.id, 1)} className="px-3 py-1.5" hitSlop={6}>
                          <Ionicons name="add" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => remove(item.id)} className="flex-row items-center px-2 py-1.5" hitSlop={6}>
                        <Ionicons name="trash-outline" size={15} color="#f43f5e" />
                        <Text className="text-xs font-bold text-rose-500 ml-1">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-between pt-3">
            <View>
              <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                Total
              </Text>
              <Text className="text-lg font-black font-mono" style={{ color: colors.text }}>
                ₹{total.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onProceed || onClose}
              disabled={cart.length === 0}
              className="px-6 py-3 rounded-2xl flex-row items-center gap-1.5"
              style={{ backgroundColor: colors.primary, opacity: cart.length === 0 ? 0.5 : 1 }}
            >
              <Text className="text-xs font-black text-black uppercase tracking-wider">
                {onProceed ? proceedLabel : 'Done'}
              </Text>
              {onProceed ? <Ionicons name="arrow-forward" size={16} color="#000" /> : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
