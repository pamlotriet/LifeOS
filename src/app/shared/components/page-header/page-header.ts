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
        class="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#3f86b6] bg-gradient-to-br from-[#1d5a87] via-[#123e64] to-[#0a2c4e] text-white shadow-[0_0_0_4px_rgba(35,129,193,0.12),inset_0_1px_4px_rgba(181,231,255,0.2),0_8px_18px_rgba(0,0,0,0.22)] active:scale-95"
        (click)="goBack()"
      >
        <ion-icon name="chevron-back" class="text-[28px]" aria-hidden="true"></ion-icon>
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-white">{{ title() }}</h1>
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
