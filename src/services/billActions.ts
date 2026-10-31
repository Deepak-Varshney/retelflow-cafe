import { Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import { getSavedPrinter, isPrinterSdkAvailable, printCommands } from '../../modules/thermal-printer';
import { PrintSettings, StoreInfo } from '../types';
import { ReceiptData, buildBillText, buildReceiptHtml } from '../utils/receipt';
import { buildThermalReceipt, paperWidthDots } from '../utils/thermalReceipt';
import { friendlyError } from '../utils/errorMessage';

export const printViaSystemDialog = (r: ReceiptData, store: StoreInfo, settings: PrintSettings) =>
  Print.printAsync({ html: buildReceiptHtml(r, store, settings.paperWidth, settings.footerText) });

/**
 * Prints straight to the paired Bluetooth printer (vendor SDK, Android build),
 * or opens the system print dialog where the SDK isn't available.
 * Shows its own alerts; resolves true when the bill was sent.
 */
export async function printBill(r: ReceiptData, store: StoreInfo, settings: PrintSettings): Promise<boolean> {
  if (!isPrinterSdkAvailable) {
    try {
      await printViaSystemDialog(r, store, settings);
      return true;
    } catch (err) {
      Alert.alert('Printer Error', friendlyError(err, 'Could not open the print dialog.'));
      return false;
    }
  }

  if (!getSavedPrinter()) {
    Alert.alert(
      'No Printer Selected',
      'Select your Bluetooth thermal printer in More > Hardware & Printing Config first.'
    );
    return false;
  }

  try {
    await printCommands(buildThermalReceipt(r, store, settings), {
      paperWidthDots: paperWidthDots(settings),
    });
    return true;
  } catch (err) {
    return new Promise((resolve) => {
      Alert.alert('Printer Error', friendlyError(err, 'Could not print. Check that the printer is ON.'), [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Retry', onPress: () => printBill(r, store, settings).then(resolve) },
        {
          text: 'System Print',
          onPress: () =>
            printViaSystemDialog(r, store, settings)
              .then(() => resolve(true))
              .catch(() => resolve(false)),
        },
      ]);
    });
  }
}

/** Opens WhatsApp chat with the customer and the text bill prefilled. */
export async function openWhatsAppBill(r: ReceiptData, store: StoreInfo, footerText = '') {
  if (!r.customerPhone) return;
  const text = encodeURIComponent(buildBillText(r, store, footerText));
  const nativeUrl = `whatsapp://send?phone=91${r.customerPhone}&text=${text}`;
  const webUrl = `https://wa.me/91${r.customerPhone}?text=${text}`;
  try {
    if (await Linking.canOpenURL(nativeUrl)) await Linking.openURL(nativeUrl);
    else await Linking.openURL(webUrl);
  } catch {
    await Linking.openURL(webUrl).catch(() => {});
  }
}

/**
 * Saves a captured bill image (file uri from react-native-view-shot) to the
 * gallery, so the cashier can attach it from inside the WhatsApp chat.
 */
export async function saveBillImageToGallery(uri: string): Promise<boolean> {
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return false;
    await MediaLibrary.saveToLibraryAsync(uri);
    return true;
  } catch (err) {
    console.warn('Bill image save failed:', err);
    return false;
  }
}
