import '@angular/compiler';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AppDatePicker } from './app-date-picker';

describe('AppDatePicker', () => {
  it('uses local calendar dates without changing the selected day for time zones', () => {
    const picker = runInInjectionContext(Injector.create({ providers: [] }), () => new AppDatePicker(new ElementRef({ contains: () => false } as unknown as HTMLElement)));
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.selectYear(2026);
    picker.selectMonth(8);
    picker.choose(22);
    expect(changed).toHaveBeenCalledWith('2026-09-22');
    expect(picker.formatted()).toContain('22 Sep 2026');
  });
});
