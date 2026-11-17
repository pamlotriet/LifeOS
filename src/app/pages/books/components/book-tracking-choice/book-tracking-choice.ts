import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
  selector: 'section[appBookTrackingChoice]',
  imports: [TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-tracking-choice.html',
  styleUrl: './book-tracking-choice.css',
})
export class BookTrackingChoice {
  readonly hasPageFormat = input.required<boolean>();
  readonly trackingByPages = input.required<boolean>();
  readonly mode = input.required<'pages' | 'percent' | 'locations'>();
  readonly modeChange = output<'pages' | 'percent' | 'locations'>();
}
