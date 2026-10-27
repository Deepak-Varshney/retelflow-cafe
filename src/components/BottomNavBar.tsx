import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';

export type CafeTab = 'order' | 'menu' | 'history' | 'khata' | 'more';

interface BottomNavBarProps {
  currentTab: CafeTab;
  onSelectTab: (tab: CafeTab) => void;
  cartCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  cartCount = 0,
}) => {
  const { colors, isDark } = useTheme();

  const tabs: Array<{
    id: CafeTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: number;
  }> = [
    { id: 'order', label: 'New Order', icon: 'fast-food', badge: cartCount },
    { id: 'menu', label: 'Menu', icon: 'restaurant' },
    { id: 'history', label: 'Orders', icon: 'receipt' },
    { id: 'khata', label: 'Khata', icon: 'book' },
    { id: 'more', label: 'More', icon: 'ellipsis-horizontal' },
  ];

  return (
    <View
      className="flex-row items-center justify-around py-2 border-t"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
            className="items-center py-1 px-3 relative"
          >
            <View className="relative">
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
              {tab.badge && tab.badge > 0 ? (
                <View
                  className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-[9px] font-black text-black">
                    {tab.badge}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              className="text-[11px] font-bold mt-1"
              style={{
                color: isActive ? colors.primary : colors.textMuted,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
