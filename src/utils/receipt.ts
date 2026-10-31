import { StoreInfo } from '../types';
import { DEFAULT_FOOTER } from './shopSettings';

/**
 * One bill in the shape every output needs (screen, Bluetooth print, system
 * print, WhatsApp). Works for a just-placed order and for old bills from
 * GET /invoices, which store "Name (Variant)" as the item name.
 */
export interface ReceiptData {
  token: number | string;
  billNo: string;
  date: Date;
  customerName: string;
  customerPhone: string; // 10 digits or ''
  items: { name: string; qty: number; price: number; amount: number }[];
  subtotal: number;
  discount: number;
  total: number;
  received: number;
  due: number;
  paymentMethod: string;
  notes: string;
}

const num = (v: any) => Number(v) || 0;

export function toReceiptData(invoice: any): ReceiptData {
  const items = (invoice?.items || []).map((it: any) => {
    const name = it.selectedVariant ? `${it.name} (${it.selectedVariant.name})` : it.name;
    const qty = num(it.qty) || 1;
    const price = num(it.price);
    return { name: String(name || 'Item'), qty, price, amount: qty * price };
  });
  const itemsTotal = items.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
  const total = num(invoice?.total ?? invoice?.totalAmount ?? invoice?.grandTotal);
  const discount = num(invoice?.discount);
  const subtotal = num(invoice?.subtotal) || num(invoice?.originalAmount) || itemsTotal || total + discount;
  const due = num(invoice?.dueAmount ?? invoice?.balanceAmount);
  const received = invoice?.receivedAmount !== undefined ? num(invoice.receivedAmount) : Math.max(0, total - due);
  const phone = String(invoice?.customer?.phone || invoice?.customerPhone || '')
    .replace(/\D/g, '')
    .slice(-10);

  return {
    token: invoice?.orderNumber || String(invoice?.invoiceNumber || invoice?.id || '').slice(-3) || '-',
    billNo: String(invoice?.invoiceNumber || invoice?.invoiceId || invoice?.id || ''),
    date: new Date(invoice?.createdAt || invoice?.date || Date.now()),
    customerName: invoice?.customer?.name || invoice?.customerName || 'Walk-in Guest',
    customerPhone: phone.length === 10 ? phone : '',
    items,
    subtotal,
    discount,
    total,
    received,
    due,
    paymentMethod: String(invoice?.paymentMethod || 'cash'),
    notes: String(invoice?.notes || ''),
  };
}

export const formatDate = (d: Date) => d.toLocaleDateString('en-IN');
export const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** WhatsApp / SMS text bill. */
export function buildBillText(r: ReceiptData, store: StoreInfo, footerText = ''): string {
  const shopName = (store.shopName || 'RetelFlow Cafe').trim();
  const line = '--------------------------------';
  return [
    `*${shopName.toUpperCase()} - BILL RECEIPT*`,
    store.address ? store.address : null,
    store.phone ? `Contact: +91 ${store.phone}` : null,
    store.gstNumber ? `GSTIN: ${store.gstNumber}` : null,
    line,
    `*Order Token:* #${r.token}`,
    `*Date:* ${formatDate(r.date)} at ${formatTime(r.date)}`,
    `*Customer:* ${r.customerName}`,
    r.customerPhone ? `*Mobile:* +91 ${r.customerPhone}` : null,
    line,
    '*ITEMS ORDERED:*',
    ...r.items.map((it) => `• ${it.qty}x ${it.name} - ₹${it.amount}`),
    line,
    r.discount > 0 ? `Subtotal: ₹${r.subtotal}` : null,
    r.discount > 0 ? `*Discount:* -₹${r.discount}` : null,
    `*Grand Total: ₹${r.total}*`,
    `*Payment Mode:* ${r.paymentMethod.toUpperCase()}`,
    `*Amount Paid: ₹${r.received}*`,
    r.due > 0 ? `*Due / Balance (Udhar): ₹${r.due}*` : '*Payment Status: Fully Paid*',
    r.notes ? `*Note:* ${r.notes}` : null,
    line,
    footerText || `${DEFAULT_FOOTER} Visit again.`,
    'Powered by RetelFlow Cafe',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML for the Android / iOS system print dialog (58mm or 80mm roll). */
export function buildReceiptHtml(r: ReceiptData, store: StoreInfo, paperWidth: 58 | 80 = 58, footerText = ''): string {
  const shopName = escapeHtml((store.shopName || 'RetelFlow Cafe').trim());
  const row = (left: string, right: string, style = '') =>
    `<tr style="${style}"><td>${left}</td><td class="r">${right}</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt #${r.token}</title>
<style>
  @page { size: ${paperWidth}mm auto; margin: 0; }
  body { font-family: 'Courier New', Courier, monospace; width: ${paperWidth}mm; margin: 0 auto; padding: 6px 4px;
         font-size: 11px; line-height: 1.25; color: #000; background: #fff; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  .name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
  .token { border: 2px dashed #000; padding: 6px 2px; margin: 6px 0; text-align: center; }
  .token b { display: block; font-size: 28px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; }
  .total td { font-size: 12px; font-weight: 900; }
</style></head><body>
  <div class="c name">${shopName}</div>
  ${store.address ? `<div class="c" style="font-size:10px">${escapeHtml(store.address)}</div>` : ''}
  ${store.phone ? `<div class="c" style="font-size:10px">Contact: +91 ${escapeHtml(store.phone)}</div>` : ''}
  ${store.gstNumber ? `<div class="c" style="font-size:9px">GSTIN: ${escapeHtml(store.gstNumber)}</div>` : ''}
  <div class="token">KOT TOKEN<b>#${r.token}</b></div>
  <div style="font-size:10px">
    <div><b>Date:</b> ${formatDate(r.date)} ${formatTime(r.date)}</div>
    <div><b>Customer:</b> ${escapeHtml(r.customerName)}</div>
    ${r.customerPhone ? `<div><b>Phone:</b> +91 ${r.customerPhone}</div>` : ''}
  </div>
  <hr/>
  <table>
    ${row('<b>ITEM</b>', '<b>AMT</b>')}
    ${r.items.map((it) => row(`${it.qty}x ${escapeHtml(it.name)}`, `₹${it.amount}`)).join('')}
  </table>
  <hr/>
  <table>
    ${r.discount > 0 ? row('SUBTOTAL', `₹${r.subtotal}`) + row('DISCOUNT', `- ₹${r.discount}`) : ''}
    ${row('TOTAL BILL', `₹${r.total}`, 'font-size:12px;font-weight:900')}
    ${row(`PAID (${r.paymentMethod.toUpperCase()})`, `₹${r.received}`)}
    ${r.due > 0 ? row('CREDIT / DUE', `₹${r.due}`, 'font-weight:900') : ''}
  </table>
  ${r.notes ? `<hr/><div style="font-size:10px"><b>NOTE:</b> ${escapeHtml(r.notes)}</div>` : ''}
  <hr/>
  <div class="c" style="font-size:10px;margin:8px 0 12px">${escapeHtml(footerText || DEFAULT_FOOTER)}<br/>*** Visit Again ***</div>
</body></html>`;
}
