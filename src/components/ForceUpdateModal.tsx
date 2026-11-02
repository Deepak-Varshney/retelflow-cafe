import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  BackHandler,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';

interface ForceUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  apkUrl: string;
  title?: string;
  message?: string;
  releaseNotes?: string;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  currentVersion,
  latestVersion,
  apkUrl,
  title = 'Important Update Required 🚀',
  message = 'A mandatory update is available to keep your cafe counter running smoothly.',
  releaseNotes,
}) => {
  const { colors, isDark } = useTheme();

  // Block Android hardware back button when force update is active
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, [visible]);

  const handleUpdate = () => {
    if (apkUrl && apkUrl.startsWith('http')) {
      Linking.openURL(apkUrl).catch((err) => {
        console.warn('Could not open APK URL:', err);
      });
    }
  };

  const notesList = (releaseNotes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}} // Unclosable on Android
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 20, 36, 0.98)' : 'rgba(255, 255, 255, 0.99)',
              borderColor: colors.primary,
            },
          ]}
        >
          {/* Top Hero Icon */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: colors.badgeBg, borderColor: colors.primary },
            ]}
          >
            <Ionicons name="cloud-download" size={36} color={colors.primary} />
          </View>

          {/* Badge */}
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' },
            ]}
          >
            <View style={styles.redDot} />
            <Text style={styles.badgeText}>MANDATORY UPDATE</Text>
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Version Pills */}
          <View style={styles.versionRow}>
            <View
              style={[
                styles.versionPill,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>Current</Text>
              <Text style={[styles.versionVal, { color: colors.text }]}>v{currentVersion}</Text>
            </View>

            <Ionicons name="arrow-forward" size={18} color={colors.primary} style={{ marginHorizontal: 8 }} />

            <View
              style={[
                styles.versionPill,
                { backgroundColor: colors.badgeBg, borderColor: colors.primary, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.versionLabel, { color: colors.primary }]}>New Version</Text>
              <Text style={[styles.versionVal, { color: colors.primary, fontWeight: '900' }]}>
                v{latestVersion}
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          {notesList.length > 0 && (
            <View style={styles.notesContainer}>
              <Text style={[styles.notesHeader, { color: colors.text }]}>What&apos;s New:</Text>
              <ScrollView style={{ maxHeight: 110 }} showsVerticalScrollIndicator={false}>
                {notesList.map((note, idx) => (
                  <View key={idx} style={styles.noteItem}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
                    <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Download & Update Button */}
          <TouchableOpacity
            onPress={handleUpdate}
            activeOpacity={0.88}
            style={[
              styles.btn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="download"
              size={18}
              color={isDark ? '#020617' : '#ffffff'}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.btnText,
                { color: isDark ? '#020617' : '#ffffff' },
              ]}
            >
              DOWNLOAD &amp; INSTALL UPDATE
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Download will start in browser. Tap the downloaded file to install.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  versionVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
