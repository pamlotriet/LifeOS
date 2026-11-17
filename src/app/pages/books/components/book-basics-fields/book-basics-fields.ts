import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { AppInput } from '@shared/components/app-input/app-input';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
@Component({
  selector: 'section[appBookBasicsFields]',
  imports: [TranslatePipe, IonIcon, AppInput, ReactiveFormsModule],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-basics-fields.html',
  styleUrl: './book-basics-fields.css',
})
export class BookBasicsFields {
  readonly form = input.required<FormGroup>();
  readonly coverUrl = input.required<string>();
  readonly lookupCover = output<void>();
}
