import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'ion-header[app-page-header]',
  imports: [IonIcon],
  host: { class: 'ion-no-border relative isolate block bg-transparent pt-3' },
  template: `
    <div class="relative z-10 flex h-[72px] items-center px-4">
      <button
        type="button"
        aria-label="Go back"
        class="lifeos-back-button grid h-10 w-10 shrink-0 place-items-center rounded-full border text-white active:scale-95"
        (click)="goBack()"
      >
        <ion-icon name="chevron-back" class="text-[22px]" aria-hidden="true"></ion-icon>
      </button>
      <h1 class="ml-4 text-xl font-semibold tracking-tight text-[var(--foreground)]">{{ title() }}</h1>
    </div>
    <ng-content></ng-content>
  `,
})
export class PageHeader {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  readonly title = input.required<string>();
  readonly backUrl = input<string | null>(null);

  goBack(): void {
    const backUrl = this.backUrl();
    if (backUrl) {
      void this.router.navigateByUrl(backUrl);
      return;
    }
    this.location.back();
  }
}
