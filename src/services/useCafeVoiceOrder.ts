import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CartItem, MenuItem } from '../types';
import { DisambiguationItem } from '../components/DisambiguationModal';
import { useVoiceRecognition } from './useVoiceRecognition';
import {
  CafeItemEvent,
  CafeVoiceItem,
  CafeVoiceMode,
  endCafeVoice,
  getVoiceSocket,
  sendLiveAudio,
  sendTranscript,
  startCafeVoice,
  startLiveTurn,
  stopLiveTurn,
  subscribeCafeVoice,
} from './voiceSocketService';
import { isPcmRecorderAvailable, startPcmStream } from '../../modules/pcm-recorder';
import { parseCafeVoiceOrderApi, parseCafeVoiceOrderAudioApi } from '../api/cafeApi';
import { startAudioRecording, stopAudioRecording } from './audioRecorderService';
import { friendlyError } from '../utils/errorMessage';
import { findSpokenDishes, isQuestion, spokenVariant } from './voiceLocalRules';

const norm = (s?: string) => (s || '').trim().toLowerCase();
const cartIdFor = (name: string, variant?: string) => `${name}-${variant || 'default'}`;
const INTERIM_SEND_MS = 250;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';

export interface SelectionRequest extends DisambiguationItem {
  /** utterance + item key from the server, so later corrections find it */
  ref: string;
}

/**
 * What one voice item turned into on our side: a cart line, or a size question.
 * queueRef: the size question opened on the phone before the server answered.
 */
type Placement = { qty: number; cartId?: string; pending?: boolean; queueRef?: string };

interface Options {
  mode: CafeVoiceMode;
  menuItems: MenuItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  /** A question instead of an order ("aaj kitni sale hui"): hand it on. */
  onQuestion?: (text: string) => void;
}

/**
 * Real-time voice ordering for the new-order screen.
 * stream: phone speech-to-text → server → Gemini streaming (default)
 * live:   mic PCM → server → Gemini Live
 * The server announces each item once per utterance (add / update / retract /
 * remove); this hook applies those to the cart and the size-picker queue.
 */
