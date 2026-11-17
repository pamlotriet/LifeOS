import { initializeAnalytics } from '@core/firebase/firebase-analytics';
import { firebaseApp } from '@core/firebase/firebase.config';

const analytics = vi.hoisted(() => ({ isSupported: vi.fn(), getAnalytics: vi.fn() }));
vi.mock('firebase/analytics', () => analytics);

describe('Deferred Firebase analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes only in supported environments', async () => {
    analytics.isSupported.mockResolvedValue(false);
    await initializeAnalytics();
    expect(analytics.getAnalytics).not.toHaveBeenCalled();
    analytics.isSupported.mockResolvedValue(true);
    await initializeAnalytics();
    expect(analytics.getAnalytics).toHaveBeenCalledWith(firebaseApp);
  });
});
