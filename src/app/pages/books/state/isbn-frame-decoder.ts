import { prepareZXingModule, readBarcodes, type ReadResult } from 'zxing-wasm/reader';

// Serve the decoder with the app, including offline caching; no external CDN.
prepareZXingModule({ overrides: {
  locateFile: (path: string) => path.endsWith('.wasm') ? new URL('assets/barcode/zxing_reader.wasm', document.baseURI).href : path,
} });

export class IsbnFrameDecoder {
  async decode(data: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
    return this.read({ data, width, height } as ImageData);
  }

  async decodeFile(file: File): Promise<string | null> {
    return this.read(new Uint8Array(await file.arrayBuffer()));
  }

  private async read(input: ImageData | Uint8Array): Promise<string | null> {
    const results: ReadResult[] = await readBarcodes(input, {
      // Bookshops can encode the ISBN in Code 128/39 rather than EAN-13.
      // The caller still validates the ISBN prefix and checksum.
      formats: ['AllLinear'], tryHarder: true, tryRotate: true, tryInvert: true,
      tryDownscale: true, maxNumberOfSymbols: 8,
    });
    // A photo may include a price barcode next to the book ISBN.
    return results.find(result => /^97[89]\d{10}$/.test(result.text))?.text ?? results[0]?.text ?? null;
  }
}
