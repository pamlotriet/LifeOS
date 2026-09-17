import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-tabs-shell',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="h-24 bg-sidebar">
        <ion-tab-button tab="home" class="bg-sidebar [--color:var(--ion-text-color)] [--color-selected:var(--nav-active)]">
          <div class="flex flex-col items-center justify-center">
            <ion-icon size="large" name="home" class="mb-1"></ion-icon>
            <ion-label>Home</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="stats" class="bg-sidebar [--color:var(--ion-text-color)] [--color-selected:var(--nav-active)]">
          <div class="flex flex-col items-center justify-center">
            <ion-icon size="large" name="stats-chart" class="mb-1"></ion-icon>
            <ion-label>Stats</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="add" class="bg-sidebar [--color:var(--ion-text-color)] [--color-selected:var(--nav-active)]">
          <div class="flex flex-col items-center justify-center">
            <div class="flex rounded-full bg-sidebar-ring p-3 mb-4">
              <ion-icon size="large" name="add" class="text-white"></ion-icon>
            </div>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="search" class="bg-sidebar [--color:var(--ion-text-color)] [--color-selected:var(--nav-active)]">
          <div class="flex flex-col items-center justify-center">
            <ion-icon size="large" name="search" class="mb-1"></ion-icon>
            <ion-label>Search</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="more" class="bg-sidebar [--color:var(--ion-text-color)] [--color-selected:var(--nav-active)]">
          <div class="flex flex-col items-center justify-center">
            <ion-icon size="large" name="ellipsis-vertical" class="mb-1"></ion-icon>
            <ion-label>More</ion-label>
          </div>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsShell {}
