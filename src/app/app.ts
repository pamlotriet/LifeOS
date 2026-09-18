import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Animation, StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular';
import { filter } from 'rxjs';
import { AuthService } from './shared/state/authentication/authentication.service';

@Component({
  imports: [IonButton, IonApp, IonIcon, IonLabel, IonRouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly paletteToggle = signal(false);
  readonly signInError = signal('');
  readonly signingIn = signal(false);
  private statusBarUpdate: Promise<void> = Promise.resolve();

  constructor() {
    effect(() => {
      const showStatusBar = this.authService.authReady();
      if (!Capacitor.isNativePlatform()) return;

      this.queueStatusBarUpdate(showStatusBar);
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        if (Capacitor.isNativePlatform() && this.authService.authReady()) {
          this.queueStatusBarUpdate(true);
        }
      });
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
  }

  private async updateStatusBar(visible: boolean) {
    if (!visible) {
      await StatusBar.hide({ animation: Animation.None });
      return;
    }

    await StatusBar.setBackgroundColor({ color: '#0d3454' });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.show({ animation: Animation.None });
  }

  private queueStatusBarUpdate(visible: boolean) {
    this.statusBarUpdate = this.statusBarUpdate
      .then(() => this.updateStatusBar(visible))
      .catch((error) => console.error('Status bar update failed', error));
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
    if (this.signingIn()) return;
    this.signInError.set('');
    this.signingIn.set(true);
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      this.signInError.set('Could not sign in with Google. Please try again.');
    } finally {
      this.signingIn.set(false);
    }
  }
}
