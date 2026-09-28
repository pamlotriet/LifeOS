import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { AppSelect, SelectOption } from '../../shared/components/app-select/app-select';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookStore } from '../../shared/state/books/book-store';
import { finishDateParts } from './finished-books-filter';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

@Component({
  selector: 'app-finished-books',
  imports: [IonContent, IonIcon, RouterLink, AppSelect, PageHeader],
  templateUrl: './finished-books.html',
})
export class FinishedBooks {
  readonly store = inject(BookStore);
  readonly currentYear = new Date().getFullYear();
  readonly selectedYear = signal(String(this.currentYear));
  readonly selectedMonth = signal('all');
  readonly view = signal<'covers' | 'list'>('covers');
  readonly monthOptions: SelectOption[] = [{ value: 'all', label: 'All months' }, ...MONTHS.map((label, index) => ({ value: String(index + 1), label }))];
  readonly yearOptions = computed<SelectOption[]>(() => {
    const years = new Set<number>([this.currentYear]);
    for (const book of this.store.books()) {
      const parts = finishDateParts(book);
      if (parts) years.add(parts.year);
    }
    return [...years].sort((a, b) => b - a).map((year) => ({ value: String(year), label: String(year) }));
  });
  readonly books = computed(() => {
    const year = Number(this.selectedYear());
    const month = this.selectedMonth() === 'all' ? null : Number(this.selectedMonth());
    return this.store.books().filter((book) => {
      const parts = finishDateParts(book);
      return parts?.year === year && (month === null || parts.month === month);
    }).sort((a, b) => b.finishDate.localeCompare(a.finishDate));
  });

  selectedPeriod(): string {
    return this.selectedMonth() === 'all' ? this.selectedYear() : `${MONTHS[Number(this.selectedMonth()) - 1]} ${this.selectedYear()}`;
  }

  formatDate(date: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return 'Date unavailable';
    return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
  }
}
