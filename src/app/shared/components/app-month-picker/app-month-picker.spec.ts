import { TestBed } from '@angular/core/testing';
import translationTestProviders from '@src/test-providers';
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AppMonthPicker } from '@shared/components/app-month-picker/app-month-picker';

describe('Budget month picker', () => {
  it('renders the selected cycle rather than defaulting to January and the first year', async () => {
    const fixture = TestBed.createComponent(AppMonthPicker);
    const picker = fixture.componentInstance;
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue('2026-12');
    await fixture.whenStable();
    const [month, year] = fixture.nativeElement.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>;
    expect(month.value).toBe('12');
    expect(year.value).toBe('2026');
    expect(changed).not.toHaveBeenCalled();
    picker.writeValue('2038-04');
    await fixture.whenStable();
    expect(month.value).toBe('04');
    expect(year.value).toBe('2038');
    month.value = '05';
    month.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith('2038-05');
  });
  it('preserves the selected year when switching months and emits ISO month values', () => {
    const picker = runInInjectionContext(
      Injector.create({ providers: [...translationTestProviders] }),
      () => new AppMonthPicker(),
    );
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue('2026-12');
    picker.choose('01', picker.year());
    expect(changed).toHaveBeenCalledWith('2026-01');
    picker.choose(picker.month(), '2027');
    expect(changed).toHaveBeenLastCalledWith('2027-01');
    expect(picker.years()).toContain(2027);
    picker.setDisabledState(true);
    picker.choose('02', '2027');
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
