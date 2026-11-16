import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '@core/authentication/authentication.service';
import { AppStartup } from '@core/startup/app-startup.service';

@Component({ template: '{{ startup.loading() }}' })
class StartupHost {
  readonly startup = inject(AppStartup);
  readonly dataLoading = signal(true);
  constructor() {
    this.startup.waitFor(this.dataLoading, inject(DestroyRef));
  }
}

describe('AppStartup readiness', () => {
  const ready = signal(false);
  const authenticated = signal(true);
  let events: Subject<NavigationEnd>;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    ready.set(false);
    authenticated.set(true);
    events = new Subject();
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    TestBed.configureTestingModule({
      imports: [StartupHost],
      providers: [
        { provide: AuthService, useValue: { authReady: ready, isAuthenticated: authenticated } },
        { provide: Router, useValue: { navigated: false, events } },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function paint() {
    await Promise.resolve();
    frames.splice(0).forEach((callback) => callback(0));
    frames.splice(0).forEach((callback) => callback(0));
  }

  it('waits for the session, initial navigation and initial data before revealing the app', async () => {
    const fixture = TestBed.createComponent(StartupHost);
    const startup = fixture.componentInstance.startup;
    fixture.detectChanges();
    await paint();
    expect(startup.loading()).toBe(true);
    ready.set(true);
    fixture.detectChanges();
    await paint();
    expect(startup.loading()).toBe(true);
    events.next(new NavigationEnd(1, '/home', '/home'));
    fixture.detectChanges();
    await paint();
    expect(startup.loading()).toBe(true);
    fixture.componentInstance.dataLoading.set(false);
    fixture.detectChanges();
    await paint();
    expect(startup.loading()).toBe(false);
    fixture.componentInstance.dataLoading.set(true);
    fixture.detectChanges();
    expect(startup.loading()).toBe(false);
  });

  it('allows sign-in without waiting for an authenticated route', async () => {
    const fixture = TestBed.createComponent(StartupHost);
    fixture.componentInstance.dataLoading.set(false);
    authenticated.set(false);
    ready.set(true);
    fixture.detectChanges();
    await paint();
    expect(fixture.componentInstance.startup.loading()).toBe(false);
  });
});
