import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'section[appLibraryTotals]',
  imports: [TranslatePipe, RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-totals.html',
})
export class LibraryTotals {
  readonly total = input.required<number>();
  readonly reading = input.required<number>();
  readonly finished = input.required<number>();
  readonly favourites = input.required<number>();
}
