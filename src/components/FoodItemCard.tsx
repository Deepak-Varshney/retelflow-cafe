import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { MenuItem, ItemVariant } from '../types';
import { useTheme } from '../services/ThemeContext';
import { getFoodImageUrl, DEFAULT_FOOD_PLACEHOLDER } from '../utils/imageHelper';

interface FoodItemCardProps {
  item: MenuItem;
  currentQty: number;
  onAddPress: (item: MenuItem, variant?: ItemVariant) => void;
  onRemovePress: (item: MenuItem) => void;
  onLongPress?: (item: MenuItem) => void;
}

export const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  currentQty,
  onAddPress,
  onRemovePress,
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();
  const [imgError, setImgError] = useState(false);

  const hasVariants = Array.isArray(item.variants) && item.variants.length > 1;
  const inCart = currentQty > 0;

  // Price label calculation
  let priceLabel = `₹${item.price}`;
  if (hasVariants && item.variants) {
    const prices = item.variants.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    priceLabel = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
  }

  const defaultVariant = item.variants?.find((v) => v.isDefault) || item.variants?.[0];
  const isVeg = item.isVeg !== false;
  const vegColor = isVeg ? (colors.neonMint || '#10b981') : '#ef4444';

  // Luminous Neo-Bento border: rgba(255, 255, 255, 0.08) -> rgba(245, 158, 11, 0.25) when in cart
  const borderColor = inCart
    ? (isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.35)')
    : (colors.bentoBorder || (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={280}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardBento : colors.surface,
          borderColor,
          shadowColor: inCart ? (colors.neonAmber || colors.primary) : '#000000',
          shadowOpacity: inCart ? (isDark ? 0.35 : 0.15) : (isDark ? 0.22 : 0.05),
          shadowRadius: inCart ? 8 : 4,
          elevation: inCart ? 3 : 1,
        },
      ]}
    >
      {/* Left: Food Image with Subtle Frosted Gradient Overlay & Tactile Veg Badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: imgError
              ? DEFAULT_FOOD_PLACEHOLDER
              : getFoodImageUrl(item.imageUrl, item.category),
          }}
          onError={() => setImgError(true)}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Frosted gradient overlay so price and title are ultra-crisp */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id={`imgGrad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0.04" />
                <Stop offset="60%" stopColor="#000000" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#0c1322" stopOpacity="0.72" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#imgGrad-${item.id})`} />
          </Svg>
        </View>

        {/* Minimalist tactile pill with glowing dot (Emerald #10b981 / Crimson #ef4444) */}
        <View
          style={[
            styles.vegBadgePill,
            {
              backgroundColor: isDark ? 'rgba(12, 19, 34, 0.88)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: `${vegColor}40`,
            },
          ]}
        >
          <View
            style={[
              styles.vegGlowDot,
              {
                backgroundColor: vegColor,
                shadowColor: vegColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Middle: Details */}
      <View style={styles.details}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {item.name}
        </Text>

        <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
          {item.description || (hasVariants ? `${item.variants!.length} sizes available` : item.category || 'Special')}
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.neonAmber || colors.primary }]}>
            {priceLabel}
          </Text>

          {hasVariants ? (
            <View
              style={[
                styles.optionsPill,
                {
                  backgroundColor: colors.pillBg || 'rgba(255, 255, 255, 0.05)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text style={[styles.optionsHint, { color: colors.primary }]}>
                Options ▾
              </Text>
            </View>
          ) : (
            <Text style={[styles.holdHint, { color: colors.textMuted }]}>Hold for info</Text>
          )}
        </View>
      </View>

      {/* Right: Tactile Neo-Bento Actions */}
      <View style={styles.actionContainer}>
        {!inCart ? (
          /* Sleek frosted pill with + Add in warm cafe amber gold */
          <TouchableOpacity
            onPress={() => onAddPress(item, hasVariants ? undefined : defaultVariant)}
            activeOpacity={0.78}
            style={[
              styles.addButton,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(217, 119, 6, 0.10)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.30)',
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="add" size={14} color={colors.primary} style={{ marginRight: 2 }} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>+ Add</Text>
          </TouchableOpacity>
        ) : (
          /* High-contrast tactile pill with - and + buttons and glowing badge */
          <View
            style={[
              styles.qtyPill,
              {
                backgroundColor: isDark ? colors.cardBento : '#ffffff',
                borderColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => onRemovePress(item)}
              activeOpacity={0.65}
              style={styles.qtyBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="remove" size={14} color="#ef4444" />
            </TouchableOpacity>

            <View
              style={[
                styles.qtyBadge,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.12)',
                },
              ]}
            >
              <Text style={[styles.qtyText, { color: colors.primary }]}>
                {currentQty}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onAddPress(item, defaultVariant)}
              activeOpacity={0.65}
              style={styles.qtyBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderRadius: 22, // Smooth rounded-3xl geometry
    borderWidth: 1, // 1px luminous border
    shadowOffset: { width: 0, height: 2 },
  },
  imageContainer: {
    width: 82,
    height: 82,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0c1322',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vegBadgePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 2,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  optionsPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
  },
  optionsHint: {
    fontSize: 10,
    fontWeight: '700',
  },
  holdHint: {
    fontSize: 9.5,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.2,
    minWidth: 76,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1.4,
    paddingHorizontal: 4,
    paddingVertical: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    marginHorizontal: 2,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
