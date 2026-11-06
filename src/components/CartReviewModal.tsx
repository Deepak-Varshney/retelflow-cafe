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
  /** Optional primary action at the bottom (e.g. "Proceed to Customer Details"). */
  onProceed?: () => void;
  proceedLabel?: string;
}

const cartIdFor = (name: string, variant?: ItemVariant) => `${name}-${variant?.name || 'default'}`;

/**
 * Neo-Bento Order Sheet:
 * Full order breakdown with tactile +/- steppers, variant selectors,
 * frosted glass header, and a high-contrast checkout action.
 */
export const CartReviewModal: React.FC<CartReviewModalProps> = ({
  visible,
  cart,
  setCart,
  menuItems,
  onClose,
  onProceed,
  proceedLabel = 'Proceed to Customer Details',
}) => {
  const { colors } = useTheme();
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
      <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Neo-Bento Sheet Container (borderRadius: 28) */}
        <View
          className="border-t px-4 pt-3 pb-6 w-full self-center"
          style={{
            backgroundColor: colors.panel,
            borderColor: colors.border,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            maxWidth: 640,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 24,
          }}
        >
          {/* Sheet Handle Bar */}
          <View
            className="w-12 h-1 rounded-full self-center mb-3"
            style={{ backgroundColor: colors.subtle }}
          />

          {/* Frosted Glass Header */}
          <View
            className="flex-row items-center justify-between pb-3.5 border-b"
            style={{ borderColor: colors.border }}
          >
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center border"
                style={{
                  backgroundColor: colors.badgeBg,
                  borderColor: colors.glassBorder,
                }}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
                    Review Order
                  </Text>
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.primarySoft }}
                  >
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: colors.primaryText }}
                    >
                      {totalQty} {totalQty === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                  Adjust quantities, portions or item details
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {cart.length > 0 ? (
                <TouchableOpacity
                  onPress={clearAll}
                  className="px-2.5 py-1 rounded-lg border"
                  style={{
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.dangerSoft,
                  }}
                  hitSlop={6}
                >
                  <Text className="text-[11px] font-bold" style={{ color: colors.danger }}>Clear</Text>
                </TouchableOpacity>
              ) : null}

              {/* Clean Frosted Close Pill */}
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                className="w-8 h-8 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Neo-Bento Food Items List */}
          <ScrollView
            className="mt-3"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340, flexShrink: 1 }}
          >
            {cart.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center mb-3 border"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="cart-outline" size={28} color={colors.textMuted} />
                </View>
                <Text className="text-sm font-bold" style={{ color: colors.text }}>
                  Your order is currently empty
                </Text>
                <Text className="text-xs text-center mt-1" style={{ color: colors.textSecondary }}>
                  Tap items on the menu to add them here
                </Text>
              </View>
            ) : (
              cart.map((item) => {
                const menuItem = menuFor(item);
                const variants = menuItem?.variants || [];
                const isVeg = item.isVeg ?? menuItem?.isVeg ?? ((menuItem as any)?.foodType === 'veg');
                const isNonVeg = ((item.isVeg === false) || (menuItem?.isVeg === false) || ((menuItem as any)?.foodType === 'nonveg'));

                return (
                  <View
                    key={item.id}
                    className="p-3 mb-2.5 rounded-2xl border"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    }}
                  >
                    {/* Top Row: Name, Diet Icon & High-Contrast Price */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          {isVeg ? (
                            <View className="w-3.5 h-3.5 border border-emerald-500 rounded items-center justify-center">
                              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </View>
                          ) : isNonVeg ? (
                            <View className="w-3.5 h-3.5 border border-rose-500 rounded items-center justify-center">
                              <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            </View>
                          ) : null}

                          <Text
                            className="text-sm font-black tracking-tight"
                            style={{ color: colors.text }}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </View>

                        <Text
                          className="text-[11px] font-mono mt-0.5"
                          style={{ color: colors.textSecondary }}
                        >
                          ₹{item.price} each{item.selectedVariant ? ` • ${item.selectedVariant.name}` : ''}
                        </Text>
                      </View>

                      {/* High-Contrast Line Subtotal */}
                      <Text
                        className="text-base font-black font-mono"
                        style={{ color: colors.primaryText }}
                      >
                        ₹{(item.qty * item.price).toLocaleString()}
                      </Text>
                    </View>

                    {/* Size / Variant Neo-Bento Chips */}
                    {variants.length > 1 ? (
                      <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                        {variants.map((v) => {
                          const active = item.selectedVariant?.name === v.name;
                          return (
                            <TouchableOpacity
                              key={v.name}
                              onPress={() => changeVariant(item, v)}
                              className="px-2.5 py-1 rounded-xl border"
                              style={{
                                backgroundColor: active ? colors.primary : colors.panel,
                                borderColor: active ? colors.primary : colors.border,
                              }}
                            >
                              <Text
                                className="text-[11px] font-bold"
                                style={{ color: active ? colors.onPrimary : colors.text }}
                              >
                                {v.name} • ₹{v.price}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* Bottom Row: Tactile +/- Stepper & Tactile Remove Pill */}
                    <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t" style={{ borderColor: colors.border }}>
                      {/* Tactile Stepper */}
                      <View
                        className="flex-row items-center rounded-xl border"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.panel,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => changeQty(item.id, -1)}
                          className="px-3 py-1.5 active:opacity-60"
                          hitSlop={4}
                        >
                          <Ionicons name="remove" size={15} color={colors.primary} />
                        </TouchableOpacity>

                        <Text
                          className="text-xs font-black font-mono min-w-[26px] text-center"
                          style={{ color: colors.text }}
                        >
                          {item.qty}
                        </Text>

                        <TouchableOpacity
                          onPress={() => changeQty(item.id, 1)}
                          className="px-3 py-1.5 active:opacity-60"
                          hitSlop={4}
                        >
                          <Ionicons name="add" size={15} color={colors.primary} />
                        </TouchableOpacity>
                      </View>

                      {/* Tactile Remove Pill */}
                      <TouchableOpacity
                        onPress={() => remove(item.id)}
                        className="flex-row items-center px-2.5 py-1.5 rounded-lg border"
                        style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text className="text-[11px] font-bold ml-1" style={{ color: colors.danger }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Total Bill Breakdown Neo-Bento Card */}
          {cart.length > 0 && (
            <View
              className="mt-3 p-3.5 rounded-2xl border"
              style={{
                backgroundColor: colors.primarySoft,
                borderColor: colors.primarySoftBorder,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Items Total ({totalQty})
                </Text>
                <Text className="text-xs font-mono font-bold" style={{ color: colors.text }}>
                  ₹{total.toLocaleString()}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Taxes & Charges
                </Text>
                <Text className="text-xs font-bold" style={{ color: colors.success }}>
                  Included
                </Text>
              </View>

              <View
                className="my-2 border-t"
                style={{ borderColor: colors.border }}
              />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-black uppercase tracking-wider" style={{ color: colors.text }}>
                  Grand Total
                </Text>
                <Text
                  className="text-xl font-black font-mono tracking-tight"
                  style={{ color: colors.primaryText }}
                >
                  ₹{total.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* High-Contrast Primary Proceed Button */}
          <View className="pt-3">
            <TouchableOpacity
              onPress={onProceed || onClose}
              disabled={cart.length === 0}
              activeOpacity={0.8}
              className="w-full py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-[0.99]"
              style={{
                backgroundColor: colors.primary,
                opacity: cart.length === 0 ? 0.5 : 1,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.onPrimary }}>
                {onProceed ? proceedLabel : 'Done'}
              </Text>
              {onProceed ? <Ionicons name="arrow-forward" size={17} color={colors.onPrimary} /> : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
