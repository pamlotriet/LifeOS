import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenLibraryCoverService } from './open-library-cover.service';

describe('OpenLibraryCoverService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('selects a cover only when title and author match', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [
      { title: 'Mexican Gothic', author_name: ['Another Author'], cover_i: 999 },
      { title: 'Mexican Gothic', author_name: ['Silvia Moreno-Garcia'], cover_i: 123 },
    ] }) });
    vi.stubGlobal('fetch', request);
    const cover = await new OpenLibraryCoverService().find('Mexican Gothic', 'Silvia Moreno-Garcia');
    expect(cover).toBe('https://covers.openlibrary.org/b/id/123-M.jpg?default=false');
    expect(String(request.mock.calls[0][0])).toContain('fields=title%2Cauthor_name%2Ccover_i');
  });

  it('leaves a book without a cover when no exact match exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [
      { title: 'Different Book', author_name: ['Author'], cover_i: 123 },
    ] }) }));
    expect(await new OpenLibraryCoverService().find('My Book', 'Author')).toBeNull();
  });

  it('uses another edition cover when an exact title and author edition has no cover', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [
      { title: 'White Nights', author_name: ['Фёдор Михайлович Достоевский'], cover_i: 14598226 },
      { title: 'White Nights', author_name: ['Fyodor Dostoevsky'] },
    ] }) }));
    expect(await new OpenLibraryCoverService().find('White Nights', 'Fyodor Dostoevsky'))
      .toBe('https://covers.openlibrary.org/b/id/14598226-M.jpg?default=false');
  });
});
