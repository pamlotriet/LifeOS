import { Injectable } from '@angular/core';
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

  async loginWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();

      return result.user;
    }

    const provider = new GoogleAuthProvider();

    const result: UserCredential = await signInWithPopup(this.webAuth, provider);

    return result.user;
  }

  async logout() {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
      return;
    }

    await webSignOut(this.webAuth);
  }

  isAuthenticated(): boolean | Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return FirebaseAuthentication.getCurrentUser().then((result) => !!result.user);
    }

    return !!this.webAuth.currentUser;
  }
}
