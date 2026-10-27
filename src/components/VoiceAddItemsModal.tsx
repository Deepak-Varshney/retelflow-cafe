import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { useVoiceRecognition } from '../services/useVoiceRecognition';
import { parseVoiceAddItemsApi, bulkAddMenuItemsApi } from '../api/cafeApi';
import { MenuItem } from '../types';

interface VoiceAddItemsModalProps {
  visible: boolean;
  onClose: () => void;
  onItemsAdded: (newItems: MenuItem[]) => void;
}

export const VoiceAddItemsModal: React.FC<VoiceAddItemsModalProps> = ({
  visible,
  onClose,
  onItemsAdded,
}) => {
  const { colors, isDark } = useTheme();

  const [analyzing, setAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition({
    locale: 'hi-IN',
    onPhraseSpoken: async (phrase) => {
      // Analyze once phrase has been spoken
      if (phrase.trim()) {
        try {
          setAnalyzing(true);
          const res = await parseVoiceAddItemsApi(phrase);
          if (res.items && res.items.length > 0) {
            setExtractedItems(res.items);
            setSummary(res.summary);
          }
        } catch (e) {
          console.warn('Voice add items parse failed:', e);
        } finally {
          setAnalyzing(false);
        }
      }
    },
  });

  const handleManualAnalyze = async () => {
    if (!transcript.trim()) return;
    try {
      setAnalyzing(true);
      const res = await parseVoiceAddItemsApi(transcript);
      if (res.items && res.items.length > 0) {
        setExtractedItems(res.items);
        setSummary(res.summary);
      }
    } catch (e) {
      console.warn('Voice add items parse failed:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToInventory = async () => {
    if (extractedItems.length === 0) return;
    try {
      setSaving(true);
      const saved = await bulkAddMenuItemsApi(extractedItems);
      onItemsAdded(saved);
      onClose();
    } catch (e) {
      console.warn('Save to inventory failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/75">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View
          className="rounded-t-3xl border-t p-5 max-h-[85%]"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-amber-500/20">
                <Ionicons name="mic" size={22} color={colors.primary} />
              </View>
              <View>
                <Text className="text-base font-bold" style={{ color: colors.text }}>
                  Voice Add Menu Items
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Speak multiple items (e.g. &ldquo;Onion pizza 300 rs small...&rdquo;)
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
                Gemini AI is parsing items & images...
              </Text>
            </View>
          )}

          {/* Extracted Items Preview */}
          {extractedItems.length > 0 && (
            <View className="flex-1 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-emerald-500">
                  ✓ {extractedItems.length} Items Detected:
                </Text>
                <TouchableOpacity onPress={() => setExtractedItems([])}>
                  <Text className="text-[11px] text-slate-400">Clear</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-56">
                {extractedItems.map((it, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center p-2.5 mb-2 rounded-2xl border"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                    <Image
                      source={{ uri: it.imageUrl }}
                      className="w-12 h-12 rounded-xl mr-3 bg-slate-800"
                    />
                    <View className="flex-1">
                      <Text className="text-xs font-bold" style={{ color: colors.text }}>
                        {it.name}
                      </Text>
                      <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                        {it.category} • {it.variants?.[0]?.name || it.unit || 'pcs'}
                      </Text>
                    </View>
                    <Text className="text-sm font-black text-amber-500 font-mono">
                      ₹{it.price}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-2">
            {!isListening && transcript && extractedItems.length === 0 && !analyzing ? (
              <TouchableOpacity
                onPress={handleManualAnalyze}
                className="flex-1 py-3 rounded-2xl items-center justify-center border"
                style={{ borderColor: colors.primary, backgroundColor: colors.badgeBg }}
              >
                <Text className="text-xs font-bold text-amber-500">Re-Parse Speech</Text>
              </TouchableOpacity>
            ) : null}

            {extractedItems.length > 0 ? (
              <TouchableOpacity
                onPress={handleSaveToInventory}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl items-center justify-center shadow-lg"
                style={{ backgroundColor: colors.primary }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-xs font-black text-black uppercase tracking-wider">
                    Add All to Menu ({extractedItems.length})
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};
