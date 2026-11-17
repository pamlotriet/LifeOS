import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BookStore } from '@pages/books/state/book/book-store';
import { buildBookStats } from '@pages/statistics/state/books/book-stats';

import type { StatsDashboard, StatsRange } from '@pages/statistics/state/overview/stats.model';
export class BooksStats {
  constructor(
    private readonly injector: Injector,
    private readonly i18n: TranslateService,
  ) {}
  private get books(): BookStore {
    return this.injector.get(BookStore);
  }
  dashboard(range: StatsRange, selectedMonth?: string): StatsDashboard {
    return buildBookStats(this.books.books(), range, selectedMonth, new Date(), (key, params) =>
      this.i18n.instant(key, params),
    );
  }
}
