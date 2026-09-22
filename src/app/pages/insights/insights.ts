import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';

@Component({ selector: 'app-insights', imports: [IonIcon], templateUrl: './insights.html' })
export class Insights {
  readonly refuels = inject(RefuelStore);
  readonly vehicles = inject(VehicleStore);
  readonly vehicleDropdownOpen = signal(false);
  private readonly vehicleDropdown = viewChild<ElementRef<HTMLElement>>('vehicleDropdown');

  readonly recentConsumption = computed(() => this.refuels.entries()
    .filter((entry) => entry.litersPer100Km !== null)
    .sort((a, b) => a.dop.localeCompare(b.dop) || a.odometer - b.odometer).slice(-6));
  readonly trendPoints = computed(() => {
    const entries = this.recentConsumption();
    const max = Math.max(10, ...entries.map((entry) => entry.litersPer100Km ?? 0));
    return entries.map((entry, index) => ({
      id: entry.id, date: entry.dop, value: entry.litersPer100Km!,
      x: entries.length === 1 ? 50 : 8 + index * 84 / (entries.length - 1),
      y: 88 - entry.litersPer100Km! / max * 76,
    }));
  });
  readonly trendLine = computed(() => this.trendPoints().map((point) => `${point.x},${point.y}`).join(' '));
  readonly trendDirection = computed(() => {
    const points = this.trendPoints();
    if (points.length < 2) return null;
    const change = points.at(-1)!.value - points[0].value;
    return Math.abs(change) < 0.05 ? 'Stable' : change < 0 ? 'Improving' : 'Increasing';
  });
  readonly monthlySpend = computed(() => {
    const grouped = new Map<string, number>();
    for (const entry of this.refuels.entries()) {
      const month = entry.dop.slice(0, 7);
      grouped.set(month, (grouped.get(month) ?? 0) + entry.amountPaid);
    }
    return [...grouped].sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([month, value]) => ({ month, value, label: this.shortDate(`${month}-01`) }));
  });
  readonly maxMonthlySpend = computed(() => Math.max(1, ...this.monthlySpend().map((month) => month.value)));
  readonly latestMonth = computed(() => this.monthlySpend().at(-1) ?? null);
  readonly spendChange = computed(() => {
    const months = this.monthlySpend();
    if (months.length < 2 || months.at(-2)!.value === 0) return null;
    return (months.at(-1)!.value / months.at(-2)!.value - 1) * 100;
  });
  readonly averageRange = computed(() => {
    const valid = this.refuels.entries().filter((entry) => entry.rangeKm !== null);
    return valid.length ? this.refuels.averages().totalRangeKm / valid.length : null;
  });
  readonly averageMonthlySpend = computed(() => {
    const count = new Set(this.refuels.entries().map((entry) => entry.dop.slice(0, 7))).size;
    return count ? this.refuels.averages().totalSpent / count : null;
  });
  readonly bestTank = computed(() => this.refuels.entries().filter((entry) => entry.kmPerLiter !== null)
    .sort((a, b) => (b.kmPerLiter ?? 0) - (a.kmPerLiter ?? 0))[0] ?? null);
  readonly highestPrice = computed(() => [...this.refuels.entries()].sort((a, b) => b.randPerLiter - a.randPerLiter)[0] ?? null);

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (!this.vehicleDropdown()?.nativeElement.contains(event.target as Node)) this.vehicleDropdownOpen.set(false);
  }
  @HostListener('document:keydown.escape')
  closeDropdown(): void { this.vehicleDropdownOpen.set(false); }
  selectVehicle(id: string): void { this.refuels.selectVehicle(id); this.vehicleDropdownOpen.set(false); }
  money(value: number | null): string { return value === null ? '—' : `R${value.toFixed(2)}`; }
  number(value: number | null, digits = 1): string { return value === null ? '—' : value.toFixed(digits); }
  shortDate(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' }); }
  date(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  barHeight(value: number): string { return `${Math.max(3, value / this.maxMonthlySpend() * 100)}%`; }
}
