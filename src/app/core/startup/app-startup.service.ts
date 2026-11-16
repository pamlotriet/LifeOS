import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { AuthService } from '@core/authentication/authentication.service';

@Injectable({ providedIn: 'root' })
export class AppStartup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly pending = signal<Signal<boolean>[]>([]);
  private readonly routeReady = signal(this.router.navigated);
  private readonly active = signal(true);
  readonly loading = this.active.asReadonly();
  readonly slow = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) this.routeReady.set(false);
      if (event instanceof NavigationEnd) this.routeReady.set(true);
    });
    const recovery = setTimeout(() => this.slow.set(true), 15000);
    inject(DestroyRef).onDestroy(() => clearTimeout(recovery));

    afterRenderEffect((onCleanup) => {
      if (!this.active() || !this.auth.authReady()) return;
      if (this.auth.isAuthenticated() && !this.routeReady()) return;
      if (this.pending().some((loading) => loading())) return;
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      // Routed views must stay mounted under the splash so Ionic can initialize.
      const controls = this.document.querySelectorAll<
        HTMLElement & { componentOnReady?: () => Promise<unknown> }
      >('ion-app, ion-router-outlet, ion-content, ion-tabs, ion-tab-bar, ion-tab-button');
      void Promise.all(Array.from(controls, (control) => control.componentOnReady?.())).then(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancelled) return;
            clearTimeout(recovery);
            this.active.set(false);
          }),
        );
      });
    });
  }

  waitFor(loading: Signal<boolean>, destroyRef: DestroyRef): void {
    if (!this.active()) return;
    this.pending.update((items) => [...items, loading]);
    destroyRef.onDestroy(() =>
      this.pending.update((items) => items.filter((item) => item !== loading)),
    );
  }

  reload(): void {
    this.document.defaultView?.location.reload();
  }
}
