import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  native: false,
  userInfo: null as { isNewUser: boolean } | null,
  webSignIn: vi.fn(),
  webDelete: vi.fn(),
  webSignOut: vi.fn(),
  nativeSignIn: vi.fn(),
  nativeCurrentUser: vi.fn(),
  nativeDelete: vi.fn(),
  nativeSignOut: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => authMocks.native },
}));

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: authMocks.nativeSignIn,
    getCurrentUser: authMocks.nativeCurrentUser,
    deleteUser: authMocks.nativeDelete,
    signOut: authMocks.nativeSignOut,
  },
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  GoogleAuthProvider: class {},
  onAuthStateChanged: () => () => {},
  signInWithPopup: authMocks.webSignIn,
  getAdditionalUserInfo: () => authMocks.userInfo,
  deleteUser: authMocks.webDelete,
  signOut: authMocks.webSignOut,
}));

vi.mock('../../../core/firebase/firebase.config', () => ({ firebaseApp: {} }));

import { AuthService, UnregisteredGoogleAccountError } from './authentication.service';

describe('AuthService Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.native = false;
    authMocks.userInfo = null;
    authMocks.webDelete.mockResolvedValue(undefined);
    authMocks.webSignOut.mockResolvedValue(undefined);
    authMocks.nativeDelete.mockResolvedValue(undefined);
    authMocks.nativeSignOut.mockResolvedValue(undefined);
    authMocks.nativeCurrentUser.mockResolvedValue({ user: null });
  });

  it('allows an existing Firebase Auth user on web', async () => {
    const user = { uid: 'existing-user' };
    authMocks.userInfo = { isNewUser: false };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(authMocks.webDelete).not.toHaveBeenCalled();
  });

  it('deletes and signs out a newly created web user', async () => {
    const user = { uid: 'new-user' };
    authMocks.userInfo = { isNewUser: true };
    authMocks.webSignIn.mockResolvedValue({ user });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).rejects.toBeInstanceOf(UnregisteredGoogleAccountError);
    expect(authMocks.webDelete).toHaveBeenCalledWith(user);
    expect(authMocks.webSignOut).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('does not continue when Firebase omits the new-user result', async () => {
    authMocks.webSignIn.mockResolvedValue({ user: { uid: 'unknown-user' } });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).rejects.toBeInstanceOf(UnregisteredGoogleAccountError);
    expect(authMocks.webSignOut).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('allows an existing Firebase Auth user on native', async () => {
    authMocks.native = true;
    const user = { uid: 'existing-user' };
    authMocks.nativeSignIn.mockResolvedValue({ user, additionalUserInfo: { isNewUser: false } });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).resolves.toBe(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(authMocks.nativeDelete).not.toHaveBeenCalled();
  });

  it('deletes and signs out a newly created native user', async () => {
    authMocks.native = true;
    authMocks.nativeSignIn.mockResolvedValue({
      user: { uid: 'new-user' },
      additionalUserInfo: { isNewUser: true },
    });
    const service = new AuthService();

    await expect(service.loginWithGoogle()).rejects.toBeInstanceOf(UnregisteredGoogleAccountError);
    expect(authMocks.nativeDelete).toHaveBeenCalled();
    expect(authMocks.nativeSignOut).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(false);
  });
});
