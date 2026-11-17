import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Injector } from '@angular/core';
import { Subject } from 'rxjs';
import { ANALYTICS_INITIALIZER, AppAnalytics } from '@core/firebase/analytics.service';

const initializeAnalytics = vi.fn();

describe('Optional analytics scheduling', () => {
  beforeEach(() => {
    initializeAnalytics.mockReset().mockResolvedValue(undefined);
  });

  function create(idle = true) {
    const stable = new Subject<boolean>();
    const callbacks: (() => void)[] = [];
    const schedule = vi.fn((callback: () => void) => {
      callbacks.push(callback);
      return 7;
    });
    const cancel = vi.fn();
    const view = {
      requestIdleCallback: idle ? schedule : undefined,
      cancelIdleCallback: cancel,
      setTimeout: schedule,
      clearTimeout: cancel,
    };
    const injector = Injector.create({
      providers: [
        AppAnalytics,
        { provide: ANALYTICS_INITIALIZER, useValue: initializeAnalytics },
        { provide: DOCUMENT, useValue: { defaultView: view } },
        { provide: ApplicationRef, useValue: { isStable: stable.asObservable() } },
      ],
    });
    injector.get(AppAnalytics);
    return { stable, callbacks, schedule, cancel, injector };
  }

  it('waits for stability and idle time, then loads analytics only once', async () => {
    const state = create();
    state.stable.next(false);
    expect(state.schedule).not.toHaveBeenCalled();
    expect(initializeAnalytics).not.toHaveBeenCalled();
    state.stable.next(true);
    state.stable.next(true);
    expect(state.schedule).toHaveBeenCalledOnce();
    expect(initializeAnalytics).not.toHaveBeenCalled();
    state.callbacks[0]();
    await vi.waitFor(() => expect(initializeAnalytics).toHaveBeenCalledOnce());
    state.injector.destroy();
  });

  it('uses a delayed fallback and cancels it when destroyed', () => {
    const state = create(false);
    state.stable.next(true);
    expect(state.schedule).toHaveBeenCalledWith(expect.any(Function), 1000);
    state.injector.destroy();
    expect(state.cancel).toHaveBeenCalledWith(7);
    state.callbacks[0]();
    expect(initializeAnalytics).not.toHaveBeenCalled();
  });

  it('handles optional analytics failures without rejecting application startup', async () => {
    initializeAnalytics.mockRejectedValue(new Error('Analytics unavailable'));
    const state = create();
    state.stable.next(true);
    expect(() => state.callbacks[0]()).not.toThrow();
    await vi.waitFor(() => expect(initializeAnalytics).toHaveBeenCalledOnce());
    state.injector.destroy();
  });
});
