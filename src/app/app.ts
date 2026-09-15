import { Component, signal } from '@angular/core';
import {
  IonRouterOutlet,
  IonApp,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonButton,
} from '@ionic/angular';

@Component({
  imports: [
    IonButton,
    IonApp,
    IonRouterOutlet,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  isLoggedIn = true;
  readonly paletteToggle = signal(false);
  ngOnInit() {
    if (typeof window === 'undefined') {
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeDarkPalette(prefersDark.matches);

    prefersDark.addEventListener('change', (mediaQuery) =>
      this.initializeDarkPalette(mediaQuery.matches),
    );
  }

  // Check/uncheck the toggle and update the palette based on isDark
  initializeDarkPalette(isDark: boolean) {
    this.paletteToggle.set(isDark);
    this.toggleDarkPalette(isDark);
  }

  // Listen for the toggle check/uncheck to toggle the dark palette
  toggleChange(event: CustomEvent) {
    this.initializeDarkPalette(event.detail.checked);
  }

  // Add or remove the dark theme classes used by both Ionic and the custom Tailwind variables
  toggleDarkPalette(shouldAdd: boolean) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', shouldAdd);
    }
  }
  onClick() {
    // Handle login button click
  }
}
