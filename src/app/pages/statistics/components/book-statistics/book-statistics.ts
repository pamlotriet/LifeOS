import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ChartConfiguration } from 'chart.js';
import { BookStatsDetail } from '@pages/statistics/state/books/book-stats';
import { StatsRange } from '@pages/statistics/state/overview/stats.service';
import { AppChart } from '@shared/components/app-chart/app-chart';
@Component({
  selector: 'app-book-statistics',
  imports: [TranslatePipe, IonIcon, AppChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-statistics.html',
  styleUrl: './book-statistics.css',
  host: { style: 'display: contents' },
})
export class BookStatistics {
  readonly book = input.required<BookStatsDetail>();
  readonly primary = input.required<ChartConfiguration>();
  readonly secondary = input.required<ChartConfiguration>();
  readonly range = input.required<StatsRange>();
}
