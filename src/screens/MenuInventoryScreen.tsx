import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../services/ThemeContext';
import { MenuItem, ItemVariant } from '../types';
import {
  getMenuItemsApi,
  addMenuItemApi,
  updateMenuItemApi,
  deleteMenuItemApi,
} from '../api/cafeApi';
import { VoiceAddItemsModal } from '../components/VoiceAddItemsModal';
import { getFoodImageUrl } from '../utils/imageHelper';

const PRESET_CATEGORIES = [
  'General',
  'Pizza',
  'Cold Drinks',
  'Waffles',
  'Sweets & Mithai',
  'Burgers & Fries',
  'Snacks & Chaat',
  'Chai & Coffee',
  'Bakery & Cakes',
  'Ice Cream & Shakes',
  'Chinese & Momos',
  'South Indian',
  'Thali & Meals',
];

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

  // Category Picker Modal State
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryPickerTarget, setCategoryPickerTarget] = useState<'new' | 'edit'>('new');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Manual Add Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Pizza');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsVeg, setNewIsVeg] = useState(true);
  const [newHasVariants, setNewHasVariants] = useState(false);
  const [newVariants, setNewVariants] = useState<ItemVariant[]>([]);
  const [showNewManualUrlInput, setShowNewManualUrlInput] = useState(false);
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
  const [editHasVariants, setEditHasVariants] = useState(false);
  const [editVariants, setEditVariants] = useState<ItemVariant[]>([]);
  const [showEditManualUrlInput, setShowEditManualUrlInput] = useState(false);
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

  // Distinct category list dynamically computed from presets + store items
  const allCategories = useMemo(() => {
    const set = new Set<string>(PRESET_CATEGORIES);
    for (const it of items) {
      if (it.category && it.category.toLowerCase() !== 'all') {
        set.add(it.category.trim());
      }
    }
    return Array.from(set);
  }, [items]);

  // Open Edit Modal with dish details & variants
  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditCategory(item.category || 'General');
    setEditPrice(String(item.price || ''));
    setEditUnit(item.unit || 'pcs');
    setEditImageUrl(item.imageUrl || '');
    setEditDesc(item.description || '');
    setEditIsVeg(item.isVeg !== false);
    setShowEditManualUrlInput(false);

    if (Array.isArray(item.variants) && item.variants.length > 0) {
      setEditHasVariants(true);
      setEditVariants(item.variants);
    } else {
      setEditHasVariants(false);
      setEditVariants([]);
    }

    setEditModalVisible(true);
  };

  // Image Picker Handler: Gallery
  const handlePickFromGallery = async (isEdit: boolean) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to upload food photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (isEdit) {
          setEditImageUrl(uri);
        } else {
          setNewImageUrl(uri);
        }
      }
    } catch (e) {
      console.warn('Image picker error:', e);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  // Image Picker Handler: Camera
  const handleCaptureCamera = async (isEdit: boolean) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take food photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (isEdit) {
          setEditImageUrl(uri);
        } else {
          setNewImageUrl(uri);
        }
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  // Save Edited Item
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    let finalPrice = Math.max(0, Number(editPrice) || 0);

    // Sanitize variants if variant toggle is ON
    let sanitizedVariants: ItemVariant[] | undefined = undefined;
    if (editHasVariants && editVariants.length > 0) {
      sanitizedVariants = editVariants
        .filter((v) => v.name && v.name.trim())
        .map((v, idx) => ({
          name: v.name.trim(),
          price: Math.max(0, Number(v.price) || 0),
          unit: (v.unit || editUnit || 'pcs').trim(),
          isDefault: idx === 0,
        }));

      if (sanitizedVariants.length > 0 && finalPrice === 0) {
        finalPrice = sanitizedVariants[0].price;
      }
    }

    try {
      setUpdatingItem(true);
      const targetId = editingItem.id || editingItem.name;
      const updated = await updateMenuItemApi(targetId, {
        name: editName.trim(),
        category: (editCategory || 'General').trim(),
        price: finalPrice,
        unit: editUnit.trim() || 'pcs',
        imageUrl: editImageUrl.trim() || getFoodImageUrl('', editCategory),
        description: editDesc.trim(),
        isVeg: editIsVeg,
        variants: sanitizedVariants,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id || i.name === editingItem.name
            ? { ...i, ...updated, price: finalPrice, variants: sanitizedVariants }
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

  // Save New Manual Item
  const handleSaveManualItem = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    let finalPrice = Math.max(0, Number(newPrice) || 0);

    // Sanitize variants if variant toggle is ON
    let sanitizedVariants: ItemVariant[] | undefined = undefined;
    if (newHasVariants && newVariants.length > 0) {
      sanitizedVariants = newVariants
        .filter((v) => v.name && v.name.trim())
        .map((v, idx) => ({
          name: v.name.trim(),
          price: Math.max(0, Number(v.price) || 0),
          unit: (v.unit || newUnit || 'pcs').trim(),
          isDefault: idx === 0,
        }));

      if (sanitizedVariants.length > 0 && finalPrice === 0) {
        finalPrice = sanitizedVariants[0].price;
      }
    }

    if (finalPrice <= 0 && (!sanitizedVariants || sanitizedVariants.length === 0)) {
      Alert.alert('Error', 'Please enter a valid price or add variants with prices.');
      return;
    }

    try {
      setSavingItem(true);
      const created = await addMenuItemApi({
        name: newName.trim(),
        category: (newCategory || 'General').trim(),
        price: finalPrice,
        unit: newUnit.trim() || 'pcs',
        imageUrl: newImageUrl.trim() || getFoodImageUrl('', newCategory),
        description: newDesc.trim(),
        isVeg: newIsVeg,
        variants: sanitizedVariants,
      });

      setItems((prev) => [created, ...prev]);
      setAddModalVisible(false);
      // Reset form
      setNewName('');
      setNewPrice('');
      setNewImageUrl('');
      setNewDesc('');
      setNewVariants([]);
      setNewHasVariants(false);
      setShowNewManualUrlInput(false);
      Alert.alert('Success', `Added "${created.name}" to store menu!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add item to menu');
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
      selectedCategory === 'all' ||
      it.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Open Category Picker
  const openCategoryPicker = (target: 'new' | 'edit') => {
    setCategoryPickerTarget(target);
    setCategorySearchQuery('');
    setCategoryPickerVisible(true);
  };

  // Select Category
  const handleSelectCategory = (cat: string) => {
    if (categoryPickerTarget === 'new') {
      setNewCategory(cat);
    } else {
      setEditCategory(cat);
    }
    setCategoryPickerVisible(false);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* 1. Header Toolbar */}
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

      {/* 2. Search Bar */}
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

      {/* 3. Menu Items List */}
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
                  uri: getFoodImageUrl(item.imageUrl, item.category),
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
                  {item.category === 'General' ? 'Without Category' : item.category} • {item.unit || 'pcs'}
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
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Ionicons name="fast-food-outline" size={30} color={colors.textMuted} />
              </View>
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

      {/* 4. Voice Add Items Modal */}
      <VoiceAddItemsModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onItemsAdded={(newItems) => {
          setItems((prev) => [...newItems, ...prev]);
        }}
      />

      {/* 5. ADD NEW DISH MODAL (Full Height + KeyboardAwareScrollView) */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="px-4 py-3 flex-row items-center justify-between border-b"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View>
              <Text className="text-base font-black" style={{ color: colors.text }}>
                Add New Menu Dish
              </Text>
              <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                Photo upload, dropdown category & size variants
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAddModalVisible(false)}
              className="p-2 rounded-xl bg-slate-800/40"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Keyboard Aware Form ScrollView */}
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={Platform.OS === 'ios' ? 40 : 25}
          >
            {/* Dish Name */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish / Item Name *
              </Text>
              <TextInput
                placeholder="e.g. Farmhouse Supreme Pizza, Special Kulhad Chai"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                className="px-4 py-3 rounded-2xl border text-sm font-bold"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
              />
            </View>

            {/* Category Dropdown Selector */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Category (Dropdown / Without Category / Custom)
              </Text>
              <TouchableOpacity
                onPress={() => openCategoryPicker('new')}
                activeOpacity={0.8}
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.primary }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} className="mr-2" />
                  <Text className="text-sm font-bold ml-1" style={{ color: colors.text }}>
                    {newCategory === 'General' ? 'Without Category (General)' : newCategory}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Food Photo Upload Section */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish Photo (Upload from Gallery / Camera)
              </Text>

              {newImageUrl ? (
                <View
                  className="p-3 rounded-2xl border flex-row items-center gap-3"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <Image
                    source={{ uri: newImageUrl }}
                    className="w-20 h-20 rounded-xl bg-slate-800"
                    resizeMode="cover"
                  />
                  <View className="flex-1 justify-between py-1">
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Photo Selected ✓
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        onPress={() => handlePickFromGallery(false)}
                        className="px-3 py-1.5 rounded-xl border"
                        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                      >
                        <Text className="text-[11px] font-bold text-amber-500">Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setNewImageUrl('')}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10"
                      >
                        <Text className="text-[11px] font-bold text-rose-500">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => handlePickFromGallery(false)}
                    activeOpacity={0.8}
                    className="flex-1 py-3 px-3 rounded-2xl border flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.primary} />
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Upload Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleCaptureCamera(false)}
                    activeOpacity={0.8}
                    className="flex-1 py-3 px-3 rounded-2xl border flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Collapsible Manual Image URL Toggle */}
              <TouchableOpacity
                onPress={() => setShowNewManualUrlInput(!showNewManualUrlInput)}
                className="mt-2"
              >
                <Text className="text-[10px] text-slate-400 underline">
                  {showNewManualUrlInput ? 'Hide web image link' : 'Or paste image URL instead'}
                </Text>
              </TouchableOpacity>
              {showNewManualUrlInput && (
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.textMuted}
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  className="mt-2 px-3.5 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              )}
            </View>

            {/* Veg / Non-Veg Toggle */}
            <View
              className="flex-row items-center justify-between p-3.5 mb-4 rounded-2xl border"
              style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-2">
                <View
                  className="w-4 h-4 rounded-sm border items-center justify-center bg-white"
                  style={{ borderColor: newIsVeg ? '#10b981' : '#ef4444' }}
                >
                  <View
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: newIsVeg ? '#10b981' : '#ef4444' }}
                  />
                </View>
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  {newIsVeg ? 'Vegetarian (100% Pure Veg)' : 'Non-Vegetarian'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNewIsVeg(!newIsVeg)}
                className="px-3 py-1.5 rounded-xl border"
                style={{ backgroundColor: colors.badgeBg, borderColor: colors.primary }}
              >
                <Text className="text-[11px] font-bold text-amber-500">Toggle</Text>
              </TouchableOpacity>
            </View>

            {/* VARIANTS / MULTIPLE SIZES TOGGLE */}
            <View
              className="p-3.5 mb-4 rounded-2xl border"
              style={{
                backgroundColor: colors.card,
                borderColor: newHasVariants ? colors.primary : colors.border,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-black" style={{ color: colors.text }}>
                    Dish Sizes & Variants
                  </Text>
                  <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                    Enable for Small/Medium/Large or 250g/500g/1kg
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const nextVal = !newHasVariants;
                    setNewHasVariants(nextVal);
                    if (nextVal && newVariants.length === 0) {
                      setNewVariants([
                        { name: 'Regular', price: Number(newPrice) || 100, unit: newUnit || 'pcs', isDefault: true },
                        { name: 'Large', price: (Number(newPrice) || 100) + 50, unit: newUnit || 'pcs' },
                      ]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border"
                  style={{
                    backgroundColor: newHasVariants ? colors.primary : colors.surface,
                    borderColor: newHasVariants ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    className="text-[11px] font-black"
                    style={{ color: newHasVariants ? '#000000' : colors.text }}
                  >
                    {newHasVariants ? 'Variants ON' : 'Single Size'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Variant Rows List */}
              {newHasVariants && (
                <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  {newVariants.map((v, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center gap-2 mb-2 p-2.5 rounded-xl border"
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    >
                      <TextInput
                        placeholder="Size (e.g. Small / 1kg)"
                        placeholderTextColor={colors.textMuted}
                        value={v.name}
                        onChangeText={(t) => {
                          const updated = [...newVariants];
                          updated[idx].name = t;
                          setNewVariants(updated);
                        }}
                        className="flex-1 text-xs font-bold px-2 py-1.5 rounded-lg border"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                      />
                      <TextInput
                        placeholder="Price ₹"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={String(v.price || '')}
                        onChangeText={(t) => {
                          const updated = [...newVariants];
                          updated[idx].price = Number(t) || 0;
                          setNewVariants(updated);
                          if (idx === 0) setNewPrice(t);
                        }}
                        className="w-20 text-xs font-black font-mono px-2 py-1.5 rounded-lg border text-amber-500"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
                      />
                      <TextInput
                        placeholder="Unit"
                        placeholderTextColor={colors.textMuted}
                        value={v.unit || 'pcs'}
                        onChangeText={(t) => {
                          const updated = [...newVariants];
                          updated[idx].unit = t;
                          setNewVariants(updated);
                        }}
                        className="w-14 text-xs font-semibold px-2 py-1.5 rounded-lg border"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                      />
                      <TouchableOpacity
                        onPress={() => setNewVariants(newVariants.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg active:bg-rose-500/20"
                      >
                        <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() =>
                      setNewVariants([
                        ...newVariants,
                        { name: '', price: 0, unit: newUnit || 'pcs' },
                      ])
                    }
                    className="mt-1 py-2 rounded-xl border border-dashed flex-row items-center justify-center gap-1.5"
                    style={{ borderColor: colors.primary }}
                  >
                    <Ionicons name="add-circle" size={16} color={colors.primary} />
                    <Text className="text-xs font-bold text-amber-500">
                      Add Another Size / Portion
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Standard Price & Unit (When variants are NOT active) */}
            {!newHasVariants && (
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                    Price (₹) *
                  </Text>
                  <TextInput
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                    className="px-4 py-3 rounded-2xl border text-sm font-black font-mono text-amber-500"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
                  />
                </View>
                <View className="w-32">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                    Unit
                  </Text>
                  <TextInput
                    placeholder="pcs, plate, kg"
                    placeholderTextColor={colors.textMuted}
                    value={newUnit}
                    onChangeText={setNewUnit}
                    className="px-4 py-3 rounded-2xl border text-sm font-bold"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
              </View>
            )}

            {/* Description */}
            <View className="mb-5">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish Description (Optional)
              </Text>
              <TextInput
                placeholder="Key ingredients, spice level, or chef's note"
                placeholderTextColor={colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                numberOfLines={2}
                className="px-4 py-3 rounded-2xl border text-xs font-medium"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveManualItem}
              disabled={savingItem}
              activeOpacity={0.8}
              className="py-4 rounded-2xl items-center justify-center bg-amber-500 shadow-xl active:scale-98"
            >
              {savingItem ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text className="text-sm font-black text-black uppercase tracking-wider">
                  Save Dish to Menu
                </Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>

      {/* 6. EDIT DISH MODAL (Full Height + KeyboardAwareScrollView) */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="px-4 py-3 flex-row items-center justify-between border-b"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View>
              <Text className="text-base font-black" style={{ color: colors.text }}>
                Edit Store Dish
              </Text>
              <Text className="text-[11px] text-amber-500 font-semibold">
                Custom pricing, sizes & photo for this counter
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              className="p-2 rounded-xl bg-slate-800/40"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Keyboard Aware Form ScrollView */}
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={Platform.OS === 'ios' ? 40 : 25}
          >
            {/* Dish Name */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish / Item Name *
              </Text>
              <TextInput
                placeholder="Dish name"
                placeholderTextColor={colors.textMuted}
                value={editName}
                onChangeText={setEditName}
                className="px-4 py-3 rounded-2xl border text-sm font-bold"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
              />
            </View>

            {/* Category Dropdown */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Category (Dropdown / Without Category / Custom)
              </Text>
              <TouchableOpacity
                onPress={() => openCategoryPicker('edit')}
                activeOpacity={0.8}
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.primary }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} className="mr-2" />
                  <Text className="text-sm font-bold ml-1" style={{ color: colors.text }}>
                    {editCategory === 'General' ? 'Without Category (General)' : editCategory}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Food Photo Upload Section */}
            <View className="mb-4">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish Photo (Upload from Gallery / Camera)
              </Text>

              {editImageUrl ? (
                <View
                  className="p-3 rounded-2xl border flex-row items-center gap-3"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <Image
                    source={{ uri: editImageUrl }}
                    className="w-20 h-20 rounded-xl bg-slate-800"
                    resizeMode="cover"
                  />
                  <View className="flex-1 justify-between py-1">
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Photo Selected ✓
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        onPress={() => handlePickFromGallery(true)}
                        className="px-3 py-1.5 rounded-xl border"
                        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                      >
                        <Text className="text-[11px] font-bold text-amber-500">Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditImageUrl('')}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10"
                      >
                        <Text className="text-[11px] font-bold text-rose-500">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => handlePickFromGallery(true)}
                    activeOpacity={0.8}
                    className="flex-1 py-3 px-3 rounded-2xl border flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.primary} />
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Upload Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleCaptureCamera(true)}
                    activeOpacity={0.8}
                    className="flex-1 py-3 px-3 rounded-2xl border flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                    <Text className="text-xs font-bold" style={{ color: colors.text }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Collapsible Manual Image URL Toggle */}
              <TouchableOpacity
                onPress={() => setShowEditManualUrlInput(!showEditManualUrlInput)}
                className="mt-2"
              >
                <Text className="text-[10px] text-slate-400 underline">
                  {showEditManualUrlInput ? 'Hide web image link' : 'Or paste image URL instead'}
                </Text>
              </TouchableOpacity>
              {showEditManualUrlInput && (
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.textMuted}
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  className="mt-2 px-3.5 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                />
              )}
            </View>

            {/* Veg / Non-Veg Toggle */}
            <View
              className="flex-row items-center justify-between p-3.5 mb-4 rounded-2xl border"
              style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
            >
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
                className="px-3 py-1.5 rounded-xl border"
                style={{ backgroundColor: colors.badgeBg, borderColor: colors.primary }}
              >
                <Text className="text-[11px] font-bold text-amber-500">Toggle</Text>
              </TouchableOpacity>
            </View>

            {/* EDIT VARIANTS / MULTIPLE SIZES */}
            <View
              className="p-3.5 mb-4 rounded-2xl border"
              style={{
                backgroundColor: colors.card,
                borderColor: editHasVariants ? colors.primary : colors.border,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-black" style={{ color: colors.text }}>
                    Dish Sizes & Variants
                  </Text>
                  <Text className="text-[10px]" style={{ color: colors.textSecondary }}>
                    Multiple portions (e.g. Small, Medium, Large)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const nextVal = !editHasVariants;
                    setEditHasVariants(nextVal);
                    if (nextVal && editVariants.length === 0) {
                      setEditVariants([
                        { name: 'Regular', price: Number(editPrice) || 100, unit: editUnit || 'pcs', isDefault: true },
                        { name: 'Large', price: (Number(editPrice) || 100) + 50, unit: editUnit || 'pcs' },
                      ]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border"
                  style={{
                    backgroundColor: editHasVariants ? colors.primary : colors.surface,
                    borderColor: editHasVariants ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    className="text-[11px] font-black"
                    style={{ color: editHasVariants ? '#000000' : colors.text }}
                  >
                    {editHasVariants ? 'Variants ON' : 'Single Size'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Variant Rows List */}
              {editHasVariants && (
                <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  {editVariants.map((v, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center gap-2 mb-2 p-2.5 rounded-xl border"
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    >
                      <TextInput
                        placeholder="Size (e.g. Small / 1kg)"
                        placeholderTextColor={colors.textMuted}
                        value={v.name}
                        onChangeText={(t) => {
                          const updated = [...editVariants];
                          updated[idx].name = t;
                          setEditVariants(updated);
                        }}
                        className="flex-1 text-xs font-bold px-2 py-1.5 rounded-lg border"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                      />
                      <TextInput
                        placeholder="Price ₹"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={String(v.price || '')}
                        onChangeText={(t) => {
                          const updated = [...editVariants];
                          updated[idx].price = Number(t) || 0;
                          setEditVariants(updated);
                          if (idx === 0) setEditPrice(t);
                        }}
                        className="w-20 text-xs font-black font-mono px-2 py-1.5 rounded-lg border text-amber-500"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
                      />
                      <TextInput
                        placeholder="Unit"
                        placeholderTextColor={colors.textMuted}
                        value={v.unit || 'pcs'}
                        onChangeText={(t) => {
                          const updated = [...editVariants];
                          updated[idx].unit = t;
                          setEditVariants(updated);
                        }}
                        className="w-14 text-xs font-semibold px-2 py-1.5 rounded-lg border"
                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                      />
                      <TouchableOpacity
                        onPress={() => setEditVariants(editVariants.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg active:bg-rose-500/20"
                      >
                        <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() =>
                      setEditVariants([
                        ...editVariants,
                        { name: '', price: 0, unit: editUnit || 'pcs' },
                      ])
                    }
                    className="mt-1 py-2 rounded-xl border border-dashed flex-row items-center justify-center gap-1.5"
                    style={{ borderColor: colors.primary }}
                  >
                    <Ionicons name="add-circle" size={16} color={colors.primary} />
                    <Text className="text-xs font-bold text-amber-500">
                      Add Another Size / Portion
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Standard Price & Unit (When variants are NOT active) */}
            {!editHasVariants && (
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                    Price (₹) *
                  </Text>
                  <TextInput
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    className="px-4 py-3 rounded-2xl border text-sm font-black font-mono text-amber-500"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
                  />
                </View>
                <View className="w-32">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                    Unit
                  </Text>
                  <TextInput
                    placeholder="pcs, plate, kg"
                    placeholderTextColor={colors.textMuted}
                    value={editUnit}
                    onChangeText={setEditUnit}
                    className="px-4 py-3 rounded-2xl border text-sm font-bold"
                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                  />
                </View>
              </View>
            )}

            {/* Description */}
            <View className="mb-5">
              <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                Dish Description
              </Text>
              <TextInput
                placeholder="Ingredients, preparation style"
                placeholderTextColor={colors.textMuted}
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
                numberOfLines={2}
                className="px-4 py-3 rounded-2xl border text-xs font-medium"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={updatingItem}
              activeOpacity={0.8}
              className="py-4 rounded-2xl items-center justify-center bg-amber-500 shadow-xl active:scale-98"
            >
              {updatingItem ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text className="text-sm font-black text-black uppercase tracking-wider">
                  Save Changes to My Store
                </Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>

      {/* 7. DEDICATED CATEGORY PICKER MODAL (Dropdown + Custom Category + Without Category) */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setCategoryPickerVisible(false)}
          />
          <View
            className="rounded-t-3xl border-t p-5 w-full self-center"
            style={{ maxHeight: '80%', maxWidth: 640, backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  Select Category
                </Text>
                <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
                  Choose from list, add custom, or choose Without Category
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search or Type New Category Input */}
            <View
              className="flex-row items-center px-3.5 py-2.5 mb-3 rounded-2xl border"
              style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} className="mr-2" />
              <TextInput
                placeholder="Search or type custom category name..."
                placeholderTextColor={colors.textMuted}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                className="flex-1 text-xs font-bold"
                style={{ color: colors.text }}
              />
              {categorySearchQuery ? (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Custom Category Quick Add Action */}
            {categorySearchQuery.trim().length > 0 &&
              !allCategories.some(
                (c) => c.toLowerCase() === categorySearchQuery.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  onPress={() => handleSelectCategory(categorySearchQuery.trim())}
                  className="p-3 mb-2.5 rounded-2xl border flex-row items-center justify-between"
                  style={{ backgroundColor: colors.badgeBg, borderColor: colors.primary }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="add-circle" size={18} color={colors.primary} className="mr-2" />
                    <Text className="text-xs font-black text-amber-500">
                      Add New Category: &quot;{categorySearchQuery.trim()}&quot;
                    </Text>
                  </View>
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}

            {/* Categories List */}
            <FlatList
              data={allCategories.filter(
                (c) =>
                  !categorySearchQuery.trim() ||
                  c.toLowerCase().includes(categorySearchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const currentVal =
                  categoryPickerTarget === 'new' ? newCategory : editCategory;
                const isSelected =
                  currentVal.toLowerCase() === item.toLowerCase() ||
                  (item === 'General' && currentVal === 'General');

                return (
                  <TouchableOpacity
                    onPress={() => handleSelectCategory(item)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between p-3 mb-1.5 rounded-2xl border active:scale-98"
                    style={{
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={item === 'General' ? 'infinite-outline' : 'pricetag-outline'}
                        size={16}
                        color={isSelected ? '#000000' : colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        className="text-xs font-black"
                        style={{ color: isSelected ? '#000000' : colors.text }}
                      >
                        {item === 'General' ? 'Without Category (General)' : item}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#000000" />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
