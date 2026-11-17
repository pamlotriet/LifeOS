import { IonModal } from '@ionic/angular/ion-modal';
import { FuelModalStub } from '@pages/fuel/testing/fuel-modal.testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RefuelStore } from '@pages/fuel/state/refuel/refuel-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { RefuelForm } from '@pages/fuel/refuel-form/refuel-form';

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
      providers: [
        provideRouter([]),
        { provide: VehicleStore, useValue: { loading: vehiclesLoading } },
        {
          provide: RefuelStore,
          useValue: {
            selectedVehicleId,
            vehicleOptions: signal([{ id: 'car-1', name: 'Suzuki Swift' }]),
            entries: signal([]),
            loading: refuelsLoading,
            save,
            selectVehicle: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(RefuelForm, {
        remove: { imports: [IonModal] },
        add: { imports: [FuelModalStub] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(RefuelForm);
    await fixture.whenStable();
  });

  it('closes on dismissal and ignores duplicate dismissal events', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.dismiss();
    fixture.componentInstance.dismiss();
    expect(fixture.componentInstance.modalOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
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
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockImplementation(async () => {
        expect(fixture.componentInstance.saving()).toBe(false);
        expect(fixture.componentInstance.modalOpen()).toBe(false);
        return true;
      });
    save.mockImplementationOnce(async () => {
      expect(fixture.componentInstance.saving()).toBe(true);
      expect(fixture.componentInstance.modalOpen()).toBe(true);
    });
    fixture.componentInstance.form.patchValue({
      dop: '2026-09-22',
      pop: 'Shell',
      fuelType: 'Petrol',
      areaTown: 'Sandton',
      odometer: 13600,
      qtyLiters: 40,
      amountPaid: 900,
      initialRangeKm: 600,
    });
    await fixture.componentInstance.submit();
    expect(save).toHaveBeenCalledWith(
      'car-1',
      expect.objectContaining({ qtyLiters: 40, initialRangeKm: 600 }),
      undefined,
    );
    expect(navigate).toHaveBeenCalledWith('/fuel/history', { replaceUrl: true });
  });

  it('unlocks the form and keeps it open when saving fails', async () => {
    save.mockRejectedValueOnce(new Error('Could not save the refuel.'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fixture.componentInstance.form.patchValue({
      pop: 'Shell',
      fuelType: 'Petrol',
      areaTown: 'Sandton',
      odometer: 13600,
      qtyLiters: 40,
      amountPaid: 900,
      initialRangeKm: 600,
    });

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.modalOpen()).toBe(true);
    expect(fixture.componentInstance.error()).toBe('Could not save the refuel.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('accepts decimal commas and saves numeric values', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({
      dop: '2026-09-22',
      pop: 'Shell',
      fuelType: 'Petrol',
      areaTown: 'Sandton',
      odometer: '13600,5',
      qtyLiters: '24,54',
      amountPaid: '600,25',
      initialRangeKm: '510,2',
    });

    await fixture.componentInstance.submit();

    expect(save).toHaveBeenCalledWith(
      'car-1',
      expect.objectContaining({
        odometer: 13600.5,
        qtyLiters: 24.54,
        amountPaid: 600.25,
        initialRangeKm: 510.2,
      }),
      undefined,
    );
  });
});
