import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';

/** Decode camera pixels without reducing them to the CSS preview dimensions. */
export class IsbnFrameDecoder {
  private readonly reader = new MultiFormatReader();
  private readonly hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
    [DecodeHintType.TRY_HARDER, true],
  ]);

  decode(data: Uint8ClampedArray, width: number, height: number): string | null {
    const pixels = new Uint8ClampedArray(width * height);
    for (let i = 0; i < pixels.length; i++) {
      const offset = i * 4;
      pixels[i] = (data[offset] + 2 * data[offset + 1] + data[offset + 2]) / 4;
    }
    const result = this.read(pixels, width, height);
    if (result) return result;
    // ISBN bars may run horizontally when the phone or book is rotated.
    const rotated = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) rotated[x * height + height - y - 1] = pixels[y * width + x];
    }
    return this.read(rotated, height, width);
  }

  private read(pixels: Uint8ClampedArray, width: number, height: number): string | null {
    try {
      return this.reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height))), this.hints).getText();
    } catch {
      return null;
    } finally {
      this.reader.reset();
    }
  }
}
