export const BOOK_CATEGORIES = [
  'Fantasy', 'Romantasy', 'Romance', 'Literary Fiction', 'Contemporary Fiction',
  'Science Fiction', 'Horror', 'Mystery', 'Thriller', 'Historical Fiction',
  'Nonfiction', 'Biography', 'Young Adult', 'Other',
] as const;

export const BOOK_FORMATS = ['Paperback', 'Hardcover', 'Kindle', 'Kindle Unlimited', 'Ebook', 'Audiobook', 'Other'] as const;
export const BOOK_STATUSES = ['Not Started', 'Reading', 'Finished', 'Did Not Finish'] as const;

export type BookFormat = typeof BOOK_FORMATS[number];
export type BookStatus = typeof BOOK_STATUSES[number];
export type BookTagType = 'mood' | 'genre';

export interface BookCopy { id: string; format: BookFormat; label: string; }
export interface BookTag { id: string; name: string; type: BookTagType; color: string; }
export interface BookRecord {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  isbn: string;
  publicationDate: string;
  status: BookStatus;
  progress: number;
  progressMode?: 'pages' | 'percent' | 'locations';
  totalLocations?: number;
  currentLocation?: number;
  locationsPerPage?: number;
  locationEntries?: LocationReadingEntry[];
  pageCount: number;
  pageProgress: number;
  rating: number;
  spiceRating: number;
  wheelSelected: boolean;
  favourite: boolean;
  wouldRecommend: boolean;
  reread: boolean;
  seriesName: string;
  seriesNumber: number | null;
  startDate: string;
  finishDate: string;
  yearRead: number | null;
  review: string;
  copies: BookCopy[];
  moodTagIds: string[];
  genreTagIds: string[];
}

export type BookInput = Omit<BookRecord, 'id'>;

export interface LocationReadingEntry {
  id: string;
  date: string;
  fromLocation: number;
  toLocation: number;
}

export function bookProgressMode(book: Pick<BookRecord, 'progressMode' | 'pageCount'>): 'pages' | 'percent' | 'locations' {
  return book.progressMode === 'locations' ? 'locations' : book.progressMode === 'percent' || !book.pageCount ? 'percent' : 'pages';
}

export function validateLocationTracking(book: Pick<BookRecord, 'totalLocations' | 'currentLocation' | 'locationsPerPage' | 'pageCount'>): void {
  if (!Number.isSafeInteger(book.totalLocations) || book.totalLocations! <= 0) throw new Error('Enter a positive whole number of total locations.');
  if (!Number.isSafeInteger(book.currentLocation) || book.currentLocation! < 0 || book.currentLocation! > book.totalLocations!) throw new Error('Current location must be between 0 and total locations.');
  if (book.locationsPerPage === null || !Number.isFinite(book.locationsPerPage ?? 15) || (book.locationsPerPage ?? 15) <= 0) throw new Error('Locations per estimated page must be positive.');
  if (!Number.isSafeInteger(book.pageCount) || book.pageCount < 0) throw new Error('Enter a positive whole page count, or leave it empty.');
}

export function effectiveTotalPages(book: BookRecord): number {
  if (book.pageCount > 0 || (!book.totalLocations && book.progressMode !== 'locations')) return book.pageCount;
  const divisor = book.locationsPerPage ?? 15;
  return divisor > 0 && Number.isFinite(divisor) && (book.totalLocations ?? 0) > 0 ? Math.ceil(book.totalLocations! / divisor) : 0;
}
export function locationProgress(book: BookRecord): number {
  return (book.totalLocations ?? 0) > 0 ? Math.max(0, Math.min(1, (book.currentLocation ?? 0) / book.totalLocations!)) : 0;
}
export function locationSessionPages(book: BookRecord, entry: LocationReadingEntry): number {
  return (book.totalLocations ?? 0) > 0 ? Math.max(0, entry.toLocation - entry.fromLocation) / book.totalLocations! * effectiveTotalPages(book) : 0;
}
export function locationPagesRead(book: BookRecord): number {
  return Math.round((book.locationEntries ?? []).reduce((sum, entry) => sum + locationSessionPages(book, entry), 0));
}
export function kindleSummary(book: BookRecord): string {
  const number = (value: number) => value.toLocaleString('en-US');
  return `Location ${number(book.currentLocation ?? 0)} of ${number(book.totalLocations ?? 0)} \u00b7 \u2248 Page ${number(Math.round(locationProgress(book) * effectiveTotalPages(book)))} of ${number(effectiveTotalPages(book))} (estimated) \u00b7 ${Math.round(locationProgress(book) * 100)}% complete`;
}
