import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslatePipe } from '@ngx-translate/core';
import type { BookRecord } from '@pages/books/state/book/book.model';
import { AppButton } from '@shared/components/app-button/app-button';

@Component({
  selector: 'article[appReadingBookCard]',
  imports: [TranslatePipe, AppButton, RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reading-book-card.html',
  styleUrl: './reading-book-card.css',
})
export class ReadingBookCard {
  readonly book = input.required<BookRecord>();
  readonly percent = input.required<number>();
  readonly trackingMode = input.required<string>();
  readonly kindleLabel = input('');
  readonly progress = output<BookRecord>();
}
