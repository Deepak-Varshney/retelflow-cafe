import { api } from './api';
import { MenuItem, OrderInvoice, CustomerInfo, CartItem } from '../types';
import { DEFAULT_MENU_ITEMS } from '../data/defaultCatalog';

/**
 * Fetch all store menu items. If none exist in backend, returns pre-seeded defaults.
 */
export const getMenuItemsApi = async (category?: string, query?: string): Promise<MenuItem[]> => {
  try {
    const params: any = { autoSeed: 'true' };
    if (category && category !== 'all') params.category = category;
    if (query && query.trim()) params.q = query.trim();

    const res = await api.get('/store-items', { params });
    if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length > 0) {
      const itemsList = res.data.items;
      const hasCafe = itemsList.some((it: any) =>
        ['Pizza', 'Cold Drinks', 'Waffles', 'Sweets', 'Burgers', 'Snacks', 'Chai & Coffee'].some((c) =>
          (it.category || '').toLowerCase().includes(c.toLowerCase())
        )
      );

      if (hasCafe) {
        return itemsList.map((it: any) => ({
          ...it,
          id: it._id || it.id,
        }));
      }

      // If backend has only non-cafe items, trigger seeding of cafe catalog
      try {
        const seedRes = await api.post('/store-items/seed-cafe', { overwrite: false });
        if (seedRes.data?.items && seedRes.data.items.length > 0) {
          return seedRes.data.items.map((it: any) => ({ ...it, id: it._id || it.id }));
        }
      } catch (seedErr) {
        console.warn('[CafeApi] Auto-seed failed:', seedErr);
      }
    }
  } catch (err) {
    console.warn('[CafeApi] Failed to fetch items from backend, using defaults:', err);
  }

  // Fallback to rich pre-seeded local defaults with images
  let items = [...DEFAULT_MENU_ITEMS];
  if (category && category !== 'all') {
    items = items.filter((it) => it.category.toLowerCase() === category.toLowerCase());
  }
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
    );
  }
  return items;
};

/**
 * Reset or seed the cafe catalog with standard pre-seeded items
 */
export const seedCafeCatalogApi = async (overwrite = false): Promise<MenuItem[]> => {
  const res = await api.post('/store-items/seed-cafe', { overwrite });
  return (res.data?.items || []).map((it: any) => ({ ...it, id: it._id || it.id }));
};

/**
 * Add a single new menu item manually
 */
export const addMenuItemApi = async (item: Partial<MenuItem>): Promise<MenuItem> => {
  const res = await api.post('/store-items', item);
  return { ...res.data.item, id: res.data.item._id || res.data.item.id };
};

/**
 * Update an existing menu item
 */
export const updateMenuItemApi = async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
  const res = await api.put(`/store-items/${id}`, updates);
  return { ...res.data.item, id: res.data.item._id || res.data.item.id };
};

/**
 * Delete a menu item
 */
export const deleteMenuItemApi = async (id: string): Promise<boolean> => {
  const res = await api.delete(`/store-items/${id}`);
  return res.data?.success === true;
};

/**
 * Bulk add items (used after voice bulk extraction or manual import)
 */
export const bulkAddMenuItemsApi = async (items: Partial<MenuItem>[]): Promise<MenuItem[]> => {
  const res = await api.post('/store-items/bulk', { items });
  return (res.data?.items || []).map((it: any) => ({ ...it, id: it._id || it.id }));
};

/**
 * Cafe Voice Ordering: Takes spoken order transcript & returns matched items or disambiguation actions
 */
export const parseCafeVoiceOrderApi = async (
  transcript: string,
  currentCartItems: CartItem[] = []
): Promise<{
  actions: Array<{
    type: 'ADD' | 'UPDATE' | 'DELETE' | 'NEEDS_SELECTION';
    itemName: string;
    variantName?: string;
    qty?: number;
    unit?: string;
    price?: number;
    totalSpokenAmount?: number;
    availableVariants?: Array<{ name: string; price: number; unit?: string }>;
  }>;
  summary: string;
}> => {
  try {
    const res = await api.post('/voice/cafe-order', {
      transcript,
      currentItems: currentCartItems,
    });
    return res.data;
  } catch (err: any) {
    console.warn('[Cafe Voice Order Error]:', err.message);
    throw err;
  }
};

/**
 * Voice Menu Item Add: Parses spoken items into inventory objects
 */
export const parseVoiceAddItemsApi = async (
  transcript: string
): Promise<{
  items: Array<{
    name: string;
    category: string;
    price: number;
    unit: string;
    imageUrl?: string;
    variants?: Array<{ name: string; price: number; unit?: string }>;
    isVeg?: boolean;
    description?: string;
  }>;
  summary: string;
}> => {
  const res = await api.post('/voice/add-items-voice', { transcript });
  return res.data;
};

/**
 * Search customer by phone
 */
export const searchCustomerApi = async (phone: string) => {
  try {
    const res = await api.get(`/customers/search?phone=${encodeURIComponent(phone)}`);
    return res.data;
  } catch {
    return { found: false, customer: null };
  }
};

/**
 * Create order invoice & record payment / credit
 */
export const createOrderInvoiceApi = async (order: {
  items: CartItem[];
  customer: CustomerInfo;
  paymentMethod: string;
  receivedAmount: number;
  dueAmount: number;
  total: number;
  notes?: string;
}): Promise<{ success: boolean; invoice: any }> => {
  const payload = {
    items: order.items.map((i) => ({
      name: i.selectedVariant ? `${i.name} (${i.selectedVariant.name})` : i.name,
      qty: i.qty,
      unit: i.unit || 'pcs',
      price: i.price,
    })),
    customer: order.customer,
    paymentMethod: order.paymentMethod,
    receivedAmount: order.receivedAmount,
    dueAmount: order.dueAmount,
    grandTotal: order.total,
    notes: order.notes || '',
  };

  const res = await api.post('/invoices', payload);
  return res.data;
};

/**
 * Fetch all past invoices for today / history
 */
export const getInvoicesApi = async () => {
  const res = await api.get('/invoices');
  return res.data?.invoices || [];
};

/**
 * Fetch all customers with due balance
 */
export const getCustomersWithDueApi = async () => {
  const res = await api.get('/customers');
  return res.data?.customers || [];
};
