import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';

const authMocks = vi.hoisted(() => ({
  webCurrentUser: null as unknown,
  webSignIn: vi.fn(),
  webSignOut: vi.fn(),
  createUserIfMissing: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    get currentUser() {
      return authMocks.webCurrentUser;
    },
  }),
  GoogleAuthProvider: class {
    addScope = vi.fn();
    static credentialFromResult = (result: { credential?: { accessToken?: string } }) =>
      result.credential ?? null;
  },
  onAuthStateChanged: () => () => {},
  signInWithPopup: authMocks.webSignIn,
  signOut: authMocks.webSignOut,
}));

vi.mock('../../../core/firebase/firebase.config', () => ({ firebaseApp: {} }));

import { AuthService } from './authentication.service';

function createService(): AuthService {
  const injector = Injector.create({
    providers: [
      {
        provide: FirestoreService,
        useValue: { createUserIfMissing: authMocks.createUserIfMissing },
      },
    ],
  });
  return runInInjectionContext(injector, () => new AuthService());
}

describe('AuthService Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.webCurrentUser = null;
    authMocks.createUserIfMissing.mockResolvedValue(undefined);
    authMocks.webSignOut.mockResolvedValue(undefined);
  });

  it('allows a Google user on web', async () => {
    const user = {
      uid: 'google-user',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.createUserIfMissing).toHaveBeenCalledWith(user.uid, 'firebase-id-token', {
      email: user.email,
      displayName: user.displayName,
      photoUrl: null,
    });
    expect(service.userId()).toBe(user.uid);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a newly created Google user on web', async () => {
    const user = {
      uid: 'new-user',
      email: 'new@example.com',
      displayName: 'New',
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = createService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.webSignOut).not.toHaveBeenCalled();
    expect(authMocks.createUserIfMissing).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(true);
  });
  it('closes the Google session if profile setup fails', async () => {
    const user = {
      uid: 'new-user',
      email: 'new@example.com',
      displayName: 'New',
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    };
    authMocks.webSignIn.mockResolvedValue({ user });
    authMocks.createUserIfMissing.mockRejectedValue(new Error('Profile setup failed'));
    const service = createService();

    await expect(service.loginWithGoogle()).rejects.toThrow('Profile setup failed');
    expect(authMocks.webSignOut).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userId()).toBeNull();
  });
});
