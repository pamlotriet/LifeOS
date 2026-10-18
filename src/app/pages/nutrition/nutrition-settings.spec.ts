import { AuthService } from '../../shared/state/authentication/authentication.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NutritionService, defaultProfile } from '../../shared/state/nutrition/nutrition.service';
import { NutritionSettings } from './nutrition-settings';
describe('Automatic targets in settings', () => {
  const profile = signal(defaultProfile());
  const saveProfile = vi.fn();
  beforeEach(async () => {
    vi.clearAllMocks();
    profile.set({
      ...defaultProfile(),
      age: 27,
      height: 179,
      weight: 95,
      sex: 'female',
      goalWeight: 80,
    });
    await TestBed.configureTestingModule({
      imports: [NutritionSettings],
      providers: [
        {provide:AuthService,useValue:{displayName:signal('Pamela Lotriet')}},
        {
          provide: NutritionService,
          useValue: { profile, loading: signal(false), error: signal(''), saveProfile },
        },
      ],
    }).compileComponents();
  });
  it('previews blank targets without turning them into manual overrides', async () => {
    const fixture = TestBed.createComponent(NutritionSettings);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector(
      '[aria-label="Daily calories"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.readOnly).toBe(true);
    expect(input.placeholder).toBe('Auto: 1915');
    expect(fixture.componentInstance.preview()?.calories).toBe(1915);
    await fixture.componentInstance.save();
    expect(saveProfile.mock.calls[0][0].targetOverrides.calories).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/nutrition"]')).toBeNull();
  });
  it('updates estimates when a manual override is entered and then cleared', async () => {
    const fixture = TestBed.createComponent(NutritionSettings);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector(
      '[aria-label="Daily calories"]',
    ) as HTMLInputElement;
    (fixture.nativeElement.querySelector('[aria-label="Set manual calories"], [aria-label="Calculate calories"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(input.readOnly).toBe(false);
    input.value = '2000';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.preview()?.protein).toBe(125);
    (fixture.nativeElement.querySelector('[aria-label="Set manual calories"], [aria-label="Calculate calories"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.preview()?.calories).toBe(1915);
    expect(input.readOnly).toBe(true);
  });
  it('subtracts an explicit deficit from maintenance and saves it', async () => {
    const fixture = TestBed.createComponent(NutritionSettings);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('[name="calorieDeficit"]') as HTMLInputElement;
    input.value = '300';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.preview()?.calories).toBe(1827);
    await fixture.componentInstance.save();
    expect(saveProfile.mock.calls[0][0].calorieDeficit).toBe(300);
    fixture.componentInstance.model.calorieDeficit = 0;
    expect(fixture.componentInstance.preview()?.calories).toBe(2127);
    fixture.componentInstance.model.calorieDeficit = 3000;
    expect(fixture.componentInstance.calculationError()).toContain('smaller than');
    fixture.componentInstance.model.targetOverrides!.calories = 2000;
    expect(fixture.componentInstance.preview()?.calories).toBe(2000);
  });

  it('uses the account name in the read-only field and saved profile', async () => {
    const fixture = TestBed.createComponent(NutritionSettings);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('[name="nutritionName"]') as HTMLInputElement;
    expect(input.value).toBe('Pamela Lotriet');
    expect(input.readOnly).toBe(true);
    fixture.componentInstance.model.name = 'Old profile name';
    await fixture.componentInstance.save();
    expect(saveProfile.mock.calls[0][0].name).toBe('Pamela Lotriet');
  });

});

