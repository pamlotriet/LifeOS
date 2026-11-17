import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
@Component({
  selector: 'details[appRecipePhotoPicker]',
  imports: [TranslatePipe, IonIcon],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-photo-picker.html',
  styleUrl: './recipe-photo-picker.css',
})
export class RecipePhotoPicker {
  readonly photoUrl = input.required<string>();
  readonly cameraIcon = input.required<string>();
  readonly pick = output<void>();
}
