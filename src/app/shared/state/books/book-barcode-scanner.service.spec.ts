import { afterEach, describe, expect, it, vi } from 'vitest';
import { Html5Qrcode } from 'html5-qrcode';
import { BookBarcodeScannerService, cleanScannedIsbn } from './book-barcode-scanner.service';

describe('cleanScannedIsbn', () => {
  it('accepts a valid ISBN-13 and removes separators', () => {
    expect(cleanScannedIsbn('978-0-14-032872-1')).toBe('9780140328721');
  });

  it('rejects non-book and invalid-checksum barcodes', () => {
    expect(cleanScannedIsbn('6001234567892')).toBeNull();
    expect(cleanScannedIsbn('9780140328722')).toBeNull();
  });
});


describe('scanner recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps photo scanning available when camera access fails', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.spyOn(Html5Qrcode, 'getCameras').mockRejectedValue(new Error('Permission denied'));
    vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});
    const scan = new BookBarcodeScannerService().scan();
    const cancelled = expect(scan).rejects.toThrow('Scan cancelled.');
    await vi.waitFor(() => {
      expect(document.querySelector<HTMLButtonElement>('[data-photo]')?.disabled).toBe(false);
    });
    expect(document.querySelector('[data-status]')?.textContent).toContain('scan from a photo');
    document.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
    await cancelled;
    expect(document.querySelector('[data-photo]')).toBeNull();
  });

  it('stops the camera if cancelled while startup is pending', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.spyOn(Html5Qrcode, 'getCameras').mockResolvedValue([{ id: 'rear', label: 'Back Camera' }]);
    let completeStart!: () => void;
    const start = vi.spyOn(Html5Qrcode.prototype, 'start').mockImplementation(function (this: Html5Qrcode) {
      return new Promise<null>(resolve => { completeStart = () => { this.isScanning = true; resolve(null); }; });
    });
    const stop = vi.spyOn(Html5Qrcode.prototype, 'stop').mockResolvedValue();
    vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});
    const scan = new BookBarcodeScannerService().scan();
    const cancelled = expect(scan).rejects.toThrow('Scan cancelled.');
    await vi.waitFor(() => expect(start).toHaveBeenCalled());
    document.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
    await cancelled;
    completeStart();
    await vi.waitFor(() => expect(stop).toHaveBeenCalled());
    expect(document.querySelector('[data-photo]')).toBeNull();
  });
});
