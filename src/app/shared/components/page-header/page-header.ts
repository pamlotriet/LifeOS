import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
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
        class="lifeos-back-button grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white active:scale-95"
        (click)="goBack()"
      >
        <ion-icon name="chevron-back" class="text-[28px]" aria-hidden="true"></ion-icon>
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-[var(--foreground)]">{{ title() }}</h1>
    </div>
    <ng-content></ng-content>
  `,
})
export class PageHeader {
  private readonly location = inject(Location);
  readonly title = input.required<string>();

  goBack(): void {
    this.location.back();
  }
}
