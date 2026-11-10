import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppChart } from '@shared/components/app-chart/app-chart';
import { StatsDashboard } from '@pages/statistics/state/stats.service';

@Component({
  selector: 'app-budget-statistics',
  imports: [TranslatePipe, RouterLink, AppChart],
  templateUrl: './budget-statistics.html',
  styleUrl: './budget-statistics.css',
})
export class BudgetStatistics {
  readonly data = input.required<StatsDashboard>();
}
