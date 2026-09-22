import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { FuelHistory } from './fuel-history';

describe('FuelHistory', () => {
  let component: FuelHistory;
  let fixture: ComponentFixture<FuelHistory>;
  const entries = signal(Array.from({ length: 7 }, (_, index) => ({
    id: `entry-${index + 1}`, vehicleId: 'car-1', dop: index < 2 ? '2026-09-22' : '2026-09-21',
    pop: 'Shell', areaTown: 'Sandton', fuelType: 'Petrol', odometer: 1000 + index * 100,
    qtyLiters: 40, amountPaid: 900, initialRangeKm: null, rangeKm: 100,
    randPerLiter: 22.5, kmPerLiter: 2.5, litersPer100Km: 40,
  })));
  const selectedVehicleId = signal<string | null>('car-1');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelHistory],
      providers: [provideRouter([]), { provide: RefuelStore, useValue: {
        newestFirst: entries,
        selectedVehicleId,
        vehicleOptions: signal([{ id: 'car-1', name: 'Suzuki Swift' }]),
        loading: signal(false), error: signal(''), selectVehicle: vi.fn(),
      } }],
    }).compileComponents();

    fixture = TestBed.createComponent(FuelHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('paginates refuels and filters them to a selected date', () => {
    expect(component.visibleEntries().length).toBe(5);
    expect(component.totalPages()).toBe(2);
    component.nextPage();
    expect(component.visibleEntries().length).toBe(2);
    component.setDate('2026-09-22');
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
    expect(component.visibleEntries().map((entry) => entry.id)).toEqual(['entry-1', 'entry-2']);
  });
});
