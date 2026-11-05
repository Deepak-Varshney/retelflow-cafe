import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { useVoiceRecognition } from '../services/useVoiceRecognition';
import {
  VoiceStatus,
  addModalMicHost,
  emitVoiceDataChanged,
  hasModalMicHost,
  micPosition,
  voiceNavigate,
  getActiveVoiceTarget,
  getExternalVoiceStatus,
  subscribeVoiceTargets,
} from '../services/voiceTargets';
import { AssistantRow, SettleCandidate, askAssistantApi } from '../api/assistantApi';
import { api } from '../api/api';
import { friendlyError } from '../utils/errorMessage';

const SIZE = 58;
const EDGE = 8;
const HOLD_MS = 220;
const DRAG_SLOP = 8;
// Above the bottom tab bar
const PANEL_BOTTOM = 96;

interface SettlePrompt {
  customerName: string;
  amount: number; // 0 = whole due
  paymentMethod: 'cash' | 'online';
  candidates: SettleCandidate[];
  picked: SettleCandidate | null;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Floating mic available on every screen (like the Realme/POCO side ball).
 * Drag to move (snaps to the nearest edge). Hold to talk, release to send;
 * or tap once to start and tap again to stop.
 */
export const GlobalVoiceBubble: React.FC<{ inModal?: boolean }> = ({ inModal = false }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  // ── position (shared, so the modal copy appears exactly where the app one was) ──
  if (micPosition.x < 0) {
    micPosition.x = width - SIZE - EDGE;
    micPosition.y = height * 0.55;
  }
  const pos = useRef(new Animated.ValueXY({ x: micPosition.x, y: micPosition.y })).current;
  const posRef = useRef(micPosition);

  useEffect(() => (inModal ? addModalMicHost() : undefined), [inModal]);
  const pulse = useRef(new Animated.Value(1)).current;

  // ── voice state (own recognizer for non-hold targets) ──
  const [, forceRender] = useState(0);
  const [ownStatus, setOwnStatus] = useState<VoiceStatus>({ listening: false, heard: '', busy: false, notice: '' });
  const [answer, setAnswer] = useState<{ title: string; rows: AssistantRow[] } | null>(null);
  const [settle, setSettle] = useState<SettlePrompt | null>(null);
  const [settling, setSettling] = useState(false);

  const talkingRef = useRef(false);
  const handsFreeRef = useRef(false);
  const holdTargetRef = useRef<ReturnType<typeof getActiveVoiceTarget>>(null);
  const bufferRef = useRef('');
  const interimRef = useRef('');
  const pendingProcessRef = useRef(false);
  const processTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processRef = useRef<(text: string) => void>(() => {});
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeVoiceTargets(() => forceRender((n) => n + 1)), []);