export function useCafeVoiceOrder({ mode, menuItems, setCart, onQuestion }: Options) {
  const [selectionQueue, setSelectionQueue] = useState<SelectionRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [liveOn, setLiveOn] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);

  const menuRef = useRef(menuItems);
  menuRef.current = menuItems;
  const placements = useRef(new Map<string, Placement>());
  // Size questions opened on the phone, per utterance + dish
  const localPicks = useRef(new Map<string, Placement>());
  // Utterances that turned out to be questions: ignore their late item events
  const ignoredUtterances = useRef(new Set<string>());
  const onQuestionRef = useRef(onQuestion);
  onQuestionRef.current = onQuestion;
  const utterance = useRef(1);
  const lastInterimSent = useRef(0);
  const lastFinal = useRef({ text: '', at: 0 });
  const stopPcm = useRef<null | (() => void)>(null);
  const noticeTimer = useRef<any>(null);

  // Live needs the native mic module (new app build); otherwise stream
  const effectiveMode: CafeVoiceMode =
    mode === 'live' && isPcmRecorderAvailable ? 'live' : mode === 'audio' ? 'audio' : 'stream';

  const flash = useCallback((text: string, ms = 3500) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ms);
  }, []);

  // ── cart helpers ──
  const changeLine = useCallback(
    (item: CafeVoiceItem, variantName: string | undefined, price: number, unit: string | undefined, delta: number) => {
      const id = cartIdFor(item.itemName, variantName);
      const menu = menuRef.current.find((m) => norm(m.name) === norm(item.itemName));
      setCart((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) {
          if (delta <= 0) return prev;
          return [
            ...prev,
            {
              id,
              menuItemId: menu?.id,
              name: item.itemName,
              category: menu?.category || 'General',
              selectedVariant: variantName ? { name: variantName, price, unit } : undefined,
              price,
              qty: delta,
              unit: unit || menu?.unit || 'pcs',
              imageUrl: menu?.imageUrl || FALLBACK_IMAGE,
              isVeg: menu?.isVeg !== false,
            },
          ];
        }
        const qty = prev[idx].qty + delta;
        return qty > 0
          ? prev.map((l, i) => (i === idx ? { ...l, qty } : l))
          : prev.filter((_, i) => i !== idx);
      });
      return id;
    },
    [setCart]
  );

  const applyEvent = useCallback(
    (e: CafeItemEvent) => {
      if (ignoredUtterances.current.has(String(e.utteranceId))) return;
      const ref = `${e.utteranceId}|${e.key}`;
      const it = e.item;
      let placed = placements.current.get(ref);

      // The phone already opened a size popup for this dish in this utterance
      const localKey = `${e.utteranceId}|${norm(it.itemName)}`;
      const local = localPicks.current.get(localKey);
      if (e.action === 'add' && !placed && local) {
        if (local.pending && !it.needsSelection) {
          // Size was said after all: close our popup, add what the server heard
          setSelectionQueue((prev) => prev.filter((q) => q.ref !== local.queueRef));
          if (local.queueRef) placements.current.delete(local.queueRef);
          localPicks.current.delete(localKey);
        } else {
          // Same dish: keep the popup / the size the cashier picked, take the qty
          if (local.pending) {
            setSelectionQueue((prev) => prev.map((q) => (q.ref === local.queueRef ? { ...q, qty: it.qty } : q)));
          } else if (local.cartId && it.qty !== local.qty) {
            const variant = local.cartId.slice(it.itemName.length + 1);
            changeLine(it, variant === 'default' ? undefined : variant, it.price, it.unit, it.qty - local.qty);
          }
          local.qty = it.qty;
          placements.current.set(ref, local);
          return;
        }
      }
      placed = placements.current.get(ref);

      if (e.action === 'remove') {
        setCart((prev) => prev.filter((l) => norm(l.name) !== norm(it.itemName)));
        setSelectionQueue((prev) => prev.filter((q) => norm(q.itemName) !== norm(it.itemName)));
        flash(`Removed ${it.itemName}`);
        return;
      }

      if (e.action === 'add' && !placed) {
        if (it.needsSelection) {
          placements.current.set(ref, { qty: it.qty, pending: true });
          setSelectionQueue((prev) => [
            ...prev,
            { ref, itemName: it.itemName, qty: it.qty, availableVariants: it.availableVariants || [] },
          ]);
        } else {
          const cartId = changeLine(it, it.variantName, it.price, it.unit, it.qty);
          placements.current.set(ref, { qty: it.qty, cartId });
          flash(`Added ${it.qty} × ${it.itemName}${it.variantName ? ` (${it.variantName})` : ''}`);
        }
        return;
      }
      if (!placed) return;

      if (e.action === 'update') {
        if (placed.pending) {
          const qRef = placed.queueRef || ref;
          setSelectionQueue((prev) => prev.map((q) => (q.ref === qRef ? { ...q, qty: it.qty } : q)));
        } else if (placed.cartId) {
          const line = { ...it, itemName: it.itemName };
          const variant = placed.cartId.slice(it.itemName.length + 1);
          changeLine(line, variant === 'default' ? undefined : variant, it.price, it.unit, it.qty - placed.qty);
        }
        placed.qty = it.qty;
      } else if (e.action === 'retract') {
        if (placed.pending) {
          const qRef = placed.queueRef || ref;
          setSelectionQueue((prev) => prev.filter((q) => q.ref !== qRef));
        } else if (placed.cartId) {
          setCart((prev) =>
            prev
              .map((l) => (l.id === placed.cartId ? { ...l, qty: l.qty - placed.qty } : l))
              .filter((l) => l.qty > 0)
          );
        }
        placements.current.delete(ref);
      }
    },
    [changeLine, flash, setCart]
  );

  // ── size picker ──
  // The picker answers for one specific item (its ref). A double tap must not
  // resolve / skip the next queued item, so the pending placement (updated
  // synchronously) is the guard, and the cart change happens outside the updater.
  const queueRef = useRef(selectionQueue);
  queueRef.current = selectionQueue;

  const resolveSelection = useCallback(
    (variantName: string, price: number, unit?: string, ref?: string) => {
      const target = ref ?? queueRef.current[0]?.ref;
      const item = queueRef.current.find((q) => q.ref === target);
      if (!target || !item || !placements.current.get(target)?.pending) return;
      const qty = item.qty || 1;
      const cartId = changeLine(
        { itemName: item.itemName, qty, price, unit: unit || 'pcs', needsSelection: false },
        variantName,
        price,
        unit,
        qty
      );
      // Same object the server's events point at (phone-side popups)
      const placement = placements.current.get(target)!;
      placement.qty = qty;
      placement.cartId = cartId;
      placement.pending = false;
      setSelectionQueue((prev) => prev.filter((q) => q.ref !== target));
    },
    [changeLine]
  );

  const skipSelection = useCallback((ref?: string) => {
    const target = ref ?? queueRef.current[0]?.ref;
    if (!target || !placements.current.get(target)?.pending) return;
    placements.current.delete(target);
    setSelectionQueue((prev) => prev.filter((q) => q.ref !== target));
  }, []);

  // ── session: warm the menu cache as soon as the order screen opens ──
  useEffect(() => {
    startCafeVoice();
    const unsub = subscribeCafeVoice({
      onItem: applyEvent,
      onBusy: (e) => setBusy(e.busy),
      onHeard: (e) => setHeard((prev) => `${prev}${e.text}`.slice(-80)),
      onError: (e) => flash(e.message, 4000),
    });
    return () => {
      unsub();
      stopPcm.current?.();
      stopPcm.current = null;
      endCafeVoice();
    };
  }, [applyEvent, flash]);

  // ── stream mode: phone speech recognition ──
  const sendFinal = useCallback(
    async (text: string) => {
      const now = Date.now();
      // Android sometimes repeats the same final result
      if (norm(text) === lastFinal.current.text && now - lastFinal.current.at < 3000) return;
      lastFinal.current = { text: norm(text), at: now };
      const id = String(utterance.current++);
      setHeard(text);

      if (getVoiceSocket().connected) {
        sendTranscript(id, text, true);
        return;
      }
      // No socket (bad network): one plain request, applied as this utterance
      try {
        setBusy(true);
        const res = await parseCafeVoiceOrderApi(text, []);
        (res?.actions || []).forEach((a, i) => {
          if (a.type !== 'ADD' && a.type !== 'NEEDS_SELECTION' && a.type !== 'DELETE') return;
          const menu = menuRef.current.find((m) => norm(m.name) === norm(a.itemName));
          const variants = menu?.variants || a.availableVariants || [];
          const chosen = a.variantName ? variants.find((v) => norm(v.name) === norm(a.variantName)) : undefined;
          applyEvent({
            utteranceId: `rest-${id}`,
            key: String(i),
            action: a.type === 'DELETE' ? 'remove' : 'add',
            item: {
              itemName: menu?.name || a.itemName,
              qty: a.qty || 1,
              variantName: chosen?.name,
              price: chosen?.price ?? a.price ?? menu?.price ?? 0,
              unit: chosen?.unit || a.unit || menu?.unit || 'pcs',
              needsSelection: variants.length > 1 && !chosen,
              availableVariants: variants,
            },
          });
        });
      } catch (err) {
        flash(friendlyError(err, 'Could not understand. Please try again.'), 4000);
      } finally {
        setBusy(false);
      }
    },
    [applyEvent, flash]
  );

  // Dish name heard (still speaking): open its size popup right away, on the
  // phone. The server's answer for the same dish then only sets the quantity.
  const openLocalPopups = useCallback((text: string) => {
    if (isQuestion(text)) return;
    const utt = String(utterance.current);
    for (const item of findSpokenDishes(text, menuRef.current)) {
      if ((item.variants || []).length < 2 || spokenVariant(text, item)) continue;
      const key = `${utt}|${norm(item.name)}`;
      if (localPicks.current.has(key)) continue;
      const queueRef = `local|${key}`;
      const placement: Placement = { qty: 1, pending: true, queueRef };
      localPicks.current.set(key, placement);
      placements.current.set(queueRef, placement);
      setSelectionQueue((prev) => [
        ...prev,
        { ref: queueRef, itemName: item.name, qty: 1, availableVariants: item.variants || [] },
      ]);
    }
  }, []);

  // A question after all: undo anything this utterance put in the cart / queue
  const dropUtterance = useCallback(
    (id: string) => {
      ignoredUtterances.current.add(id);
      const prefixes = [`${id}|`, `local|${id}|`];
      for (const [ref, p] of placements.current) {
        if (!prefixes.some((x) => ref.startsWith(x))) continue;
        if (p.pending) setSelectionQueue((prev) => prev.filter((q) => q.ref !== (p.queueRef || ref)));
        else if (p.cartId) {
          setCart((prev) =>
            prev.map((l) => (l.id === p.cartId ? { ...l, qty: l.qty - p.qty } : l)).filter((l) => l.qty > 0)
          );
          p.qty = 0;
        }
        placements.current.delete(ref);
      }
    },
    [setCart]
  );

  const speech = useVoiceRecognition({
    locale: 'en-IN',
    onInterimResult: (text) => {
      setHeard(text);
      openLocalPopups(text);
      const now = Date.now();
      if (now - lastInterimSent.current < INTERIM_SEND_MS) return;
      lastInterimSent.current = now;
      if (getVoiceSocket().connected) sendTranscript(String(utterance.current), text, false);
    },
    onPhraseSpoken: (text) => {
      const clean = text.trim();
      if (!clean) return;
      if (onQuestionRef.current && isQuestion(clean)) {
        dropUtterance(String(utterance.current++));
        onQuestionRef.current(clean);
        return;
      }
      openLocalPopups(clean);
      sendFinal(clean);
    },
  });

  // ── live mode: mic audio to Gemini Live ──
  const startLive = useCallback(async () => {
    try {
      setHeard('');
      startLiveTurn();
      stopPcm.current = await startPcmStream(sendLiveAudio);
      setLiveOn(true);
    } catch (err) {
      stopLiveTurn();
      flash(friendlyError(err, 'Could not start the microphone.'), 4000);
    }
  }, [flash]);

  const stopLive = useCallback(() => {
    stopPcm.current?.();
    stopPcm.current = null;
    stopLiveTurn();
    setLiveOn(false);
  }, []);

  
  // ── audio mode: direct audio to Gemini Multimodal ──
  const startAudio = useCallback(async () => {
    try {
      setHeard('Listening...');
      const started = await startAudioRecording();
      if (started) {
        setAudioRecording(true);
      } else {
        flash('Could not access microphone.');
      }
    } catch (err) {
      flash(friendlyError(err, 'Microphone error'));
    }
  }, [flash]);

  const stopAudio = useCallback(
    async (opts?: { abort?: boolean }) => {
      setAudioRecording(false);
      const { uri, durationSec } = await stopAudioRecording();
      if (opts?.abort || !uri || durationSec < 0.25) {
        setHeard('');
        return;
      }

      try {
        setBusy(true);
        setHeard('Processing audio...');
        const id = String(utterance.current++);
        const res = await parseCafeVoiceOrderAudioApi(uri, 'audio/m4a', []);
        if (res?.transcript) {
          setHeard(res.transcript);
        }
        (res?.actions || []).forEach((a, i) => {
          if (a.type !== 'ADD' && a.type !== 'NEEDS_SELECTION' && a.type !== 'DELETE') return;
          const menu = menuRef.current.find((m) => norm(m.name) === norm(a.itemName));
          const variants = menu?.variants || a.availableVariants || [];
          const chosen = a.variantName ? variants.find((v) => norm(v.name) === norm(a.variantName)) : undefined;
          applyEvent({
            utteranceId: `audio-${id}`,
            key: String(i),
            action: a.type === 'DELETE' ? 'remove' : 'add',
            item: {
              itemName: menu?.name || a.itemName,
              qty: a.qty || 1,
              variantName: chosen?.name,
              price: chosen?.price ?? a.price ?? menu?.price ?? 0,
              unit: chosen?.unit || a.unit || menu?.unit || 'pcs',
              needsSelection: variants.length > 1 && !chosen,
              availableVariants: variants,
            },
          });
        });
        if (res?.summary) {
          flash(res.summary);
        }
      } catch (err) {
        flash(friendlyError(err, 'Could not understand order. Please try again.'), 4000);
      } finally {
        setBusy(false);
      }
    },
    [applyEvent, flash]
  );

  const isListening =
    effectiveMode === 'live' ? liveOn : effectiveMode === 'audio' ? audioRecording : speech.isListening;

  const startListening = useCallback(() => {
    if (effectiveMode === "live") {
      startLive();
    } else if (effectiveMode === "audio") {
      startAudio();
    } else {
      setHeard("");
      speech.startListening();
    }
  }, [effectiveMode, speech, startAudio, startLive]);

  const stopListening = useCallback((opts?: { abort?: boolean }) => {
    if (effectiveMode === 'live') {
      stopLive();
    } else if (effectiveMode === 'audio') {
      stopAudio(opts);
    } else {
      speech.stopListening(opts);
    }
  }, [effectiveMode, speech, stopAudio, stopLive]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening,
    startListening,
    stopListening, startListening, stopListening]);

  return {
    mode: effectiveMode,
    isListening,
    startListening,
    stopListening,
    toggleListening,
    busy,
    heard,
    notice,
    selectionQueue,
    resolveSelection,
    skipSelection,
  };
}
