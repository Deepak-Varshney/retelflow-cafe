import { api } from './api';
import { authStorage } from '../auth/authStorage';
import { getVoiceSocket } from '../services/voiceSocketService';
import type { VoiceForm, VoiceTab } from '../services/voiceTargets';

export interface AssistantRow {
  label: string;
  sub?: string;
  value: string;
}

export interface SettleCandidate {
  name: string;
  phone: string;
  due: number;
  bills: number;
  /** Exact name/phone match: safe to settle without asking. */
  strong?: boolean;
}

export interface BillSpec {
  billNumber?: string;
  customerName?: string;
  which?: 'last' | 'first';
  then?: 'open' | 'print' | 'whatsapp';
}

export interface BillFilter {
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  paymentMethod?: 'cash' | 'online' | 'credit' | 'any';
  customerName?: string;
}

/** One thing the assistant wants done (server: utils/cafeAssistant.js resolveAction). */
export type AssistantAction =
  | { type: 'set_form'; form: VoiceForm }
  | { type: 'add_dishes'; dishes: VoiceForm[] }
  | { type: 'delete_dishes'; dishes: { id: string; name: string }[] }
  | { type: 'edit_dish'; id: string; name: string; form: VoiceForm }
  | { type: 'open_bill'; bill: BillSpec }
  | { type: 'filter_bills'; filter: BillFilter }
  | { type: 'answer'; reply: string; data?: { kind: string; rows: AssistantRow[] } }
  | {
      type: 'settle';
      customerName: string;
      /** 0 = clear the whole due */
      amount: number;
      paymentMethod: 'cash' | 'online';
      candidates: SettleCandidate[];
    }
  | { type: 'navigate'; tab: VoiceTab }
  | { type: 'notice'; text: string; speak?: boolean };

export interface AssistantRequest {
  transcript: string;
  screen: string;
  form?: VoiceForm | null;
  /** App-side timings (ms) for the server log */
  timing?: Record<string, number>;
}

let askSeq = 0;
const ASK_TIMEOUT_MS = 15000;

/**
 * Ask the assistant. Each action is handed to `onAction` as soon as the server
 * finishes it (streamed over the open voice socket); HTTP when the socket is down.
 */
export async function askAssistantStream(
  req: AssistantRequest,
  onAction: (a: AssistantAction) => void
): Promise<{ reply: string }> {
  const socket = getVoiceSocket();
  if (!socket.connected) {
    const res = await api.post(
      '/cafe/assistant',
      { transcript: req.transcript, screen: req.screen, form: req.form },
      {
        headers: {
          'x-voice-timing': Object.entries(req.timing || {})
            .map(([k, v]) => `${k}=${v}`)
            .join(','),
        },
      }
    );
    (res.data?.actions || []).forEach((a: AssistantAction) => onAction(a));
    return { reply: res.data?.reply || '' };
  }

  const id = `a${Date.now()}-${++askSeq}`;
  const token = await authStorage.getToken();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off('assistant:action', onActionEvent);
      socket.off('assistant:done', onDone);
    };
    const onActionEvent = (e: { id: string; action: AssistantAction }) => {
      if (e?.id === id) onAction(e.action);
    };
    const onDone = (e: { id: string; reply?: string; error?: string }) => {
      if (e?.id !== id) return;
      cleanup();
      if (e.error) reject(new Error(e.error));
      else resolve({ reply: e.reply || '' });
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Voice assistant ne jawab nahi diya, phir se boliye.'));
    }, ASK_TIMEOUT_MS);
    socket.on('assistant:action', onActionEvent);
    socket.on('assistant:done', onDone);
    socket.emit('assistant:ask', { id, token, ...req });
  });
}

export interface CafeInsights {
  period: string;
  sales: number;
  orders: number;
  today: { sales: number; orders: number };
  lastBill: {
    invoiceId: string;
    customerName: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
    items: { name: string; qty: number; price: number }[];
  } | null;
  topItems: {
    name: string;
    qty: number;
    amount: number;
    variants: { name: string; qty: number; amount: number }[];
  }[];
}

/** null when the shop has insights set to voice-only, or on failure. */
export const getInsightsApi = async (period = 'month'): Promise<CafeInsights | null> => {
  try {
    const res = await api.get('/cafe/insights', { params: { period } });
    return res.data?.insights || null;
  } catch {
    return null;
  }
};
