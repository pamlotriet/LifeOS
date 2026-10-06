import { inject, Injectable, signal } from '@angular/core';

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

    const user = this.webAuth.currentUser;
    if (!user || user.uid !== uid) throw new Error('Your sign-in session has expired.');
    return { uid, token: await user.getIdToken() };
  }

  private async restoreWebSession(
    user: typeof this.webAuth.currentUser,
    version: number,
  ): Promise<void> {
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
    const user = this.webAuth.currentUser;
    await this.restoreWebSession(user, ++this.authVersion);
    return this.authenticated();
  }

  async loginWithGoogle() {
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
    await webSignOut(this.webAuth);
    this.uid.set(null);
    this.authenticated.set(false);
  }
}
