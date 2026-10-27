import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <TouchableOpacity
      activeOpacity={0.88}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={300}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.3 : 0.06,
        },
      ]}
    >
      {/* Left: Food Image with Veg Badge */}
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

        {/* Veg / Non-Veg Indicator */}
        <View
          style={[
            styles.vegBadge,
            { borderColor: item.isVeg !== false ? '#10b981' : '#ef4444' },
          ]}
        >
          <View
            style={[
              styles.vegDot,
              { backgroundColor: item.isVeg !== false ? '#10b981' : '#ef4444' },
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
          <Text style={[styles.price, { color: colors.primary }]}>
            {priceLabel}
          </Text>
          {hasVariants ? (
            <Text style={[styles.optionsHint, { color: colors.primary }]}>
              Options ▾
            </Text>
          ) : (
            <Text style={styles.holdHint}>Hold for info</Text>
          )}
        </View>
      </View>

      {/* Right: Solid ADD Button (Never wraps or squishes) */}
      <View style={styles.actionContainer}>
        {currentQty === 0 ? (
          <TouchableOpacity
            onPress={() => onAddPress(item, hasVariants ? undefined : defaultVariant)}
            activeOpacity={0.8}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>ADD</Text>
            <Ionicons name="add" size={16} color="#000000" />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.qtyContainer,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                borderColor: colors.primary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => onRemovePress(item)}
              activeOpacity={0.7}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={14} color="#ef4444" />
            </TouchableOpacity>

            <Text style={[styles.qtyText, { color: colors.text }]}>
              {currentQty}
            </Text>

            <TouchableOpacity
              onPress={() => onAddPress(item, defaultVariant)}
              activeOpacity={0.7}
              style={styles.qtyBtn}
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
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  imageContainer: {
    width: 82,
    height: 82,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vegBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 15,
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
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
  optionsHint: {
    fontSize: 10,
    fontWeight: '700',
  },
  holdHint: {
    fontSize: 9,
    color: '#94a3b8',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginRight: 2,
    flexShrink: 0,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 5,
  },
});