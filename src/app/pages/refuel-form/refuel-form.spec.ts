import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';
import { RefuelForm } from './refuel-form';

describe('RefuelForm', () => {
  let fixture: ComponentFixture<RefuelForm>;
  const save = vi.fn();
  const selectedVehicleId = signal<string | null>('car-1');
  const vehiclesLoading = signal(false);
  const refuelsLoading = signal(false);

  beforeEach(async () => {
    save.mockReset().mockResolvedValue(undefined);
    vehiclesLoading.set(false);
    refuelsLoading.set(false);
    await TestBed.configureTestingModule({
      imports: [RefuelForm],
      providers: [provideRouter([]), { provide: VehicleStore, useValue: { loading: vehiclesLoading } }, { provide: RefuelStore, useValue: {
        selectedVehicleId,
        vehicleOptions: signal([{ id: 'car-1', name: 'Suzuki Swift' }]),
        entries: signal([]),
        loading: refuelsLoading,
        save,
        selectVehicle: vi.fn(),
      } }],
    }).compileComponents();
    fixture = TestBed.createComponent(RefuelForm);
    await fixture.whenStable();
  });

  it('keeps the form hidden until vehicles and refuel records are ready', async () => {
    vehiclesLoading.set(true);
    refuelsLoading.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    vehiclesLoading.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    refuelsLoading.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('saves a first refuel with its manual range', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({
      dop: '2026-09-22', pop: 'Shell', fuelType: 'Petrol', areaTown: 'Sandton',
      odometer: 13600, qtyLiters: 40, amountPaid: 900, initialRangeKm: 600,
    });
    await fixture.componentInstance.submit();
    expect(save).toHaveBeenCalledWith('car-1', expect.objectContaining({ qtyLiters: 40, initialRangeKm: 600 }), undefined);
    expect(navigate).toHaveBeenCalledWith('/fuel/history', { replaceUrl:true });
  });

  it('accepts decimal commas and saves numeric values', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({
      dop: '2026-09-22', pop: 'Shell', fuelType: 'Petrol', areaTown: 'Sandton',
      odometer: '13600,5', qtyLiters: '24,54', amountPaid: '600,25', initialRangeKm: '510,2',
    });

    await fixture.componentInstance.submit();

    expect(save).toHaveBeenCalledWith('car-1', expect.objectContaining({
      odometer: 13600.5, qtyLiters: 24.54, amountPaid: 600.25, initialRangeKm: 510.2,
    }), undefined);
  });
});
