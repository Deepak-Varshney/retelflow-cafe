import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useTheme } from '../services/ThemeContext';
import { OrderInvoice } from '../types';

interface StoreInfo {
  shopName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
}

interface OrderCompleteScreenProps {
  invoice: OrderInvoice;
  onNewOrder: () => void;
  storeInfo?: StoreInfo;
}

export const OrderCompleteScreen: React.FC<OrderCompleteScreenProps> = ({
  invoice,
  onNewOrder,
  storeInfo,
}) => {
  const { colors } = useTheme();
  const [isPrinting, setIsPrinting] = useState(false);

  const tokenNumber = invoice.orderNumber || Math.floor(10 + Math.random() * 89);

  const storeName = (storeInfo?.shopName || 'RetelFlow Cafe').trim();
  const storeAddress = (storeInfo?.address || '').trim();
  const storePhone = (storeInfo?.phone || '').trim();
  const storeGst = (storeInfo?.gstNumber || '').trim();

  // Validate customer phone: only 10-digit valid numbers qualify for WhatsApp direct billing
  const rawPhone = invoice.customer?.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
  const hasPhone = cleanPhone.length === 10;

  // 1. Direct WhatsApp Bill Sending
  const handleSendWhatsApp = async () => {
    if (!hasPhone) return;

    const orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderDate = new Date().toLocaleDateString('en-IN');

    const receiptMessage =
      `*${storeName.toUpperCase()} - BILL RECEIPT*\n` +
      (storeAddress ? `${storeAddress}\n` : '') +
      (storePhone ? `Contact: +91 ${storePhone}\n` : '') +
      (storeGst ? `GSTIN: ${storeGst}\n` : '') +
      `--------------------------------\n` +
      `*Order Token:* #${tokenNumber}\n` +
      `*Date:* ${orderDate} at ${orderTime}\n` +
      `*Customer:* ${invoice.customer?.name || 'Valued Guest'}\n` +
      `*Mobile:* +91 ${cleanPhone}\n` +
      `--------------------------------\n` +
      `*ITEMS ORDERED:*\n` +
      invoice.items
        .map(
          (it) =>
            `• ${it.qty}x ${it.name}${it.selectedVariant ? ` (${it.selectedVariant.name})` : ''} - ₹${it.qty * it.price}`
        )
        .join('\n') +
      `\n--------------------------------\n` +
      (invoice.discount ? `*Discount Applied:* -₹${invoice.discount}\n` : '') +
      `*Grand Total: ₹${invoice.total}*\n` +
      `*Payment Mode:* ${(invoice.paymentMethod || 'cash').toUpperCase()}\n` +
      `*Amount Paid: ₹${invoice.receivedAmount}*\n` +
      (invoice.dueAmount > 0
        ? `*Due / Balance (Udhar): ₹${invoice.dueAmount}*\n`
        : `*Payment Status: Fully Paid*\n`) +
      (invoice.notes ? `*Instructions / Note:* ${invoice.notes}\n` : '') +
      `--------------------------------\n` +
      `Thank you for dining with us! Visit again.\n` +
      `Powered by RetelFlow Cafe`;

    const waNativeUrl = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(receiptMessage)}`;
    const waWebFallback = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(receiptMessage)}`;

    try {
      const supported = await Linking.canOpenURL(waNativeUrl);
      if (supported) {
        await Linking.openURL(waNativeUrl);
      } else {
        await Linking.openURL(waWebFallback);
      }
    } catch {
      await Linking.openURL(waWebFallback);
    }
  };

  // 2. Generate HTML tailored for 58mm / 80mm ESC/POS Thermal Printers
  const generateThermalReceiptHtml = () => {
    const orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderDate = new Date().toLocaleDateString('en-IN');
    const custName = invoice.customer?.name || 'Walk-in Guest';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${tokenNumber}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }
    @media print {
      body {
        width: 58mm;
        margin: 0;
        padding: 4px;
      }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 58mm;
      max-width: 58mm;
      margin: 0 auto;
      padding: 6px 4px;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: 900; }
    .store-name {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .token-box {
      border: 2px dashed #000;
      padding: 6px 2px;
      margin: 6px 0;
      text-align: center;
    }
    .token-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .token-no {
      font-size: 28px;
      font-weight: 900;
      margin: 2px 0;
    }
    .dashed {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .solid {
      border-top: 1.5px solid #000;
      margin: 5px 0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .col-name { width: 55%; word-break: break-word; }
    .col-qty { width: 15%; text-align: center; }
    .col-amt { width: 30%; text-align: right; }
    .total-row {
      font-size: 12px;
      font-weight: 900;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 8px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="text-center store-name">${storeName}</div>
  ${storeAddress ? `<div class="text-center" style="font-size: 10px; margin-top: 2px;">${storeAddress}</div>` : ''}
  ${storePhone ? `<div class="text-center" style="font-size: 10px; margin-top: 1px;">Contact: +91 ${storePhone}</div>` : ''}
  ${storeGst ? `<div class="text-center" style="font-size: 9px; margin-top: 1px;">GSTIN: ${storeGst}</div>` : ''}

  <div class="token-box">
    <div class="token-title">KOT TOKEN #</div>
    <div class="token-no">#${tokenNumber}</div>
  </div>

  <div style="font-size: 10px;">
    <div><b>Date:</b> ${orderDate} ${orderTime}</div>
    <div><b>Customer:</b> ${custName}</div>
    ${hasPhone ? `<div><b>Phone:</b> +91 ${cleanPhone}</div>` : ''}
  </div>

  <div class="dashed"></div>

  <table class="table bold">
    <tr>
      <td class="col-name">ITEM</td>
      <td class="col-qty">QTY</td>
      <td class="col-amt">AMT</td>
    </tr>
  </table>

  <div class="dashed"></div>

  <table class="table">
    ${invoice.items
      .map(
        (it) => `
      <tr>
        <td class="col-name">${it.name}${it.selectedVariant ? ` (${it.selectedVariant.name})` : ''}</td>
        <td class="col-qty">x${it.qty}</td>
        <td class="col-amt">₹${it.qty * it.price}</td>
      </tr>
    `
      )
      .join('')}
  </table>

  <div class="solid"></div>

  <table class="table total-row">
    ${
      invoice.discount
        ? `
    <tr style="font-size: 10px; font-weight: normal;">
      <td>DISCOUNT:</td>
      <td class="text-right">- ₹${invoice.discount}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td>TOTAL BILL:</td>
      <td class="text-right">₹${invoice.total}</td>
    </tr>
    <tr style="font-size: 10px; font-weight: normal;">
      <td>PAID (${(invoice.paymentMethod || 'CASH').toUpperCase()}):</td>
      <td class="text-right">₹${invoice.receivedAmount}</td>
    </tr>
    ${
      invoice.dueAmount > 0
        ? `
    <tr style="color: #000; font-weight: 900;">
      <td>CREDIT / DUE:</td>
      <td class="text-right">₹${invoice.dueAmount}</td>
    </tr>
    `
        : ''
    }
  </table>

  ${
    invoice.notes
      ? `
  <div class="dashed"></div>
  <div style="font-size: 10px; font-weight: bold; margin: 3px 0;">
    <b>NOTE:</b> ${invoice.notes}
  </div>
  `
      : ''
  }

  <div class="dashed"></div>

  <div class="footer">
    Thank you for dining with us!<br/>
    *** Visit Again ***
  </div>
</body>
</html>
    `;
  };

  // 3. Print to paired Bluetooth Thermal Printer via Android/iOS Print Service
  const handlePrintReceipt = async () => {
    try {
      setIsPrinting(true);
      const html = generateThermalReceiptHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      console.warn('Print error:', err);
      Alert.alert(
        'Printer Error',
        err?.message || 'Could not send document to printer. Please check Bluetooth connection.'
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // 4. Fallback Generic Share
  const handleGenericShare = async () => {
    try {
      const summary =
        `*${storeName} - Bill Receipt*\n` +
        (storeAddress ? `${storeAddress}\n` : '') +
        (storePhone ? `Phone: +91 ${storePhone}\n` : '') +
        `Order Token #${tokenNumber}\nCustomer: ${invoice.customer?.name || 'Guest'}\n\n` +
        invoice.items
          .map((it) => `• ${it.qty}x ${it.name} - ₹${it.qty * it.price}`)
          .join('\n') +
        `\n\n*Total Amount: ₹${invoice.total}*\nReceived: ₹${invoice.receivedAmount}` +
        (invoice.dueAmount > 0
          ? `\n*Due / Credit: ₹${invoice.dueAmount}*`
          : '\n*Status: Fully Paid*') +
        `\n\nThank you for dining with us!`;

      await Share.share({ message: summary });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        {/* Success Icon */}
        <View className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 items-center justify-center mt-3 mb-2">
          <Ionicons name="checkmark" size={40} color="#10b981" />
        </View>

        <Text className="text-xl font-black text-center" style={{ color: colors.text }}>
          Order Placed Successfully!
        </Text>
        <Text className="text-xs text-center mt-0.5 text-slate-400">
          Kitchen Order Token (KOT) Generated
        </Text>

        {/* Token # Card */}
        <View
          className="my-4 px-8 py-3.5 rounded-3xl border items-center shadow-xl w-full"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.primary,
          }}
        >
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
            KOT TOKEN NUMBER
          </Text>
          <Text className="text-5xl font-black text-amber-500 font-mono my-1">
            #{tokenNumber}
          </Text>
          <Text className="text-[11px] font-semibold text-emerald-400">
            Send directly to Kitchen / Preparation Counter
          </Text>
        </View>

        {/* Receipt Details Card */}
        <View
          className="w-full rounded-3xl p-5 border mb-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {/* Store Details Header */}
          <View className="items-center pb-3 mb-3 border-b" style={{ borderColor: colors.border }}>
            <Text className="text-base font-black uppercase tracking-wider text-center" style={{ color: colors.text }}>
              {storeName}
            </Text>
            {storeAddress ? (
              <Text className="text-[11px] text-slate-400 text-center mt-0.5">{storeAddress}</Text>
            ) : null}
            {storePhone ? (
              <Text className="text-[11px] text-slate-400 font-mono text-center mt-0.5">Contact: +91 {storePhone}</Text>
            ) : null}
            {storeGst ? (
              <Text className="text-[10px] text-amber-500 font-mono text-center mt-0.5">GSTIN: {storeGst}</Text>
            ) : null}
          </View>

          <View
            className="flex-row items-center justify-between pb-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <View>
              <Text className="text-xs font-bold" style={{ color: colors.text }}>
                Customer: {invoice.customer?.name || 'Walk-in Guest'}
              </Text>
              {hasPhone ? (
                <Text className="text-[11px] text-slate-400 font-medium">
                  Phone: +91 {cleanPhone}
                </Text>
              ) : null}
            </View>
            <Text className="text-[11px] font-mono text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Items */}
          <View className="py-3">
            {invoice.items.map((it, idx) => (
              <View key={idx} className="flex-row items-center justify-between py-1.5">
                <Text
                  className="text-xs font-medium flex-1 pr-2"
                  style={{ color: colors.text }}
                >
                  {it.qty}x {it.name} {it.selectedVariant ? `(${it.selectedVariant.name})` : ''}
                </Text>
                <Text className="text-xs font-bold font-mono text-amber-500">
                  ₹{it.qty * it.price}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View className="pt-3 border-t" style={{ borderColor: colors.border }}>
            {invoice.discount ? (
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-emerald-400 font-semibold">Discount Applied:</Text>
                <Text className="text-xs font-bold font-mono text-emerald-400">
                  - ₹{invoice.discount}
                </Text>
              </View>
            ) : null}

            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-slate-400 font-semibold">Total Amount:</Text>
              <Text className="text-sm font-black font-mono text-white">
                ₹{invoice.total}
              </Text>
            </View>

            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-slate-400 font-semibold">Received:</Text>
              <Text className="text-xs font-bold font-mono text-emerald-400">
                ₹{invoice.receivedAmount}
              </Text>
            </View>

            {invoice.dueAmount > 0 && (
              <View
                className="flex-row justify-between pt-1 border-t border-dashed"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-xs text-rose-500 font-extrabold">Credit / Due (Udhar):</Text>
                <Text className="text-sm font-black font-mono text-rose-500">
                  ₹{invoice.dueAmount}
                </Text>
              </View>
            )}

            {invoice.notes ? (
              <View className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Text className="text-[10px] font-black text-amber-500 uppercase">Kitchen Note:</Text>
                <Text className="text-xs font-semibold text-slate-200 mt-0.5">{invoice.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-3">
          {/* 1. Start Next Order */}
          <TouchableOpacity
            onPress={onNewOrder}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-xl active:scale-98"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text className="text-sm font-black text-black tracking-wider uppercase">
              Start Next Order
            </Text>
          </TouchableOpacity>

          {/* 2. Bluetooth Thermal Print Button */}
          <TouchableOpacity
            onPress={handlePrintReceipt}
            disabled={isPrinting}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-md active:scale-98"
            style={{
              backgroundColor: '#1e293b',
              borderWidth: 1.5,
              borderColor: '#38bdf8',
            }}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <Ionicons name="print" size={19} color="#38bdf8" />
            )}
            <Text className="text-xs font-black text-sky-400 uppercase tracking-wider">
              {isPrinting ? 'Printing Receipt...' : 'Print Receipt (Bluetooth Thermal)'}
            </Text>
          </TouchableOpacity>

          {/* 3. Send Bill on WhatsApp (SHOWN ONLY IF CUSTOMER MOBILE NUMBER WAS ENTERED) */}
          {hasPhone && (
            <TouchableOpacity
              onPress={handleSendWhatsApp}
              activeOpacity={0.8}
              className="w-full py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-md active:scale-98"
              style={{ backgroundColor: '#25D366' }}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text className="text-xs font-black text-white uppercase tracking-wider">
                Send Bill on WhatsApp (+91 {cleanPhone})
              </Text>
            </TouchableOpacity>
          )}

          {/* 4. Secondary Generic Share Option */}
          <TouchableOpacity
            onPress={handleGenericShare}
            className="w-full py-2.5 rounded-2xl items-center justify-center flex-row gap-1.5 active:scale-98"
          >
            <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
            <Text className="text-[11px] font-bold" style={{ color: colors.textSecondary }}>
              Share via Other Apps / SMS
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
