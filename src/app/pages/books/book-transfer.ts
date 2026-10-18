import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookService } from '../../shared/state/books/book.service';
import { BookStore } from '../../shared/state/books/book-store';
import {
  BookBackup,
  booksCsv,
  parseBookBackup,
  planBookImport,
} from '../../shared/state/books/book-transfer';
import { localDate } from '../../shared/state/nutrition/nutrition.model';
@Component({
  selector: 'app-book-transfer',
  imports: [FormsModule, RouterLink, IonContent, PageHeader],
  templateUrl: './book-transfer.html',
  styles: `
    .transfer-page {
      max-width: 720px;
      margin: auto;
      padding: 24px 18px calc(40px + env(safe-area-inset-bottom));
      color: var(--foreground);
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 18px 0 8px;
    }
    h2 {
      font-size: 19px;
      font-weight: 650;
      margin-bottom: 10px;
    }
    p {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    section {
      border: 1px solid var(--border);
      background: var(--card);
      border-radius: 20px;
      padding: 22px;
      margin-top: 20px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 18px;
    }
    button {
      border: 1px solid var(--border);
      border-radius: 12px;
      min-height: 44px;
      padding: 10px 16px;
      font-size: 14px;
    }
    .primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    button:disabled {
      opacity: 0.5;
    }
    label {
      display: block;
      margin: 16px 0;
      font-size: 14px;
    }
    input[type='file'] {
      display: block;
      max-width: 100%;
      margin-top: 12px;
    }
    input[type='checkbox'] {
      margin-right: 8px;
    }
    ul {
      padding-left: 20px;
      list-style: disc;
      font-size: 14px;
      margin: 12px 0;
    }
    .preview {
      max-height: 240px;
      overflow: auto;
      border-top: 1px solid var(--border);
      padding-top: 10px;
    }
    .feedback {
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-top: 18px;
    }
    progress {
      width: 100%;
      margin-top: 12px;
    }
    a {
      color: var(--primary);
    }
  `,
})
export class BookTransfer {
  private readonly service = inject(BookService);
  readonly store = inject(BookStore);
  readonly backup = signal<BookBackup | null>(null);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly saved = signal(0);
  readonly total = signal(0);
  readonly preview = computed(() => {
    const backup = this.backup();
    return backup ? planBookImport(backup, this.store.books(), this.store.tags(), true) : null;
  });
  private download(content: string, type: string, name: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async exportBooks(csv = false): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const backup = await this.service.exportLibrary();
      this.download(
        csv ? booksCsv(backup.books) : JSON.stringify(backup, null, 2),
        csv ? 'text/csv;charset=utf-8' : 'application/json',
        `lifeos-books-${localDate()}.${csv ? 'csv' : 'json'}`,
      );
      this.notice.set(
        `Exported all ${backup.books.length} books${csv ? ' as a spreadsheet summary' : ` and ${backup.tags.length} tags as a full backup`}.`,
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not export books.');
    } finally {
      this.busy.set(false);
    }
  }
  async chooseFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.backup.set(null);
    this.error.set('');
    this.notice.set('');
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a backup smaller than 20 MB.');
      this.backup.set(parseBookBackup(await file.text()));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      input.value = '';
    }
  }
  async importBooks(): Promise<void> {
    const backup = this.backup();
    if (!backup || this.busy() || this.store.loading() || this.store.error()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.saved.set(0);
    this.total.set(0);
    try {
      const result = await this.service.importLibrary(backup, true, (saved, total) => {
        this.saved.set(saved);
        this.total.set(total);
      });
      this.backup.set(null);
      this.notice.set(
        `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`,
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not import books.');
    } finally {
      await this.store.reload();
      this.busy.set(false);
    }
  }
}
