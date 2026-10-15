import '@angular/compiler';
import { Injector,runInInjectionContext,signal } from '@angular/core';
import { describe,expect,it } from 'vitest';
import { FuelDashboard } from '../fuel/fuel-dashboard';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';
import { calculateRefuels,RefuelRecord } from '../../shared/state/refuels/refuel.model';
const record=(id:string,odometer:number):RefuelRecord=>({id,vehicleId:'car',dop:'2026-10-10',odometer,qtyLiters:40,amountPaid:800,initialRangeKm:null,pop:'Station',areaTown:'Town',fuelType:'95'});
describe('Fuel dashboard interactions',()=>{
 it('switches between consumption gaps and available fuel prices',()=>{
   const entries=signal(calculateRefuels([record('1',1000)]));
   const page=runInInjectionContext(Injector.create({providers:[{provide:RefuelStore,useValue:{entries}},{provide:VehicleStore,useValue:{}}]}),()=>new FuelDashboard());
   expect(page.hasTrend()).toBe(false);page.metric.set('price');expect(page.hasTrend()).toBe(true);expect(page.trend()[0].value).toBe(20);
   entries.set(calculateRefuels([record('1',1000),record('2',1500)]));page.metric.set('consumption');expect(page.trend().map(p=>p.value)).toEqual([null,8]);
 });
 it('updates charts and metrics when the selected vehicle records change',()=>{
   const entries=signal(calculateRefuels([record('1',1000),record('2',1500)]));
   const page=runInInjectionContext(Injector.create({providers:[{provide:RefuelStore,useValue:{entries}},{provide:VehicleStore,useValue:{}}]}),()=>new FuelDashboard());
   expect(page.analytics().averages.totalSpent).toBe(1600);expect(page.hasTrend()).toBe(true);
   entries.set([]);expect(page.analytics().months).toEqual([]);expect(page.analytics().averages.totalSpent).toBe(0);expect(page.hasTrend()).toBe(false);
 });
});
