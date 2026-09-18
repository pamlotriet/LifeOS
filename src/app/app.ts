import { Component, effect, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Animation, StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular';
import { AuthService, UnregisteredGoogleAccountError } from './shared/state/authentication/authentication.service';

@Component({
  imports: [IonButton, IonApp, IonIcon, IonLabel, IonRouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  authService = inject(AuthService);
  readonly paletteToggle = signal(false);
  readonly signInError = signal('');
  readonly signingIn = signal(false);
  private statusBarUpdate: Promise<void> = Promise.resolve();

  constructor() {
    effect(() => {
      const showStatusBar = this.authService.authReady() && this.authService.isAuthenticated();
      const isDark = this.paletteToggle();
      if (!Capacitor.isNativePlatform()) return;

      this.statusBarUpdate = this.statusBarUpdate
        .then(() => this.updateStatusBar(showStatusBar, isDark))
        .catch((error) => console.error('Status bar update failed', error));
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

  private async updateStatusBar(visible: boolean, isDark: boolean) {
    if (!visible) {
      await StatusBar.hide({ animation: Animation.None });
      return;
    }

    await StatusBar.setBackgroundColor({ color: isDark ? '#061426' : '#f4f9fd' });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.show({ animation: Animation.None });
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
      this.signInError.set(
        error instanceof UnregisteredGoogleAccountError
          ? error.message
          : 'Could not sign in with Google. Please try again.',
      );
    } finally {
      this.signingIn.set(false);
    }
  }
}
