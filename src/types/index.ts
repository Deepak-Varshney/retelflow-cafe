export interface ItemVariant {
  name: string; // e.g. "Small (7\")", "Medium (10\")", "Glass (250ml)", "1 kg", "500 gm"
  price: number;
  unit?: string;
  isDefault?: boolean;
}

export interface MenuItem {
  _id?: string;
  id?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl?: string;
  variants?: ItemVariant[];
  aliases?: string[];
  isVeg?: boolean;
  description?: string;
  isAvailable?: boolean;
}

export interface CartItem {
  id: string; // generated unique cart id (e.g. `${item.name}-${variant?.name}`)
  menuItemId?: string;
  name: string;
  category: string;
  selectedVariant?: ItemVariant;
  price: number;
  qty: number;
  unit: string;
  imageUrl?: string;
  isVeg?: boolean;
  notes?: string;
}

export interface CustomerInfo {
  name?: string;
  phone?: string;
}

export type PaymentMethod = 'cash' | 'online' | 'split' | 'credit';

export interface StoreInfo {
  shopName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
}

/** Bluetooth receipt layout, set per shop from the admin panel (/auth/me). */
export interface PrintSettings {
  paperWidth: 58 | 80;
  storeNameSize: 'normal' | 'large' | 'xlarge';
  itemTextSize: 'normal' | 'large';
  tokenSize: 'normal' | 'large';
  footerText: string; // empty = app default
  feedLines: number;
}

/** Per-shop features switched on from the admin panel (/auth/me). */
export interface ShopFeatures {
  reprintBills: boolean;
  khataStatement: boolean;
}

export interface OrderInvoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: number; // KOT token # (e.g. 14)
  items: CartItem[];
  subtotal: number;
  originalAmount?: number; // server's name for the subtotal before discount
  discount: number;
  total: number;
  receivedAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  customer: CustomerInfo;
  notes?: string;
  date: string;
  createdAt?: string;
  status?: 'completed' | 'cancelled';
}

export interface Buyer {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  totalDue: number;
  lastPurchaseDate?: string;
}
