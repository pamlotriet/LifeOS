import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HomeStateService } from '@pages/home/state/dashboard/home-state.service';
import { AppSkeleton } from '@shared/components/app-skeleton/app-skeleton';
@Component({
  selector: 'a[appHomeMetricCard]',
  imports: [TranslatePipe, AppSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-metric-card.html',
})
export class HomeMetricCard {
  readonly metric =
    input.required<ReturnType<ReturnType<HomeStateService['create']>['overviewMetrics']>[number]>();
  readonly progress = input.required<number>();
}
