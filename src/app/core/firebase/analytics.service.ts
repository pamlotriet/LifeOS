import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';

export const ANALYTICS_INITIALIZER = new InjectionToken<() => Promise<void>>(
  'Deferred analytics initializer',
  {
    providedIn: 'root',
    factory: () => () =>
      import('@core/firebase/firebase-analytics').then(({ initializeAnalytics }) =>
        initializeAnalytics(),
      ),
  },
);

@Injectable({ providedIn: 'root' })
export class AppAnalytics {
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly initialize = inject(ANALYTICS_INITIALIZER);

  constructor() {
    inject(ApplicationRef)
      .isStable.pipe(filter(Boolean), take(1), takeUntilDestroyed())
      .subscribe(() => this.schedule());
  }

  private schedule(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const start = () => {
      if (this.destroy.destroyed) return;
      void this.initialize().catch(() => {
        // Optional analytics must never prevent sign-in or application startup.
      });
    };
    if (typeof view.requestIdleCallback === 'function') {
      const id = view.requestIdleCallback(start, { timeout: 5000 });
      this.destroy.onDestroy(() => view.cancelIdleCallback(id));
    } else {
      const id = view.setTimeout(start, 1000);
      this.destroy.onDestroy(() => view.clearTimeout(id));
    }
  }
}
