import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { RefuelForm } from './refuel-form';

describe('RefuelForm', () => {
  let fixture: ComponentFixture<RefuelForm>;
  const save = vi.fn();
  const selectedVehicleId = signal<string | null>('car-1');

  beforeEach(async () => {
    save.mockReset().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [RefuelForm],
      providers: [provideRouter([]), { provide: RefuelStore, useValue: {
        selectedVehicleId,
        vehicleOptions: signal([{ id: 'car-1', name: 'Suzuki Swift' }]),
        entries: signal([]),
        save,
        selectVehicle: vi.fn(),
      } }],
    }).compileComponents();
    fixture = TestBed.createComponent(RefuelForm);
    await fixture.whenStable();
  });

  it('saves a first refuel with its manual range', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({
      dop: '2026-09-22', pop: 'Shell', fuelType: 'Petrol', areaTown: 'Sandton',
      odometer: 13600, qtyLiters: 40, amountPaid: 900, initialRangeKm: 600,
    });
    await fixture.componentInstance.submit();
    expect(save).toHaveBeenCalledWith('car-1', expect.objectContaining({ qtyLiters: 40, initialRangeKm: 600 }), undefined);
    expect(navigate).toHaveBeenCalledWith('/fuel/history');
  });
});
