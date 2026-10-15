import { BackButton } from '../back-button/back-button';
import { AppNavigation } from '../../state/app-navigation.service';
import { Component, inject, input } from '@angular/core';

@Component({
  selector: 'ion-header[app-page-header]',
  imports: [BackButton],
  host: { class: 'ion-no-border relative isolate block bg-transparent pt-3' },
  template: `
    <div class="relative z-10 flex h-[72px] items-center px-4">
      <app-back-button [fallback]="backUrl()" />
      <h1 class="ml-4 text-xl font-semibold tracking-tight text-[var(--foreground)]">{{ title() }}</h1>
    </div>
    <ng-content></ng-content>
  `,
})
export class PageHeader {
  private readonly navigation = inject(AppNavigation);

  readonly title = input.required<string>();
  readonly backUrl = input<string | null>(null);

  goBack(): void {
    this.navigation.back(this.backUrl());
  }
}
