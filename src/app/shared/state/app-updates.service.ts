import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private readonly sw = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  readonly available = signal(false);
  readonly checking = signal(false);
  readonly message = signal('');
  readonly enabled = this.sw.isEnabled;
  private lastCheck = 0;

  constructor() {
    if (!this.enabled) return;
    this.sw.versionUpdates.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event.type === 'VERSION_READY') this.available.set(true);
      if (event.type === 'VERSION_INSTALLATION_FAILED') this.message.set('Update download failed. Try again when online.');
    });
    this.sw.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.available.set(true));
    const resume = () => {
      if (this.document.visibilityState === 'visible' && Date.now() - this.lastCheck > 60000) void this.check();
    };
    this.document.addEventListener('visibilitychange', resume);
    this.document.defaultView?.addEventListener('online', resume);
    this.destroy.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', resume);
      this.document.defaultView?.removeEventListener('online', resume);
    });
    inject(ApplicationRef).isStable.pipe(filter(Boolean), take(1), takeUntilDestroyed()).subscribe(() => void this.check());
  }

  async check(): Promise<void> {
    if (!this.enabled || this.checking()) return;
    this.checking.set(true); this.message.set(''); this.lastCheck = Date.now();
    try {
      if (await this.sw.checkForUpdate()) this.available.set(true);
      this.message.set(this.available() ? 'An update is ready.' : 'You’re using the latest version.');
    } catch { this.message.set('Could not check for updates. Check your connection and try again.'); }
    finally { this.checking.set(false); }
  }

  refresh(): void { this.document.defaultView?.location.reload(); }
}
