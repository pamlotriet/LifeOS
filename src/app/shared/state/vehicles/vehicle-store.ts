import { computed, Injectable, signal } from '@angular/core';

export interface VehicleRecord {
  id: string;
  make: string;
  model: string;
  year: string;
  registration: string;
  fuelType: string;
  tankCapacity: number | null;
  odometer: number;
  photoUrl: string | null;
}

export interface VehicleListItem {
  id: string;
  name: string;
  description: string;
  registration: string;
  consumption: string;
  image: string | null;
}

const storageKey = 'lifeos.vehicles';

const sampleVehicles: VehicleListItem[] = [
  {
    id: 'sample-haval',
    name: 'Haval Jolion',
    description: '1.5T Luxury',
    registration: 'CAA 123 456',
    consumption: '7.6',
    image: '/assets/vehicles/white-suv.png',
  },
  {
    id: 'sample-suzuki',
    name: 'Suzuki Swift',
    description: '1.2 GL',
    registration: 'CAA 987 654',
    consumption: '5.9',
    image: '/assets/vehicles/silver-hatchback.png',
  },
];

@Injectable({ providedIn: 'root' })
export class VehicleStore {
  private readonly saved = signal<VehicleRecord[]>(this.readSaved());

  readonly vehicles = computed<VehicleListItem[]>(() => [
    ...this.saved().map((vehicle) => ({
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model}`,
      description: `${vehicle.year} · ${vehicle.fuelType}`,
      registration: vehicle.registration || 'No registration',
      consumption: '—',
      image: vehicle.photoUrl,
    })),
    ...sampleVehicles,
  ]);

  add(vehicle: Omit<VehicleRecord, 'id'>): void {
    const id = globalThis.crypto?.randomUUID?.() ?? `vehicle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record: VehicleRecord = { ...vehicle, id };
    this.saved.update((vehicles) => [record, ...vehicles]);

    try {
      localStorage.setItem(storageKey, JSON.stringify(this.saved()));
    } catch {
      // Keep the vehicle available for this session when storage is unavailable.
    }
  }

  private readSaved(): VehicleRecord[] {
    try {
      const value = localStorage.getItem(storageKey);
      const records: unknown = value ? JSON.parse(value) : [];
      if (!Array.isArray(records)) return [];
      return records.filter(
        (record): record is VehicleRecord =>
          typeof record === 'object' &&
          record !== null &&
          typeof record.id === 'string' &&
          typeof record.make === 'string' &&
          typeof record.model === 'string' &&
          typeof record.year === 'string' &&
          typeof record.fuelType === 'string' &&
          typeof record.odometer === 'number',
      );
    } catch {
      return [];
    }
  }
}
