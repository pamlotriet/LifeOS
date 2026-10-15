import { Injectable } from '@angular/core';
import { IsbnFrameDecoder } from './isbn-frame-decoder';
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
    if (typeof document === 'undefined' || typeof navigator === 'undefined' ) {
      throw new Error('Camera scanning is not available on this device.');
    }
    const id = `isbn-scanner-${crypto.randomUUID()}`;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#061b2e;display:flex;flex-direction:column;padding:max(env(safe-area-inset-top),16px) 16px max(env(safe-area-inset-bottom),16px);color:white;';
    overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div><strong style="font-size:20px">Scan ISBN barcode</strong><p style="margin:4px 0 0;color:#b5cbe2;font-size:13px">Place the barcode beginning with 978 or 979 in view, including the blank space at both ends.</p></div><button type="button" data-cancel style="min-width:72px;min-height:44px;border:1px solid #4c789a;border-radius:999px;background:#123451;color:white">Cancel</button></div><div id="${id}" style="overflow:hidden;border:1px solid #35d6ed;border-radius:20px;background:#000"></div><p data-status style="text-align:center;color:#b5cbe2;font-size:13px;margin:16px 0 10px">Requesting camera access...</p><button type="button" data-photo disabled style="min-height:46px;border:1px solid #35d6ed;border-radius:14px;background:#123451;color:#bff7ff;font-weight:600">Scan from a photo</button><input data-file type="file" accept="image/*" hidden>`;
    document.body.appendChild(overlay);
    const scanner = new Html5Qrcode(id, { formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.CODABAR,
    ], verbose: false });
    const decoder = new IsbnFrameDecoder();
    let readingPhoto = false;
    let frameTimer: ReturnType<typeof setTimeout> | undefined;
    const stopFrameDecoding = () => { clearTimeout(frameTimer); frameTimer = undefined; };
    let started = false;
    let starting = true;
    const finish = async (): Promise<void> => {
      stopFrameDecoding();
      if (starting) return;
      if (started) {
        try { await scanner.stop(); } catch { /* Camera may still be initialising. */ }
      }
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
        const file = fileInput.files?.[0]; if (!file || settled || starting) return;
        fileInput.value = '';
        if (readingPhoto) return;
        readingPhoto = true;
        stopFrameDecoding();
        const photoButton = overlay.querySelector<HTMLButtonElement>('[data-photo]');
        if (photoButton) photoButton.disabled = true;
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = 'Reading barcode from photo...';
        try {
          if (scanner.isScanning) { await scanner.stop(); started = false; }
          let value: string | null = null;
          // Read original file pixels, rather than html5-qrcode's reduced preview.
          try { value = await decoder.decodeFile(file); } catch { /* Try browser image decoding below (e.g. HEIC). */ }
          if (!value && !settled) value = await this.decodePhotoWithBrowser(file, decoder);
          if (settled) return;
          if (value && await accept(value)) return;
          if (status) status.textContent = value
            ? `Barcode ${value} detected. This is not a valid book ISBN beginning with 978 or 979.`
            : 'No barcode detected in this photo. Crop around the barcode, keeping white space at both ends, and try again.';
        } catch (error) {
          if (!settled && status) status.textContent = error instanceof Error ? error.message : 'Photo scanning failed. Try a JPEG or PNG image.';
        } finally {
          readingPhoto = false;
          if (photoButton) photoButton.disabled = false;
        }
      })());
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (settled) return;
        if (!cameras.length) throw new Error('No camera was found. Check camera access in iOS Settings.');
        const rearCameras = cameras.filter((camera) => /back|rear|environment/i.test(camera.label));
        const rearCamera = rearCameras.find((camera) => /^(back|rear) camera$/i.test(camera.label.trim()))
          ?? rearCameras.find((camera) => !/ultra|telephoto|macro/i.test(camera.label))
          ?? rearCameras[0] ?? cameras.at(-1)!;
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = 'Hold the barcode steady with the entire barcode visible. Move farther away if it looks blurry.';
        started = true;
        await scanner.start(rearCamera.id, {
          fps: 5,
          disableFlip: true,
          videoConstraints: {
            deviceId: { exact: rearCamera.id }, facingMode: { ideal: 'environment' },
            width: { ideal: 1920 }, height: { ideal: 1080 },
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          },
        }, (value) => { void accept(value); }, undefined);
        if (!settled) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });
          const readFrame = async () => {
            // start() can resolve before the video fires `playing` and the
            // library sets isScanning (notably on Safari). Keep polling until
            // frames arrive instead of permanently abandoning the scan loop.
            if (settled || readingPhoto || !started) return;
            const video = overlay.querySelector('video');
            if (context && video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
              // The built-in scanner uses the preview's CSS width (often only 390px).
              // Preserve the camera's detail so narrow EAN bars remain distinguishable.
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              try {
                context.drawImage(video, 0, 0);
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                const value = await decoder.decode(image.data, canvas.width, canvas.height);
                if (settled || readingPhoto) return;
                if (value && cleanScannedIsbn(value)) { void accept(value); return; }
                if (value && status) status.textContent = 'Barcode detected. Scan the book ISBN beginning with 978 or 979.';
                else if (status) status.textContent = 'Scanning for ISBN... Keep the entire barcode visible and hold steady.';
              } catch {
                if (!settled && !readingPhoto && status) status.textContent = 'Barcode reader could not load or read the camera image. Check your connection and retry, or scan from a photo.';
              }
            }
            if (!settled && !readingPhoto) frameTimer = setTimeout(() => void readFrame(), 500);
          };
          frameTimer = setTimeout(() => void readFrame(), 0);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = overlay.querySelector<HTMLElement>('[data-status]');
        if (!settled && status) status.textContent = /permission|notallowed|denied/i.test(message)
          ? 'Camera access was denied. Allow camera access in your browser settings, or scan from a photo.'
          : 'Camera could not start. Try scanning from a photo.';
      } finally {
        starting = false;
        const photoButton = overlay.querySelector<HTMLButtonElement>('[data-photo]');
        if (photoButton) photoButton.disabled = false;
        if (settled) await finish();
      }
    });
  }

  private async decodePhotoWithBrowser(file: File, decoder: IsbnFrameDecoder): Promise<string | null> {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('This image could not be opened. Choose a JPEG or PNG photo.'));
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Photo scanning is unavailable in this browser.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      return await decoder.decode(pixels.data, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  }

}
