import '@angular/compiler';
import { ApplicationRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppUpdates } from './app-updates.service';

describe('App updates', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(enabled = true) {
    const events = new Subject<any>();
    const sw = { isEnabled:enabled, versionUpdates:events, unrecoverable:new Subject(), checkForUpdate:vi.fn().mockResolvedValue(false) };
    const reload = vi.fn();
    const doc = Object.assign(new EventTarget(), {visibilityState:'visible',defaultView:Object.assign(new EventTarget(),{location:{reload}})});
    TestBed.configureTestingModule({providers:[{provide:SwUpdate,useValue:sw},{provide:ApplicationRef,useValue:{isStable:of(false)}},{provide:DOCUMENT,useValue:doc}]});
    return {service:TestBed.inject(AppUpdates),events,sw,reload};
  }
  it('offers refresh only after the new version is ready', () => {
    const {service,events,reload}=setup();
    events.next({type:'VERSION_DETECTED'});expect(service.available()).toBe(false);
    events.next({type:'VERSION_READY'});expect(service.available()).toBe(true);expect(reload).not.toHaveBeenCalled();
    service.refresh();expect(reload).toHaveBeenCalledOnce();
  });
  it('supports manual checking and permits retry after a network failure', async () => {
    const {service,sw}=setup();sw.checkForUpdate.mockRejectedValueOnce(new Error('Offline'));
    await service.check();expect(service.checking()).toBe(false);expect(service.message()).toContain('Could not check');
    sw.checkForUpdate.mockResolvedValueOnce(true);await service.check();expect(service.available()).toBe(true);
  });
  it('does not check when service workers are disabled', async () => {
    const {service,sw}=setup(false);await service.check();expect(sw.checkForUpdate).not.toHaveBeenCalled();
  });
});
