import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

export function cleanScannedIsbn(value: string): string | null {
  const isbn = value.replace(/[^0-9]/g, '');
  if (isbn.length !== 13 || !isbn.startsWith('978') && !isbn.startsWith('979')) return null;
  const sum = isbn.slice(0, 12).split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(isbn[12]) ? isbn : null;
}

@Injectable({ providedIn: 'root' })
export class BookBarcodeScannerService {
  async scan(): Promise<string> {
    if (Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable('CapacitorBarcodeScanner')) {
      throw new Error('The iOS app needs to be rebuilt once to install the barcode scanner. Sync iOS, remove the old app from the device, and run it again from Xcode.');
    }
    let result: Awaited<ReturnType<typeof CapacitorBarcodeScanner.scanBarcode>>;
    try {
      result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.EAN_13,
        scanInstructions: 'Place the ISBN barcode inside the frame',
        scanButton: false,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
        cancelButtonAccessibilityLabel: 'Cancel ISBN scan',
        web: { showCameraSelection: true, scannerFPS: 15 },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not implemented|unimplemented/i.test(message)) {
        throw new Error('The iOS app needs to be rebuilt once to install the barcode scanner. Sync iOS, remove the old app from the device, and run it again from Xcode.');
      }
      throw error;
    }
    const isbn = cleanScannedIsbn(result.ScanResult ?? '');
    if (!isbn) throw new Error('That barcode is not a valid ISBN-13. Scan the barcode beginning with 978 or 979.');
    return isbn;
  }
}
