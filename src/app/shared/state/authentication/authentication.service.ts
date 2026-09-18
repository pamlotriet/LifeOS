import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import {
  deleteUser,
  getAuth,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as webSignOut,
  UserCredential,
} from 'firebase/auth';
import { firebaseApp } from '../../../core/firebase/firebase.config';

export class UnregisteredGoogleAccountError extends Error {
  constructor() {
    super('This Google account is not registered in Firebase. Contact the administrator for access.');
    this.name = 'UnregisteredGoogleAccountError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly webAuth = getAuth(firebaseApp);
  private readonly authenticated = signal(false);
  private readonly ready = signal(false);
  private readonly rejectedUserIds = new Set<string>();
  private loginPending = false;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void this.refreshAuthState();
      return;
    }

    onAuthStateChanged(this.webAuth, (user) => {
      if (!this.loginPending) {
        this.authenticated.set(
          !!user && user.uid === this.webAuth.currentUser?.uid && !this.rejectedUserIds.has(user.uid),
        );
      }
      this.ready.set(true);
    });
  }

  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly authReady = this.ready.asReadonly();

  async refreshAuthState(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.getCurrentUser();
      this.authenticated.set(!!result.user && !this.rejectedUserIds.has(result.user.uid));
      this.ready.set(true);
      return this.authenticated();
    }

    const user = this.webAuth.currentUser;
    const isAuthenticated = !!user && !this.rejectedUserIds.has(user.uid);
    this.authenticated.set(isAuthenticated);
    this.ready.set(true);
    return isAuthenticated;
  }

  async loginWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (!result.user || result.additionalUserInfo?.isNewUser !== false) {
        this.authenticated.set(false);
        if (result.user) this.rejectedUserIds.add(result.user.uid);
        if (result.additionalUserInfo?.isNewUser) {
          try {
            await FirebaseAuthentication.deleteUser();
          } catch (error) {
            console.error('Could not remove a new Firebase account', error);
          }
        }
        await FirebaseAuthentication.signOut();
        throw new UnregisteredGoogleAccountError();
      }

      this.authenticated.set(true);
      return result.user;
    }

    const provider = new GoogleAuthProvider();
    this.loginPending = true;
    try {
      const result: UserCredential = await signInWithPopup(this.webAuth, provider);
      const userInfo = getAdditionalUserInfo(result);
      if (!result.user || userInfo?.isNewUser !== false) {
        this.authenticated.set(false);
        if (result.user) this.rejectedUserIds.add(result.user.uid);
        if (result.user && userInfo?.isNewUser) {
          try {
            await deleteUser(result.user);
          } catch (error) {
            console.error('Could not remove a new Firebase account', error);
          }
        }
        await webSignOut(this.webAuth);
        throw new UnregisteredGoogleAccountError();
      }

      this.authenticated.set(true);
      return result.user;
    } finally {
      this.loginPending = false;
    }
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
