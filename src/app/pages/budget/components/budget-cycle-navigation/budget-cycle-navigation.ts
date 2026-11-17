import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AppMonthPicker } from '@shared/components/app-month-picker/app-month-picker';

@Component({
  selector: 'section[appBudgetCycleNavigation]',
  imports: [AppMonthPicker, TranslatePipe, FormsModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-cycle-navigation.html',
  styleUrl: './budget-cycle-navigation.css',
})
export class BudgetCycleNavigation {
  readonly month = input.required<string>();
  readonly dates = input.required<string>();
  readonly monthChange = output<string>();
  readonly shift = output<number>();
  readonly current = output<void>();
}
