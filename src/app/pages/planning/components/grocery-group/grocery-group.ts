import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslatePipe } from '@ngx-translate/core';
import { PLANNING_ICONS } from '@pages/planning/planning-icons';
import type { GroceryItem } from '@pages/planning/state/plan/planning.model';

@Component({
  selector: 'section[appGroceryGroup]',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grocery-group.html',
  styleUrl: './grocery-group.css',
})
export class GroceryGroup {
  readonly section = input.required<string>();
  readonly items = input.required<GroceryItem[]>();
  readonly busy = input(false);
  readonly toggle = output<GroceryItem>();
  readonly remove = output<GroceryItem>();
  readonly icons = PLANNING_ICONS;
}
