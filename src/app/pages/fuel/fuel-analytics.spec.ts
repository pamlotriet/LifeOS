import { describe,expect,it } from 'vitest';
import { calculateRefuels,RefuelRecord } from '../../shared/state/refuels/refuel.model';
import { fuelAnalytics } from './fuel-analytics';
const record=(id:string,date:string,odometer:number,amountPaid=800):RefuelRecord=>({id,vehicleId:'car',dop:date,odometer,amountPaid,qtyLiters:40,pop:'Station',areaTown:'Town',fuelType:'95',initialRangeKm:null});
describe('Fuel chart data',()=>{
  it('keeps unknown consumption as gaps and orders points chronologically',()=>{
    const entries=calculateRefuels([record('2','2026-10-10',1500),record('1','2026-09-10',1000)]);
    const data=fuelAnalytics(entries);expect(data.consumption.map(p=>p.value)).toEqual([null,8]);expect(data.price.map(p=>p.value)).toEqual([20,20]);expect(data.costPerKm).toBe(1.6);
  });
  it('includes zero-spend calendar months and distinct years',()=>{
    const data=fuelAnalytics(calculateRefuels([record('1','2025-12-10',1000,500.25),record('2','2026-03-10',1500,800)]));
    expect(data.months.map(p=>p.value)).toEqual([0,0,500.25,0,0,800]);expect(data.months[2].label).toContain('25');expect(data.months[5].label).toContain('26');
  });
  it('does not fabricate cost or consumption when there is no known distance',()=>{
    const data=fuelAnalytics(calculateRefuels([record('1','2026-10-10',1000)]));expect(data.costPerKm).toBeNull();expect(data.consumption[0].value).toBeNull();expect(data.priceChange).toBeNull();
  });
  it('limits recent chart points without changing lifetime metrics',()=>{
    const data=fuelAnalytics(calculateRefuels(Array.from({length:15},(_,i)=>record(String(i),`2026-10-${String(i+1).padStart(2,'0')}`,1000+i*400))),6);expect(data.price).toHaveLength(6);expect(data.averages.totalSpent).toBe(12000);expect(data.rangeCount).toBe(14);
  });
  it('does not emit infinite values from invalid historical volume',()=>{
    const data=fuelAnalytics(calculateRefuels([{...record('1','2026-10-10',1000),qtyLiters:0}]));expect(data.price[0].value).toBeNull();
  });
});
