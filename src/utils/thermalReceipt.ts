import type { PrintCommand } from '../../modules/thermal-printer';
import { PrintSettings, StoreInfo } from '../types';
import { ReceiptData, formatDate, formatTime } from './receipt';
import { DEFAULT_FOOTER } from './shopSettings';

// Default 12x24 font: 58mm head = 384 dots = 32 chars, 80mm = 576 dots = 48 chars.
export const paperWidthDots = (s: PrintSettings) => (s.paperWidth === 80 ? 576 : 384);
const columnsFor = (s: PrintSettings) => (s.paperWidth === 80 ? 48 : 32);

// The SDK encodes text as GBK, which has no rupee sign.
const clean = (s: string) => s.replace(/₹/g, 'Rs.').replace(/[\r\t]/g, ' ');

const money = (n: number) => `Rs.${Number(n || 0).toFixed(Number.isInteger(n) ? 0 : 2)}`;

export function buildThermalReceipt(r: ReceiptData, store: StoreInfo, settings: PrintSettings): PrintCommand[] {
  const cols = columnsFor(settings);
  const largeItems = settings.itemTextSize === 'large';
  const divider = (ch = '-'): PrintCommand => ({ type: 'text', text: ch.repeat(cols) });

  // Left text + right-aligned value on one line, wrapping the left text if needed.
  const row = (left: string, right: string, bold = false, doubleHeight = false): PrintCommand[] => {
    const width = cols - right.length - 1;
    const lines: string[] = [];
    let rest = clean(left);
    while (rest.length > width) {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    lines.push(rest.padEnd(width) + ' ' + right);
    return lines.map((text) => ({ type: 'text', text, bold, doubleHeight }));
  };

  const nameSize = settings.storeNameSize;
  const cmds: PrintCommand[] = [
    {
      type: 'text',
      text: clean((store.shopName || 'RetelFlow Cafe').toUpperCase()),
      align: 'center',
      bold: true,
      doubleHeight: nameSize !== 'normal',
      doubleWidth: nameSize === 'xlarge',
    },
  ];
  if (store.address) cmds.push({ type: 'text', text: clean(store.address), align: 'center' });
  if (store.phone) cmds.push({ type: 'text', text: `Contact: +91 ${store.phone}`, align: 'center' });
  if (store.gstNumber) cmds.push({ type: 'text', text: `GSTIN: ${clean(store.gstNumber)}`, align: 'center' });

  const largeToken = settings.tokenSize === 'large';
  cmds.push(
    divider('='),
    { type: 'text', text: 'KOT TOKEN', align: 'center', bold: true },
    { type: 'text', text: `#${r.token}`, align: 'center', bold: true, doubleWidth: largeToken, doubleHeight: largeToken },
    divider('='),
    { type: 'text', text: `Date: ${formatDate(r.date)} ${formatTime(r.date)}` },
    { type: 'text', text: `Customer: ${clean(r.customerName)}` }
  );
  if (r.customerPhone) cmds.push({ type: 'text', text: `Phone: +91 ${r.customerPhone}` });

  cmds.push(divider(), ...row('ITEM', 'AMT', true), divider());
  for (const it of r.items) {
    cmds.push(...row(`${it.qty}x ${it.name}`, money(it.amount), false, largeItems));
  }

  cmds.push(divider());
  if (r.discount > 0) {
    cmds.push(...row('SUBTOTAL', money(r.subtotal)));
    cmds.push(...row('DISCOUNT', `-${money(r.discount)}`));
  }
  cmds.push(...row('TOTAL BILL', money(r.total), true, true));
  cmds.push(...row(`PAID (${r.paymentMethod.toUpperCase()})`, money(r.received)));
  if (r.due > 0) cmds.push(...row('CREDIT / DUE', money(r.due), true));

  if (r.notes) {
    cmds.push(divider(), { type: 'text', text: `NOTE: ${clean(r.notes)}`, bold: true });
  }

  cmds.push(
    divider(),
    { type: 'text', text: clean(settings.footerText || DEFAULT_FOOTER), align: 'center' },
    { type: 'text', text: '*** Visit Again ***', align: 'center' },
    { type: 'feed', lines: settings.feedLines }
  );
  return cmds;
}
