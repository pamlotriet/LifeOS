import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { BookRecord } from '@pages/books/state/book/book.model';
@Component({
  selector: 'section[appBookDetailHero]',
  imports: [TranslatePipe, IonIcon],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-detail-hero.html',
})
export class BookDetailHero {
  readonly book = input.required<BookRecord>();
}
