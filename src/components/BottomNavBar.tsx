import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
      {/* Floating Translucent Liquid Glass Bar */}
      <View
        style={[
          styles.glassDock,
          {
            backgroundColor: isDark ? 'rgba(7, 16, 38, 0.82)' : 'rgba(255, 255, 255, 0.88)',
            borderColor: isDark ? 'rgba(0, 210, 255, 0.32)' : 'rgba(2, 132, 199, 0.22)',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.40)' : 'rgba(255, 255, 255, 0.95)',
            shadowColor: isDark ? '#00d2ff' : '#0284c7',
            shadowOpacity: isDark ? 0.35 : 0.16,
          },
        ]}
      >
        <View style={styles.tabsInner}>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onSelectTab(tab.id)}
                activeOpacity={0.7}
                className="flex-1 items-center justify-center py-1 relative"
              >
                {/* Active Tab Indicator: Glowing Liquid Neon Pill */}
                <View
                  className="items-center justify-center relative px-3 py-1 rounded-2xl"
                  style={{
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(0, 210, 255, 0.22)' : 'rgba(2, 132, 199, 0.16)')
                      : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive
                      ? (isDark ? 'rgba(0, 210, 255, 0.40)' : 'rgba(2, 132, 199, 0.30)')
                      : 'transparent',
                  }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={
                      isActive
                        ? colors.primary
                        : colors.textMuted
                    }
                  />

                  {/* Notification badge for cart */}
                  {tab.badge && tab.badge > 0 ? (
                    <View
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full items-center justify-center shadow-sm"
                      style={{ backgroundColor: '#f43f5e' }}
                    >
                      <Text className="text-[9px] font-black text-white">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Tab Label */}
                <Text
                  className="text-[10px] mt-1 tracking-tight"
                  style={{
                    color: isActive ? colors.primary : colors.textMuted,
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
    </View>
  );
};

const styles = StyleSheet.create({
  glassDock: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 18,
    elevation: 12,
  },
  tabsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
