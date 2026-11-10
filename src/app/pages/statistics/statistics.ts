import { AppInput } from '../../shared/components/app-input/app-input';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  barChartOutline,
  bookOutline,
  bookmarkOutline,
  checkmarkDoneOutline,
  readerOutline,
  timeOutline,
  trophyOutline,
  flameOutline,
  starOutline,
  trendingUpOutline,
} from './statistics-icons';
import { statsMonthOptions } from './state/stats.calculations';
import { FormsModule } from '@angular/forms';
import { BudgetStatistics } from './components/budget-statistics/budget-statistics';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { AppChart } from '../../shared/components/app-chart/app-chart';
import { StatisticsSkeleton } from './components/statistics-skeleton/statistics-skeleton';
import {
  StatsModule,
  StatsRange,
  StatsService,
  STATS_MODULES,
} from './state/stats.service';

@Component({
  selector: 'app-statistics',
  imports: [AppInput, 
    FormsModule,
    IonContent,
    IonIcon,
    RouterLink,
    AppChart,
    StatisticsSkeleton,
    BudgetStatistics,
  ],
  styleUrls: ['./statistics.css', './statistics-layout.css'],
  templateUrl: './statistics.html',
})
export class Statistics {
  readonly service = inject(StatsService);
  readonly modules = STATS_MODULES;
  readonly ranges: StatsRange[] = ['1M', '3M', '6M', '1Y', 'All'];
  readonly selected = signal<StatsModule>(this.restoreModule());
  readonly range = signal<StatsRange>('6M');
  readonly monthOptions = statsMonthOptions();
  readonly selectedMonth = signal(this.monthOptions[new Date().getMonth()].value);
  readonly nutritionStart = signal('');
  readonly nutritionEnd = signal('');
  readonly dashboard = computed(() => {
    this.service.nutritionStart = this.nutritionStart();
    this.service.nutritionEnd = this.nutritionEnd();
    return this.service.dashboard(this.selected(), this.range(), this.selectedMonth());
  });
  readonly loading = computed(() => this.service.loading(this.selected()));
  readonly error = computed(() => this.service.error(this.selected()));
  constructor() {
    addIcons({
      arrowBackOutline,
      barChartOutline,
      bookOutline,
      bookmarkOutline,
      checkmarkDoneOutline,
      readerOutline,
      timeOutline,
      trophyOutline,
      flameOutline,
      starOutline,
      trendingUpOutline,
    });
    effect(() => {
      if (this.selected() === 'fuel') void this.service.ensureFuelLoaded();
    });
    effect(() => {
      try {
        localStorage.setItem('lifeos.stats.module', this.selected());
      } catch {
        /* Optional persistence. */
      }
    });
  }
  option(id = this.selected()) {
    return this.modules.find((item) => item.id === id)!;
  }
  choose(id: StatsModule): void {
    this.selected.set(id);
  }
  private restoreModule(): StatsModule {
    try {
      const value = localStorage.getItem('lifeos.stats.module');
      return this.modules.some((item) => item.id === value) ? (value as StatsModule) : 'books';
    } catch {
      return 'books';
    }
  }
}
