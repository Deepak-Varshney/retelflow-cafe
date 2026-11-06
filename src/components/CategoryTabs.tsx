import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
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

  const activeBorderColor = colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.glassBg : colors.surface,
          borderBottomColor: colors.glassBorder || colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DEFAULT_CAFE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          const count = categoryCounts[cat.id] || 0;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.75}
              style={[
                styles.tabPill,
                isSelected
                  ? {
                      // Active: Glowing electric cyan border, subtle glow shadow, bold text
                      backgroundColor: colors.badgeBg,
                      borderColor: activeBorderColor,
                      shadowColor: activeBorderColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.45 : 0.2,
                      shadowRadius: 8,
                      elevation: 3,
                    }
                  : {
                      // Inactive: Translucent liquid glass background, subtle 1px border
                      backgroundColor: colors.pillBg,
                      borderColor: colors.bentoBorder,
                      elevation: 0,
                    },
              ]}
            >
              <Ionicons
                name={(cat.iconName || 'restaurant-outline') as any}
                size={14}
                color={isSelected ? activeBorderColor : colors.textSecondary}
                style={{ marginRight: 6 }}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.tabText,
                  {
                    color: isSelected
                      ? colors.primaryText
                      : colors.textSecondary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {cat.name}
              </Text>

              {/* Category count pill: Micro-pill badge inside each tab */}
              {count > 0 && (
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.subtle,
                      borderColor: isSelected ? colors.primarySoftBorder : colors.bentoBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: isSelected ? colors.primaryText : colors.textSecondary,
                      },
                    ]}
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  countPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
