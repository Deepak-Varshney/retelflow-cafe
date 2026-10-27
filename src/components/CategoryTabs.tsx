import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { DEFAULT_CAFE_CATEGORIES } from '../data/defaultCatalog';

interface CategoryTabsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View className="py-2.5 border-b" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14 }}
      >
        {DEFAULT_CAFE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          const count = categoryCounts[cat.id] || 0;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.7}
              className="flex-row items-center px-4 py-2 mr-2.5 rounded-2xl border"
              style={{
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.07)'
                  : '#f1f5f9',
                borderColor: isSelected ? colors.primary : colors.border,
                shadowColor: isSelected ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.35 : 0,
                shadowRadius: 4,
                elevation: isSelected ? 3 : 0,
              }}
            >
              <Ionicons
                name={(cat.iconName || 'restaurant-outline') as any}
                size={14}
                color={isSelected ? '#000000' : colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text
                className="text-xs font-black"
                numberOfLines={1}
                style={{
                  color: isSelected ? '#000000' : colors.text,
                }}
              >
                {cat.name}
              </Text>
              {count > 0 && (
                <View
                  className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isSelected ? '#000000' : colors.badgeBg,
                  }}
                >
                  <Text
                    className="text-[10px] font-black"
                    style={{ color: isSelected ? '#ffffff' : colors.primary }}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
