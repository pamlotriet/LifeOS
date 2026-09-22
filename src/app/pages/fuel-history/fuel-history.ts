import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';

@Component({
  imports: [IonIcon, RouterLink, AppSelect, AppDatePicker],
  selector: 'app-fuel-history',
  styleUrl: './fuel-history.css',
  templateUrl: './fuel-history.html',
})
export class FuelHistory {
  readonly refuels = inject(RefuelStore);
  readonly selectedDate = signal('');
  readonly page = signal(1);
  readonly pageSize = 5;
  readonly vehicleOptions = computed(() => this.refuels.vehicleOptions().map((vehicle) => ({
    value: vehicle.id, label: vehicle.name, description: `${vehicle.description} · ${vehicle.registration}`, image: vehicle.image,
  })));
  readonly filteredEntries = computed(() => {
    const selectedDate = this.selectedDate();
    return this.refuels.newestFirst().filter((entry) => !selectedDate || entry.dop === selectedDate);
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEntries().length / this.pageSize)));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly visibleEntries = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEntries().slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      this.refuels.selectedVehicleId();
      this.selectedDate();
      untracked(() => this.page.set(1));
    });
  }

  setDate(value: string): void {
    this.selectedDate.set(value);
  }

  previousPage(): void {
    this.page.set(Math.max(1, this.currentPage() - 1));
  }

  nextPage(): void {
    this.page.set(Math.min(this.totalPages(), this.currentPage() + 1));
  }

  date(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  number(value: number | null, digits = 1): string {
    return value === null ? '—' : value.toFixed(digits);
  }
}
