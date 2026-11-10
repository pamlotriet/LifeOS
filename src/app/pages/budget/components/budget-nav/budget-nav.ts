import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { wallet, calendarOutline, cardOutline, documentText, gridOutline, statsChart } from 'ionicons/icons';

@Component({
  selector: 'app-budget-nav',
  imports: [RouterLink, RouterLinkActive, IonIcon],
  template: `
    <nav aria-label="Budget sections">
      @for (item of sections; track item.route) {
        <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page" [class.planning]="item.route === '/budget/planned'">
          <ion-icon [name]="item.icon" aria-hidden="true" />
          <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
        </a>
      }
    </nav>
  `,
  styleUrl: './budget-nav.css',
})
export class BudgetNav {
  constructor() { addIcons({ wallet, calendarOutline, cardOutline, documentText, gridOutline, statsChart }); }
  readonly sections = [
    { route: '/budget', label: 'Overview', description: 'Income, spending & balance', icon: 'wallet' },
    { route: '/budget/planned', label: 'Planned payments', description: 'Plan, predict & copy forward', icon: 'calendar-outline' },
    { route: '/budget/comparison', label: 'Planned vs actual', description: 'Compare each category', icon: 'stats-chart' },
    { route: '/budget/debts', label: 'Manage debt', description: 'Payments, balances & PDF', icon: 'card-outline' },
    { route: '/budget/month', label: 'Transactions', description: 'Calendar & payment history', icon: 'document-text' },
    { route: '/budget/categories', label: 'Categories', description: 'Organize your budget', icon: 'grid-outline' },
    { route: '/budget/insights', label: 'Insights', description: 'Spending & debt guidance', icon: 'stats-chart' },
  ];
}
