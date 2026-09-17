import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-page-header',
  imports: [IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header class="ion-no-border bg-sidebar pt-3">
      <ion-toolbar
        class="[--background:var(--sidebar)] [--color:var(--sidebar-foreground)] [--padding-start:12px] [--padding-end:12px]"
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
    </ion-header>
  `,
})
export class PageHeader {
  private readonly location = inject(Location);
  readonly title = input.required<string>();

  goBack(): void {
    this.location.back();
  }
}
