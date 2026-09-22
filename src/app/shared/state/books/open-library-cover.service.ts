import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface SearchDocument {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
}

interface SearchResponse {
  docs?: SearchDocument[];
}

interface GoogleImageLinks {
  extraLarge?: string;
  large?: string;
  medium?: string;
  thumbnail?: string;
  smallThumbnail?: string;
}

interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
    imageLinks?: GoogleImageLinks;
  };
}

interface GoogleSearchResponse {
  items?: GoogleVolume[];
}

export function normalizedBookText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizedAuthorText(value: string): string {
  return normalizedBookText(value)
    .split(' ')
    .filter(Boolean)
    .filter((part) => part.length > 1)
    .sort()
    .join(' ');
}

@Injectable({ providedIn: 'root' })
export class OpenLibraryCoverService {
  private readonly cache = new Map<string, Promise<string | null>>();

  find(title: string, author: string, isbn?: string): Promise<string | null> {
    const titleKey = normalizedBookText(title);
    const authorKey = normalizedAuthorText(author);
    const isbnKey = this.cleanIsbn(isbn ?? '');

    if (!titleKey || !authorKey) return Promise.resolve(null);

    const key = `${titleKey}|${authorKey}|${isbnKey}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, this.search(title, author, isbn));
    }

    return this.cache.get(key)!;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async search(title: string, author: string, isbn?: string): Promise<string | null> {
    if (isbn?.trim()) {
      const isbnCover = await this.searchByIsbn(isbn);
      if (isbnCover) return isbnCover;
    }

    return (
      (await this.searchOpenLibrary(title, author)) ?? (await this.searchGoogleBooks(title, author))
    );
  }

  private cleanIsbn(value: string): string {
    return value.replace(/[^0-9Xx]/g, '');
  }

  private async searchByIsbn(isbn: string): Promise<string | null> {
    const cleanIsbn = this.cleanIsbn(isbn);
    if (!cleanIsbn) return null;

    return (
      (await this.searchOpenLibraryByIsbn(cleanIsbn)) ??
      (await this.searchGoogleBooksByIsbn(cleanIsbn))
    );
  }

  private async searchOpenLibraryByIsbn(isbn: string): Promise<string | null> {
    try {
      const url = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok ? url : null;
    } catch {
      return null;
    }
  }

  private async searchGoogleBooksByIsbn(isbn: string): Promise<string | null> {
    try {
      const volumes = await this.fetchGoogleBooks(`isbn:${isbn}`);

      for (const volume of volumes) {
        const cover = this.getGoogleCover(volume.volumeInfo?.imageLinks);
        if (cover) return this.ensureHttps(cover);
      }

      return null;
    } catch {
      return null;
    }
  }

  private words(value: string): string[] {
    return normalizedBookText(value).split(' ').filter(Boolean);
  }

  private levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, () =>
      new Array<number>(a.length + 1).fill(0),
    );

    for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }

    return matrix[b.length][a.length];
  }

  private similarity(leftValue: string, rightValue: string): number {
    const left = normalizedBookText(leftValue);
    const right = normalizedBookText(rightValue);

    if (!left || !right) return 0;
    if (left === right) return 1;

    const distance = this.levenshtein(left, right);
    return 1 - distance / Math.max(left.length, right.length);
  }

  private titleScore(requested: string, returned: string): number {
    const requestedKey = normalizedBookText(requested);
    const returnedKey = normalizedBookText(returned);

    if (!requestedKey || !returnedKey) return 0;
    if (requestedKey === returnedKey) return 1;

    // Handles subtitle/edition variants:
    // "The House of Whispers"
    // "The House of Whispers: A Novel"
    if (returnedKey.startsWith(`${requestedKey} `)) return 0.98;
    if (requestedKey.startsWith(`${returnedKey} `)) return 0.96;

    const requestedWords = this.words(requested);
    const returnedWords = this.words(returned);

    const containsAllRequested =
      requestedWords.length > 0 && requestedWords.every((word) => returnedWords.includes(word));

    if (containsAllRequested) return 0.94;

    const fuzzy = this.similarity(requestedKey, returnedKey);
    return fuzzy >= 0.9 ? fuzzy : 0;
  }

  private authorScore(requestedAuthor: string, returnedAuthors: string[]): number {
    const requestedParts = this.words(requestedAuthor).filter((part) => part.length > 1);

    if (!requestedParts.length || !returnedAuthors.length) return 0;

    let best = 0;

    for (const returnedAuthor of returnedAuthors) {
      const returnedParts = this.words(returnedAuthor).filter((part) => part.length > 1);

      if (!returnedParts.length) continue;

      const exactRequested = normalizedAuthorText(requestedAuthor);
      const exactReturned = normalizedAuthorText(returnedAuthor);

      if (exactRequested && exactRequested === exactReturned) {
        best = Math.max(best, 1);
        continue;
      }

      let total = 0;
      let matched = 0;

      for (const requestedPart of requestedParts) {
        let bestPart = 0;

        for (const returnedPart of returnedParts) {
          bestPart = Math.max(bestPart, this.similarity(requestedPart, returnedPart));
        }

        // Catches small spelling issues such as Frieda/Freida.
        if (bestPart >= 0.72) {
          total += bestPart;
          matched++;
        }
      }

      if (!matched) continue;

      const coverage = matched / Math.max(requestedParts.length, returnedParts.length);

      const average = total / matched;
      best = Math.max(best, average * coverage);
    }

    return best;
  }

  private async searchOpenLibrary(title: string, author: string): Promise<string | null> {
    try {
      const attempts: SearchDocument[][] = [];

      attempts.push(await this.fetchOpenLibrary(title, author));
      attempts.push(await this.fetchOpenLibrary(title));
      attempts.push(await this.fetchOpenLibraryQuery(`${title} ${author}`));
      attempts.push(await this.fetchOpenLibraryQuery(`"${title}" ${author}`));

      for (const docs of attempts) {
        const cover = this.findOpenLibraryCover(docs, title, author);
        if (cover) return cover;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async fetchOpenLibrary(title: string, author?: string): Promise<SearchDocument[]> {
    const url = new URL('https://openlibrary.org/search.json');

    url.searchParams.set('title', title.trim());

    if (author?.trim()) {
      url.searchParams.set('author', author.trim());
    }

    url.searchParams.set('fields', 'title,author_name,cover_i,isbn');
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = (await response.json()) as SearchResponse;
    return data.docs ?? [];
  }

  private async fetchOpenLibraryQuery(query: string): Promise<SearchDocument[]> {
    const url = new URL('https://openlibrary.org/search.json');

    url.searchParams.set('q', query.trim());
    url.searchParams.set('fields', 'title,author_name,cover_i,isbn');
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = (await response.json()) as SearchResponse;
    return data.docs ?? [];
  }

  private findOpenLibraryCover(
    docs: SearchDocument[],
    title: string,
    author: string,
  ): string | null {
    const candidates = docs
      .filter((doc) => Number.isInteger(doc.cover_i) && (doc.cover_i ?? 0) > 0)
      .map((doc) => {
        const titleScore = this.titleScore(title, doc.title ?? '');
        const authorScore = this.authorScore(author, doc.author_name ?? []);

        if (titleScore < 0.9 || authorScore < 0.72) return null;

        return {
          coverId: doc.cover_i!,
          score: titleScore * 0.65 + authorScore * 0.35,
        };
      })
      .filter((candidate): candidate is { coverId: number; score: number } => candidate !== null)
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    return best ? this.openLibraryCoverUrl(best.coverId) : null;
  }

  private openLibraryCoverUrl(coverId: number): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
  }

  private async searchGoogleBooks(title: string, author: string): Promise<string | null> {
    try {
      const queries = [
        `intitle:${title.trim()} inauthor:${author.trim()}`,
        `"${title.trim()}" "${author.trim()}"`,
        `${title.trim()} ${author.trim()}`,
        `intitle:${title.trim()}`,
        title.trim(),
      ];

      for (const query of queries) {
        const volumes = await this.fetchGoogleBooks(query);
        const cover = this.findGoogleCover(volumes, title, author);
        if (cover) return cover;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async fetchGoogleBooks(query: string): Promise<GoogleVolume[]> {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');

    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '40');
    url.searchParams.set('printType', 'books');

    if (environment.firebaseConfig.apiKey) {
      url.searchParams.set('key', environment.firebaseConfig.apiKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = (await response.json()) as GoogleSearchResponse;
    return data.items ?? [];
  }

  private findGoogleCover(volumes: GoogleVolume[], title: string, author: string): string | null {
    const candidates = volumes
      .map((volume) => {
        const info = volume.volumeInfo;
        if (!info) return null;

        const cover = this.getGoogleCover(info.imageLinks);
        if (!cover) return null;

        const titleScore = this.titleScore(title, info.title ?? '');
        const authorScore = this.authorScore(author, info.authors ?? []);

        // Strong title requirement prevents wrong generic-title covers,
        // e.g. a different "Test Kitchen".
        if (titleScore < 0.9) return null;

        // Flexible enough for:
        // Neil D Stewart -> Neil Stewart
        // Frieda Mcfadden -> Freida McFadden
        // but still rejects unrelated authors.
        if (authorScore < 0.72) return null;

        return {
          cover,
          score: titleScore * 0.65 + authorScore * 0.35,
        };
      })
      .filter((candidate): candidate is { cover: string; score: number } => candidate !== null)
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    return best ? this.ensureHttps(best.cover) : null;
  }

  private getGoogleCover(links?: GoogleImageLinks): string | null {
    if (!links) return null;

    return (
      links.extraLarge ??
      links.large ??
      links.medium ??
      links.thumbnail ??
      links.smallThumbnail ??
      null
    );
  }

  private ensureHttps(value: string): string | null {
    try {
      const url = new URL(value.replace(/^http:/, 'https:'));
      return url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  }
}
