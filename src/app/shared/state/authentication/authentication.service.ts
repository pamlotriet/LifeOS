import { inject, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as webSignOut,
} from 'firebase/auth';
import { firebaseApp } from '../../../core/firebase/firebase.config';
import { FirestoreService } from '../../../core/firebase/firestore.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly webAuth = getAuth(firebaseApp);
  private readonly firestore = inject(FirestoreService);
  private readonly authenticated = signal(false);
  private readonly ready = signal(false);
  private readonly uid = signal<string | null>(null);
  private loginPending = false;
  private authVersion = 0;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void this.refreshAuthState();
      return;
    }

    onAuthStateChanged(this.webAuth, (user) => {
      if (this.loginPending) return;
      const version = ++this.authVersion;
      void this.restoreWebSession(user, version);
    });
  }

  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly authReady = this.ready.asReadonly();
  readonly userId = this.uid.asReadonly();

  async getSession(): Promise<{ uid: string; token: string }> {
    const uid = this.uid();
    if (!uid) throw new Error('Sign in to access vehicles.');

    if (Capacitor.isNativePlatform()) {
      const { token } = await FirebaseAuthentication.getIdToken();
      return { uid, token };
    }

    const user = this.webAuth.currentUser;
    if (!user || user.uid !== uid) throw new Error('Your sign-in session has expired.');
    return { uid, token: await user.getIdToken() };
  }

  private async ensureNativeProfile(user: NonNullable<Awaited<ReturnType<typeof FirebaseAuthentication.getCurrentUser>>['user']>) {
    const { token } = await FirebaseAuthentication.getIdToken();
    await this.firestore.createUserIfMissing(user.uid, token, {
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    });
  }

  private async restoreWebSession(user: typeof this.webAuth.currentUser, version: number): Promise<void> {
    this.authenticated.set(false);
    this.uid.set(null);
    try {
      if (user) {
        await this.firestore.createUserIfMissing(user.uid, await user.getIdToken(), {
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoURL,
        });
      }
      if (version !== this.authVersion) return;
      this.uid.set(user?.uid ?? null);
      this.authenticated.set(!!user);
    } catch (error) {
      console.error('Could not restore Firebase user profile', error);
    } finally {
      if (version === this.authVersion) this.ready.set(true);
    }
  }

  async refreshAuthState(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { user } = await FirebaseAuthentication.getCurrentUser();
        if (user) await this.ensureNativeProfile(user);
        this.uid.set(user?.uid ?? null);
        this.authenticated.set(!!user);
        return !!user;
      } catch (error) {
        console.error('Could not restore Firebase user profile', error);
        this.uid.set(null);
        this.authenticated.set(false);
        return false;
      } finally {
        this.ready.set(true);
      }
    }

    const user = this.webAuth.currentUser;
    await this.restoreWebSession(user, ++this.authVersion);
    return this.authenticated();
  }

  async loginWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (!result.user) throw new Error('Google sign-in returned no user.');

      try {
        await this.ensureNativeProfile(result.user);
      } catch (error) {
        try {
          await FirebaseAuthentication.signOut();
        } catch (signOutError) {
          console.error('Could not close the incomplete Firebase sign-in', signOutError);
        }
        throw error;
      }
      this.uid.set(result.user.uid);
      this.authenticated.set(true);
      return result.user;
    }

    const provider = new GoogleAuthProvider();
    this.loginPending = true;
    try {
      const result = await signInWithPopup(this.webAuth, provider);

      try {
        await this.firestore.createUserIfMissing(result.user.uid, await result.user.getIdToken(), {
          email: result.user.email,
          displayName: result.user.displayName,
          photoUrl: result.user.photoURL,
        });
      } catch (error) {
        try {
          await webSignOut(this.webAuth);
        } catch (signOutError) {
          console.error('Could not close the incomplete Firebase sign-in', signOutError);
        }
        throw error;
      }
      this.uid.set(result.user.uid);
      this.authenticated.set(true);
      return result.user;
    } finally {
      this.loginPending = false;
    }
  }

  async logout() {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
      this.uid.set(null);
      this.authenticated.set(false);
      return;
    }

    await webSignOut(this.webAuth);
    this.uid.set(null);
    this.authenticated.set(false);
  }
}
