import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';

@Component({
  imports: [IonIcon, RouterLink],
  selector: 'app-fuel-consumptions',
  templateUrl: './fuel-consumptions.html',
})
export class FuelConsumptions {
  readonly refuels = inject(RefuelStore);
  readonly vehicles = inject(VehicleStore);
  readonly vehicleDropdownOpen = signal(false);
  private readonly vehicleDropdown = viewChild<ElementRef<HTMLElement>>('vehicleDropdown');

  @HostListener('document:click', ['$event'])
  closeVehicleDropdownOnOutsideClick(event: MouseEvent): void {
    if (!this.vehicleDropdown()?.nativeElement.contains(event.target as Node)) {
      this.vehicleDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeVehicleDropdown(): void {
    this.vehicleDropdownOpen.set(false);
  }

  selectVehicle(id: string): void {
    this.refuels.selectVehicle(id);
    this.vehicleDropdownOpen.set(false);
  }

  money(value: number | null): string {
    return value === null ? '—' : `R${value.toFixed(2)}`;
  }

  number(value: number | null, digits = 1): string {
    return value === null ? '—' : value.toFixed(digits);
  }

  date(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  barHeight(value: number, maximum: number): string {
    return `${Math.max(12, Math.round(value / maximum * 100))}%`;
  }
}
