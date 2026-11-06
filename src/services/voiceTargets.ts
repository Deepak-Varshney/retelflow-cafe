import type { AssistantAction } from '../api/assistantApi';

/**
 * Global voice assistant wiring.
 *
 * Every screen / open form registers a "voice target" describing what voice
 * can do there. The floating mic (GlobalVoiceBubble) always talks to the most
 * recently registered target, so opening a modal on top of a screen takes over
 * voice until it closes.
 *
 * A target picks one of three behaviours:
 *  - hold:         takes over the mic itself (New Order: realtime voice ordering)
 *  - onTranscript: handles the spoken text locally (Customer details: name/phone)
 *  - default:      text goes to the server assistant with `screen` + `getForm()`,
 *                  and `applyForm` receives the edited form back
 */

export interface VoiceForm {
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  isVeg: boolean;
  variants: { name: string; price: number; unit?: string; isDefault?: boolean }[];
}

export interface VoiceTarget {
  /** Sent to the assistant so it knows what the cashier is looking at. */
  screen: string;
  hold?: { start: () => void; stop: (abort: boolean) => void };
  onTranscript?: (text: string) => string | void | Promise<string | void>;
  getForm?: () => VoiceForm;
  applyForm?: (form: VoiceForm) => void;
  /**
   * Screen-specific assistant actions (add/delete/edit dishes, open bills…).
   * Return a notice to show, or false when this screen can't do it.
   */
  handleAction?: (a: AssistantAction) => string | void | false | Promise<string | void | false>;
  /** Instant on-phone handling of common commands; return a notice when handled. */
  tryLocal?: (text: string) => string | null | Promise<string | null>;
  /** Live partial words while the cashier is still speaking. */
  onInterim?: (text: string) => void;
  locale?: string;
}

/** Live status shown in the bottom-middle panel. */
export interface VoiceStatus {
  listening: boolean;
  heard: string;
  busy: boolean;
  notice: string;
}

type Listener = () => void;

const stack: { id: number; target: VoiceTarget }[] = [];
let nextId = 1;
let externalStatus: VoiceStatus | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

export function subscribeVoiceTargets(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Screen name used when the visible screen registered nothing (set by App)
let baseScreen = 'app';
export function setBaseVoiceScreen(name: string) {
  baseScreen = name;
}

export function getActiveVoiceTarget(): VoiceTarget | null {
  return stack.length ? stack[stack.length - 1].target : { screen: baseScreen };
}

/** Register a target; returns unregister. Re-registering updates in place. */
export function registerVoiceTarget(target: VoiceTarget) {
  const id = nextId++;
  stack.push({ id, target });
  emit();
  return {
    update(next: VoiceTarget) {
      const entry = stack.find((e) => e.id === id);
      if (entry) entry.target = next;
    },
    remove() {
      const idx = stack.findIndex((e) => e.id === id);
      if (idx !== -1) stack.splice(idx, 1);
      emit();
    },
  };
}

/** A `hold` target (order screen) reports its own live status here. */
export function setExternalVoiceStatus(status: VoiceStatus | null) {
  externalStatus = status;
  emit();
}

export function getExternalVoiceStatus() {
  return externalStatus;
}

// ── data-changed events (e.g. a voice settlement refreshes Khata) ──
type DataKind = 'customers' | 'menu' | 'orders';
const dataListeners = new Set<(kind: DataKind) => void>();

export function onVoiceDataChanged(listener: (kind: DataKind) => void) {
  dataListeners.add(listener);
  return () => {
    dataListeners.delete(listener);
  };
}

export function emitVoiceDataChanged(kind: DataKind) {
  dataListeners.forEach((l) => l(kind));
}

// ── shop settings the assistant needs ──
export type AnalyticsDisplay = 'voice' | 'screen' | 'both';
let analyticsDisplay: AnalyticsDisplay = 'both';

export function setAnalyticsDisplay(value?: string) {
  analyticsDisplay = value === 'voice' || value === 'screen' ? value : 'both';
  emit();
}

/** Insights cards on screens (last bill, best sellers, size split). */
export function showInsightsOnScreen() {
  return analyticsDisplay !== 'voice';
}

// ── navigation (set by App) ──
export type VoiceTab = 'order' | 'menu' | 'history' | 'khata' | 'more';
let navigator: ((tab: VoiceTab) => void) | null = null;

export function setVoiceNavigator(fn: ((tab: VoiceTab) => void) | null) {
  navigator = fn;
}

export function voiceNavigate(tab: VoiceTab) {
  navigator?.(tab);
}

// ── where the mic is drawn ──
// RN Modals cover the app, so an open full-screen modal renders its own mic
// (<GlobalVoiceBubble inModal />) and the app-level one hides meanwhile.
let modalHosts = 0;
export const micPosition = { x: -1, y: -1 };

export function addModalMicHost() {
  modalHosts += 1;
  emit();
  return () => {
    modalHosts = Math.max(0, modalHosts - 1);
    emit();
  };
}

export function hasModalMicHost() {
  return modalHosts > 0;
}

// ── run the assistant from code (e.g. a question asked on the New Order screen) ──
let assistantRunner: ((text: string, screen?: string) => void) | null = null;

export function setAssistantRunner(fn: ((text: string, screen?: string) => void) | null) {
  assistantRunner = fn;
}

export function runAssistant(text: string, screen?: string) {
  assistantRunner?.(text, screen);
}
