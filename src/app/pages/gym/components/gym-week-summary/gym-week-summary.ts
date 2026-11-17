import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'section[appGymWeekSummary]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gym-week-summary.html',
  styleUrl: './gym-week-summary.css',
})
export class GymWeekSummary {
  readonly trainingDays = input.required<number>();
  readonly exerciseCount = input.required<number>();
}
