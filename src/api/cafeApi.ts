import { api } from './api';
import { MenuItem, OrderInvoice, CustomerInfo, CartItem } from '../types';
import { DEFAULT_MENU_ITEMS } from '../data/defaultCatalog';

/**
 * Fetch all store menu items. If none exist in backend, returns pre-seeded defaults.
 */
export const getMenuItemsApi = async (category?: string, query?: string): Promise<MenuItem[]> => {
  try {
    const params: any = {};
    if (category && category !== 'all') params.category = category;
    if (query && query.trim()) params.q = query.trim();

    const res = await api.get('/store-items', { params });
    if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length > 0) {
      return res.data.items.map((it: any) => ({
        ...it,
        id: it._id || it.id,
      }));
    }

    // Only if backend is completely empty (brand new store with 0 items), seed once
    if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length === 0 && (!category || category === 'all') && !query) {
      try {
        const seedRes = await api.post('/store-items/seed-cafe', { overwrite: false });
        if (seedRes.data?.items && seedRes.data.items.length > 0) {
          return seedRes.data.items.map((it: any) => ({ ...it, id: it._id || it.id }));
        }
      } catch (seedErr) {
        console.warn('[CafeApi] Initial seed failed:', seedErr);
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
  subtotal: number;
  discount: number;
  notes?: string;
}): Promise<{ success: boolean; invoice: any; message?: string }> => {
  const payload = {
    customerName: order.customer.name || 'Walk-in Guest',
    customerPhone: order.customer.phone || '',
    customer: order.customer,
    items: order.items.map((i) => ({
      name: i.selectedVariant ? `${i.name} (${i.selectedVariant.name})` : i.name,
      qty: i.qty,
      unit: i.unit || 'pcs',
      price: i.price,
    })),
    totalAmount: order.total,
    grandTotal: order.total,
    // Subtotal before discount; the server stores it as originalAmount
    originalAmount: order.subtotal,
    discount: order.discount,
    receivedAmount: order.receivedAmount,
    balanceAmount: order.dueAmount,
    dueAmount: order.dueAmount,
    paymentMethod: order.paymentMethod,
    notes: order.notes || '',
  };

  const res = await api.post('/invoices', payload);
  const invoice = res.data?.invoice || res.data;
  return {
    success: true,
    invoice,
    message: res.data?.message,
  };
};

/**
 * Update shop settings (shopName, address, phone, gstNumber, receiptTemplate)
 */
export const updateShopSettingsApi = async (settings: {
  shopName?: string;
  name?: string;
  address?: string;
  gstNumber?: string;
  receiptTemplate?: string;
}) => {
  const res = await api.put('/auth/settings', settings);
  return res.data;
};

/**
 * Fetch all past invoices for today / history
 */
export const getInvoicesApi = async (): Promise<any[]> => {
  try {
    const res = await api.get('/invoices');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (Array.isArray(res.data?.invoices)) {
      return res.data.invoices;
    }
    return [];
  } catch (err) {
    console.warn('[CafeApi] Failed to fetch invoices:', err);
    return [];
  }
};

/**
 * Fetch all customers with due balance
 */
export const getCustomersWithDueApi = async (): Promise<any[]> => {
  try {
    const res = await api.get('/customers');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (Array.isArray(res.data?.customers)) {
      return res.data.customers;
    }
    return [];
  } catch (err) {
    console.warn('[CafeApi] Failed to fetch customers:', err);
    return [];
  }
};

export interface LedgerEntry {
  type: 'bill' | 'payment';
  id: string;
  date: string;
  // bill
  total?: number;
  paidAtBill?: number;
  dueAtBill?: number;
  dueNow?: number;
  items?: number;
  // payment
  amount?: number;
  bills?: string[];
  dueAfter?: number;
  approximateDate?: boolean;
  notes?: string;
  paymentMethod?: string;
}

export interface CustomerLedger {
  billed: number;
  paid: number;
  paidLater: number;
  due: number;
  entries: LedgerEntry[];
}

/**
 * Khata history of one customer: bills and dues payments, newest first
 */
export const getCustomerLedgerApi = async (phone?: string, name?: string): Promise<CustomerLedger> => {
  const res = await api.get('/customers/ledger', { params: { phone: phone || '', name: name || '' } });
  return res.data;
};

/**
 * Record a dues payment; the server applies it to the oldest unpaid bills first
 */
export const settleCustomerDueApi = async (data: {
  phone: string;
  amount: number;
  paymentMethod: 'cash' | 'online';
  notes?: string;
}): Promise<{ success: boolean; settledAmount: number; remainingDue: number }> => {
  const res = await api.post('/customers/settle', data);
  return res.data;
};

/**
 * Fetch dynamic branding and customer care configuration from superadmin
 */
export const getAppConfigApi = async (): Promise<{
  branding: any;
  cafe: {
    logoUrl?: string;
    splashUrl?: string;
    helpPhone?: string;
    whatsappPhone?: string;
    helpEmail?: string;
  };
}> => {
  try {
    const res = await api.get('/config');
    return res.data;
  } catch (err) {
    console.warn('[CafeApi] Failed to fetch app config:', err);
    return { branding: {}, cafe: {} };
  }
};

/**
 * Raise a new support ticket directly from cafe app
 */
export const createTicketApi = async (data: {
  subject: string;
  category: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}) => {
  const res = await api.post('/tickets', data);
  return res.data;
};

/**
 * Get all support tickets raised by this cafe counter
 */
export const getTicketsApi = async () => {
  try {
    const res = await api.get('/tickets');
    return res.data?.tickets || [];
  } catch (err) {
    console.warn('[CafeApi] Failed to fetch tickets:', err);
    return [];
  }
};

/**
 * Get full conversation of a single ticket
 */
export const getTicketDetailApi = async (id: string) => {
  const res = await api.get(`/tickets/${id}`);
  return res.data?.ticket;
};

/**
 * Reply to a ticket
 */
export const replyTicketApi = async (id: string, text: string) => {
  const res = await api.post(`/tickets/${id}/reply`, { text });
  return res.data?.ticket;
};
