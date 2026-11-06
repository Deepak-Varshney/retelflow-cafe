import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { StoreInfo } from '../types';
import { ReceiptData, formatDate, formatTime } from '../utils/receipt';
import { DEFAULT_FOOTER } from '../utils/shopSettings';

interface BillReceiptViewProps {
  receipt: ReceiptData;
  store: StoreInfo;
  footerText?: string;
}

const INK = '#111827';
const MUTED = '#4b5563';

const Row = ({ left, right, bold, color }: { left: string; right: string; bold?: boolean; color?: string }) => (
  <View className="flex-row justify-between py-0.5">
    <Text className={`text-xs flex-1 pr-2 ${bold ? 'font-black' : 'font-medium'}`} style={{ color: color || INK }}>
      {left}
    </Text>
    <Text className={`text-xs font-mono ${bold ? 'font-black' : 'font-semibold'}`} style={{ color: color || INK }}>
      {right}
    </Text>
  </View>
);

const Dashed = () => <View className="my-2 border-t border-dashed" style={{ borderColor: '#9ca3af' }} />;

/**
 * Paper-style bill (always white, same in light and dark theme). Shown on
 * screen and captured as an image for WhatsApp / gallery, so keep it plain.
 */
export const BillReceiptView = forwardRef<React.ComponentRef<typeof View>, BillReceiptViewProps>(({ receipt: r, store, footerText }, ref) => (
  <View ref={ref} collapsable={false} className="w-full rounded-2xl p-4" style={{ backgroundColor: '#ffffff' }}>
    <Text className="text-base font-black uppercase text-center" style={{ color: INK }}>
      {store.shopName || 'RetelFlow Cafe'}
    </Text>
    {store.address ? (
      <Text className="text-[11px] text-center mt-0.5" style={{ color: MUTED }}>
        {store.address}
      </Text>
    ) : null}
    {store.phone ? (
      <Text className="text-[11px] text-center font-mono" style={{ color: MUTED }}>
        Contact: +91 {store.phone}
      </Text>
    ) : null}
    {store.gstNumber ? (
      <Text className="text-[10px] text-center font-mono" style={{ color: MUTED }}>
        GSTIN: {store.gstNumber}
      </Text>
    ) : null}

    <View className="my-3 py-2 rounded-xl border-2 border-dashed items-center" style={{ borderColor: INK }}>
      <Text className="text-[10px] font-black tracking-widest" style={{ color: INK }}>
        KOT TOKEN
      </Text>
      <Text className="text-3xl font-black font-mono" style={{ color: INK }}>
        #{r.token}
      </Text>
    </View>

    <Row left={`Customer: ${r.customerName}`} right={`${formatDate(r.date)} ${formatTime(r.date)}`} />
    {r.customerPhone ? <Row left={`Phone: +91 ${r.customerPhone}`} right={r.billNo ? `#${r.billNo}` : ''} /> : null}

    <Dashed />
    <Row left="ITEM" right="AMOUNT" bold />
    <Dashed />
    {r.items.map((it, idx) => (
      <Row key={idx} left={`${it.qty}x ${it.name}`} right={`₹${it.amount.toLocaleString()}`} />
    ))}
    <Dashed />

    {r.discount > 0 ? (
      <>
        <Row left="Subtotal" right={`₹${r.subtotal.toLocaleString()}`} />
        <Row left="Discount" right={`- ₹${r.discount.toLocaleString()}`} color="#047857" />
      </>
    ) : null}
    <Row left="TOTAL BILL" right={`₹${r.total.toLocaleString()}`} bold />
    <Row left={`Paid (${r.paymentMethod.toUpperCase()})`} right={`₹${r.received.toLocaleString()}`} />
    {r.due > 0 ? <Row left="Credit / Khata (Due)" right={`₹${r.due.toLocaleString()}`} bold color="#be123c" /> : null}

    {r.notes ? (
      <>
        <Dashed />
        <Text className="text-[11px] font-bold" style={{ color: INK }}>
          Note: {r.notes}
        </Text>
      </>
    ) : null}

    <Dashed />
    <Text className="text-[11px] text-center" style={{ color: MUTED }}>
      {footerText || DEFAULT_FOOTER}
    </Text>
    <Text className="text-[10px] text-center mt-0.5 font-bold" style={{ color: MUTED }}>
      *** Visit Again ***
    </Text>
  </View>
));

BillReceiptView.displayName = 'BillReceiptView';
