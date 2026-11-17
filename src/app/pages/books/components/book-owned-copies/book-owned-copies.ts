import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { BookCopy } from '@pages/books/state/book/book.model';
@Component({
  selector: 'section[appBookOwnedCopies]',
  imports: [TranslatePipe, IonIcon],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-owned-copies.html',
})
export class BookOwnedCopies {
  readonly copies = input.required<BookCopy[]>();
  readonly addCopy = output<void>();
}
