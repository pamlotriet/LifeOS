import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-budget-nav',
  imports: [TranslatePipe, RouterLink, RouterLinkActive],
  host: { class: 'mb-5 block' },
  template: `
    <nav
      class="grid grid-cols-2 items-center gap-1 border-b border-border pb-2 min-[400px]:grid-cols-4 sm:flex sm:flex-wrap sm:gap-2 sm:pb-3"
      [attr.aria-label]="'Budget sections' | translate"
    >
      @for (item of sections; track item.route) {
        <a
          class="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-xs text-(--text-secondary) hover:bg-muted sm:px-4 sm:text-sm [&.active]:bg-secondary [&.active]:font-medium [&.active]:text-foreground"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          >{{ item.label | translate }}</a
        >
      }
      <details class="col-span-full mt-0! min-w-0 sm:ml-auto sm:basis-auto" [open]="toolRoute()">
        <summary
          class="min-h-11 cursor-pointer content-center px-3 text-sm text-(--text-secondary)"
        >
          {{ 'Budget tools' | translate }}
        </summary>
        <div class="grid grid-cols-2 gap-2 py-2 sm:flex sm:flex-wrap">
          @for (item of tools; track item.route) {
            <a
              class="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs text-(--text-secondary) hover:bg-muted [&.active]:bg-secondary [&.active]:text-foreground"
              [routerLink]="item.route"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              >{{ item.label | translate }}</a
            >
          }
        </div>
      </details>
    </nav>
  `,
})
export class BudgetNav {
  private readonly router = inject(Router);
  readonly sections = [
    { route: '/budget', label: 'Accounts' },
    { route: '/budget/month', label: 'Transactions' },
    { route: '/budget/transfers', label: 'Transfers' },
    { route: '/budget/debts', label: 'Manage debt' },
  ];
  readonly tools = [
    { route: '/budget/planned', label: 'Planned payments' },
    { route: '/budget/comparison', label: 'Planned vs actual' },
    { route: '/budget/categories', label: 'Categories' },
    { route: '/budget/insights', label: 'Insights' },
  ];
  toolRoute(): boolean {
    return this.tools.some((item) => this.router.url.split('?')[0] === item.route);
  }
}
