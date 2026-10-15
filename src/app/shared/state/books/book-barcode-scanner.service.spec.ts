import { afterEach, describe, expect, it, vi } from 'vitest';
import { Html5Qrcode } from 'html5-qrcode';
import { IsbnFrameDecoder } from './isbn-frame-decoder';
import { BookBarcodeScannerService, cleanScannedIsbn } from './book-barcode-scanner.service';

describe('cleanScannedIsbn', () => {
  it('accepts a valid ISBN-13 and removes separators', () => {
    expect(cleanScannedIsbn('978-0-14-032872-1')).toBe('9780140328721');
    expect(cleanScannedIsbn('9780571376476')).toBe('9780571376476');
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

  it('uses the new photo decoder and lets the same photo be retried', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.spyOn(Html5Qrcode, 'getCameras').mockRejectedValue(new Error('Permission denied'));
    vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});
    const decode = vi.spyOn(IsbnFrameDecoder.prototype, 'decodeFile')
      .mockResolvedValueOnce('6001234567892').mockResolvedValueOnce('9780140328721');
    const oldDecoder = vi.spyOn(Html5Qrcode.prototype, 'scanFile');
    const scan = new BookBarcodeScannerService().scan();
    await vi.waitFor(() => expect(document.querySelector<HTMLButtonElement>('[data-photo]')?.disabled).toBe(false));
    const input = document.querySelector<HTMLInputElement>('[data-file]')!;
    const file = new File(['photo'], 'book.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(document.querySelector('[data-status]')?.textContent).toContain('6001234567892'));
    input.dispatchEvent(new Event('change'));
    await expect(scan).resolves.toBe('9780140328721');
    expect(decode).toHaveBeenCalledTimes(2);
    expect(oldDecoder).not.toHaveBeenCalled();
    expect(document.querySelector('[data-photo]')).toBeNull();
  });

  it('reads full-resolution frames when the preview scanner finds nothing', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.spyOn(Html5Qrcode, 'getCameras').mockResolvedValue([{ id: 'rear', label: 'Back Camera' }]);
    vi.spyOn(Html5Qrcode.prototype, 'start').mockImplementation(async function (this: Html5Qrcode) {
      this.isScanning = true;
      const video = document.createElement('video');
      Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 1080 }, readyState: { value: 4 } });
      document.querySelector('[id^="isbn-scanner-"]')!.appendChild(video);
      return null;
    });
    const getImageData = vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData } as unknown as CanvasRenderingContext2D);
    const decode = vi.spyOn(IsbnFrameDecoder.prototype, 'decode').mockResolvedValue('9780140328721');
    const stop = vi.spyOn(Html5Qrcode.prototype, 'stop').mockResolvedValue();
    vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});
    await expect(new BookBarcodeScannerService().scan()).resolves.toBe('9780140328721');
    expect(getImageData).toHaveBeenCalledWith(0, 0, 1920, 1080);
    expect(decode).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 1920, 1080);
    expect(stop).toHaveBeenCalled();
    expect(document.querySelector('[data-photo]')).toBeNull();
  });

  it('keeps trying when start resolves before the video becomes ready', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
      vi.spyOn(Html5Qrcode, 'getCameras').mockResolvedValue([{ id: 'rear', label: 'Back Camera' }]);
      let ready = false;
      vi.spyOn(Html5Qrcode.prototype, 'start').mockImplementation(async function (this: Html5Qrcode) {
        // Safari can show the preview after this promise resolves.
        this.isScanning = false;
        const video = document.createElement('video');
        Object.defineProperties(video, {
          videoWidth: { get: () => ready ? 1920 : 0 },
          videoHeight: { get: () => ready ? 1080 : 0 },
          readyState: { get: () => ready ? 4 : 0 },
        });
        document.querySelector('[id^="isbn-scanner-"]')!.appendChild(video);
        return null;
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(), getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
      } as unknown as CanvasRenderingContext2D);
      const decode = vi.spyOn(IsbnFrameDecoder.prototype, 'decode').mockResolvedValue('9780571376476');
      vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});
      const scan = new BookBarcodeScannerService().scan();
      await vi.advanceTimersByTimeAsync(1000);
      expect(decode).not.toHaveBeenCalled();
      ready = true;
      await vi.advanceTimersByTimeAsync(500);
      await expect(scan).resolves.toBe('9780571376476');
      expect(decode).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 1920, 1080);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
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
