import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { StatsService } from './stats.service';
import { VehicleStore } from '../vehicles/vehicle-store';
import { RefuelService } from '../refuels/refuel.service';
import { AuthService } from '../authentication/authentication.service';

describe('Vehicle statistics', () => {
  it('calculates distances per car, preserves the prior reading, and filters totals and charts', async () => {
    const year = new Date().getFullYear();
    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: { userId: () => 'user' } },
        {
          provide: VehicleStore,
          useValue: {
            vehicles: () => [
              { id: 'a', name: 'Car A', registration: 'A' },
              { id: 'b', name: 'Car B', registration: 'B' },
            ],
          },
        },
        {
          provide: RefuelService,
          useValue: {
            list: async (vehicleId: string) => [
              {
                id: '1',
                vehicleId,
                dop: `${year}-01-01`,
                odometer: vehicleId === 'a' ? 1000 : 9000,
                qtyLiters: 20,
                amountPaid: 400,
                initialRangeKm: null,
              },
              {
                id: '2',
                vehicleId,
                dop: `${year}-02-01`,
                odometer: vehicleId === 'a' ? 1200 : 9100,
                qtyLiters: 10,
                amountPaid: 200,
                initialRangeKm: null,
              },
            ],
          },
        },
      ],
    });
    const stats = runInInjectionContext(injector, () => new StatsService());
    await stats.ensureFuelLoaded();
    const all = stats.dashboard('fuel', '1M', `${year}-02`);
    const value = (label: string) => all.kpis.find((kpi) => kpi.label === label)!.value;
    expect(value('Distance tracked')).toBe('300 km');
    expect(value('Fuel purchased')).toBe('20.0 L');
    expect(value('Average consumption')).toBe('6.7 L/100 km');
    expect(all.secondary.data.datasets[0].data).toEqual([400]);
    expect(all.primary.data.datasets).toHaveLength(2);
    stats.selectVehicle('a');
    const car = stats.dashboard('fuel', '1M', `${year}-02`);
    expect(car.kpis.find((kpi) => kpi.label === 'Distance tracked')!.value).toBe('200 km');
    expect(car.secondary.data.datasets[0].data).toEqual([200]);
    expect(car.primary.data.datasets).toHaveLength(1);
    expect(stats.dashboard('fuel', '1M', `${year}-03`).empty).toBe(true);
  });
});
