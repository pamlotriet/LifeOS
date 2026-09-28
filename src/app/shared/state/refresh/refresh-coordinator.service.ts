import { Injectable, signal } from '@angular/core';

export type RefreshHandler = () => void | Promise<void>;

@Injectable({ providedIn: 'root' })
export class RefreshCoordinator {
  private readonly handlers = new Set<RefreshHandler>();
  readonly refreshing = signal(false);

  register(handler: RefreshHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      await Promise.allSettled([...this.handlers].map((handler) => Promise.resolve().then(handler)));
    } finally {
      this.refreshing.set(false);
    }
  }
}
