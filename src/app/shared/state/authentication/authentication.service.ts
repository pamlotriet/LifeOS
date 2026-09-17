import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as webSignOut,
  UserCredential,
} from 'firebase/auth';
import { firebaseApp } from '../../../core/firebase/firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly webAuth = getAuth(firebaseApp);
  private readonly authenticated = signal(false);

  constructor() {
    void this.refreshAuthState();
  }

  readonly isAuthenticated = this.authenticated.asReadonly();

  async refreshAuthState(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.getCurrentUser();
      this.authenticated.set(!!result.user);
      return this.authenticated();
    }

    const isAuthenticated = !!this.webAuth.currentUser;
    this.authenticated.set(isAuthenticated);
    return isAuthenticated;
  }

  async loginWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();

      this.authenticated.set(!!result.user);
      return result.user;
    }

    const provider = new GoogleAuthProvider();

    const result: UserCredential = await signInWithPopup(this.webAuth, provider);

    this.authenticated.set(!!result.user);
    return result.user;
  }

  async logout() {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
      this.authenticated.set(false);
      return;
    }

    await webSignOut(this.webAuth);
    this.authenticated.set(false);
  }
}
