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

  // Case 1: No printer saved at all
  if (!getSavedPrinter()) {
    return new Promise((resolve) => {
      Alert.alert(
        'Printer Not Connected',
        'No printer is connected with RetelFlow Cafe. Please connect your Bluetooth printer to print.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Connect Printer Now', onPress: () => requestPrinterSetup(resolve) },
          {
            text: 'System Print',
            onPress: () =>
              printViaSystemDialog(r, store, settings)
                .then(() => resolve(true))
                .catch(() => resolve(false)),
          },
        ]
      );
    });
  }

  // Case 2: Attempt print (will auto-connect to saved printer if needed)
  try {
    await printCommands(buildThermalReceipt(r, store, settings), {
      paperWidthDots: paperWidthDots(settings),
    });
    return true;
  } catch (err) {
    const errorInfo = classifyPrinterError(err);

    return new Promise((resolve) => {
      const handleConnectPrinter = () => requestPrinterSetup(resolve);

      const handleRetry = () => {
        printBill(r, store, settings, options).then(resolve);
      };

      const handleSystemPrint = () => {
        printViaSystemDialog(r, store, settings)
          .then(() => resolve(true))
          .catch(() => resolve(false));
      };

      // Case: Bluetooth disabled on mobile device
      if (errorInfo.kind === 'BLUETOOTH_DISABLED') {
        Alert.alert(
          'Bluetooth is Off',
          'Bluetooth is turned off on your phone. Please turn it on and try again.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Retry', onPress: handleRetry },
            { text: 'System Print', onPress: handleSystemPrint },
          ]
        );
        return;
      }

      // Case: Bluetooth permissions not granted
      if (errorInfo.kind === 'BLUETOOTH_PERMISSION') {
        Alert.alert(
          'Bluetooth Permission Required',
          'Bluetooth permission is required to print receipts. Please allow Nearby devices in Settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch(() => {});
                resolve(false);
              },
            },
            { text: 'System Print', onPress: handleSystemPrint },
          ]
        );
        return;
      }

      // Case: Printer is turned off or unreachable
      if (errorInfo.kind === 'PRINTER_OFF_OR_UNREACHABLE') {
        Alert.alert(
          'Printer is Off',
          'Printer is off. Please turn it on and try again.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Connect Printer', onPress: handleConnectPrinter },
            { text: 'Retry', onPress: handleRetry },
            { text: 'System Print', onPress: handleSystemPrint },
          ]
        );
        return;
      }

      // Case: Printer is on but not connected to the app
      if (errorInfo.kind === 'PRINTER_NOT_CONNECTED' || errorInfo.kind === 'NO_PRINTER_SAVED') {
        Alert.alert(
          'Printer Not Connected',
          'Printer is on but not connected with RetelFlow Cafe. Connect it now to print.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Connect Printer Now', onPress: handleConnectPrinter },
            { text: 'Retry', onPress: handleRetry },
            { text: 'System Print', onPress: handleSystemPrint },
          ]
        );
        return;
      }

      // Case: Generic error fallback
      Alert.alert(
        'Printer Error',
        errorInfo.message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Connect Printer', onPress: handleConnectPrinter },
          { text: 'Retry', onPress: handleRetry },
          { text: 'System Print', onPress: handleSystemPrint },
        ]
      );
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
