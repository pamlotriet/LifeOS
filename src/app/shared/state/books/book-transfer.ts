import { BOOK_FORMATS, BOOK_STATUSES, BookRecord, BookTag } from './book.model';
export interface BookBackup {
  format: 'lifeos-books';
  version: 1;
  exportedAt: string;
  books: BookRecord[];
  tags: BookTag[];
}
export interface BookImportPlan {
  books: BookRecord[];
  tags: BookTag[];
  added: number;
  updated: number;
  skipped: number;
}
export function createBookBackup(books: BookRecord[], tags: BookTag[]): BookBackup {
  return structuredClone({
    format: 'lifeos-books',
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    tags,
  });
}
const textFields = [
  'title',
  'author',
  'category',
  'coverUrl',
  'isbn',
  'publicationDate',
  'seriesName',
  'startDate',
  'finishDate',
  'review',
] as const;
const booleans = ['wheelSelected', 'favourite', 'wouldRecommend', 'reread'] as const;
const numbers = ['progress', 'pageCount', 'pageProgress', 'rating', 'spiceRating'] as const;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JSON object.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 20000): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid or oversized text field.');
  return value;
}
function id(value: unknown): string {
  const s = text(value, 128);
  if (!s || s === '.' || s === '..' || s.includes('/') || /^__.*__$/.test(s))
    throw new Error('Invalid record ID.');
  return s;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected a list.');
  return value;
}
function unique(values: string[]): void {
  if (new Set(values).size !== values.length) throw new Error('Duplicate record IDs in backup.');
}
export function parseBookBackup(json: string): BookBackup {
  const raw = object(JSON.parse(json));
  if (raw['format'] !== 'lifeos-books' || raw['version'] !== 1)
    throw new Error('Choose a LifeOS books JSON export (version 1).');
  const tags = list(raw['tags']).map((value) => {
    const t = object(value);
    if (t['type'] !== 'genre' && t['type'] !== 'mood') throw new Error('Invalid tag type.');
    const name = text(t['name'], 100).trim();
    const color = text(t['color'], 32);
    if (!name || (color !== '' && !/^#[0-9a-f]{6}$/i.test(color))) throw new Error('Invalid tag name or colour.');
    return { id: id(t['id']), name, type: t['type'], color } as BookTag;
  });
  unique(tags.map((t) => t.id));
  const books = list(raw['books']).map((value, index) => {
    try {
      const b = object(value);
      const result: Record<string, unknown> = { id: id(b['id']) };
      for (const key of textFields) result[key] = text(b[key]);
      if (
        !String(result['title']).trim() ||
        !String(result['author']).trim() ||
        !String(result['category']).trim()
      )
        throw new Error('Title, author and category are required.');
      for (const key of booleans) {
        if (typeof b[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
        result[key] = b[key];
      }
      for (const key of numbers) {
        const n = b[key];
        if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0)
          throw new Error(`Invalid ${key}.`);
        result[key] = n;
      }
      if (
        Number(result['progress']) > 100 ||
        Number(result['rating']) > 5 ||
        Number(result['spiceRating']) > 5
      )
        throw new Error('Progress or ratings are out of range.');
      if (!BOOK_STATUSES.includes(b['status'] as never)) throw new Error('Invalid reading status.');
      result['status'] = b['status'];
      if (
        b['progressMode'] !== undefined &&
        !['pages', 'percent'].includes(String(b['progressMode']))
      )
        throw new Error('Invalid progress unit.');
      if (b['progressMode'] !== undefined) result['progressMode'] = b['progressMode'];
      for (const key of ['yearRead', 'seriesNumber']) {
        const n = b[key];
        if (n !== null && (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0))
          throw new Error(`Invalid ${key}.`);
        result[key] = n;
      }
      const copies = list(b['copies']).map((value) => {
        const c = object(value);
        if (!BOOK_FORMATS.includes(c['format'] as never)) throw new Error('Invalid book format.');
        return { id: id(c['id']), format: c['format'], label: text(c['label']) };
      });
      if (!copies.length) throw new Error('At least one copy is required.');
      unique(copies.map((c) => c.id));
      result['copies'] = copies;
      for (const key of ['moodTagIds', 'genreTagIds']) {
        const ids = list(b[key]).map(id);
        if (
          ids.some(
            (tagId) =>
              !tags.some(
                (t) => t.id === tagId && t.type === (key === 'moodTagIds' ? 'mood' : 'genre'),
              ),
          )
        )
          throw new Error('A referenced tag is missing from the backup.');
        result[key] = ids;
      }
      if (JSON.stringify(result).length > 100000) throw new Error('Book record is too large.');
      return result as unknown as BookRecord;
    } catch (e) {
      throw new Error(`Book ${index + 1}: ${e instanceof Error ? e.message : 'Invalid data'}`);
    }
  });
  unique(books.map((b) => b.id));
  return {
    format: 'lifeos-books',
    version: 1,
    exportedAt: text(raw['exportedAt'], 100),
    books,
    tags,
  };
}
/** Enrich metadata without replacing existing reviews, ratings or reading history. */
export function mergeBookInformation(current: BookRecord, incoming: BookRecord): BookRecord {
  const merged = structuredClone(current);
  merged.progressMode = current.progressMode ?? (current.pageCount > 0 ? 'pages' : 'percent');
  for (const key of textFields)
    if (!merged[key].trim() && incoming[key].trim()) merged[key] = incoming[key];
  if (
    (!current.category.trim() || current.category.trim().toLowerCase() === 'other') &&
    incoming.category.trim().toLowerCase() !== 'other'
  )
    merged.category = incoming.category;
  for (const key of ['pageCount', 'rating', 'spiceRating'] as const)
    if (!current[key] && incoming[key] > 0) merged[key] = incoming[key];
  if (current.seriesNumber === null) merged.seriesNumber = incoming.seriesNumber;
  for (const key of booleans) merged[key] = current[key] || incoming[key];
  // Adopt history as a unit only when there is no existing reading history.
  if (
    current.status === 'Not Started' &&
    current.progress === 0 &&
    !current.startDate &&
    !current.finishDate
  ) {
    merged.status = incoming.status;
    merged.progress = incoming.progress;
    merged.pageProgress = incoming.pageProgress;
    merged.progressMode = incoming.progressMode;
    merged.yearRead = incoming.yearRead;
  } else {
    merged.startDate =
      current.startDate || (current.status === incoming.status ? incoming.startDate : '');
    merged.finishDate =
      current.finishDate || (current.status === incoming.status ? incoming.finishDate : '');
    merged.yearRead =
      current.yearRead ??
      (merged.finishDate ? Number(merged.finishDate.slice(0, 4)) || null : null);
  }
  if (merged.progressMode === 'percent' && merged.pageCount !== current.pageCount)
    merged.pageProgress = Math.round((merged.progress / 100) * merged.pageCount);
  merged.moodTagIds = [...new Set([...current.moodTagIds, ...incoming.moodTagIds])];
  merged.genreTagIds = [...new Set([...current.genreTagIds, ...incoming.genreTagIds])];
  const copyKey = (copy: BookRecord['copies'][number]) =>
    `${copy.format.toLowerCase()}|${copy.label.trim().toLowerCase()}`;
  for (const copy of incoming.copies)
    if (!merged.copies.some((c) => copyKey(c) === copyKey(copy)))
      merged.copies.push({
        ...copy,
        id: merged.copies.some((c) => c.id === copy.id) ? crypto.randomUUID() : copy.id,
      });
  return merged;
}
const identity = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const isbnKey = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
export function planBookImport(
  backup: BookBackup,
  existing: BookRecord[],
  tags: BookTag[],
  updateExisting = true,
): BookImportPlan {
  const additions: BookTag[] = [];
  const mapping = new Map<string, string>();
  for (const tag of backup.tags) {
    const match = [...tags, ...additions].find(
      (t) => t.type === tag.type && t.name.trim().toLowerCase() === tag.name.trim().toLowerCase(),
    );
    if (match) {
      mapping.set(tag.id, match.id);
      continue;
    }
    const copy = {
      ...tag,
      id: [...tags, ...additions].some((t) => t.id === tag.id) ? crypto.randomUUID() : tag.id,
    };
    additions.push(copy);
    mapping.set(tag.id, copy.id);
  }
  let added = 0,
    updated = 0,
    skipped = 0;
  const pending = new Map<string, BookRecord>();
  const originallyExisting = new Set(existing.map((book) => book.id));
  for (const book of backup.books) {
    const incoming = {
      ...structuredClone(book),
      moodTagIds: book.moodTagIds.map((id) => mapping.get(id)!),
      genreTagIds: book.genreTagIds.map((id) => mapping.get(id)!),
    };
    const pool = [...existing.filter((b) => !pending.has(b.id)), ...pending.values()];
    const direct = pool.find((b) => b.id === book.id);
    const isbnMatches = book.isbn.trim()
      ? pool.filter((b) => isbnKey(b.isbn) === isbnKey(book.isbn))
      : [];
    const titleMatches = pool.filter(
      (b) =>
        identity(b.title) === identity(book.title) &&
        identity(b.author) === identity(book.author) &&
        (!b.isbn.trim() || !book.isbn.trim() || isbnKey(b.isbn) === isbnKey(book.isbn)),
    );
    const matches = direct ? [direct] : isbnMatches.length ? isbnMatches : titleMatches;
    if (matches.length > 1) {
      skipped++;
      continue;
    }
    const match = matches[0];
    if (match && !updateExisting) {
      skipped++;
      continue;
    }
    if (match) pending.set(match.id, mergeBookInformation(match, incoming));
    else pending.set(incoming.id, incoming);
  }
  const books = [...pending.values()];
  for (const book of books) originallyExisting.has(book.id) ? updated++ : added++;

  return { books, tags: additions, added, updated, skipped };
}
export function booksCsv(books: BookRecord[]): string {
  const keys = [
    'id',
    'title',
    'author',
    'category',
    'isbn',
    'status',
    'progress',
    'pageCount',
    'pageProgress',
    'rating',
    'spiceRating',
    'startDate',
    'finishDate',
    'seriesName',
    'seriesNumber',
    'favourite',
    'review',
  ] as const;
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return (
    '\uFEFF' +
    [keys.map(cell).join(','), ...books.map((b) => keys.map((k) => cell(b[k])).join(','))].join(
      '\r\n',
    )
  );
}
