import '@angular/compiler';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AppSelect } from './app-select';

describe('AppSelect', () => {
  it('passes the selected option to a reactive form', () => {
    const select = runInInjectionContext(Injector.create({ providers: [] }), () => new AppSelect(new ElementRef({ contains: () => false } as unknown as HTMLElement)));
    const changed = vi.fn();
    select.registerOnChange(changed);
    select.writeValue('');
    select.choose('ULP 95');
    expect(changed).toHaveBeenCalledWith('ULP 95');
    expect(select.value()).toBe('ULP 95');
  });
});
