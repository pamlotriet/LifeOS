import { describe, expect, it } from 'vitest';
import { BookRecord, BookTag } from './book.model';
import {
  booksCsv,
  createBookBackup,
  parseBookBackup,
  planBookImport,
  mergeBookInformation,
} from './book-transfer';
const tags: BookTag[] = [
  { id: 'genre', name: 'Fantasy', type: 'genre', color: '#abcdef' },
  { id: 'mood', name: 'Cosy', type: 'mood', color: '#123456' },
];
const book: BookRecord = {
  id: 'book1',
  title: 'A "quoted" title',
  author: 'Author',
  category: 'Custom category',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '9780000000000',
  publicationDate: '2025-01-01',
  status: 'Reading',
  progress: 50,
  progressMode: 'pages',
  pageCount: 200,
  pageProgress: 100,
  rating: 4,
  spiceRating: 2,
  wheelSelected: true,
  favourite: true,
  wouldRecommend: false,
  reread: true,
  seriesName: 'Series',
  seriesNumber: 1,
  startDate: '2026-01-01',
  finishDate: '',
  yearRead: null,
  review: 'Multiline\nreview',
  copies: [
    { id: 'paper', format: 'Paperback', label: 'Signed copy' },
    { id: 'audio', format: 'Audiobook', label: 'Digital' },
  ],
  moodTagIds: ['mood'],
  genreTagIds: ['genre'],
};
describe('Book backups', () => {
  it('round trips Kindle tracking and raw location sessions', () => {
    const kindle: BookRecord = {...book, progressMode: 'locations', totalLocations: 4500, currentLocation: 900, pageCount: 0, locationsPerPage: 15.5, locationEntries: [{id: 'session', date: '2026-10-21', fromLocation: 0, toLocation: 900}]};
    const backup = createBookBackup([kindle], tags);
    expect(parseBookBackup(JSON.stringify(backup))).toEqual(backup);
    const merged = mergeBookInformation(kindle, {...book, pageCount: 300});
    expect(merged.locationEntries).toEqual(kindle.locationEntries);
    expect(merged.currentLocation).toBe(900);
  });
  it('round-trips every book field, custom categories, multiple copies and tags', () => {
    const backup = createBookBackup([book], tags);
    expect(parseBookBackup(JSON.stringify(backup))).toEqual(backup);
    backup.books[0].title = 'changed';
    expect(book.title).toBe('A "quoted" title');
  });
  it('accepts empty libraries and rejects malformed or incompatible files before writing', () => {
    expect(parseBookBackup(JSON.stringify(createBookBackup([], []))).books).toEqual([]);
    for (const value of [
      '{}',
      'not json',
      JSON.stringify({ format: 'lifeos-books', version: 2, books: [], tags: [] }),
    ])
      expect(() => parseBookBackup(value)).toThrow();
    for (const bad of [
      { ...book, id: '../bad' },
      { ...book, progress: 101 },
      { ...book, rating: -1 },
      { ...book, status: 'invalid' },
      { ...book, copies: [] },
      { ...book, moodTagIds: ['missing'] },
    ])
      expect(() =>
        parseBookBackup(JSON.stringify(createBookBackup([bad as BookRecord], tags))),
      ).toThrow();
    expect(() => parseBookBackup(JSON.stringify(createBookBackup([book, book], tags)))).toThrow(
      'Duplicate',
    );
  });
  it('supports legacy skip mode and enriches matches without overwriting specific categories', () => {
    const backup = createBookBackup([{ ...book, category: 'Fantasy' }], tags);
    const extra = { ...book, id: 'unrelated' };
    expect(planBookImport(backup, [book, extra], tags, false)).toMatchObject({
      added: 0,
      updated: 0,
      skipped: 1,
      books: [],
    });
    const plan = planBookImport(backup, [book, extra], tags, true);
    expect(plan.updated).toBe(1);
    expect(plan.books[0].category).toBe('Custom category');
    expect(extra.category).toBe('Custom category');
  });
  it('reuses matching tag names and remaps colliding IDs without overwriting existing tags', () => {
    const existing = [
      { ...tags[0], id: 'same-name' },
      { ...tags[1], name: 'Different mood' },
    ];
    const plan = planBookImport(createBookBackup([book], tags), [], existing, false);
    expect(plan.books[0].genreTagIds).toEqual(['same-name']);
    expect(plan.books[0].moodTagIds[0]).not.toBe('mood');
    expect(plan.tags).toHaveLength(1);
    expect(planBookImport(createBookBackup([], tags), [], [], false).tags).toHaveLength(2);
  });
  it('merges duplicate books within the same backup and supports repeat imports', () => {
    const backup = createBookBackup([book, { ...book, id: 'second-edition' }], tags);
    const first = planBookImport(backup, [], [], false);
    expect(first.added).toBe(1);
    expect(planBookImport(backup, first.books, first.tags, false).skipped).toBe(2);
  });
  it('escapes CSV quotes/newlines and neutralizes spreadsheet formulas', () => {
    const csv = booksCsv([{ ...book, title: '=HYPERLINK("bad")' }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Multiline\nreview"');
    expect(csv).toContain('""bad""');
  });
  it('fills missing metadata and Other categories while preserving reviews, ratings and progress', () => {
    const current = {
      ...book,
      category: 'Other',
      isbn: '',
      coverUrl: '',
      pageCount: 0,
      progressMode: 'percent' as const,
      progress: 75,
      pageProgress: 0,
      review: 'My review',
      rating: 5,
    };
    const incoming = {
      ...book,
      category: 'Fantasy',
      review: 'Different review',
      rating: 2,
      progress: 10,
    };
    const merged = mergeBookInformation(current, incoming);
    expect(merged).toMatchObject({
      id: current.id,
      category: 'Fantasy',
      isbn: book.isbn,
      coverUrl: book.coverUrl,
      review: 'My review',
      rating: 5,
      progress: 75,
      pageProgress: 150,
      progressMode: 'percent',
    });
  });
  it('matches differing IDs by ISBN or normalized title/author and merges copies and tags', () => {
    const current = {
      ...book,
      id: 'existing',
      isbn: '',
      copies: [book.copies[0]],
      genreTagIds: [],
    };
    const incoming = { ...book, id: 'external', title: '  A "quoted" title  ', author: 'AUTHOR' };
    const backup = createBookBackup([incoming], tags);
    const plan = planBookImport(backup, [current], tags);
    expect(plan.added).toBe(0);
    expect(plan.updated).toBe(1);
    expect(plan.books[0].id).toBe('existing');
    expect(plan.books[0].copies).toHaveLength(2);
    expect(plan.books[0].genreTagIds).toEqual(['genre']);
    expect(planBookImport(backup, plan.books, tags).books[0].copies).toHaveLength(2);
    expect(
      planBookImport(
        createBookBackup([{ ...book, id: 'different', title: 'Alternative title' }], tags),
        [book],
        tags,
      ).updated,
    ).toBe(1);
  });
  it('keeps distinct ISBN editions separate and skips ambiguous title matches', () => {
    expect(
      planBookImport(
        createBookBackup([{ ...book, id: 'external', isbn: '9781234567890' }], tags),
        [book],
        tags,
      ).added,
    ).toBe(1);
    const incoming = { ...book, id: 'external', isbn: '' };
    expect(
      planBookImport(createBookBackup([incoming], tags), [book, { ...book, id: 'another' }], tags)
        .skipped,
    ).toBe(1);
  });
  it('accepts legacy tags with no colour without changing their metadata', () => {
    const backup=createBookBackup([book],tags.map(tag=>({...tag,color:''})));
    expect(parseBookBackup(JSON.stringify(backup)).tags.every(tag=>tag.color==='')).toBe(true);
  });

});
