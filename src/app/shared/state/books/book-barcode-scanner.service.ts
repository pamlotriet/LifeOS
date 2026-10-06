import { Injectable } from '@angular/core';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export function cleanScannedIsbn(value: string): string | null {
  const isbn = value.replace(/[^0-9]/g, '');
  if (isbn.length !== 13 || !isbn.startsWith('978') && !isbn.startsWith('979')) return null;
  const sum = isbn.slice(0, 12).split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(isbn[12]) ? isbn : null;
}

@Injectable({ providedIn: 'root' })
export class BookBarcodeScannerService {
  scan(): Promise<string> { return this.scanWithWebCamera(); }

  private async scanWithWebCamera(): Promise<string> {
    if (typeof document === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera scanning is not available on this device.');
    }
    const id = `isbn-scanner-${crypto.randomUUID()}`;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#061b2e;display:flex;flex-direction:column;padding:max(env(safe-area-inset-top),16px) 16px max(env(safe-area-inset-bottom),16px);color:white;';
    overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div><strong style="font-size:20px">Scan ISBN barcode</strong><p style="margin:4px 0 0;color:#b5cbe2;font-size:13px">Place the barcode beginning with 978 or 979 inside the frame.</p></div><button type="button" data-cancel style="min-width:72px;min-height:44px;border:1px solid #4c789a;border-radius:999px;background:#123451;color:white">Cancel</button></div><div id="${id}" style="overflow:hidden;border:1px solid #35d6ed;border-radius:20px;background:#000"></div><p data-status style="text-align:center;color:#b5cbe2;font-size:13px;margin:16px 0 10px">Requesting camera access...</p><button type="button" data-photo style="min-height:46px;border:1px solid #35d6ed;border-radius:14px;background:#123451;color:#bff7ff;font-weight:600">Scan from a photo</button><input data-file type="file" accept="image/*" capture="environment" hidden>`;
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
      const accept = async (value: string) => {
        const isbn = cleanScannedIsbn(value);
        if (!isbn || settled) return false;
        settled = true; await finish(); resolve(isbn); return true;
      };
      overlay.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click', () => void fail(new Error('Scan cancelled.')));
      const fileInput = overlay.querySelector<HTMLInputElement>('[data-file]');
      overlay.querySelector<HTMLButtonElement>('[data-photo]')?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', () => void (async () => {
        const file = fileInput.files?.[0]; if (!file || settled) return;
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = 'Reading barcode from photo...';
        try {
          if (scanner.isScanning) { await scanner.stop(); started = false; }
          const value = await scanner.scanFile(file, false);
          if (!await accept(value)) throw new Error('No valid ISBN barcode was found in that photo.');
        } catch (error) { await fail(error); }
      })());
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error('No camera was found. Check camera access in iOS Settings.');
        const rearCameras = cameras.filter((camera) => /back|rear|environment/i.test(camera.label));
        const rearCamera = rearCameras.find((camera) => /^(back|rear) camera$/i.test(camera.label.trim()))
          ?? rearCameras.find((camera) => !/ultra|telephoto|macro/i.test(camera.label))
          ?? rearCameras[0] ?? cameras.at(-1)!;
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = 'Hold the barcode 15–25 cm away and keep it inside the frame.';
        started = true;
        await scanner.start(rearCamera.id, {
          fps: 10,
          qrbox: (width, height) => ({ width: Math.min(width * 0.92, 420), height: Math.min(height * 0.3, 140) }),
          videoConstraints: {
            deviceId: { exact: rearCamera.id }, facingMode: { ideal: 'environment' },
            width: { ideal: 1920 }, height: { ideal: 1080 },
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          },
        }, (value) => { void accept(value); }, undefined);
        const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
        if (capabilities.zoom?.max && capabilities.zoom.max > 1) {
          await scanner.applyVideoConstraints({ advanced: [{ zoom: Math.min(2, capabilities.zoom.max) } as MediaTrackConstraintSet] }).catch(() => undefined);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await fail(/permission|notallowed|denied/i.test(message) ? new Error('Camera access was denied. Allow camera access for LifeOS in iOS Settings, then try again.') : error);
      }
    });
  }
}
