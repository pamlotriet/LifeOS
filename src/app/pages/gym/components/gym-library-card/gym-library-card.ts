import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GymExercise } from '@pages/gym/state/gym/gym.model';
@Component({
  selector: 'article[appGymLibraryCard]',
  imports: [AppButton, TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gym-library-card.html',
  styleUrl: './gym-library-card.css',
})
export class GymLibraryCard {
  readonly item = input.required<GymExercise>();
  readonly dayLabel = input.required<string>();
  readonly saving = input(false);
  readonly add = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
