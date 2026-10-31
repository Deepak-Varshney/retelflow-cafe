import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { MenuItem, ItemVariant, CartItem } from '../types';
import { getMenuItemsApi } from '../api/cafeApi';
import { getCachedMenu, setCachedMenu } from '../services/cacheService';
import { DEFAULT_MENU_ITEMS } from '../data/defaultCatalog';
import { CategoryTabs } from '../components/CategoryTabs';
import { GeminiVoiceOrb } from '../components/GeminiVoiceOrb';
import { FoodItemCard } from '../components/FoodItemCard';
import { VariantSelectorModal } from '../components/VariantSelectorModal';
import { DisambiguationModal } from '../components/DisambiguationModal';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { FoodItemDetailModal } from '../components/FoodItemDetailModal';
import { CartReviewModal } from '../components/CartReviewModal';
import { useCafeVoiceOrder } from '../services/useCafeVoiceOrder';
import { CafeVoiceMode } from '../services/voiceSocketService';

interface NewOrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onProceedToCustomer: () => void;
  shopName?: string;
  /** Set per shop in the admin panel (default: phone speech-to-text + Gemini stream) */
  voiceMode?: CafeVoiceMode;
}

export const NewOrderScreen: React.FC<NewOrderScreenProps> = ({
  cart,
  setCart,
  onProceedToCustomer,
  shopName = 'Cafe Counter',
  voiceMode = 'stream',
}) => {
  const { colors, isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = getCachedMenu();
    return cached && cached.length > 0 ? cached : DEFAULT_MENU_ITEMS;
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCachedMenu();
    return !(cached && cached.length > 0);
  });

  // Long press food detail modal
  const [detailModalItem, setDetailModalItem] = useState<MenuItem | null>(null);

  // Modals state
  const [selectedVariantItem, setSelectedVariantItem] = useState<MenuItem | null>(null);
  const [cartModalVisible, setCartModalVisible] = useState(false);

  // Pulse animation for mic
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load menu items with background cache update
  const loadMenu = async () => {
    try {
      const items = await getMenuItemsApi();
      if (items && items.length > 0) {
        setMenuItems(items);
        setCachedMenu(items);
      }
    } catch (e) {
      console.warn('Failed to load menu items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Real-time voice ordering: menu context is warmed on the server as soon as
  // this screen opens; items and size questions arrive while the cashier speaks
  const voice = useCafeVoiceOrder({ mode: voiceMode, menuItems, setCart });
  const { isListening, selectionQueue } = voice;
  const disambiguationData = selectionQueue[0] || null;

  // Animated pulse when mic is active
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Cart quantity map per menu item
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.name] = (map[item.name] || 0) + item.qty;
    }
    return map;
  }, [cart]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of cart) {
      counts[item.category] = (counts[item.category] || 0) + item.qty;
      counts['all'] = (counts['all'] || 0) + item.qty;
    }
    return counts;
  }, [cart]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    let result = menuItems;
    if (selectedCategory !== 'all') {
      result = result.filter(
        (it) => it.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [menuItems, selectedCategory, search]);

  // Add Item to cart
  const handleAddItem = (item: MenuItem, variant?: ItemVariant) => {
    if (item.variants && item.variants.length > 1 && !variant) {
      setSelectedVariantItem(item);
      return;
    }

    const price = variant ? variant.price : item.price;
    const cartId = `${item.name}-${variant?.name || 'default'}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === cartId);
      if (existingIdx !== -1) {
        return prev.map((it, i) => (i === existingIdx ? { ...it, qty: it.qty + 1 } : it));
      }
      return [
        ...prev,
        {
          id: cartId,
          menuItemId: item.id,
          name: item.name,
          category: item.category,
          selectedVariant: variant,
          price,
          qty: 1,
          unit: variant?.unit || item.unit || 'pcs',
          imageUrl: item.imageUrl,
          isVeg: item.isVeg !== false,
        },
      ];
    });
  };

  // Remove Item from cart
  const handleRemoveItem = (item: MenuItem) => {
    setCart((prev) => {
      // Find last added variant of this item
      const idx = prev.findIndex((i) => i.name === item.name);
      if (idx === -1) return prev;

      if (prev[idx].qty > 1) {
        return prev.map((it, i) => (i === idx ? { ...it, qty: it.qty - 1 } : it));
      } else {
        return prev.filter((_, i) => i !== idx);
      }
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* 1. Header Toolbar */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.glassBg || colors.surface, borderColor: colors.glassBorder || colors.border }}
      >
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border"
            style={{ backgroundColor: colors.badgeBg, borderColor: colors.primary }}
          >
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View>
            <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
              {shopName}
            </Text>
            <Text className="text-[11px] font-semibold text-amber-500">
              New Dine-In / Takeaway Order
            </Text>
          </View>
        </View>

        {/* Live Mic Push-to-Talk (Hold-to-Speak) Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPressIn={() => {
              setIsHolding(true);
              voice.startListening();
            }}
            onPressOut={() => {
              setIsHolding(false);
              voice.stopListening();
            }}
            activeOpacity={0.85}
            className="flex-row items-center px-3 py-1.5 rounded-2xl border shadow-md active:scale-95"
            style={{
              backgroundColor: (isHolding || isListening) ? '#06202a' : colors.primary,
              borderColor: (isHolding || isListening) ? '#00d2ff' : colors.primaryGlow,
            }}
          >
            <Ionicons
              name={isListening ? 'radio' : 'mic'}
              size={17}
              color={(isHolding || isListening) ? '#00d2ff' : '#000000'}
            />
            <Text
              className="text-xs font-black ml-1.5 uppercase tracking-wide"
              style={{ color: isListening ? '#00d2ff' : '#000000' }}
            >
              {(isHolding || isListening) ? 'Listening...' : 'Hold & Speak'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Gemini Voice Pulse Orb */}
      {(isHolding || isListening) && (
        <View
          className="border-b py-2"
          style={{
            backgroundColor: 'rgba(6, 18, 30, 0.96)',
            borderColor: 'rgba(0, 210, 255, 0.25)',
          }}
        >
          <GeminiVoiceOrb
            isListening={isHolding || isListening}
            size={68}
            heardText={voice.heard || undefined}
            hintText={
              voice.mode === 'live'
                ? 'Live: speak items & quantities freely...'
                : 'Hold & speak items (e.g. "Do burger ek cold coffee")'
            }
          />
        </View>
      )}

      {/* Voice Notice / Processing Banner when not holding */}
      {!isListening && (voice.busy || voice.notice) && (
        <View
          className="px-4 py-2 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
          }}
        >
          <View className="flex-row items-center flex-1 pr-2">
            {voice.busy ? (
              <ActivityIndicator size="small" color={colors.primary} className="mr-2" />
            ) : (
              <Ionicons name="sparkles" size={15} color={colors.primary} className="mr-2" />
            )}
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primary }}
              numberOfLines={1}
            >
              {voice.notice || (voice.busy ? 'AI is processing your order...' : '')}
            </Text>
          </View>
        </View>
      )}

      {/* 2. Search Box */}
      <View className="px-4 pt-3 pb-2" style={{ backgroundColor: colors.glassBg || colors.surface }}>
        <View
          className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
          style={{ backgroundColor: colors.inputBg, borderColor: colors.glassBorder || colors.border }}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} className="mr-2" />
          <TextInput
            placeholder="Search pizza, drinks, waffle, rasgulla..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs font-semibold ml-2"
            style={{ color: colors.text }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 3. Category Tabs (Swiggy / Zomato Kiosk Style) */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
      />

      {/* 4. Food Items Grid/List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-xs font-bold mt-3" style={{ color: colors.textSecondary }}>
            Loading delicious menu...
          </Text>
        </View>
      ) : (
        <FlatList
          key="cafe-menu-list"
          data={filteredItems}
          keyExtractor={(item) => item.id || item.name}
          refreshing={loading}
          onRefresh={loadMenu}
          renderItem={({ item }) => (
            <FoodItemCard
              item={item}
              currentQty={cartQtyMap[item.name] || 0}
              onAddPress={handleAddItem}
              onRemovePress={handleRemoveItem}
              onLongPress={(it) => setDetailModalItem(it)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: cart.length > 0 ? 120 : 40,
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Ionicons name="restaurant-outline" size={30} color={colors.textMuted} />
              </View>
              <Text className="text-base font-black" style={{ color: colors.text }}>
                No menu items found
              </Text>
              <Text className="text-xs mt-1 text-center mb-4" style={{ color: colors.textMuted }}>
                {search.trim()
                  ? `No matches for "${search}". Try another keyword or clear search.`
                  : 'No items in this category. Check Menu tab or try another category.'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  loadMenu();
                }}
                activeOpacity={0.8}
                className="flex-row items-center px-4 py-2.5 rounded-2xl bg-amber-500 shadow-md active:scale-95"
              >
                <Ionicons name="reload" size={16} color="#000000" className="mr-1.5" />
                <Text className="text-xs font-black text-black uppercase tracking-wider ml-1">
                  Reset Filter & Refresh
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 5. Variant / Size Picker Modal */}
      <VariantSelectorModal
        visible={Boolean(selectedVariantItem)}
        item={selectedVariantItem}
        onSelectVariant={handleAddItem}
        onClose={() => setSelectedVariantItem(null)}
      />

      {/* 6. Food Item Details Modal (Shown on Long Press) */}
      <FoodItemDetailModal
        visible={Boolean(detailModalItem)}
        item={detailModalItem}
        onClose={() => setDetailModalItem(null)}
        onAddToCart={(it, v) => handleAddItem(it, v)}
      />

      {/* 7. Voice Disambiguation Modal */}
      <DisambiguationModal
        visible={Boolean(disambiguationData)}
        data={disambiguationData}
        position={selectionQueue.length > 1 ? `1 of ${selectionQueue.length}` : undefined}
        onSelect={voice.resolveSelection}
        onClose={voice.skipSelection}
      />

      {/* 8. Full order list: change size / qty / remove */}
      <CartReviewModal
        visible={cartModalVisible}
        cart={cart}
        setCart={setCart}
        menuItems={menuItems}
        onClose={() => setCartModalVisible(false)}
        onProceed={() => {
          setCartModalVisible(false);
          onProceedToCustomer();
        }}
      />

      {/* 9. Floating Cart Summary Bar */}
      <FloatingCartBar
        items={cart}
        onProceed={onProceedToCustomer}
        onViewCart={() => setCartModalVisible(true)}
      />
    </SafeAreaView>
  );
};
