import { Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
// The root "expo-media-library" export (v57+) is the new class API; its old
// function exports (createAssetAsync etc.) only throw a deprecation error.
import * as MediaLibrary from 'expo-media-library/legacy';
import {
  classifyPrinterError,
  getSavedPrinter,
  isPrinterConnected,
  isPrinterSdkAvailable,
  printCommands,
} from '../../modules/thermal-printer';
import { openPrinterSetupModal } from './printerSetupService';
import { PrintSettings, StoreInfo } from '../types';
import { ReceiptData, buildBillText, buildReceiptHtml } from '../utils/receipt';
import { buildThermalReceipt, paperWidthDots } from '../utils/thermalReceipt';

export interface PrintBillOptions {
  /**
   * Show the printer picker. Call onConnected to resume printing, or onCancel
   * when it is closed without connecting (so the print button stops loading).
   */
  onRequirePrinterSetup?: (onConnected: () => void, onCancel: () => void) => void;
}

export const printViaSystemDialog = (r: ReceiptData, store: StoreInfo, settings: PrintSettings) =>
  Print.printAsync({ html: buildReceiptHtml(r, store, settings.paperWidth, settings.footerText) });

/**
 * Prints straight to the paired Bluetooth printer (vendor SDK, Android build),
 * or opens the system print dialog where the SDK isn't available.
 * Shows actionable alerts for every scenario (off, disconnected, Bluetooth disabled, etc.)
 * and allows launching printer setup with auto-resume.
 */
export async function printBill(
  r: ReceiptData,
  store: StoreInfo,
  settings: PrintSettings,
  options?: PrintBillOptions
): Promise<boolean> {
  // Opens printer setup; the bill prints automatically once a printer connects,
  // and the pending promise always settles (closing the picker resolves false)
  const requestPrinterSetup = (resolve: (ok: boolean) => void) => {
    const onConnected = () => {
      printBill(r, store, settings, options).then(resolve);
    };
    const onCancel = () => resolve(false);
    if (options?.onRequirePrinterSetup) {
      options.onRequirePrinterSetup(onConnected, onCancel);
    } else {
      openPrinterSetupModal({
        onConnected,
        onCancel,
        title: 'Connect Printer',
        reason: 'Connect your printer to resume printing the bill.',
      });
    }
  };

  if (!isPrinterSdkAvailable) {
    try {
      await printViaSystemDialog(r, store, settings);
      return true;
    } catch (err) {
      const info = classifyPrinterError(err);
      Alert.alert('Printer Error', info.message || 'Could not open the print dialog.');
      return false;
    }
  }

  // Every alert settles the print promise (any button, or Back / tap outside),
  // so the Print button never stays in its loading state
  const ask = (
    resolve: (ok: boolean) => void,
    title: string,
    message: string,
    buttons: { text: string; onPress: () => void }[]
  ) =>
    Alert.alert(
      title,
      message,
      [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, ...buttons],
      { cancelable: true, onDismiss: () => resolve(false) }
    );

  // Case 1: No printer saved at all
  if (!getSavedPrinter()) {
    return new Promise((resolve) => {
      ask(resolve, 'Printer Not Connected', 'No printer is connected with RetelFlow Cafe. Connect your Bluetooth printer to print.', [
        { text: 'Connect Printer', onPress: () => requestPrinterSetup(resolve) },
      ]);
    });
  }

  // Case 2: Attempt print (auto-connects to the saved printer; times out with
  // a clear error if the printer is off, out of range or the link is dead)
  try {
    await printCommands(buildThermalReceipt(r, store, settings), {
      paperWidthDots: paperWidthDots(settings),
    });
    return true;
  } catch (err) {
    const errorInfo = classifyPrinterError(err);

    return new Promise((resolve) => {
      const connect = { text: 'Connect Printer', onPress: () => requestPrinterSetup(resolve) };
      const retry = { text: 'Retry', onPress: () => printBill(r, store, settings, options).then(resolve) };

      switch (errorInfo.kind) {
        case 'BLUETOOTH_DISABLED':
          ask(resolve, 'Bluetooth is Off', 'Bluetooth is turned off on your phone. Turn it on, then tap Retry.', [retry]);
          return;
        case 'BLUETOOTH_PERMISSION':
          ask(resolve, 'Bluetooth Permission Required', 'Allow "Nearby devices" for RetelFlow Cafe in Settings to print receipts.', [
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch(() => {});
                resolve(false);
              },
            },
          ]);
          return;
        case 'PRINTER_OFF_OR_UNREACHABLE':
          ask(resolve, 'Printer Not Responding', 'The printer is off or too far away. Turn it on, keep it close, then tap Retry.', [connect, retry]);
          return;
        case 'PRINTER_NOT_CONNECTED':
        case 'NO_PRINTER_SAVED':
          ask(resolve, 'Printer Not Connected', 'The printer is not connected with RetelFlow Cafe. Connect it now to print.', [connect, retry]);
          return;
        default:
          ask(resolve, 'Printer Error', errorInfo.message || 'Could not print the receipt.', [connect, retry]);
      }
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
    // Saving only needs write access (no READ_MEDIA_IMAGES prompt on Android 13+)
    let perm = await MediaLibrary.getPermissionsAsync(true);
    if (!perm.granted) perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) {
      console.warn('MediaLibrary permission denied');
      return false;
    }

    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    const asset = await MediaLibrary.createAssetAsync(fileUri);

    // Optional "RetelFlow" album; needs read access, so failures are ignored
    // (the image is already in the gallery at this point).
    try {
      const album = await MediaLibrary.getAlbumAsync('RetelFlow');
      if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      else await MediaLibrary.createAlbumAsync('RetelFlow', asset, false);
    } catch {}
    return true;
  } catch (err) {
    console.warn('Bill image save failed:', err);
    return false;
  }
}
