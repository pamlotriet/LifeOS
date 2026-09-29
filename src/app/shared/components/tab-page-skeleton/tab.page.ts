import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { filter, map } from 'rxjs';
import { Home } from '../tab-pages/home/home';
import { Statistics } from '../tab-pages/statistics/statistics';
import { More } from '../tab-pages/more/more';
@Component({
  standalone: true,
  imports: [IonContent, Home, Statistics, More],
  template: `
    @if (tab() === 'home') {
      <ion-content class="ion-padding [--background:var(--background)] [--color:var(--foreground)]">
        <app-home></app-home>
      </ion-content>
    }
    @if (tab() === 'stats') {
      <ion-content class="ion-padding [--background:var(--background)] [--color:var(--foreground)]">
        <app-statistics></app-statistics>
      </ion-content>
    }
    @if (tab() === 'more') {
      <ion-content class="ion-padding [--background:var(--background)] [--color:var(--foreground)]">
        <app-more></app-more>
      </ion-content>
    }
  `,
})
export class TabPage {
  private readonly router = inject(Router);
  readonly tab = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0].split('/')[1] || 'home'),
    ),
    {
      initialValue: this.currentTab(),
    },
  );

  private currentTab(): string {
    const path = typeof window === 'undefined' ? this.router.url : window.location.pathname;
    return path.split('?')[0].split('/')[1] || 'home';
  }
}
