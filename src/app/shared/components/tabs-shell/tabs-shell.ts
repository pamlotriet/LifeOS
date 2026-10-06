import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-tabs-shell',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="lifeos-tab-bar border-t border-[var(--border)] bg-[var(--nav-background)] [--background:var(--nav-background)] [--border:none]">
        <ion-tab-button tab="home" class="lifeos-tab-button [--background:var(--nav-background)] [--color:var(--nav-inactive)] [--color-selected:var(--nav-active)]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="home" class="mb-1"></ion-icon>
            <ion-label>Home</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="stats" class="lifeos-tab-button [--background:var(--nav-background)] [--color:var(--nav-inactive)] [--color-selected:var(--nav-active)]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="stats-chart" class="mb-1"></ion-icon>
            <ion-label>Stats</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="today" class="lifeos-tab-button [--background:var(--nav-background)] [--color:var(--nav-inactive)] [--color-selected:var(--nav-active)]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <div class="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary)]">
              <ion-icon size="large" name="sunny" class="text-[var(--primary)]"></ion-icon>
            </div>
            <ion-label>Today</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="wheel" class="lifeos-tab-button [--background:var(--nav-background)] [--color:var(--nav-inactive)] [--color-selected:var(--nav-active)]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="disc" class="mb-1"></ion-icon>
            <ion-label>Wheel</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="more" class="lifeos-tab-button [--background:var(--nav-background)] [--color:var(--nav-inactive)] [--color-selected:var(--nav-active)]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="ellipsis-vertical" class="mb-1"></ion-icon>
            <ion-label>More</ion-label>
          </div>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsShell {}
