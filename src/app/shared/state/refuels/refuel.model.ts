export interface RefuelInput {
  dop: string;
  pop: string;
  fuelType: string;
  areaTown: string;
  odometer: number;
  qtyLiters: number;
  amountPaid: number;
  initialRangeKm: number | null;
}

export interface RefuelRecord extends RefuelInput {
  id: string;
  vehicleId: string;
}

export interface RefuelEntry extends RefuelRecord {
  rangeKm: number | null;
  randPerLiter: number;
  kmPerLiter: number | null;
  litersPer100Km: number | null;
}

export function calculateRefuels(records: RefuelRecord[]): RefuelEntry[] {
  const ordered = [...records].sort((a, b) => a.odometer - b.odometer || a.dop.localeCompare(b.dop) || a.id.localeCompare(b.id));
  return ordered.map((record, index) => {
    const rangeKm = index === 0
      ? record.initialRangeKm
      : record.odometer - ordered[index - 1].odometer;
    const validRange = rangeKm !== null && rangeKm > 0;
    return {
      ...record,
      rangeKm: validRange ? rangeKm : null,
      randPerLiter: record.amountPaid / record.qtyLiters,
      kmPerLiter: validRange ? rangeKm / record.qtyLiters : null,
      litersPer100Km: validRange ? record.qtyLiters / rangeKm * 100 : null,
    };
  });
}

export function refuelAverages(entries: RefuelEntry[]) {
  const amount = entries.reduce((sum, entry) => sum + entry.amountPaid, 0);
  const litres = entries.reduce((sum, entry) => sum + entry.qtyLiters, 0);
  const ranged = entries.filter((entry) => entry.rangeKm !== null);
  const rangedKm = ranged.reduce((sum, entry) => sum + (entry.rangeKm ?? 0), 0);
  const rangedLitres = ranged.reduce((sum, entry) => sum + entry.qtyLiters, 0);
  return {
    randPerLiter: litres > 0 ? amount / litres : null,
    kmPerLiter: rangedLitres > 0 ? rangedKm / rangedLitres : null,
    litersPer100Km: rangedKm > 0 ? rangedLitres / rangedKm * 100 : null,
    totalRangeKm: rangedKm,
    totalSpent: amount,
    totalLitres: litres,
  };
}

export function refuelLifetimeSummary(entries: RefuelEntry[]) {
  const averages = refuelAverages(entries);
  const rangedCount = entries.filter((entry) => entry.rangeKm !== null).length;
  const activeMonths = new Set(entries.map((entry) => entry.dop.slice(0, 7))).size;
  return {
    lifetimeTotalSpent: averages.totalSpent,
    lifetimeTotalRangeKm: averages.totalRangeKm,
    lifetimeTotalLitres: averages.totalLitres,
    lifetimeRefuelCount: entries.length,
    lifetimeAverageMonthlySpend: activeMonths ? averages.totalSpent / activeMonths : null,
    lifetimeAverageRangeKm: rangedCount ? averages.totalRangeKm / rangedCount : null,
    lifetimeAveragePricePerLiter: averages.randPerLiter,
    lifetimeAverageKmPerLiter: averages.kmPerLiter,
    lifetimeAverageLitersPer100Km: averages.litersPer100Km,
  };
}
