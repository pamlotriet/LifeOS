import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  native: false,
  webSignIn: vi.fn(),
  webSignOut: vi.fn(),
  nativeSignIn: vi.fn(),
  nativeCurrentUser: vi.fn(),
  nativeSignOut: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => authMocks.native },
}));

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: authMocks.nativeSignIn,
    getCurrentUser: authMocks.nativeCurrentUser,
    signOut: authMocks.nativeSignOut,
  },
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  GoogleAuthProvider: class {},
  onAuthStateChanged: () => () => {},
  signInWithPopup: authMocks.webSignIn,
  signOut: authMocks.webSignOut,
}));

vi.mock('../../../core/firebase/firebase.config', () => ({ firebaseApp: {} }));

import { AuthService } from './authentication.service';

describe('AuthService Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.native = false;
    authMocks.webSignOut.mockResolvedValue(undefined);
    authMocks.nativeSignOut.mockResolvedValue(undefined);
    authMocks.nativeCurrentUser.mockResolvedValue({ user: null });
  });

  it('allows a Google user on web', async () => {
    const user = { uid: 'google-user' };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a newly created Google user on web', async () => {
    const user = { uid: 'new-user' };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.webSignOut).not.toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a Google user on native', async () => {
    authMocks.native = true;
    const user = { uid: 'google-user' };
    authMocks.nativeSignIn.mockResolvedValue({ user });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('allows a newly created Google user on native', async () => {
    authMocks.native = true;
    const user = { uid: 'new-user' };
    authMocks.nativeSignIn.mockResolvedValue({
      user,
      additionalUserInfo: { isNewUser: true },
    });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(authMocks.nativeSignOut).not.toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('does not authenticate if native Google sign-in returns no user', async () => {
    authMocks.native = true;
    authMocks.nativeSignIn.mockResolvedValue({ user: null });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).rejects.toThrow('Google sign-in returned no user.');
    expect(service.isAuthenticated()).toBe(false);
  });
});
