import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { PasswordStore } from '../../shared/state/passwords/password-store';
import { ThemeService } from '../../shared/state/theme/theme.service';
import { PasswordSettings } from './password-settings';

describe('Settings budget cycle', () => {
  const cycleStartDay = signal(28);
  const loading = signal(false);
  const setCycleStartDay = vi.fn(async (day: number) => { cycleStartDay.set(day); });

  beforeEach(async () => {
    cycleStartDay.set(28);
    loading.set(false);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PasswordSettings],
      providers: [
        provideRouter([]),
        { provide: BudgetStore, useValue: { cycleStartDay, loading, error: signal(''), cycleLabel: signal('Saved cycle'), setCycleStartDay } },
        { provide: ThemeService, useValue: { dark: signal(true) } },
        { provide: PasswordStore, useValue: { initialize: vi.fn(), vault: { crypto: { autoLockMinutes: signal(5), lockOnBackground: signal(true) } } } },
      ],
    }).compileComponents();
  });

  it('restores the selected day after leaving and reopening Settings', async () => {
    const first = TestBed.createComponent(PasswordSettings);
    await first.whenStable();
    const select = first.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.selectedIndex).toBe(27);
    select.selectedIndex = 14;
    select.dispatchEvent(new Event('change'));
    await first.whenStable();
    expect(setCycleStartDay).toHaveBeenCalledWith(15);
    expect(cycleStartDay()).toBe(15);
    first.destroy();

    const reopened = TestBed.createComponent(PasswordSettings);
    await reopened.whenStable();
    expect((reopened.nativeElement.querySelector('select') as HTMLSelectElement).selectedIndex).toBe(14);
  });

  it('shows the account day when it loads after the options render', async () => {
    cycleStartDay.set(1);
    loading.set(true);
    const fixture = TestBed.createComponent(PasswordSettings);
    await fixture.whenStable();
    cycleStartDay.set(31);
    loading.set(false);
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.selectedIndex).toBe(30);
    expect(select.disabled).toBe(false);
    expect(setCycleStartDay).not.toHaveBeenCalled();
  });
});
