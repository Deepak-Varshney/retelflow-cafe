import { api } from './api';
import { VoiceForm } from '../services/voiceTargets';

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

export interface AssistantResult {
  intent: 'edit_form' | 'settle_due' | 'query' | 'navigate' | 'none';
  reply: string;
  form?: VoiceForm;
  settle?: {
    customerName: string;
    /** 0 = clear the whole due */
    amount: number;
    paymentMethod: 'cash' | 'online';
    candidates: SettleCandidate[];
  };
  data?: { kind: string; rows: AssistantRow[] };
  navigate?: { tab: 'order' | 'menu' | 'history' | 'khata' | 'more' };
}

export const askAssistantApi = async (req: {
  transcript: string;
  screen: string;
  form?: VoiceForm | null;
}): Promise<AssistantResult> => {
  const res = await api.post('/cafe/assistant', req);
  return res.data;
};

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
