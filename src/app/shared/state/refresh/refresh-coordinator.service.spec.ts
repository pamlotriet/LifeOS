import { describe, expect, it, vi } from 'vitest';
import { RefreshCoordinator } from './refresh-coordinator.service';

describe('RefreshCoordinator', () => {
  it('runs every registered refresh handler', async () => {
    const coordinator = new RefreshCoordinator();
    const first = vi.fn();
    const second = vi.fn().mockResolvedValue(undefined);

    coordinator.register(first);
    coordinator.register(second);
    await coordinator.refresh();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(coordinator.refreshing()).toBe(false);
  });

  it('stops calling a handler after it is unregistered', async () => {
    const coordinator = new RefreshCoordinator();
    const handler = vi.fn();
    const unregister = coordinator.register(handler);

    unregister();
    await coordinator.refresh();

    expect(handler).not.toHaveBeenCalled();
  });

  it('finishes refreshing when one handler fails', async () => {
    const coordinator = new RefreshCoordinator();
    const successful = vi.fn();
    coordinator.register(() => Promise.reject(new Error('offline')));
    coordinator.register(successful);

    await expect(coordinator.refresh()).resolves.toBeUndefined();

    expect(successful).toHaveBeenCalledOnce();
    expect(coordinator.refreshing()).toBe(false);
  });
});
