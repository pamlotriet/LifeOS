import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';

const authMocks = vi.hoisted(() => ({
  native: false,
  webCurrentUser: null as unknown,
  webSignIn: vi.fn(),
  webSignOut: vi.fn(),
  nativeSignIn: vi.fn(),
  nativeCurrentUser: vi.fn(),
  nativeGetIdToken: vi.fn(),
  nativeSignOut: vi.fn(),
  createUserIfMissing: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => authMocks.native },
}));

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: authMocks.nativeSignIn,
    getCurrentUser: authMocks.nativeCurrentUser,
    getIdToken: authMocks.nativeGetIdToken,
    signOut: authMocks.nativeSignOut,
  },
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ get currentUser() { return authMocks.webCurrentUser; } }),
  GoogleAuthProvider: class {
    addScope = vi.fn();
    static credentialFromResult = (result: { credential?: { accessToken?: string } }) => result.credential ?? null;
  },
  onAuthStateChanged: () => () => {},
  signInWithPopup: authMocks.webSignIn,
  signOut: authMocks.webSignOut,
}));

vi.mock('../../../core/firebase/firebase.config', () => ({ firebaseApp: {} }));

import { AuthService } from './authentication.service';

function createService(): AuthService {
  const injector = Injector.create({
    providers: [{ provide: FirestoreService, useValue: { createUserIfMissing: authMocks.createUserIfMissing } }],
  });
  return runInInjectionContext(injector, () => new AuthService());
}

describe('AuthService Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.native = false;
    authMocks.webCurrentUser = null;
    authMocks.createUserIfMissing.mockResolvedValue(undefined);
    authMocks.nativeGetIdToken.mockResolvedValue({ token: 'firebase-id-token' });
    authMocks.webSignOut.mockResolvedValue(undefined);
    authMocks.nativeSignOut.mockResolvedValue(undefined);
    authMocks.nativeCurrentUser.mockResolvedValue({ user: null });
  });

  it('allows a Google user on web', async () => {
    const user = { uid: 'google-user', email: 'user@example.com', displayName: 'User', photoURL: null, getIdToken: vi.fn().mockResolvedValue('firebase-id-token') };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.createUserIfMissing).toHaveBeenCalledWith(user.uid, 'firebase-id-token', {
      email: user.email, displayName: user.displayName, photoUrl: null,
    });
    expect(service.userId()).toBe(user.uid);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a newly created Google user on web', async () => {
    const user = { uid: 'new-user', email: 'new@example.com', displayName: 'New', photoURL: null, getIdToken: vi.fn().mockResolvedValue('firebase-id-token') };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.webSignOut).not.toHaveBeenCalled();
    expect(authMocks.createUserIfMissing).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a Google user on native', async () => {
    authMocks.native = true;
    const user = { uid: 'google-user', email: 'user@example.com', displayName: 'User', photoUrl: null };
    authMocks.nativeSignIn.mockResolvedValue({ user });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.createUserIfMissing).toHaveBeenCalledWith(user.uid, 'firebase-id-token', {
      email: user.email, displayName: user.displayName, photoUrl: null,
    });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a newly created Google user on native', async () => {
    authMocks.native = true;
    const user = { uid: 'new-user', email: 'new@example.com', displayName: 'New', photoUrl: null };
    authMocks.nativeSignIn.mockResolvedValue({
      user,
      additionalUserInfo: { isNewUser: true },
    });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.nativeSignOut).not.toHaveBeenCalled();
    expect(authMocks.createUserIfMissing).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('does not authenticate if native Google sign-in returns no user', async () => {
    authMocks.native = true;
    authMocks.nativeSignIn.mockResolvedValue({ user: null });
    const service = createService();

    await expect(service.loginWithGoogle()).rejects.toThrow('Google sign-in returned no user.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('does not open the app when the Firebase profile cannot be created', async () => {
    authMocks.native = true;
    authMocks.nativeSignIn.mockResolvedValue({ user: {
      uid: 'new-user', email: 'new@example.com', displayName: 'New', photoUrl: null,
    } });
    authMocks.createUserIfMissing.mockRejectedValue(new Error('Firestore unavailable'));
    const service = createService();

    await expect(service.loginWithGoogle()).rejects.toThrow('Firestore unavailable');
    expect(authMocks.nativeSignOut).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userId()).toBeNull();
  });
});
