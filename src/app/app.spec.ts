import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { App } from '@app/app';
import { AuthService } from '@core/authentication/authentication.service';
import { AppNavigation } from '@core/navigation/app-navigation.service';
import { AppUpdates } from '@core/updates/app-updates.service';
import { ThemeService } from '@core/theme/theme.service';
import { AppStartup } from '@core/startup/app-startup.service';

describe('App startup', () => {
  const ready = signal(false);
  const authenticated = signal(false);
  const loading = signal(true);

  beforeEach(async () => {
    ready.set(false);
    authenticated.set(false);
    loading.set(true);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: AppStartup, useValue: { loading, slow: signal(false), reload: vi.fn() } },
        { provide: AuthService, useValue: { authReady: ready, isAuthenticated: authenticated } },
        { provide: AppNavigation, useValue: {} },
        { provide: AppUpdates, useValue: { available: signal(false) } },
        { provide: ThemeService, useValue: { dark: signal(false) } },
      ],
    }).compileComponents();
  });

  it('mounts the route outlet immediately while the session is being restored', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('ion-router-outlet');
    expect(outlet).toBeTruthy();
    expect(outlet.classList.contains('auth-route-hidden')).toBe(false);
    expect(fixture.nativeElement.querySelector('.login-page')).toBeNull();
  });

  it('keeps the same route outlet mounted after the session is restored', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('ion-router-outlet');
    authenticated.set(true);
    ready.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBe(outlet);
    expect(outlet.classList.contains('auth-route-hidden')).toBe(false);
    expect(fixture.nativeElement.querySelector('.login-page')).toBeNull();
  });

  it('shows sign-in and hides routed content when no session exists', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    ready.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-page')).toBeTruthy();
    expect(
      fixture.nativeElement
        .querySelector('ion-router-outlet')
        .classList.contains('auth-route-hidden'),
    ).toBe(true);
  });

  it('blocks interaction during startup and reveals the mounted app when ready', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('ion-router-outlet');
    expect(fixture.nativeElement.querySelector('.lifeos-launch')).toBeTruthy();
    expect(outlet.closest('[inert]')).toBeTruthy();
    loading.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lifeos-launch')).toBeNull();
    expect(outlet.closest('[inert]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBe(outlet);
  });
});
