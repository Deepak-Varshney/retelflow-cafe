import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  // Floating dock elevation above gesture navigation or hardware nav
  const bottomPadding = Math.max(insets.bottom, 8);

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
      style={{
        paddingBottom: bottomPadding,
        backgroundColor: 'transparent',
      }}
      className="px-3 pt-1"
    >
      {/* Floating Frosted Liquid Glass Bar */}
      <View
        className="flex-row items-center justify-around rounded-[26px] border py-2 px-1"
        style={{
          backgroundColor: isDark ? 'rgba(8, 14, 26, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          shadowColor: isDark ? '#000000' : '#64748b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.38 : 0.12,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.7}
              className="flex-1 items-center justify-center py-1 relative"
            >
              {/* Active Tab Indicator: Glowing Neon Pill / Soft Ambient Halo */}
              <View
                className="items-center justify-center relative px-3 py-1 rounded-2xl"
                style={{
                  backgroundColor: isActive
                    ? (isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(217, 119, 6, 0.12)')
                    : 'transparent',
                  borderColor: isActive
                    ? (isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.28)')
                    : 'transparent',
                  borderWidth: 1,
                  shadowColor: isActive ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isActive ? 0.35 : 0,
                  shadowRadius: 8,
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isActive ? colors.primary : (isDark ? '#94a3b8' : '#64748b')}
                />

                {/* Subtle tactile micro-pill badge for cart item count */}
                {tab.badge && tab.badge > 0 ? (
                  <View
                    className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full border border-black/30 items-center justify-center"
                    style={{
                      backgroundColor: isDark ? '#00d2ff' : colors.primary,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                    }}
                  >
                    <Text className="text-[9px] font-black text-black">
                      {tab.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                className="text-[10px] mt-1 text-center"
                numberOfLines={1}
                style={{
                  color: isActive ? colors.primary : (isDark ? '#64748b' : '#94a3b8'),
                  fontWeight: isActive ? '800' : '600',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
