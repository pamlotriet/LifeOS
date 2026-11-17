import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'section[appReadingGoalPanel]',
  imports: [AppButton, TranslatePipe, RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reading-goal-panel.html',
  styleUrl: './reading-goal-panel.css',
})
export class ReadingGoalPanel {
  readonly goal = input<number | null>(null);
  readonly completed = input.required<number>();
  readonly year = input.required<number>();
  readonly percent = input.required<number>();
  readonly remaining = input.required<number>();
  readonly error = input('');
  readonly editing = input(false);
  readonly edit = output<void>();
}
