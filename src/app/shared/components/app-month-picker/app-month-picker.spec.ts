import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AppMonthPicker } from './app-month-picker';

describe('Budget month picker', () => {
  it('preserves the selected year when switching months and emits ISO month values', () => {
    const picker = runInInjectionContext(Injector.create({ providers: [] }), () => new AppMonthPicker());
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue('2026-12');
    picker.choose('01', picker.year());
    expect(changed).toHaveBeenCalledWith('2026-01');
    picker.choose(picker.month(), '2027');
    expect(changed).toHaveBeenLastCalledWith('2027-01');
    expect(picker.years()).toContain(2027);
    picker.setDisabledState(true);
    picker.choose('02','2027');
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
