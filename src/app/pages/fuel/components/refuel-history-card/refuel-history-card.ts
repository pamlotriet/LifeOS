import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { RouterLink } from '@angular/router';
import { RefuelEntry } from '@pages/fuel/state/refuel/refuel.model';
@Component({
  selector: 'article[appRefuelHistoryCard]',
  imports: [TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refuel-history-card.html',
})
export class RefuelHistoryCard {
  readonly entry = input.required<RefuelEntry>();
  date(value: string): string {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  number(value: number | null, digits = 1): string {
    return value === null ? '—' : value.toFixed(digits);
  }
}
