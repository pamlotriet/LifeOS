import { TestBed } from '@angular/core/testing';
import '@angular/compiler';

import { describe, expect, it } from 'vitest';
import { FuelConsumptionChart } from '@pages/fuel/components/fuel-consumption-chart/fuel-consumption-chart';

import { calculateRefuels, RefuelRecord } from '@pages/fuel/state/refuel/refuel.model';
const record = (id: string, odometer: number): RefuelRecord => ({
  id,
  vehicleId: 'car',
  dop: '2026-10-10',
  odometer,
  qtyLiters: 40,
  amountPaid: 800,
  initialRangeKm: null,
  pop: 'Station',
  areaTown: 'Town',
  fuelType: '95',
});
describe('FuelConsumptionChart interactions', () => {
  it('switches between consumption gaps and available fuel prices', () => {
    const entries = calculateRefuels([record('1', 1000)]);
    const fixture = TestBed.createComponent(FuelConsumptionChart);
    fixture.componentRef.setInput('entries', entries);
    const page = fixture.componentInstance;
    expect(page.hasTrend()).toBe(false);
    page.metric.set('price');
    expect(page.hasTrend()).toBe(true);
    expect(page.trend()[0].value).toBe(20);
    fixture.componentRef.setInput(
      'entries',
      calculateRefuels([record('1', 1000), record('2', 1500)]),
    );
    page.metric.set('consumption');
    expect(page.trend().map((p) => p.value)).toEqual([null, 8]);
  });
  it('updates charts and metrics when the selected vehicle records change', () => {
    const entries = calculateRefuels([record('1', 1000), record('2', 1500)]);
    const fixture = TestBed.createComponent(FuelConsumptionChart);
    fixture.componentRef.setInput('entries', entries);
    const page = fixture.componentInstance;
    expect(page.analytics().averages.totalSpent).toBe(1600);
    expect(page.hasTrend()).toBe(true);
    fixture.componentRef.setInput('entries', []);
    expect(page.analytics().months).toEqual([]);
    expect(page.analytics().averages.totalSpent).toBe(0);
    expect(page.hasTrend()).toBe(false);
  });
});
