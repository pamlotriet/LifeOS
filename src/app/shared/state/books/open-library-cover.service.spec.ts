import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenLibraryCoverService } from './open-library-cover.service';

describe('OpenLibraryCoverService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fills book details from an Open Library ISBN lookup', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ 'ISBN:9780140328721': { title: 'Matilda', authors: [{ name: 'Roald Dahl' }], publish_date: '1988', subjects: [{name:'Fantasy'}], cover: {large:'https://covers.openlibrary.org/b/id/123-L.jpg?default=false'} } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Roald Dahl' }) }));

    await expect(new OpenLibraryCoverService().lookupByIsbn('9780140328721')).resolves.toEqual({
      isbn: '9780140328721', title: 'Matilda', author: 'Roald Dahl', category: 'Fantasy',
      publicationDate: '1988-01-01', coverUrl: 'https://covers.openlibrary.org/b/id/123-L.jpg?default=false',
    });
  });

  it('falls back to ISBN search when an edition is absent', async () => {
    const request = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({})}).mockResolvedValueOnce({ok:true,json:async()=>({docs:[{title:'Matilda',author_name:['Roald Dahl'],first_publish_year:1988,cover_i:123}]})});
    vi.stubGlobal('fetch',request);
    await expect(new OpenLibraryCoverService().lookupByIsbn('9780140328721')).resolves.toMatchObject({title:'Matilda',author:'Roald Dahl'});
  });
  it('reports unavailable catalogues instead of claiming a book does not exist', async () => {
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Network error')));
    await expect(new OpenLibraryCoverService().lookupByIsbn('9780140328721')).rejects.toThrow('lookup could not be completed');
  });
  it('preserves partial book details when author metadata is unavailable', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({'ISBN:9780140328721':{title:'Matilda'}})}).mockResolvedValue({ok:true,json:async()=>({})}));
    await expect(new OpenLibraryCoverService().lookupByIsbn('9780140328721')).resolves.toMatchObject({title:'Matilda',author:''});
  });
  it('queries Google without a Firebase API key and distinguishes a genuine miss', async () => {
    const request=vi.fn().mockResolvedValue({ok:true,json:async()=>({})});vi.stubGlobal('fetch',request);
    await expect(new OpenLibraryCoverService().lookupByIsbn('9780140328721')).resolves.toBeNull();
    const url=request.mock.calls.map(call=>String(call[0])).find(url=>url.includes('googleapis'))!;
    expect(new URL(url).searchParams.has('key')).toBe(false);
  });
  it('selects a cover only when title and author match', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [
          { title: 'Mexican Gothic', author_name: ['Another Author'], cover_i: 999 },
          { title: 'Mexican Gothic', author_name: ['Silvia Moreno-Garcia'], cover_i: 123 },
        ],
      }),
    });
    vi.stubGlobal('fetch', request);
    const cover = await new OpenLibraryCoverService().find(
      'Mexican Gothic',
      'Silvia Moreno-Garcia',
    );
    expect(cover).toBe('https://covers.openlibrary.org/b/id/123-L.jpg?default=false');
    expect(String(request.mock.calls[0][0])).toContain('fields=title%2Cauthor_name%2Ccover_i');
  });

  it('leaves a book without a cover when no exact match exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            docs: [{ title: 'Different Book', author_name: ['Author'], cover_i: 123 }],
          }),
        }),
    );
    expect(await new OpenLibraryCoverService().find('My Book', 'Author')).toBeNull();
  });

  it('uses another edition cover when an exact title and author edition has no cover', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'White Nights',
              author_name: ['Fyodor Dostoevsky'],
              cover_i: 14598226,
            },
            { title: 'White Nights', author_name: ['Fyodor Dostoevsky'] },
          ],
        }),
      }),
    );
    expect(await new OpenLibraryCoverService().find('White Nights', 'Fyodor Dostoevsky')).toBe(
      'https://covers.openlibrary.org/b/id/14598226-L.jpg?default=false',
    );
  });

  it('falls back to Google Books when Open Library has no matching cover', async () => {
    const request=vi.fn().mockImplementation(async (url:string)=>({ok:true,json:async()=>url.includes('googleapis')?{items:[{volumeInfo:{title:'Wrong Book',authors:['Andy Weir'],imageLinks:{thumbnail:'http://books.google.com/wrong'}}},{volumeInfo:{title:'Project Hail Mary',authors:['Andy Weir'],imageLinks:{thumbnail:'http://books.google.com/cover'}}}]}:{docs:[]}}));
    vi.stubGlobal('fetch',request);
    expect(await new OpenLibraryCoverService().find('Project Hail Mary','Andy Weir')).toBe('https://books.google.com/cover');
    expect(request.mock.calls.some(call=>String(call[0]).includes('books/v1/volumes'))).toBe(true);
  });

  it('matches authors when Open Library stores surname first', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'The Book of Lost Things',
              author_name: ['Connolly, John'],
              cover_i: 456,
            },
          ],
        }),
      }),
    );

    expect(
      await new OpenLibraryCoverService().find('The Book of Lost Things', 'John Connolly'),
    ).toBe('https://covers.openlibrary.org/b/id/456-L.jpg?default=false');
  });
});
