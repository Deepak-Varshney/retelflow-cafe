import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { CafeInsights, getInsightsApi } from '../api/assistantApi';
import { showInsightsOnScreen } from '../services/voiceTargets';

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// One fetch shared by every strip on screen; refreshed at most every 60s
let cached: { at: number; data: CafeInsights | null } = { at: 0, data: null };
let inflight: Promise<CafeInsights | null> | null = null;

export function loadInsights(force = false): Promise<CafeInsights | null> {
  if (!force && cached.data && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
  if (!inflight) {
    inflight = getInsightsApi('month')
      .then((data) => {
        if (data) cached = { at: Date.now(), data };
        return data || cached.data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useInsights() {
  const enabled = showInsightsOnScreen();
  const [data, setData] = useState<CafeInsights | null>(enabled ? cached.data : null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadInsights().then((d) => alive && d && setData(d));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return enabled ? data : null;
}

/**
 * Order screen: last bill + today's sales + this month's best sellers.
 * Menu screen ("menu"): this month's best sellers only.
 * Hidden when the shop has insights set to voice-only.
 */
export const InsightsStrip: React.FC<{ variant?: 'order' | 'menu' }> = ({ variant = 'order' }) => {
  const { colors } = useTheme();
  const data = useInsights();
  if (!data) return null;

  const chips: { icon: any; label: string; value: string }[] = [];
  if (variant === 'order') {
    if (data.lastBill) {
      chips.push({ icon: 'receipt-outline', label: `Last #${data.lastBill.invoiceId}`, value: money(data.lastBill.totalAmount) });
    }
    chips.push({ icon: 'today-outline', label: `Today · ${data.today.orders} orders`, value: money(data.today.sales) });
  }
  for (const t of data.topItems.slice(0, variant === 'menu' ? 5 : 3)) {
    const best = t.variants.length > 1 ? ` · ${t.variants[0].name}` : '';
    chips.push({ icon: 'flame-outline', label: `${t.name}${best}`, value: `${t.qty} sold` });
  }
  if (!chips.length) return null;

  return (
    <View style={{ paddingVertical: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {variant === 'menu' ? (
          <View style={{ justifyContent: 'center', paddingRight: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>THIS MONTH</Text>
          </View>
        ) : null}
        {chips.map((c, i) => (
          <View
            key={`${c.label}-${i}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Ionicons name={c.icon} size={13} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{c.label} </Text>
            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text }}>{c.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/** Edit Dish form: how each size of this dish sold this month. */
export const DishSizeSales: React.FC<{ name: string }> = ({ name }) => {
  const { colors } = useTheme();
  const data = useInsights();
  const item = data?.topItems.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!item) return null;
  return (
    <View
      className="mb-4 p-3 rounded-2xl border"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Text className="text-[10px] font-black uppercase" style={{ color: colors.textMuted }}>
        This month · {item.qty} sold · {money(item.amount)}
      </Text>
      <View className="flex-row flex-wrap gap-2 mt-2">
        {item.variants.map((v) => (
          <View key={v.name} className="px-2.5 py-1 rounded-xl border" style={{ borderColor: colors.border }}>
            <Text className="text-[11px] font-bold" style={{ color: colors.text }}>
              {v.name}: {v.qty}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
