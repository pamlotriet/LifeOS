import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { OpenLibraryCoverService } from './open-library-cover.service';
import { BookInput, BookRecord, BookTag, BookTagType } from './book.model';

const text = (value: string): FirestoreValue => ({ stringValue: value });
const strings = (values: string[]): FirestoreValue => ({ arrayValue: { values: values.map(text) } });

@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  private readonly covers = inject(OpenLibraryCoverService);

  async listBooks(): Promise<BookRecord[]> {
    const { uid, token } = await this.auth.getSession();
    const docs = await this.firestore.listDocuments(`users/${uid}/books`, token);
    return docs.map((doc) => this.fromBook(doc));
  }

  async getBook(id: string): Promise<BookRecord> {
    const { uid, token } = await this.auth.getSession();
    return this.fromBook(await this.firestore.getDocument(`users/${uid}/books/${encodeURIComponent(id)}`, token));
  }

  async saveBook(input: BookInput, id?: string): Promise<BookRecord> {
    if (!input.title.trim() || !input.author.trim() || !input.category) throw new Error('Title, author, and category are required.');
    if (!input.copies.length) throw new Error('Add at least one copy.');
    const { uid, token } = await this.auth.getSession();
    const book: BookRecord = {
      ...input, title: input.title.trim(), author: input.author.trim(), id: id ?? crypto.randomUUID(),
      yearRead: input.status === 'Finished' ? (input.yearRead ?? (Number(input.finishDate.slice(0, 4)) || new Date().getFullYear())) : null,
    };
    const path = `users/${uid}/books`;
    const previous = id ? await this.getBook(id) : null;
    book.coverUrl = previous && previous.title === book.title && previous.author === book.author && previous.coverUrl
      ? previous.coverUrl
      : await this.covers.find(book.title, book.author) ?? '';
    if (id) await this.firestore.updateDocument(`${path}/${encodeURIComponent(id)}`, this.toBookFields(book), token);
    else await this.firestore.createDocument(path, book.id, this.toBookFields(book), token);
    return book;
  }

  async deleteBook(id: string): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    await this.firestore.deleteDocument(`users/${uid}/books`, id, token);
  }

  async setWheelSelected(id: string, selected: boolean): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    await this.firestore.updateDocumentField(`users/${uid}/books`, id, 'wheelSelected', { booleanValue: selected }, token);
  }

  async listTags(): Promise<BookTag[]> {
    const { uid, token } = await this.auth.getSession();
    return (await this.firestore.listDocuments(`users/${uid}/bookTags`, token)).map((doc) => this.fromTag(doc));
  }

  async saveTag(input: Pick<BookTag, 'name' | 'type' | 'color'>, id?: string): Promise<BookTag> {
    if (!input.name.trim()) throw new Error('Enter a tag name.');
    const { uid, token } = await this.auth.getSession();
    const tag: BookTag = { ...input, name: input.name.trim(), id: id ?? crypto.randomUUID() };
    const path = `users/${uid}/bookTags`;
    const fields = { name: text(tag.name), type: text(tag.type), color: text(tag.color) };
    if (id) await this.firestore.updateDocument(`${path}/${encodeURIComponent(id)}`, fields, token);
    else await this.firestore.createDocument(path, tag.id, fields, token);
    return tag;
  }

  async deleteTag(tag: BookTag, books: BookRecord[]): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    const listField = tag.type === 'mood' ? 'moodTagIds' : 'genreTagIds';
    const affected = books.filter((book) => book[listField].includes(tag.id));
    const writes = affected.map((book) => ({
      update: { name: this.firestore.documentName(`users/${uid}/books/${book.id}`), fields: {
        [listField]: strings(book[listField].filter((id) => id !== tag.id)),
      } },
      updateMask: { fieldPaths: [listField] },
    }));
    if (writes.length >= 500) throw new Error('This tag is on too many books to remove in one save.');
    await this.firestore.commitWrites([
      ...writes,
      { delete: this.firestore.documentName(`users/${uid}/bookTags/${tag.id}`) },
    ], token);
  }

  private toBookFields(book: BookRecord): Record<string, FirestoreValue> {
    return {
      title: text(book.title), author: text(book.author), category: text(book.category), coverUrl: text(book.coverUrl),
      publicationDate: text(book.publicationDate), status: text(book.status), rating: { integerValue: String(book.rating) },
      spiceRating: { integerValue: String(book.spiceRating) },
      wheelSelected: { booleanValue: book.wheelSelected },
      favourite: { booleanValue: book.favourite }, wouldRecommend: { booleanValue: book.wouldRecommend },
      reread: { booleanValue: book.reread }, seriesName: text(book.seriesName),
      seriesNumber: book.seriesNumber === null ? { nullValue: null } : { integerValue: String(book.seriesNumber) },
      startDate: text(book.startDate), finishDate: text(book.finishDate), review: text(book.review),
      yearRead: book.yearRead === null ? { nullValue: null } : { integerValue: String(book.yearRead) },
      moodTagIds: strings(book.moodTagIds), genreTagIds: strings(book.genreTagIds),
      copies: { arrayValue: { values: book.copies.map((copy) => ({ mapValue: { fields: {
        id: text(copy.id), format: text(copy.format), label: text(copy.label),
      } } })) } },
    };
  }

  private fromBook(doc: FirestoreDocument): BookRecord {
    const f = doc.fields ?? {};
    const s = (key: string) => f[key]?.stringValue ?? '';
    const ids = (key: string) => f[key]?.arrayValue?.values?.map((value) => value.stringValue ?? '') ?? [];
    return {
      id: doc.name.split('/').at(-1) ?? '', title: s('title'), author: s('author'), category: s('category'),
      coverUrl: s('coverUrl'), publicationDate: s('publicationDate'), status: (s('status') || 'Not Started') as BookRecord['status'],
      rating: Number(f['rating']?.integerValue ?? 0), spiceRating: Number(f['spiceRating']?.integerValue ?? 0),
      wheelSelected: f['wheelSelected']?.booleanValue ?? false, favourite: f['favourite']?.booleanValue ?? false,
      wouldRecommend: f['wouldRecommend']?.booleanValue ?? false, reread: f['reread']?.booleanValue ?? false,
      seriesName: s('seriesName'), seriesNumber: f['seriesNumber']?.integerValue === undefined ? null : Number(f['seriesNumber'].integerValue),
      startDate: s('startDate'), finishDate: s('finishDate'), review: s('review'),
      yearRead: f['yearRead']?.integerValue === undefined ? (Number(s('finishDate').slice(0, 4)) || null) : Number(f['yearRead'].integerValue),
      moodTagIds: ids('moodTagIds'), genreTagIds: ids('genreTagIds'),
      copies: (f['copies']?.arrayValue?.values ?? []).map((value) => ({
        id: value.mapValue?.fields?.['id']?.stringValue ?? '',
        format: (value.mapValue?.fields?.['format']?.stringValue ?? 'Paperback') as BookRecord['copies'][number]['format'],
        label: value.mapValue?.fields?.['label']?.stringValue ?? '',
      })),
    };
  }

  private fromTag(doc: FirestoreDocument): BookTag {
    const f = doc.fields ?? {};
    return { id: doc.name.split('/').at(-1) ?? '', name: f['name']?.stringValue ?? '',
      type: (f['type']?.stringValue ?? 'mood') as BookTagType, color: f['color']?.stringValue ?? '#36cafa' };
  }
}
