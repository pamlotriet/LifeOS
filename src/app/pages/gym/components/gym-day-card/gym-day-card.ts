import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GymEntry, GymExercise } from '@pages/gym/state/gym/gym.model';
@Component({
  selector: 'article[appGymDayCard]',
  imports: [AppButton, TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gym-day-card.html',
  styleUrl: './gym-day-card.css',
})
export class GymDayCard {
  readonly day = input.required<{
    day: number;
    name: string;
    entries: (GymEntry & { exercise: GymExercise | undefined })[];
  }>();
  readonly saving = input(false);
  readonly add = output<void>();
  readonly edit = output<GymEntry>();
  readonly move = output<{ id: string; direction: -1 | 1 }>();
  readonly remove = output<string>();
  readonly copy = output<void>();
  readonly create = output<void>();
}
