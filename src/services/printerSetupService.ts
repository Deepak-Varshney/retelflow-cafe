import { PrinterDevice } from '../../modules/thermal-printer';

export interface PrinterSetupRequest {
  onConnected?: (printer: PrinterDevice) => void;
  title?: string;
  reason?: string;
}

type Listener = (req: PrinterSetupRequest | null) => void;

const listeners = new Set<Listener>();

export function subscribeToPrinterSetup(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openPrinterSetupModal(req: PrinterSetupRequest = {}) {
  listeners.forEach((listener) => listener(req));
}

export function closePrinterSetupModal() {
  listeners.forEach((listener) => listener(null));
}
