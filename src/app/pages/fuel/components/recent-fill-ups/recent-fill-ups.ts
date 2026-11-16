import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RefuelEntry } from '@pages/fuel/state/refuel/refuel.model';

@Component({
  selector: 'app-recent-fill-ups',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './recent-fill-ups.html',
  host: { class: 'block min-w-0' },
})
export class RecentFillUps {
  readonly entries = input.required<RefuelEntry[]>();
  private readonly currencyFormatter = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  });

  money(value: number | null): string {
    return value === null ? '\u2014' : this.currencyFormatter.format(value);
  }

  number(value: number | null, digits = 1): string {
    return value === null
      ? '\u2014'
      : value.toLocaleString('en-ZA', { maximumFractionDigits: digits });
  }

  date(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
