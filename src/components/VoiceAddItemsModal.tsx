import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { useVoiceRecognition } from '../services/useVoiceRecognition';
import { parseVoiceAddItemsApi } from '../api/cafeApi';
import { ItemVariant, MenuItem } from '../types';

interface VoiceAddItemsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Parsed dishes, to be reviewed one by one in the Add Dish form (nothing saved yet). */
  onDraftsReady: (drafts: MenuItem[]) => void;
}

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * One draft per dish: when the same dish comes back more than once (one entry
 * per size), its sizes are merged into a single item with variants.
 */
export function mergeVoiceDrafts(items: any[]): MenuItem[] {
  const drafts = new Map<string, { item: MenuItem; sizes: ItemVariant[]; spokenSizes: boolean }>();
  for (const it of items) {
    if (!it?.name) continue;
    const unit = it.unit || 'pcs';
    const spokenSizes = Array.isArray(it.variants) && it.variants.length > 0;
    const sizes: ItemVariant[] = spokenSizes
      ? it.variants.map((v: any) => ({
          name: String(v.name || '').trim(),
          price: Number(v.price) || 0,
          unit: v.unit || unit,
        }))
      : [{ name: unit !== 'pcs' ? unit : 'Regular', price: Number(it.price) || 0, unit }];

    const key = normName(it.name);
    const existing = drafts.get(key);
    if (existing) {
      existing.sizes.push(...sizes);
      existing.spokenSizes = true; // same dish twice = two sizes
      continue;
    }
    drafts.set(key, {
      spokenSizes,
      sizes,
      item: {
        name: it.name,
        category: it.category || 'General',
        price: Number(it.price) || sizes[0]?.price || 0,
        unit,
        imageUrl: it.imageUrl,
        description: it.description || '',
        isVeg: it.isVeg !== false,
      },
    });
  }

  return Array.from(drafts.values()).map(({ item, sizes, spokenSizes }) => {
    if (!spokenSizes) return { ...item, variants: [] };
    const variants = sizes
      .filter((v, i) => sizes.findIndex((o) => normName(o.name) === normName(v.name)) === i)
      .map((v, i) => ({ ...v, isDefault: i === 0 }));
    return { ...item, variants, price: variants[0]?.price || item.price };
  });
}

export const VoiceAddItemsModal: React.FC<VoiceAddItemsModalProps> = ({
  visible,
  onClose,
  onDraftsReady,
}) => {
  const { colors } = useTheme();

  const [analyzing, setAnalyzing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Parse the speech and hand the dishes to the Add Dish form as drafts
  const analyze = async (text: string) => {
    if (!text.trim()) return;
    try {
      setAnalyzing(true);
      setParseError('');
      const res = await parseVoiceAddItemsApi(text);
      const drafts = mergeVoiceDrafts(res.items || []);
      if (drafts.length > 0) onDraftsReady(drafts);
      else setParseError('No dish detected. Speak the name with its price, e.g. "Onion pizza small 200, medium 300".');
    } catch (e) {
      console.warn('Voice add items parse failed:', e);
      setParseError('Could not understand that. Tap Re-Parse or speak again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition({
    locale: 'hi-IN',
    onPhraseSpoken: (phrase) => analyze(phrase),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/75">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View
          className="rounded-t-3xl border-t p-5 w-full self-center"
          style={{ maxHeight: '85%', maxWidth: 640,
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: 'rgba(0, 210, 255, 0.15)' }}>
                <Ionicons name="mic" size={22} color={colors.primary} />
              </View>
              <View>
                <Text className="text-base font-bold" style={{ color: colors.text }}>
                  Voice Add Menu Items
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  e.g. &ldquo;Onion pizza small 200, medium 300, large 400&rdquo;
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-slate-800/40">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Mic Button & Transcript Banner */}
          <View className="items-center my-4">
            <TouchableOpacity
              onPress={() => (isListening ? stopListening() : startListening())}
              activeOpacity={0.8}
              className="w-20 h-20 rounded-full items-center justify-center border-4 shadow-xl active:scale-95"
              style={{
                backgroundColor: isListening ? '#ef4444' : colors.primary,
                borderColor: isListening ? 'rgba(239, 68, 68, 0.4)' : colors.primaryGlow,
              }}
            >
              <Ionicons
                name={isListening ? 'stop' : 'mic'}
                size={32}
                color={isListening ? '#ffffff' : '#000000'}
              />
            </TouchableOpacity>

            <Text
              className="text-xs font-bold mt-2.5"
              style={{ color: isListening ? '#ef4444' : colors.primary }}
            >
              {isListening ? 'Listening... Tap to Stop' : 'Tap Mic & Speak Items'}
            </Text>

            {transcript ? (
              <View
                className="mt-3 p-3 rounded-2xl border w-full"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-[11px] font-semibold text-slate-400 mb-0.5">Spoken:</Text>
                <Text className="text-xs italic" style={{ color: colors.text }}>
                  &ldquo;{transcript}&rdquo;
                </Text>
              </View>
            ) : null}
          </View>

          {analyzing && (
            <View className="items-center my-3 flex-row justify-center gap-2">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                Drafting dishes & sizes...
              </Text>
            </View>
          )}

          {parseError && !analyzing ? (
            <View className="p-2.5 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Text className="text-[11px] font-semibold text-rose-500">{parseError}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-2">
            {!isListening && transcript && !analyzing ? (
              <TouchableOpacity
                onPress={() => analyze(transcript)}
                className="flex-1 py-3 rounded-2xl items-center justify-center border"
                style={{ borderColor: colors.primary, backgroundColor: colors.badgeBg }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>Re-Parse Speech</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};
