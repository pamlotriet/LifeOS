import { getAnalytics, isSupported } from 'firebase/analytics';
import { firebaseApp } from '@core/firebase/firebase.config';

/** Loaded only after the application has rendered and the browser has idle time. */
export async function initializeAnalytics(): Promise<void> {
  if (await isSupported()) getAnalytics(firebaseApp);
}
