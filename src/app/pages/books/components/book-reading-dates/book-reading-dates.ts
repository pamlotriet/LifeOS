import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
  selector: 'section[appBookReadingDates]',
  imports: [TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-reading-dates.html',
})
export class BookReadingDates {
  readonly started = input.required<string>();
  readonly finished = input.required<string>();
}
