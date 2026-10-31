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
    throw new Error('Bluetooth permission is required to find printers.');
  }
  return requireNative().getPairedDevices();
}

/** Connects to the given printer, or to the last used one when no address is passed. */
export async function connectPrinter(address?: string): Promise<void> {
  if (!(await requestBluetoothPermission())) {
    throw new Error('Bluetooth permission is required to connect to the printer.');
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
