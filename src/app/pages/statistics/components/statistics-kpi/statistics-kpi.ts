import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

import { StatsKpi } from '@pages/statistics/state/overview/stats.service';
@Component({
  selector: 'article[appStatisticsKpi]',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistics-kpi.html',
  styleUrl: './statistics-kpi.css',
})
export class StatisticsKpi {
  readonly item = input.required<StatsKpi>();
}
