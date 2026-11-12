import { TranslatePipe } from '@ngx-translate/core';
import { WriteToast } from '@shared/components/write-toast/write-toast';
import { Login } from '@pages/login/login';
import { AppUpdates } from '@core/updates/app-updates.service';
import { Component, inject, signal } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from '@core/authentication/authentication.service';
import { RefreshCoordinator } from '@core/refresh/refresh-coordinator.service';
import { ThemeService } from '@core/theme/theme.service';
import { ClearZeroOnFocus } from '@shared/directives/clear-zero-on-focus';

@Component({
  imports: [TranslatePipe, IonApp, IonRouterOutlet, ClearZeroOnFocus, WriteToast, Login],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly updates = inject(AppUpdates);
  readonly refreshCoordinator = inject(RefreshCoordinator);
  readonly theme = inject(ThemeService);
  readonly paletteToggle = signal(false);
  readonly pullDistance = signal(0);
  private touchStart: number | null = null;

  authService = inject(AuthService);

  ngOnInit() {
    this.paletteToggle.set(this.theme.dark());
  }

  initializeDarkPalette(isDark: boolean) {
    this.paletteToggle.set(isDark);
    this.theme.setDark(isDark);
  }

  toggleChange(event: CustomEvent) {
    this.initializeDarkPalette(event.detail.checked);
  }

  toggleDarkPalette(shouldAdd: boolean) {
    this.theme.setDark(shouldAdd);
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.authService.isAuthenticated() || this.refreshCoordinator.refreshing()) return;
    const content = event
      .composedPath()
      .find((element) => element instanceof HTMLElement && element.tagName === 'ION-CONTENT') as
      HTMLElement | undefined;
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
}
