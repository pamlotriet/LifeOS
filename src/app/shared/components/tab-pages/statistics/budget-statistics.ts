import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BudgetChart } from '../../../../pages/budget/budget-ui';
import { StatsDashboard } from '../../../state/statistics/stats.service';

@Component({
  selector: 'app-budget-statistics',
  imports: [RouterLink, BudgetChart],
  templateUrl: './budget-statistics.html',
  styleUrl: './budget-statistics.css',
})
export class BudgetStatistics {
  readonly data = input.required<StatsDashboard>();
}
