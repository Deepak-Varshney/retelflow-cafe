import { io, Socket } from 'socket.io-client';
import { getBaseUrl } from '../api/api';
import { authStorage } from '../auth/authStorage';

/**
 * Socket client for real-time cafe voice ordering (server: sockets/cafeVoiceSocket.js).
 * One shared connection; screens subscribe to the events they need.
 */

export type CafeVoiceMode = 'stream' | 'live';

export interface CafeVoiceItem {
  itemName: string;
  qty: number;
  variantName?: string;
  price: number;
  unit: string;
  needsSelection: boolean;
  availableVariants?: Array<{ name: string; price: number; unit?: string }>;
}

/**
 * add: new item in this utterance; update: same item, quantity corrected;
 * retract: the final words didn't include it after all; remove: cashier cancelled it.
 */
export interface CafeItemEvent {
  utteranceId: string;
  key: string;
  action: 'add' | 'update' | 'retract' | 'remove';
  item: CafeVoiceItem;
}

export interface CafeVoiceHandlers {
  onReady?: (e: { mode: CafeVoiceMode; items: number }) => void;
  onItem?: (e: CafeItemEvent) => void;
  onBusy?: (e: { utteranceId: string; busy: boolean }) => void;
  onHeard?: (e: { text: string }) => void;
  onError?: (e: { message: string }) => void;
}

let socket: Socket | null = null;
const handlers = new Set<CafeVoiceHandlers>();

const emitTo = <K extends keyof CafeVoiceHandlers>(key: K, payload: any) => {
  handlers.forEach((h) => {
    try {
      (h[key] as any)?.(payload);
    } catch (e) {
      console.warn('[Cafe Voice Socket] handler error:', e);
    }
  });
};

export const getBackendSocketUrl = (): string => getBaseUrl().replace(/\/api\/?$/, '');

export const getVoiceSocket = (): Socket => {
  if (!socket) {
    socket = io(getBackendSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socket.on('cafe:ready', (e) => emitTo('onReady', e));
    socket.on('cafe:item', (e) => emitTo('onItem', e));
    socket.on('cafe:busy', (e) => emitTo('onBusy', e));
    socket.on('cafe:heard', (e) => emitTo('onHeard', e));
    socket.on('cafe:error', (e) => emitTo('onError', e));
    socket.on('connect_error', (err) => console.warn('[Cafe Voice Socket] connection error:', err.message));
  }
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
};

export const subscribeCafeVoice = (h: CafeVoiceHandlers) => {
  getVoiceSocket();
  handlers.add(h);
  return () => {
    handlers.delete(h);
  };
};

/**
 * New order screen opened: server loads the menu and warms the Gemini context
 * cache before the cashier speaks. Re-sent after every reconnect.
 */
export const startCafeVoice = async () => {
  const s = getVoiceSocket();
  const token = await authStorage.getToken();
  const send = () => s.emit('cafe:start', { token });
  s.off('connect', send);
  s.on('connect', send);
  if (s.connected) send();
};

export const endCafeVoice = () => {
  if (!socket) return;
  socket.off('connect');
  socket.emit('cafe:end');
};

/** Stream mode: the words of the current utterance so far (whole text, not a delta). */
export const sendTranscript = (utteranceId: string, text: string, isFinal: boolean) => {
  getVoiceSocket().emit('cafe:transcript', { utteranceId, text, isFinal });
};

/** Live mode */
export const startLiveTurn = () => getVoiceSocket().emit('cafe:live-start');
export const sendLiveAudio = (data: string) => socket?.emit('cafe:audio', { data });
export const stopLiveTurn = () => socket?.emit('cafe:live-stop');