  const flash = useCallback((notice: string, ms = 3500) => {
    setOwnStatus((s) => ({ ...s, notice }));
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setOwnStatus((s) => ({ ...s, notice: '' })), ms);
  }, []);

  const target = getActiveVoiceTarget();
  const speech = useVoiceRecognition({
    locale: target?.locale || 'hi-IN',
    onPhraseSpoken: (phrase) => {
      bufferRef.current = `${bufferRef.current} ${phrase}`.trim();
      interimRef.current = '';
      setOwnStatus((s) => ({ ...s, heard: bufferRef.current.slice(-80) }));
      // Final words after release: send right after they land
      if (pendingProcessRef.current) scheduleProcess(150);
    },
    onInterimResult: (interim) => {
      interimRef.current = interim;
      setOwnStatus((s) => ({ ...s, heard: `${bufferRef.current} ${interim}`.trim().slice(-80) }));
    },
  });

  // Send what was heard once the recognizer's final result arrives (or after
  // a short wait, falling back to the last partial words)
  function scheduleProcess(ms: number) {
    if (processTimer.current) clearTimeout(processTimer.current);
    processTimer.current = setTimeout(() => {
      if (!pendingProcessRef.current) return;
      pendingProcessRef.current = false;
      const text = `${bufferRef.current} ${bufferRef.current ? '' : interimRef.current}`.trim();
      bufferRef.current = '';
      interimRef.current = '';
      processRef.current(text);
    }, ms);
  }

  // ── what to do with the final sentence ──
  const settleNow = useCallback(
    async (c: SettleCandidate, amount: number, method: 'cash' | 'online') => {
      const pay = amount > 0 ? Math.min(amount, c.due) : c.due;
      setSettling(true);
      try {
        const res = await api.post('/customers/settle', {
          phone: c.phone || c.name,
          name: c.name,
          amount: pay,
          paymentMethod: method,
          notes: 'Voice',
        });
        const left = Number(res.data?.remainingDue) || 0;
        flash(`${c.name}: ${money(res.data?.settledAmount || pay)} settled · baaki ${money(left)}`, 5000);
        emitVoiceDataChanged('customers');
      } catch (e: any) {
        flash(friendlyError(e?.response?.data?.message || e?.message, 'Settle nahi hua, phir try karo.'), 5000);
      } finally {
        setSettling(false);
        setSettle(null);
      }
    },
    [flash]
  );

  const processTranscript = useCallback(
    async (text: string) => {
      const t = getActiveVoiceTarget();
      if (!text.trim()) {
        flash('Kuch suna nahi, phir se boliye.');
        return;
      }
      setOwnStatus((s) => ({ ...s, busy: true }));
      try {
        if (t?.onTranscript) {
          const notice = await t.onTranscript(text);
          if (notice) flash(notice);
          return;
        }
        const res = await askAssistantApi({ transcript: text, screen: t?.screen || 'unknown', form: t?.getForm?.() || null });

        if (res.intent === 'edit_form' && res.form && t?.applyForm) {
          t.applyForm(res.form);
          flash(res.reply || 'Form update ho gaya.');
        } else if (res.intent === 'settle_due' && res.settle) {
          const { candidates, amount, paymentMethod, customerName } = res.settle;
          if (!candidates.length) flash(res.reply || 'Koi due nahi mila.');
          // "Deepak se 300 mile" + exactly one clear match: settle right away
          else if (candidates.length === 1 && candidates[0].strong && amount > 0) {
            settleNow(candidates[0], amount, paymentMethod);
          } else {
            setSettle({
              customerName,
              amount,
              paymentMethod,
              candidates,
              picked: candidates.length === 1 ? candidates[0] : null,
            });
          }
        } else if (res.intent === 'query') {
          setAnswer({ title: res.reply, rows: res.data?.rows || [] });
        } else if (res.intent === 'navigate' && res.navigate) {
          voiceNavigate(res.navigate.tab);
          flash(res.reply || 'Khol diya.');
        } else {
          flash(res.reply || 'Samajh nahi aaya, phir se boliye.');
        }
      } catch (e: any) {
        flash(friendlyError(e?.response?.data?.message || e?.message, 'Voice assistant abhi available nahi.'), 4500);
      } finally {
        setOwnStatus((s) => ({ ...s, busy: false, heard: '' }));
      }
    },
    [flash, settleNow]
  );

  processRef.current = processTranscript;

  useEffect(() => {
    if (speech.error) flash(speech.error, 4000);
  }, [speech.error, flash]);

  const startTalk = useCallback(() => {
    if (talkingRef.current) return;
    talkingRef.current = true;
    setAnswer(null);
    const t = getActiveVoiceTarget();
    holdTargetRef.current = t;
    if (t?.hold) {
      t.hold.start();
      return;
    }
    bufferRef.current = '';
    interimRef.current = '';
    pendingProcessRef.current = false;
    setOwnStatus({ listening: true, heard: '', busy: false, notice: '' });
    speech.startListening();
  }, [speech]);

  const stopTalk = useCallback(
    (abort = false) => {
      if (!talkingRef.current) return;
      talkingRef.current = false;
      handsFreeRef.current = false;
      const t = holdTargetRef.current;
      holdTargetRef.current = null;
      if (t?.hold) {
        t.hold.stop(abort);
        return;
      }
      setOwnStatus((s) => ({ ...s, listening: false }));
      if (abort) {
        bufferRef.current = '';
        speech.stopListening({ abort: true });
        return;
      }
      pendingProcessRef.current = true;
      speech.stopListening();
      scheduleProcess(1500);
    },
    [speech]
  );

  // ── drag / hold / tap ──
  const gesture = useRef({ moved: false, holdTimer: null as ReturnType<typeof setTimeout> | null, sx: 0, sy: 0 });
  const startTalkRef = useRef(startTalk);
  startTalkRef.current = startTalk;
  const stopTalkRef = useRef(stopTalk);
  stopTalkRef.current = stopTalk;

  const snapToEdge = useCallback(() => {
    const { width: w, height: h } = Dimensions.get('window');
    const x = posRef.current.x + SIZE / 2 < w / 2 ? EDGE : w - SIZE - EDGE;
    const y = Math.min(Math.max(posRef.current.y, insets.top + 60), h - SIZE - PANEL_BOTTOM);
    posRef.current = { x, y };
    Object.assign(micPosition, posRef.current);
    Animated.spring(pos, { toValue: { x, y }, useNativeDriver: false, friction: 7 }).start();
  }, [insets.top, pos]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const g = gesture.current;
        g.moved = false;
        g.sx = posRef.current.x;
        g.sy = posRef.current.y;
        if (handsFreeRef.current) return; // tap mode: next tap stops
        g.holdTimer = setTimeout(() => {
          g.holdTimer = null;
          if (!g.moved) startTalkRef.current();
        }, HOLD_MS);
      },
      onPanResponderMove: (_e, { dx, dy }) => {
        const g = gesture.current;
        if (talkingRef.current && !handsFreeRef.current) return; // holding to talk: don't drag
        if (!g.moved && Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
        g.moved = true;
        if (g.holdTimer) {
          clearTimeout(g.holdTimer);
          g.holdTimer = null;
        }
        posRef.current = { x: g.sx + dx, y: g.sy + dy };
        pos.setValue(posRef.current);
      },
      onPanResponderRelease: () => {
        const g = gesture.current;
        if (g.holdTimer) {
          clearTimeout(g.holdTimer);
          g.holdTimer = null;
        }
        if (g.moved) {
          snapToEdgeRef.current();
          return;
        }
        if (handsFreeRef.current) {
          stopTalkRef.current(false); // second tap: send
        } else if (talkingRef.current) {
          stopTalkRef.current(false); // released after holding: send
        } else {
          handsFreeRef.current = true; // quick tap: hands-free until next tap
          startTalkRef.current();
        }
      },
      onPanResponderTerminate: () => {
        const g = gesture.current;
        if (g.holdTimer) clearTimeout(g.holdTimer);
        if (talkingRef.current && !handsFreeRef.current) stopTalkRef.current(true);
      },
    })
  ).current;
  const snapToEdgeRef = useRef(snapToEdge);
  snapToEdgeRef.current = snapToEdge;

  // ── status shown ──
  const usesHold = Boolean(target?.hold);
  const ext = getExternalVoiceStatus();
  const status: VoiceStatus = usesHold && ext ? { ...ext, notice: ext.notice || ownStatus.notice } : ownStatus;
  const active = status.listening || talkingRef.current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  // App-level mic steps aside while a full-screen modal shows its own
  const hidden = !inModal && hasModalMicHost();
  if (hidden) return null;

  const panelText = status.listening
    ? status.heard
      ? `"${status.heard}"`
      : 'Listening… boliye'
    : status.busy
      ? 'Samajh raha hoon…'
      : status.notice;

  return (
    <>
      {/* Bottom-middle live panel: never takes touches, so it can't block the screen */}
      {panelText ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: PANEL_BOTTOM + insets.bottom, alignItems: 'center', zIndex: 998 }}
        >
          <View
            style={{
              maxWidth: '86%',
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: 'rgba(255,255,255,0.97)',
              shadowColor: colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            {status.busy ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name={status.listening ? 'mic' : 'sparkles'} size={14} color={colors.primary} style={{ marginRight: 8 }} />
            )}
            <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1 }}>
              {panelText}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Answer card for questions (last bill, best sellers…) */}
      {answer ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: PANEL_BOTTOM + insets.bottom, zIndex: 999 }}>
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: '#ffffff',
              padding: 14,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 12,
              maxHeight: height * 0.45,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' }}>{answer.title}</Text>
              <TouchableOpacity onPress={() => setAnswer(null)} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {answer.rows.length > 0 ? (
              <ScrollView style={{ marginTop: 8 }}>
                {answer.rows.map((r, i) => (
                  <View
                    key={`${r.label}-${i}`}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{r.label}</Text>
                      {r.sub ? <Text style={{ color: colors.textMuted, fontSize: 10 }}>{r.sub}</Text> : null}
                    </View>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900' }}>{r.value}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* The floating mic */}
      <Animated.View
        {...responder.panHandlers}
        style={{
          position: 'absolute',
          zIndex: 1000,
          width: SIZE,
          height: SIZE,
          transform: [{ translateX: pos.x }, { translateY: pos.y }],
        }}
      >
        <Animated.View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? '#ef4444' : colors.primary,
            borderWidth: 3,
            borderColor: 'rgba(255,255,255,0.85)',
            shadowColor: active ? '#ef4444' : colors.primary,
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 12,
            opacity: active || status.busy ? 1 : 0.92,
            transform: [{ scale: pulse }],
          }}
        >
          {status.busy && !active ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Ionicons name={active ? 'mic' : 'mic-outline'} size={26} color="#ffffff" />
          )}
        </Animated.View>
      </Animated.View>

      {/* Settle popup: pick the right customer, then settle (part or all) */}
      <Modal visible={Boolean(settle)} transparent animationType="fade" onRequestClose={() => setSettle(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 22, padding: 18 }}>
            {settle && !settle.picked ? (
              <>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                  Kaunse {settle.customerName}?
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: 10 }}>
                  Is naam ke {settle.candidates.length} customers ka due hai
                </Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {settle.candidates.map((c) => (
                    <TouchableOpacity
                      key={`${c.phone}-${c.name}`}
                      onPress={() =>
                        settle.amount > 0
                          ? settleNow(c, settle.amount, settle.paymentMethod)
                          : setSettle({ ...settle, picked: c })
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{c.phone || 'No mobile'} · {c.bills} bill(s)</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#ef4444' }}>{money(c.due)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : settle?.picked ? (
              <>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>{settle.picked.name}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {settle.picked.phone || 'No mobile'} · total due {money(settle.picked.due)}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginVertical: 14 }}>
                  {settle.amount > 0
                    ? `${money(Math.min(settle.amount, settle.picked.due))} settle karein?`
                    : `Pura due ${money(settle.picked.due)} settle karein?`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['cash', 'online'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      disabled={settling}
                      onPress={() => settleNow(settle.picked!, settle.amount, m)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        backgroundColor: m === settle.paymentMethod ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: colors.primary,
                      }}
                    >
                      {settling && m === settle.paymentMethod ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <Text style={{ fontWeight: '900', fontSize: 12, color: m === settle.paymentMethod ? '#000' : colors.primary }}>
                          {settle.amount > 0 ? 'Settle' : 'Settle All'} · {m === 'cash' ? 'Cash' : 'Online'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            <TouchableOpacity onPress={() => setSettle(null)} disabled={settling} style={{ marginTop: 12, alignItems: 'center', padding: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
