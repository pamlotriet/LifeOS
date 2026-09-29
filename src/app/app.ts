import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './shared/state/authentication/authentication.service';
import { RefreshCoordinator } from './shared/state/refresh/refresh-coordinator.service';
import { ThemeService } from './shared/state/theme/theme.service';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly document = inject(DOCUMENT);
  authService = inject(AuthService);
  readonly refreshCoordinator = inject(RefreshCoordinator);
  readonly theme = inject(ThemeService);
  readonly nativePlatform = Capacitor.isNativePlatform();
  readonly androidPlatform = Capacitor.getPlatform() === 'android';
  readonly paletteToggle = signal(false);
  readonly signInError = signal('');
  readonly signingIn = signal(false);
  readonly biometricFailures = signal(0);
  readonly pullDistance = signal(0);
  private touchStart: number | null = null;

  constructor() {
    if (this.androidPlatform) this.document.documentElement.classList.add('platform-android-native');
    effect(() => {
      const ready = this.authService.authReady();
      const enrolled = this.authService.biometric.enrolled();
      const authenticated = this.authService.isAuthenticated();
      const failures = this.biometricFailures();
      untracked(() => {
        if (ready && enrolled && !authenticated && failures === 0 && !this.signingIn()) {
          queueMicrotask(() => void this.authenticateWithBiometrics());
        }
      });
    });
  }

  ngOnInit() {
    this.paletteToggle.set(this.theme.dark());
  }

  // Check/uncheck the toggle and update the palette based on isDark
  initializeDarkPalette(isDark: boolean) {
    this.paletteToggle.set(isDark);
    this.theme.setDark(isDark);
  }

  // Listen for the toggle check/uncheck to toggle the dark palette
  toggleChange(event: CustomEvent) {
    this.initializeDarkPalette(event.detail.checked);
  }

  // Add or remove the dark theme classes used by both Ionic and the custom Tailwind variables
  toggleDarkPalette(shouldAdd: boolean) {
    this.theme.setDark(shouldAdd);
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.authService.isAuthenticated() || this.refreshCoordinator.refreshing()) return;
    const content = event.composedPath().find((element) =>
      element instanceof HTMLElement && element.tagName === 'ION-CONTENT') as HTMLElement | undefined;
    if (!content) return;
    const scroll = content.shadowRoot?.querySelector<HTMLElement>('.inner-scroll');
    if ((scroll?.scrollTop ?? 0) <= 2) this.touchStart = event.touches[0]?.clientY ?? null;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchStart === null || this.refreshCoordinator.refreshing()) return;
    const distance = Math.max(0, (event.touches[0]?.clientY ?? this.touchStart) - this.touchStart);
    this.pullDistance.set(Math.min(104, distance * 0.55));
  }

  onTouchEnd(): void {
    const shouldRefresh = this.pullDistance() >= 58;
    this.touchStart = null;
    this.pullDistance.set(0);
    if (shouldRefresh) void this.refreshCoordinator.refresh();
  }

  pullIndicatorOffset(): number {
    return this.refreshCoordinator.refreshing() ? 0 : Math.min(18, this.pullDistance() / 4);
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
        error instanceof Error && error.message.includes('Firebase user profile')
          ? 'Could not set up your account. Please try again.'
          : 'Could not sign in with Google. Please try again.',
      );
    } finally {
      this.signingIn.set(false);
    }
  }

  async authenticateWithBiometrics(): Promise<void> {
    if (this.signingIn()) return;
    this.signInError.set('');
    this.signingIn.set(true);
    try {
      await this.authService.unlockWithBiometrics();
      this.biometricFailures.set(0);
    } catch (error) {
      this.biometricFailures.update((count) => Math.min(3, count + 1));
      this.signInError.set(error instanceof Error ? error.message : 'Could not unlock LifeOS.');
    } finally {
      this.signingIn.set(false);
    }
  }
}
