import { PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type EventSubscription = { remove(): void };

export type PrinterDevice = { name: string; address: string };

export type PrintCommand =
  | {
      type: 'text';
      text: string;
      align?: 'left' | 'center' | 'right';
      bold?: boolean;
      doubleWidth?: boolean;
      doubleHeight?: boolean;
      underline?: boolean;
    }
  | { type: 'feed'; lines: number }
  | { type: 'image'; base64: string }
  | { type: 'cut' };

export type PrintOptions = {
  /** Printable dots per line: 384 for 58mm, 576 for 80mm. */
  paperWidthDots?: number;
};

type NativeThermalPrinter = {
  isConnected(): boolean;
  getSavedPrinter(): PrinterDevice | null;
  forgetPrinter(): void;
  getPairedDevices(): Promise<PrinterDevice[]>;
  connect(address: string | null): Promise<boolean>;
  disconnect(): Promise<void>;
  print(commands: PrintCommand[], options?: PrintOptions): Promise<void>;
  addListener(
    event: 'onConnectionChange',
    listener: (e: { connected: boolean }) => void
  ): EventSubscription;
};

// Null on web / iOS / Expo Go — the SDK only ships for Android dev/production builds.
const Native = requireOptionalNativeModule<NativeThermalPrinter>('ThermalPrinter');

export const isPrinterSdkAvailable = Native != null;

function requireNative(): NativeThermalPrinter {
  if (!Native) {
    throw new Error('Thermal printer SDK is only available in the Android app build.');
  }
  return Native;
}

export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 31) return true;
  // SCAN is needed too: the SDK calls cancelDiscovery() inside its connect thread.
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  ]);
  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export async function getPairedDevices(): Promise<PrinterDevice[]> {
  if (!(await requestBluetoothPermission())) {
    const permError = new Error('Bluetooth permission is required to find printers.');
    (permError as any).code = 'BLUETOOTH_PERMISSION_DENIED';
    throw permError;
  }
  return requireNative().getPairedDevices();
}

/** Connects to the given printer, or to the last used one when no address is passed. */
export async function connectPrinter(address?: string): Promise<void> {
  if (!(await requestBluetoothPermission())) {
    const permError = new Error('Bluetooth permission is required to connect to the printer.');
    (permError as any).code = 'BLUETOOTH_PERMISSION_DENIED';
    throw permError;
  }
  await requireNative().connect(address ?? null);
}

export function disconnectPrinter(): Promise<void> {
  return requireNative().disconnect();
}

export function isPrinterConnected(): boolean {
  return Native?.isConnected() ?? false;
}

export function getSavedPrinter(): PrinterDevice | null {
  return Native?.getSavedPrinter() ?? null;
}

export function forgetPrinter(): void {
  Native?.forgetPrinter();
}

/** Connects to the saved printer if needed, then sends the job. */
export async function printCommands(
  commands: PrintCommand[],
  options?: PrintOptions
): Promise<void> {
  const native = requireNative();
  if (!native.isConnected()) {
    await connectPrinter();
  }
  await native.print(commands, options);
}

export function addConnectionListener(
  listener: (e: { connected: boolean }) => void
): EventSubscription | null {
  return Native?.addListener('onConnectionChange', listener) ?? null;
}

export type PrinterErrorKind =
  | 'BLUETOOTH_DISABLED'
  | 'BLUETOOTH_PERMISSION'
  | 'NO_PRINTER_SAVED'
  | 'PRINTER_OFF_OR_UNREACHABLE'
  | 'PRINTER_NOT_CONNECTED'
  | 'GENERIC';

export interface ClassifiedPrinterError {
  kind: PrinterErrorKind;
  message: string;
  originalError: any;
}

export function classifyPrinterError(err: any): ClassifiedPrinterError {
  const code = String(err?.code || '').toUpperCase();
  const rawMsg = String(err?.message || '');

  if (
    code.includes('BLUETOOTH_DISABLED') ||
    /bluetooth is turned off/i.test(rawMsg) ||
    /turn on bluetooth/i.test(rawMsg)
  ) {
    return {
      kind: 'BLUETOOTH_DISABLED',
      message: 'Bluetooth is turned off on your phone. Please turn it on.',
      originalError: err,
    };
  }

  if (
    code.includes('BLUETOOTH_PERMISSION') ||
    /permission.*not granted/i.test(rawMsg) ||
    /nearby devices/i.test(rawMsg) ||
    /bluetooth permission/i.test(rawMsg)
  ) {
    return {
      kind: 'BLUETOOTH_PERMISSION',
      message: 'Bluetooth permission not granted. Allow "Nearby devices" for this app in Settings.',
      originalError: err,
    };
  }

  if (
    code.includes('NO_PRINTER_SAVED') ||
    code.includes('NO_PRINTER') ||
    /no printer selected/i.test(rawMsg) ||
    /no printer connected/i.test(rawMsg) ||
    /choose a printer/i.test(rawMsg)
  ) {
    return {
      kind: 'NO_PRINTER_SAVED',
      message: 'No printer connected. Please connect your Bluetooth printer.',
      originalError: err,
    };
  }

  if (
    code.includes('PRINTER_OFF') ||
    code.includes('UNREACHABLE') ||
    code.includes('PRINTER_NOT_FOUND') ||
    code.includes('TIMEOUT') ||
    /turned off/i.test(rawMsg) ||
    /unreachable/i.test(rawMsg) ||
    /timed out/i.test(rawMsg) ||
    /make sure it is ON/i.test(rawMsg) ||
    /printer not found/i.test(rawMsg)
  ) {
    return {
      kind: 'PRINTER_OFF_OR_UNREACHABLE',
      message: 'Printer is off. Please turn it on and try again.',
      originalError: err,
    };
  }

  if (
    code.includes('NOT_CONNECTED') ||
    code.includes('CLOSED') ||
    /not connected/i.test(rawMsg) ||
    /connection closed/i.test(rawMsg)
  ) {
    return {
      kind: 'PRINTER_NOT_CONNECTED',
      message: 'Printer is on but not connected with RetelFlow Cafe. Connect it now to print.',
      originalError: err,
    };
  }

  let msg = rawMsg.trim();
  const caused = msg.split(/Caused by:/i);
  if (caused.length > 1) msg = caused[caused.length - 1];
  msg = msg
    .replace(/^Call to function '.*?' has been rejected\.?/i, '')
    .replace(/^[\s→:.-]+/, '')
    .replace(/^[\w.]+Exception:\s*/, '')
    .trim();

  return {
    kind: 'GENERIC',
    message: msg || 'Could not print. Please check printer and try again.',
    originalError: err,
  };
}
