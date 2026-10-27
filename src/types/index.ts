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

export interface OrderInvoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: number; // KOT token # (e.g. 14)
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  receivedAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  customer: CustomerInfo;
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
