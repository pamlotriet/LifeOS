import { describe, expect, it } from 'vitest';
import { calculateRefuels, refuelAverages, refuelLifetimeSummary, RefuelRecord } from './refuel.model';

const entry = (id: string, odometer: number, qtyLiters: number, amountPaid: number, initialRangeKm: number | null = null): RefuelRecord => ({
  id, vehicleId: 'car-1', dop: `2026-09-${id.padStart(2, '0')}`, pop: 'Shell',
  fuelType: 'ULP 95', areaTown: 'Sandton', odometer, qtyLiters, amountPaid, initialRangeKm,
});

describe('refuel calculations', () => {
  it('uses the manual first range and previous odometer for later entries', () => {
    const entries = calculateRefuels([
      entry('2', 1032, 26.36, 674.50),
      entry('1', 578.7, 27.525, 761.50, 564.7),
      entry('3', 1436, 27.22, 733),
    ]);
    expect(entries[0].rangeKm).toBeCloseTo(564.7);
    expect(entries[1].rangeKm).toBeCloseTo(453.3);
    expect(entries[2].rangeKm).toBeCloseTo(404);
    expect(entries[1].randPerLiter).toBeCloseTo(674.5 / 26.36);
    expect(entries[1].kmPerLiter).toBeCloseTo(453.3 / 26.36);
    expect(entries[1].litersPer100Km).toBeCloseTo(26.36 / 453.3 * 100);
  });

  it('recalculates following ranges after an earlier entry is edited or deleted', () => {
    const original = [entry('1', 100, 20, 400, 300), entry('2', 500, 25, 500), entry('3', 850, 30, 600)];
    expect(calculateRefuels(original).map((item) => item.rangeKm)).toEqual([300, 400, 350]);
    expect(calculateRefuels([original[0], { ...original[1], odometer: 550 }, original[2]]).map((item) => item.rangeKm)).toEqual([300, 450, 300]);
    expect(calculateRefuels([original[0], original[2]]).map((item) => item.rangeKm)).toEqual([300, 750]);
  });

  it('computes weighted overall averages from distance, litres, and spend', () => {
    const averages = refuelAverages(calculateRefuels([entry('1', 100, 20, 400, 300), entry('2', 500, 25, 500)]));
    expect(averages.randPerLiter).toBeCloseTo(900 / 45);
    expect(averages.kmPerLiter).toBeCloseTo(700 / 45);
    expect(averages.litersPer100Km).toBeCloseTo(45 / 700 * 100);
  });

  it('summarizes lifetime values and months with recorded refuels', () => {
    const records = [entry('1', 100, 20, 400, 300), entry('2', 500, 25, 500)];
    const summary = refuelLifetimeSummary(calculateRefuels(records));
    expect(summary).toEqual(expect.objectContaining({
      lifetimeTotalSpent: 900, lifetimeTotalRangeKm: 700, lifetimeTotalLitres: 45,
      lifetimeRefuelCount: 2, lifetimeAverageMonthlySpend: 900, lifetimeAverageRangeKm: 350,
    }));
    expect(refuelLifetimeSummary([]).lifetimeAverageMonthlySpend).toBeNull();
  });
});
