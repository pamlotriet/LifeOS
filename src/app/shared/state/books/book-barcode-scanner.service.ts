import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
      return this.scanWithWebCamera();
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
        return this.scanWithWebCamera();
      }
      throw error;
    }
    const isbn = cleanScannedIsbn(result.ScanResult ?? '');
    if (!isbn) throw new Error('That barcode is not a valid ISBN-13. Scan the barcode beginning with 978 or 979.');
    return isbn;
  }

  private async scanWithWebCamera(): Promise<string> {
    if (typeof document === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera scanning is not available on this device.');
    }
    const id = `isbn-scanner-${crypto.randomUUID()}`;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#061b2e;display:flex;flex-direction:column;padding:max(env(safe-area-inset-top),16px) 16px max(env(safe-area-inset-bottom),16px);color:white;';
    overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div><strong style="font-size:20px">Scan ISBN barcode</strong><p style="margin:4px 0 0;color:#b5cbe2;font-size:13px">Place the barcode beginning with 978 or 979 inside the frame.</p></div><button type="button" data-cancel style="min-width:72px;min-height:44px;border:1px solid #4c789a;border-radius:999px;background:#123451;color:white">Cancel</button></div><div id="${id}" style="overflow:hidden;border:1px solid #35d6ed;border-radius:20px;background:#000"></div><p data-status style="text-align:center;color:#b5cbe2;font-size:13px;margin-top:16px">Requesting camera access...</p>`;
    document.body.appendChild(overlay);
    const scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13], verbose: false });
    let started = false;
    const finish = async (): Promise<void> => {
      if (started && scanner.isScanning) await scanner.stop().catch(() => undefined);
      try { scanner.clear(); } catch { /* Scanner may not have finished initialising. */ }
      overlay.remove();
    };
    return new Promise<string>(async (resolve, reject) => {
      let settled = false;
      const fail = async (error: unknown) => { if (settled) return; settled = true; await finish(); reject(error); };
      overlay.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click', () => void fail(new Error('Scan cancelled.')));
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error('No camera was found. Check camera access in iOS Settings.');
        const rearCamera = [...cameras].reverse().find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras.at(-1)!;
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = 'Hold the book steady while LifeOS reads the barcode.';
        started = true;
        await scanner.start(rearCamera.id, { fps: 12, qrbox: (width, height) => ({ width: Math.min(width * 0.9, 360), height: Math.min(height * 0.35, 150) }), aspectRatio: 1.5 }, (value) => {
          const isbn = cleanScannedIsbn(value);
          if (!isbn || settled) return;
          settled = true;
          void finish().then(() => resolve(isbn));
        }, undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await fail(/permission|notallowed|denied/i.test(message) ? new Error('Camera access was denied. Allow camera access for LifeOS in iOS Settings, then try again.') : error);
      }
    });
  }
}
