import { describe, expect, it } from 'vitest';
import { cleanScannedIsbn } from './book-barcode-scanner.service';

describe('cleanScannedIsbn', () => {
  it('accepts a valid ISBN-13 and removes separators', () => {
    expect(cleanScannedIsbn('978-0-14-032872-1')).toBe('9780140328721');
  });

  it('rejects non-book and invalid-checksum barcodes', () => {
    expect(cleanScannedIsbn('6001234567892')).toBeNull();
    expect(cleanScannedIsbn('9780140328722')).toBeNull();
  });
});
