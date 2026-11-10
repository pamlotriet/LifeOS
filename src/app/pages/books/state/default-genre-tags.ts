import { BookTag } from './book.model';

const genres = [
  'Fantasy', 'Romantasy', 'High Fantasy', 'Urban Fantasy', 'Magical Realism',
  'Science Fiction', 'Dystopian', 'Horror', 'Paranormal', 'Mystery', 'Cozy Mystery',
  'Thriller', 'Psychological Thriller', 'Crime', 'Romance', 'Contemporary Romance',
  'Historical Romance', 'Dark Romance', 'Romantic Comedy', 'Historical Fiction',
  'Literary Fiction', 'Contemporary Fiction', 'Classics', 'Adventure', 'Young Adult',
  'Coming of Age', 'Children’s Fiction', 'Middle Grade', 'Graphic Novel', 'Manga',
  'Short Stories', 'Poetry', 'Nonfiction', 'Memoir', 'Biography', 'True Crime',
  'History', 'Science', 'Psychology', 'Self-Help', 'Business', 'Travel',
];
const colors = ['#8c5cf6', '#47b9fa', '#36c98c', '#f6bd48', '#f46a7c', '#29d9eb'];
export const DEFAULT_GENRE_TAGS: BookTag[] = genres.map((name, index) => ({
  id: `genre-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`,
  name, type: 'genre', color: colors[index % colors.length],
}));
export const GENRE_SEED_ID = '__genre_defaults_v1';
