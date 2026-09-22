import { Injectable } from '@angular/core';

interface SearchDocument { title?: string; author_name?: string[]; cover_i?: number; }
interface SearchResponse { docs?: SearchDocument[]; }

export function normalizedBookText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

@Injectable({ providedIn: 'root' })
export class OpenLibraryCoverService {
  private readonly cache = new Map<string, Promise<string | null>>();

  find(title: string, author: string): Promise<string | null> {
    const key = `${normalizedBookText(title)}|${normalizedBookText(author)}`;
    if (!normalizedBookText(title) || !normalizedBookText(author)) return Promise.resolve(null);
    if (!this.cache.has(key)) this.cache.set(key, this.search(title, author));
    return this.cache.get(key)!;
  }

  private async search(title: string, author: string): Promise<string | null> {
    try {
      const url = new URL('https://openlibrary.org/search.json');
      url.searchParams.set('title', title.trim());
      url.searchParams.set('author', author.trim());
      url.searchParams.set('fields', 'title,author_name,cover_i');
      url.searchParams.set('limit', '10');
      const response = await fetch(url.toString());
      if (!response.ok) return null;
      const docs = ((await response.json()) as SearchResponse).docs ?? [];
      const titleKey = normalizedBookText(title);
      const authorKey = normalizedBookText(author);
      const exactTitle = docs.filter((doc) => normalizedBookText(doc.title ?? '') === titleKey);
      const sameAuthor = (doc: SearchDocument) => (doc.author_name ?? []).some((name) => normalizedBookText(name) === authorKey);
      const hasCover = (doc: SearchDocument) => Number.isInteger(doc.cover_i) && (doc.cover_i ?? 0) > 0;
      const match = exactTitle.find((doc) => hasCover(doc) && sameAuthor(doc))
        ?? (exactTitle.some(sameAuthor) ? exactTitle.find(hasCover) : undefined);
      return match ? `https://covers.openlibrary.org/b/id/${match.cover_i}-M.jpg?default=false` : null;
    } catch {
      return null;
    }
  }
}
