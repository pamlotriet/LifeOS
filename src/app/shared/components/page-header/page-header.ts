import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { IonButton, IonButtons, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'ion-header[app-page-header]',
  imports: [IonButton, IonButtons, IonIcon, IonTitle, IonToolbar],
  host: { class: 'ion-no-border bg-background pt-3' },
  template: `
    <ion-toolbar
      class="[--background:var(--background)] [--color:var(--foreground)] [--padding-start:12px] [--padding-end:12px]"
    >
      <ion-buttons slot="start">
        <ion-button
          aria-label="Go back"
          shape="round"
          class="h-10 w-10 [--background:var(--card)] [--color:var(--foreground)] [--padding-start:0] [--padding-end:0]"
          (click)="goBack()"
        >
          <ion-icon name="chevron-back" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title() }}</ion-title>
    </ion-toolbar>
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
