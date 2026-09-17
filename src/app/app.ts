import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
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
import { filter, map } from 'rxjs';

@Component({
  imports: [IonButton, IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TabPopover],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showTabBar = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.isTabRoute(event.urlAfterRedirects)),
    ),
    { initialValue: this.isTabRoute(this.router.url) },
  );

  readonly paletteToggle = signal(false);

  private isTabRoute(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/home';
    return ['/home', '/stats', '/add', '/search', '/more'].includes(path);
  }

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
