import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { MenuItem } from '../types';
import {
  getMenuItemsApi,
  addMenuItemApi,
  updateMenuItemApi,
  deleteMenuItemApi,
} from '../api/cafeApi';
import { VoiceAddItemsModal } from '../components/VoiceAddItemsModal';

export const MenuInventoryScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals state
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Manual Add Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Pizza');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsVeg, setNewIsVeg] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // Edit Item Form State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Pizza');
  const [editPrice, setEditPrice] = useState('');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsVeg, setEditIsVeg] = useState(true);
  const [updatingItem, setUpdatingItem] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getMenuItemsApi();
      setItems(data);
    } catch (e) {
      console.warn('Load items failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditCategory(item.category || 'General');
    setEditPrice(String(item.price || ''));
    setEditUnit(item.unit || 'pcs');
    setEditImageUrl(item.imageUrl || '');
    setEditDesc(item.description || '');
    setEditIsVeg(item.isVeg !== false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }
    const finalPrice = Math.max(0, Number(editPrice) || 0);

    try {
      setUpdatingItem(true);
      const targetId = editingItem.id || editingItem.name;
      const updated = await updateMenuItemApi(targetId, {
        name: editName.trim(),
        category: editCategory.trim(),
        price: finalPrice,
        unit: editUnit.trim(),
        imageUrl: editImageUrl.trim(),
        description: editDesc.trim(),
        isVeg: editIsVeg,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id || i.name === editingItem.name
            ? { ...i, ...updated, price: finalPrice }
            : i
        )
      );
      setEditModalVisible(false);
      setEditingItem(null);
      Alert.alert('Saved', `Updated "${editName}" for your store successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update item for this store');
    } finally {
      setUpdatingItem(false);
    }
  };

  const handleSaveManualItem = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }
    if (!newPrice.trim()) {
      Alert.alert('Error', 'Item price is required');
      return;
    }

    try {
      setSavingItem(true);
      const created = await addMenuItemApi({
        name: newName.trim(),
        category: newCategory.trim(),
        price: Number(newPrice) || 0,
        unit: newUnit.trim(),
        imageUrl:
          newImageUrl.trim() ||
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
        description: newDesc.trim(),
        isVeg: newIsVeg,
      });

      setItems((prev) => [created, ...prev]);
      setAddModalVisible(false);
      setNewName('');
      setNewPrice('');
      setNewImageUrl('');
      setNewDesc('');
      Alert.alert('Success', `Added "${created.name}" to menu!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to add item to menu');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    Alert.alert('Delete Item', `Remove "${name}" from this store's menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMenuItemApi(id);
          setItems((prev) => prev.filter((i) => i.id !== id && i.name !== name));
        },
      },
    ]);
  };

  // Filtered list
  const filtered = items.filter((it) => {
    const matchesCategory =
      selectedCategory === 'all' || it.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-4 py-3 flex-row items-center justify-between border-b"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View>
          <Text className="text-base font-black tracking-tight" style={{ color: colors.text }}>
            Menu & Inventory
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            {items.length} Dishes & Beverages in this store
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Voice Add Items Button */}
          <TouchableOpacity
            onPress={() => setVoiceModalVisible(true)}
            className="flex-row items-center px-3 py-2 rounded-2xl border active:scale-95"
            style={{ backgroundColor: colors.badgeBg, borderColor: colors.primary }}
          >
            <Ionicons name="mic" size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-amber-500 ml-1">Voice Add</Text>
          </TouchableOpacity>

          {/* Manual Add Button */}
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            className="flex-row items-center px-3.5 py-2 rounded-2xl bg-amber-500 active:scale-95 shadow-md"
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text className="text-xs font-black text-black ml-1">New Dish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (Clean full width without preseed clutter) */}
      <View className="px-4 py-2.5 flex-row items-center gap-2" style={{ backgroundColor: colors.surface }}>
        <View
          className="flex-row items-center px-3 py-2 rounded-2xl border flex-1"
          style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} className="mr-2" />
          <TextInput
            placeholder="Search dish, sweets, drinks..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs font-semibold ml-1"
            style={{ color: colors.text }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Menu Items List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-xs font-bold mt-2" style={{ color: colors.textSecondary }}>
            Loading menu items...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.7}
              className="flex-row items-center p-3 mb-2 rounded-2xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Image
                source={{
                  uri:
                    item.imageUrl ||
                    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80',
                }}
                className="w-14 h-14 rounded-xl mr-3 bg-slate-800"
              />

              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="w-3.5 h-3.5 rounded-sm border items-center justify-center bg-white"
                    style={{ borderColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
                  >
                    <View
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: item.isVeg !== false ? '#10b981' : '#ef4444' }}
                    />
                  </View>
                  <Text className="text-xs font-bold flex-1" numberOfLines={1} style={{ color: colors.text }}>
                    {item.name}
                  </Text>
                </View>

                <Text className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                  {item.category} • {item.unit || 'pcs'}
                </Text>
                {item.variants && item.variants.length > 0 && (
                  <Text className="text-[10px] text-amber-500 font-medium">
                    {item.variants.length} Sizes/Variants
                  </Text>
                )}
              </View>

              <View className="items-end mr-3">
                <Text className="text-sm font-extrabold text-amber-500 font-mono">
                  ₹{item.price}
                </Text>
              </View>

              {/* Edit Icon Button */}
              <TouchableOpacity
                onPress={() => handleOpenEdit(item)}
                className="p-2 rounded-xl active:bg-amber-500/10 mr-1"
              >
                <Ionicons name="pencil-outline" size={17} color={colors.primary} />
              </TouchableOpacity>

              {/* Delete Icon Button */}
              <TouchableOpacity
                onPress={() => item.id && handleDeleteItem(item.id, item.name)}
                className="p-2 rounded-xl active:bg-rose-500/10"
              >
                <Ionicons name="trash-outline" size={17} color="#f43f5e" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-2">📋</Text>
              <Text className="text-sm font-bold" style={{ color: colors.text }}>
                No items in inventory
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500"
              >
                <Text className="text-xs font-black text-black">
                  + Add First Dish to Menu
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Voice Add Items Modal */}
      <VoiceAddItemsModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onItemsAdded={(newItems) => {
          setItems((prev) => [...newItems, ...prev]);
        }}
      />

      {/* EDIT MENU ITEM MODAL (Per-Store Custom Pricing & Details) */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/75">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setEditModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 max-h-[88%]"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  Edit Store Dish
                </Text>
                <Text className="text-[10px] text-amber-500 font-semibold">
                  Changes will apply exclusively to your counter
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Item Name */}
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Dish / Item Name *</Text>
                <TextInput
                  placeholder="e.g. Onion Pizza, Paneer Makhani Burger"
                  placeholderTextColor={colors.textMuted}
                  value={editName}
                  onChangeText={setEditName}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              {/* Category */}
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Category</Text>
                <TextInput
                  placeholder="Pizza, Cold Drinks, Waffles, Sweets, Burgers, Snacks, Chai & Coffee"
                  placeholderTextColor={colors.textMuted}
                  value={editCategory}
                  onChangeText={setEditCategory}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              {/* Price & Unit */}
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Store Price (₹) *</Text>
                  <TextInput
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
                <View className="w-28">
                  <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Unit</Text>
                  <TextInput
                    placeholder="pcs, plate, glass, kg"
                    placeholderTextColor={colors.textMuted}
                    value={editUnit}
                    onChangeText={setEditUnit}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
              </View>

              {/* Veg / Non-Veg Toggle */}
              <View className="flex-row items-center justify-between p-3 mb-3 rounded-2xl border" style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}>
                <View className="flex-row items-center gap-2">
                  <View
                    className="w-4 h-4 rounded-sm border items-center justify-center bg-white"
                    style={{ borderColor: editIsVeg ? '#10b981' : '#ef4444' }}
                  >
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: editIsVeg ? '#10b981' : '#ef4444' }}
                    />
                  </View>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    {editIsVeg ? 'Vegetarian (100% Pure Veg)' : 'Non-Vegetarian'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditIsVeg(!editIsVeg)}
                  className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40"
                >
                  <Text className="text-[11px] font-bold text-amber-500">Change</Text>
                </TouchableOpacity>
              </View>

              {/* Image URL with Preview */}
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Image URL</Text>
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.textMuted}
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
                {editImageUrl ? (
                  <View className="mt-2 items-center">
                    <Image source={{ uri: editImageUrl }} className="w-24 h-24 rounded-2xl bg-slate-800" resizeMode="cover" />
                  </View>
                ) : null}
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Description</Text>
                <TextInput
                  placeholder="Detailed ingredients or preparation style"
                  placeholderTextColor={colors.textMuted}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  numberOfLines={2}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-medium"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={updatingItem}
                className="py-3.5 rounded-2xl items-center justify-center bg-amber-500 shadow-lg active:scale-98"
              >
                {updatingItem ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-xs font-black text-black uppercase tracking-wider">
                    Save Changes to My Store
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manual Add Item Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <View
            className="rounded-t-3xl border-t p-5 max-h-[85%]"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <Text className="text-base font-bold" style={{ color: colors.text }}>
                Add New Menu Dish
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Item Name *</Text>
                <TextInput
                  placeholder="e.g. Corn Cheese Pizza, Kaju Katli"
                  placeholderTextColor={colors.textMuted}
                  value={newName}
                  onChangeText={setNewName}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Category</Text>
                <TextInput
                  placeholder="Pizza, Cold Drinks, Waffles, Sweets, Burgers..."
                  placeholderTextColor={colors.textMuted}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Price (₹) *</Text>
                  <TextInput
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
                <View className="w-28">
                  <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Unit</Text>
                  <TextInput
                    placeholder="pcs, kg, glass"
                    placeholderTextColor={colors.textMuted}
                    value={newUnit}
                    onChangeText={setNewUnit}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Image URL (Optional)</Text>
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.textMuted}
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>Short Description</Text>
                <TextInput
                  placeholder="e.g. Delicious cheese burst base with fresh herbs"
                  placeholderTextColor={colors.textMuted}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-medium"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveManualItem}
                disabled={savingItem}
                className="py-3.5 rounded-2xl items-center justify-center bg-amber-500 shadow-lg"
              >
                {savingItem ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-xs font-black text-black uppercase tracking-wider">
                    Save to Menu
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};