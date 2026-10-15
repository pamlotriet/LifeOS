import { RefuelEntry, refuelAverages } from '../../shared/state/refuels/refuel.model';
export interface FuelPoint { label:string; value:number|null; }
export function fuelAnalytics(entries:RefuelEntry[],limit=12) {
  const ordered=[...entries].sort((a,b)=>a.dop.localeCompare(b.dop)||a.odometer-b.odometer||a.id.localeCompare(b.id));
  const averages=refuelAverages(ordered);
  const ranged=ordered.filter(e=>e.rangeKm!==null&&e.rangeKm>0);
  const distance=ranged.reduce((sum,e)=>sum+e.rangeKm!,0);
  const cost=ranged.reduce((sum,e)=>sum+e.amountPaid,0);
  const recent=ordered.slice(-limit);
  const finite=(value:number|null)=>value!==null&&Number.isFinite(value)&&value>0?value:null;
  const label=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'2-digit'});
  const monthly=new Map<string,number>();
  ordered.forEach(e=>monthly.set(e.dop.slice(0,7),(monthly.get(e.dop.slice(0,7))??0)+Math.round(e.amountPaid*100)));
  const lastMonth=ordered.at(-1)?.dop.slice(0,7);
  const months:FuelPoint[]=[];
  if(lastMonth){const date=new Date(`${lastMonth}-01T12:00:00`);date.setMonth(date.getMonth()-5);for(let i=0;i<6;i++){const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;months.push({label:date.toLocaleDateString('en-ZA',{month:'short',year:'2-digit'}),value:(monthly.get(key)??0)/100});date.setMonth(date.getMonth()+1);}}
  const latest=ordered.at(-1)??null;
  const previous=ordered.at(-2)??null;
  return {averages,latest,previous,rangeCount:ranged.length,costPerKm:distance>0?cost/distance:null,
    price:recent.map(e=>({label:label(e.dop),value:finite(e.randPerLiter)})),
    consumption:recent.map(e=>({label:label(e.dop),value:finite(e.litersPer100Km)})),months,
    priceChange:latest&&previous&&previous.randPerLiter>0?(latest.randPerLiter/previous.randPerLiter-1)*100:null,
  };
}
