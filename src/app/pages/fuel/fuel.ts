import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { IonContent, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';
import { filter, map } from 'rxjs';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-fuel',
  styleUrl: './fuel.css',
  imports: [
    IonContent,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    PageHeader,
    RouterLink,
    RouterOutlet,
  ],
  template: `
    <ion-header app-page-header title="Fuel">
      <div class="segment-bar mt-8">
        <ion-segment
          id="fuel-segment"
          mode="ios"
          [scrollable]="false"
          [value]="selectedSegment()"
        >
          @for (option of segments; track option.value) {
            <ion-segment-button
              [value]="option.value"
              [routerLink]="option.route"
            >
              <ion-label class="text-xs font-semibold">{{ option.label }}</ion-label>
            </ion-segment-button>
          }
        </ion-segment>
      </div>
    </ion-header>
    <ion-content class="[--background:var(--background)] [--color:var(--foreground)]">
      <div class="p-4">
        <router-outlet></router-outlet>
      </div>
    </ion-content>
  `,
})
export class Fuel {
  private readonly router = inject(Router);

  readonly segments = [
    { value: 'consumption', label: 'Fuel Consumption', route: '/fuel' },
    { value: 'vehicles', label: 'Vehicles', route: '/fuel/vehicles' },
    { value: 'insights', label: 'Insights', route: '/fuel/insights' },
  ];

  readonly selectedSegment = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.segmentFromUrl(event.urlAfterRedirects)),
    ),
    { initialValue: this.segmentFromUrl(this.router.url) },
  );

  private segmentFromUrl(url: string): string {
    const path = url.split(/[?#]/, 1)[0].replace(/\/$/, '');
    if (path === '/fuel/vehicles' || path === '/fuel/add-car') return 'vehicles';
    if (path === '/fuel/insights') return 'insights';
    return 'consumption';
  }
}
