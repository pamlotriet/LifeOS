import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-tabs-shell',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="lifeos-tab-bar border-t border-white/10 bg-[#0b2138] [--background:#0b2138] [--border:none]">
        <ion-tab-button tab="home" class="lifeos-tab-button [--background:#0b2138] [--color:#aebdd3] [--color-selected:#40e6f2]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="home" class="mb-1"></ion-icon>
            <ion-label>Home</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="stats" class="lifeos-tab-button [--background:#0b2138] [--color:#aebdd3] [--color-selected:#40e6f2]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="stats-chart" class="mb-1"></ion-icon>
            <ion-label>Stats</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="add" class="lifeos-tab-button [--background:#0b2138] [--color:#aebdd3] [--color-selected:#40e6f2]">
          <div class="flex h-full w-full items-center justify-center text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-lg shadow-cyan-400/30">
              <ion-icon size="large" name="add" class="text-white"></ion-icon>
            </div>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="search" class="lifeos-tab-button [--background:#0b2138] [--color:#aebdd3] [--color-selected:#40e6f2]">
          <div class="flex h-full w-full flex-col items-center justify-center text-center">
            <ion-icon size="large" name="search" class="mb-1"></ion-icon>
            <ion-label>Search</ion-label>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="more" class="lifeos-tab-button [--background:#0b2138] [--color:#aebdd3] [--color-selected:#40e6f2]">
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
