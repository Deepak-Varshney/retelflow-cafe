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
import { getMenuItemsApi, parseCafeVoiceOrderApi, seedCafeCatalogApi } from '../api/cafeApi';
import { CategoryTabs } from '../components/CategoryTabs';
import { FoodItemCard } from '../components/FoodItemCard';
import { VariantSelectorModal } from '../components/VariantSelectorModal';
import { DisambiguationModal, DisambiguationItem } from '../components/DisambiguationModal';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { FoodItemDetailModal } from '../components/FoodItemDetailModal';
import { useVoiceRecognition } from '../services/useVoiceRecognition';

interface NewOrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onProceedToCustomer: () => void;
  shopName?: string;
}

export const NewOrderScreen: React.FC<NewOrderScreenProps> = ({
  cart,
  setCart,
  onProceedToCustomer,
  shopName = 'Cafe Counter',
}) => {
  const { colors, isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Long press food detail modal
  const [detailModalItem, setDetailModalItem] = useState<MenuItem | null>(null);

  // Modals state
  const [selectedVariantItem, setSelectedVariantItem] = useState<MenuItem | null>(null);
  const [disambiguationData, setDisambiguationData] = useState<DisambiguationItem | null>(null);

  // Live voice processing status
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Pulse animation for mic
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load menu items
  const loadMenu = async () => {
    try {
      setLoading(true);
      const items = await getMenuItemsApi();
      setMenuItems(items);
    } catch (e) {
      console.warn('Failed to load menu items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Voice ordering hook
  const { isListening, transcript, interimTranscript, startListening, stopListening } =
    useVoiceRecognition({
      locale: 'hi-IN',
      onPhraseSpoken: async (phrase) => {
        if (!phrase.trim()) return;
        try {
          setIsProcessingVoice(true);
          setVoiceNotice(`Listening: "${phrase}"`);

          const res = await parseCafeVoiceOrderApi(phrase, cart);

          if (res?.actions && res.actions.length > 0) {
            let noticeSummary = res.summary || '';

            for (const act of res.actions) {
              if (act.type === 'NEEDS_SELECTION') {
                // Trigger disambiguation / variant picker popup
                const matchedMenu = menuItems.find(
                  (m) => m.name.toLowerCase() === act.itemName.toLowerCase()
                );
                const variants = act.availableVariants || matchedMenu?.variants || [];

                setDisambiguationData({
                  itemName: act.itemName,
                  qty: act.qty || 1,
                  availableVariants: variants,
                });
                noticeSummary = `Select size for ${act.itemName}`;
              } else if (act.type === 'ADD') {
                // Find matching menu item from catalog
                const matchedMenu = menuItems.find(
                  (m) =>
                    m.name.toLowerCase().includes(act.itemName.toLowerCase()) ||
                    act.itemName.toLowerCase().includes(m.name.toLowerCase())
                );

                const itemImg =
                  matchedMenu?.imageUrl ||
                  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';

                const unitPrice =
                  act.price ||
                  (act.totalSpokenAmount && act.qty ? act.totalSpokenAmount / act.qty : 0) ||
                  matchedMenu?.price ||
                  0;

                const qty = act.qty || 1;
                const variantObj = act.variantName
                  ? { name: act.variantName, price: unitPrice, unit: act.unit }
                  : undefined;

                const cartId = `${act.itemName}-${act.variantName || 'default'}`;

                setCart((prev) => {
                  const existingIdx = prev.findIndex((i) => i.id === cartId);
                  if (existingIdx !== -1) {
                    const updated = [...prev];
                    updated[existingIdx].qty += qty;
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: cartId,
                      menuItemId: matchedMenu?.id,
                      name: act.itemName,
                      category: matchedMenu?.category || 'General',
                      selectedVariant: variantObj,
                      price: unitPrice,
                      qty,
                      unit: act.unit || matchedMenu?.unit || 'pcs',
                      imageUrl: itemImg,
                      isVeg: matchedMenu?.isVeg !== false,
                    },
                  ];
                });
              } else if (act.type === 'DELETE') {
                setCart((prev) =>
                  prev.filter(
                    (i) => !i.name.toLowerCase().includes(act.itemName.toLowerCase())
                  )
                );
              }
            }

            setVoiceNotice(noticeSummary);
            setTimeout(() => setVoiceNotice(null), 3500);
          }
        } catch (e) {
          console.warn('Voice ordering error:', e);
          setVoiceNotice('Could not understand. Please try again.');
          setTimeout(() => setVoiceNotice(null), 3000);
        } finally {
          setIsProcessingVoice(false);
        }
      },
    });

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
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
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
        const updated = [...prev];
        updated[idx].qty -= 1;
        return updated;
      } else {
        return prev.filter((_, i) => i !== idx);
      }
    });
  };

  // Disambiguation selection resolution
  const handleResolveDisambiguation = (
    variantName: string,
    price: number,
    unit?: string
  ) => {
    if (!disambiguationData) return;
    const item = menuItems.find(
      (m) => m.name.toLowerCase() === disambiguationData.itemName.toLowerCase()
    );

    const qty = disambiguationData.qty || 1;
    const cartId = `${disambiguationData.itemName}-${variantName}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === cartId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].qty += qty;
        return updated;
      }
      return [
        ...prev,
        {
          id: cartId,
          menuItemId: item?.id,
          name: disambiguationData.itemName,
          category: item?.category || 'General',
          selectedVariant: { name: variantName, price, unit },
          price,
          qty,
          unit: unit || item?.unit || 'pcs',
          imageUrl: item?.imageUrl,
          isVeg: item?.isVeg !== false,
        },
      ];
    });

    setDisambiguationData(null);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* 1. Header Toolbar */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
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

        {/* Live Mic Toggle Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={() => (isListening ? stopListening() : startListening())}
            activeOpacity={0.8}
            className="flex-row items-center px-3 py-1.5 rounded-2xl border shadow-md active:scale-95"
            style={{
              backgroundColor: isListening ? '#ef4444' : colors.primary,
              borderColor: isListening ? 'rgba(239, 68, 68, 0.5)' : colors.primaryGlow,
            }}
          >
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
              size={17}
              color={isListening ? '#ffffff' : '#000000'}
            />
            <Text
              className="text-xs font-black ml-1 uppercase"
              style={{ color: isListening ? '#ffffff' : '#000000' }}
            >
              {isListening ? 'Stop' : 'Voice'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Voice Processing Banner */}
      {(isListening || isProcessingVoice || voiceNotice) && (
        <View
          className="px-4 py-2 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center flex-1 pr-2">
            {isProcessingVoice ? (
              <ActivityIndicator size="small" color={colors.primary} className="mr-2" />
            ) : (
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: isListening ? '#ef4444' : colors.primary }}
              />
            )}
            <Text
              className="text-xs font-bold"
              style={{ color: isListening ? '#ef4444' : colors.primary }}
              numberOfLines={1}
            >
              {voiceNotice ||
                (isListening
                  ? interimTranscript || transcript || 'Listening for items...'
                  : 'Processing speech...')}
            </Text>
          </View>
        </View>
      )}

      {/* 2. Search Box */}
      <View className="px-4 pt-3 pb-2" style={{ backgroundColor: colors.surface }}>
        <View
          className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
          style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
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
        onSelect={handleResolveDisambiguation}
        onClose={() => setDisambiguationData(null)}
      />

      {/* 8. Floating Cart Summary Bar */}
      <FloatingCartBar items={cart} onProceed={onProceedToCustomer} />
    </SafeAreaView>
  );
};
