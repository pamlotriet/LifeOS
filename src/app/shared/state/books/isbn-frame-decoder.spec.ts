import { describe, expect, it } from 'vitest';
import { IsbnFrameDecoder } from './isbn-frame-decoder';

// EAN-13 fixture for 9780140328721, with quiet zones at both ends.
const bars = '000000000000101'
  + '0111011' + '0001001' + '0100111' + '0011001' + '0011101' + '0001101'
  + '01010' + '1000010' + '1101100' + '1001000' + '1000100' + '1101100' + '1100110'
  + '101000000000000';

function fixture(rotated: boolean) {
  const barcodeWidth = bars.length * 3;
  const barcodeHeight = 180;
  const width = rotated ? barcodeHeight : barcodeWidth;
  const height = rotated ? barcodeWidth : barcodeHeight;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 20; y < barcodeHeight - 20; y++) {
    for (let x = 0; x < barcodeWidth; x++) {
      const target = rotated ? (x * width + barcodeHeight - y - 1) * 4 : (y * width + x) * 4;
      const shade = bars[Math.floor(x / 3)] === '1' ? 30 : 235;
      data[target] = data[target + 1] = data[target + 2] = shade;
    }
  }
  return { data, width, height };
}

describe('IsbnFrameDecoder', () => {
  it.each([false, true])('reads EAN-13 pixels (rotated: %s)', rotated => {
    const { data, width, height } = fixture(rotated);
    expect(new IsbnFrameDecoder().decode(data, width, height)).toBe('9780140328721');
  });

  it('returns null for a frame with no barcode', () => {
    expect(new IsbnFrameDecoder().decode(new Uint8ClampedArray(120 * 120 * 4).fill(255), 120, 120)).toBeNull();
  });
});
