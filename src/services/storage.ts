import { OrderInvoice, MenuItem } from '../types';

const CACHED_ORDERS_KEY = 'retelflow_cafe_orders';
const CACHED_MENU_KEY = 'retelflow_cafe_menu';

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch {}
    }
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    memoryStore.set(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    memoryStore.delete(key);
  },
};

export const saveCachedOrders = async (orders: OrderInvoice[]) => {
  try {
    await safeStorage.setItem(CACHED_ORDERS_KEY, JSON.stringify(orders));
  } catch {}
};

export const getCachedOrders = async (): Promise<OrderInvoice[]> => {
  try {
    const raw = await safeStorage.getItem(CACHED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCachedMenu = async (items: MenuItem[]) => {
  try {
    await safeStorage.setItem(CACHED_MENU_KEY, JSON.stringify(items));
  } catch {}
};

export const getCachedMenu = async (): Promise<MenuItem[]> => {
  try {
    const raw = await safeStorage.getItem(CACHED_MENU_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
