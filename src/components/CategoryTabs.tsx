import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {DEFAULT_CAFE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          const count = categoryCounts[cat.id] || 0;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.7}
              className="flex-row items-center px-3.5 py-2 rounded-2xl border"
              style={{
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : '#f1f5f9',
                borderColor: isSelected ? colors.primary : colors.border,
                shadowColor: isSelected ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.3 : 0,
                shadowRadius: 4,
                elevation: isSelected ? 3 : 0,
              }}
            >
              <Text className="text-sm mr-1.5">{cat.icon}</Text>
              <Text
                className="text-xs font-bold"
                style={{
                  color: isSelected ? '#ffffff' : colors.text,
                }}
              >
                {cat.name}
              </Text>
              {count > 0 && (
                <View
                  className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.25)' : colors.badgeBg,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold"
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
