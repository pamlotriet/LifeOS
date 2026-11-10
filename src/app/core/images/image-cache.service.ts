import { Injectable } from '@angular/core';

const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  private readonly pending = new Map<string, Promise<Blob | null>>();
  private writes: Promise<void> = Promise.resolve();

  load(url: string, userId: string): Promise<Blob | null> {
    if (!/^https?:\/\//i.test(url)) return Promise.resolve(null);
    const key = JSON.stringify([userId, url]);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = this.read(url, userId).catch(() => null).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  private async read(url: string, userId: string): Promise<Blob | null> {
    let cache: Cache | undefined;
    try {
      cache = await globalThis.caches?.open(`lifeos-images-v1-${encodeURIComponent(userId)}`);
      const stored = await cache?.match(url);
      if (stored && Date.now() - Number(stored.headers.get('x-lifeos-cached-at') || 0) < MAX_AGE) {
        return await stored.blob();
      }
      if (stored) await cache?.delete(url);
    } catch { /* Storage may be unavailable; use the normal image loader below. */ }
    if (!cache) return null;

    const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(10000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null;
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_IMAGE_BYTES) return null;
    if (!/no-store/i.test(response.headers.get('cache-control') || '')) {
      const target = cache;
      this.writes = this.writes.then(async () => {
        await target.put(url, new Response(blob, { headers: {
          'content-type': blob.type,
          'x-lifeos-cached-at': String(Date.now()),
          'x-lifeos-bytes': String(blob.size),
        } }));
        const keys = await target.keys();
        let bytes = 0;
        let count = 0;
        // Keep the newest entries, within both byte and entry limits.
        for (const key of [...keys].reverse()) {
          const item = await target.match(key);
          bytes += Number(item?.headers.get('x-lifeos-bytes') || MAX_IMAGE_BYTES);
          if (++count > 100 || bytes > MAX_BYTES) await target.delete(key);
        }
      }).catch(() => { /* Quota errors must never prevent displaying an image. */ });
      await this.writes;
    }
    return blob;
  }
}
