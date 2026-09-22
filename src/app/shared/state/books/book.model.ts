export const BOOK_CATEGORIES = [
  'Fantasy', 'Romantasy', 'Romance', 'Literary Fiction', 'Contemporary Fiction',
  'Science Fiction', 'Horror', 'Mystery', 'Thriller', 'Historical Fiction',
  'Nonfiction', 'Biography', 'Young Adult', 'Other',
] as const;

export const BOOK_FORMATS = ['Paperback', 'Hardcover', 'Kindle', 'Ebook', 'Audiobook', 'Other'] as const;
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
  coverStoragePath: string;
  publicationDate: string;
  status: BookStatus;
  rating: number;
  favourite: boolean;
  wouldRecommend: boolean;
  reread: boolean;
  seriesName: string;
  seriesNumber: number | null;
  startDate: string;
  finishDate: string;
  review: string;
  copies: BookCopy[];
  moodTagIds: string[];
  genreTagIds: string[];
}

export type BookInput = Omit<BookRecord, 'id'>;
