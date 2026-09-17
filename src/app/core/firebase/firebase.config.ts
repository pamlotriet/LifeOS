import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { environment } from '../../../environments/environment';
import { getAuth } from 'firebase/auth';

export const firebaseApp = initializeApp(environment.firebaseConfig);

export const analyticsPromise = isAnalyticsSupported().then((supported) => {
  if (!supported) {
    return null;
  }

  return getAnalytics(firebaseApp);
});

export const auth = getAuth(firebaseApp);
