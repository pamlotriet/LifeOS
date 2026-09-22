import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { filter, map } from 'rxjs';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-fuel',
  imports: [IonContent, IonIcon, PageHeader, RouterLink, RouterOutlet],
  template: `
    <ion-header app-page-header title="Fuel">
      <nav
        aria-label="Fuel sections"
        class="relative z-10 mx-3 mt-2 mb-4 grid grid-cols-4 rounded-full border border-[#5a89b5] bg-gradient-to-b from-[#153a5d] to-[#102b49] p-1 shadow-[0_0_14px_rgba(25,184,237,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        @for (option of segments; track option.value) {
          <a
            [routerLink]="option.route"
            [replaceUrl]="true"
            [attr.aria-current]="selectedSegment() === option.value ? 'page' : null"
            class="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-center text-[10px] font-semibold leading-3 no-underline transition-colors"
            [class]="
              selectedSegment() === option.value
                ? 'bg-gradient-to-r from-[#10d9e9] to-[#1bbbf1] text-[#062b43] shadow-[0_3px_18px_rgba(16,217,233,0.4)] ring-1 ring-cyan-200/70'
                : 'text-[#b7cde8]'
            "
          >
            @if (option.value === 'consumption') {
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 7h5v4H7zM15 9l3 3v6a2 2 0 0 0 4 0v-6l-2-2"
                />
              </svg>
            } @else {
              <ion-icon
                [name]="option.icon"
                class="shrink-0 text-base"
                aria-hidden="true"
              ></ion-icon>
            }
            <span class="min-w-0 whitespace-normal">{{ option.label }}</span>
          </a>
        }
      </nav>
    </ion-header>
    <ion-content class="[--background:transparent] [--color:#f7fafc]">
      <div class="px-4 pb-6 pt-2">
        <router-outlet></router-outlet>
      </div>
    </ion-content>
  `,
})
export class Fuel {
  private readonly router = inject(Router);

  readonly segments = [
    { value: 'consumption', label: 'Refuel', route: '/fuel', icon: '' },
    { value: 'vehicles', label: 'Vehicles', route: '/fuel/vehicles', icon: 'car-sport-outline' },
    { value: 'history', label: 'History', route: '/fuel/history', icon: 'book' },
    { value: 'insights', label: 'Insights', route: '/fuel/insights', icon: 'stats-chart' },
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
    if (path === '/fuel/vehicles' || path === '/fuel/add-car' || path.startsWith('/fuel/edit-car/'))
      return 'vehicles';
    if (path === '/fuel/history' || path.startsWith('/fuel/refuels/')) return 'history';
    if (path === '/fuel/insights') return 'insights';
    return 'consumption';
  }
}
