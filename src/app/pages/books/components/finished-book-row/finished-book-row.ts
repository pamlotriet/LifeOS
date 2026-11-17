import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

import { BookRecord } from '@pages/books/state/book/book.model';
@Component({
  selector: 'a[appFinishedBookRow]',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finished-book-row.html',
})
export class FinishedBookRow {
  readonly book = input.required<BookRecord>();
  readonly finishedDate = input.required<string>();
}
