import { Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
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
  onRequirePrinterSetup?: (onConnected: () => void) => void;
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
          {
            text: 'Connect Printer Now',
            onPress: () => {
              const handleResume = () => {
                printBill(r, store, settings, options).then(resolve);
              };
              if (options?.onRequirePrinterSetup) {
                options.onRequirePrinterSetup(handleResume);
              } else {
                openPrinterSetupModal({
                  onConnected: handleResume,
                  title: 'Connect Printer',
                  reason: 'Connect your printer to resume printing the bill.',
                });
              }
            },
          },
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
      const handleConnectPrinter = () => {
        const handleResume = () => {
          printBill(r, store, settings, options).then(resolve);
        };
        if (options?.onRequirePrinterSetup) {
          options.onRequirePrinterSetup(handleResume);
        } else {
          openPrinterSetupModal({
            onConnected: handleResume,
            title: 'Connect Printer',
            reason: 'Connect your printer to resume printing the bill.',
          });
        }
      };

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
    let perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) {
      perm = await MediaLibrary.requestPermissionsAsync();
    }
    if (!perm.granted) {
      perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        console.warn('MediaLibrary permission denied');
        return false;
      }
    }

    const asset = await MediaLibrary.createAssetAsync(uri);
    if (asset) {
      try {
        const album = await MediaLibrary.getAlbumAsync('RetelFlow');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('RetelFlow', asset, false);
        }
      } catch {}
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Bill image save failed:', err);
    return false;
  }
}
