import { Component, computed, effect, inject, signal } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { BudgetChart } from '../../../../pages/budget/budget-ui';
import { AppSkeleton } from '../../../components/app-skeleton/app-skeleton';
import {
  StatsModule,
  StatsRange,
  StatsService,
  STATS_MODULES,
} from '../../../state/statistics/stats.service';

@Component({
  selector: 'app-statistics',
  imports: [IonContent, IonIcon, RouterLink, BudgetChart, AppSkeleton],
  styleUrl: './statistics.css',
  templateUrl: './statistics.html',
})
export class Statistics {
  readonly service = inject(StatsService);
  readonly modules = STATS_MODULES;
  readonly ranges: StatsRange[] = ['3M', '6M', '1Y', 'All'];
  readonly selected = signal<StatsModule>(this.restoreModule());
  readonly range = signal<StatsRange>('6M');
  readonly selectorOpen = signal(false);
  readonly dashboard = computed(() => this.service.dashboard(this.selected(), this.range()));
  readonly loading = computed(() => this.service.loading(this.selected()));
  readonly error = computed(() => this.service.error(this.selected()));
  constructor() {
    effect(() => {
      if (this.selected() === 'fuel' && this.service.selectedVehicleId()) this.service.ensureFuelLoaded();
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
    this.selectorOpen.set(false);
  }
  private restoreModule(): StatsModule {
    try {
      const value = localStorage.getItem('lifeos.stats.module');
      return this.modules.some((item) => item.id === value) ? (value as StatsModule) : 'fuel';
    } catch {
      return 'fuel';
    }
  }
}
