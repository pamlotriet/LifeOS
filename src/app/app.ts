import { Component, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  IonApp,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonButton,
} from '@ionic/angular';
import { TabPopover, TabPopoverItem } from './shared/components/tab-popover/tab-popover';
import { AuthService } from './shared/state/authentication/authentication.service';

@Component({
  imports: [IonButton, IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TabPopover],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  authService = inject(AuthService);

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
    void this.updateStatusBar(isDark);
  }

  private async updateStatusBar(isDark: boolean) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await StatusBar.setBackgroundColor({ color: isDark ? '#061426' : '#f4f9fd' });
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
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

  async authenticate() {
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
    }
  }
}
