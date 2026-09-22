import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { VehicleService } from './vehicle.service';

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
  photoStoragePath?: string | null;
}

export interface VehicleListItem {
  id: string;
  name: string;
  description: string;
  registration: string;
  consumption: string | null;
  image: string | null;
}

@Injectable({ providedIn: 'root' })
export class VehicleStore {
  private readonly auth = inject(AuthService);
  private readonly service = inject(VehicleService);
  private readonly saved = signal<VehicleRecord[]>([]);
  private loadVersion = 0;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly vehicles = computed<VehicleListItem[]>(() =>
    this.saved().map((vehicle) => ({
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model}`,
      description: `${vehicle.year} · ${vehicle.fuelType}`,
      registration: vehicle.registration || 'No registration',
      consumption: null,
      image: vehicle.photoUrl,
    })),
  );

  constructor() {
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        this.saved.set([]);
        this.error.set('');
        if (uid) void this.load(uid);
        else {
          this.loadVersion++;
          this.loading.set(false);
        }
      });
    });
  }

  async reload(): Promise<void> {
    const uid = this.auth.userId();
    if (uid) await this.load(uid);
  }

  async add(vehicle: Omit<VehicleRecord, 'id'>): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) throw new Error('Sign in to add a vehicle.');
    const saved = await this.service.add(vehicle);
    if (this.auth.userId() === uid) this.saved.update((vehicles) => [saved, ...vehicles]);
  }

  private async load(uid: string): Promise<void> {
    const version = ++this.loadVersion;
    const existingIds = new Set(this.saved().map((vehicle) => vehicle.id));
    this.loading.set(true);
    this.error.set('');
    try {
      const vehicles = await this.service.list(uid);
      if (version === this.loadVersion && this.auth.userId() === uid) {
        const loadedIds = new Set(vehicles.map((vehicle) => vehicle.id));
        this.saved.update((current) => {
          const next = [
            ...current.filter((vehicle) => !existingIds.has(vehicle.id) && !loadedIds.has(vehicle.id)),
            ...vehicles,
          ];
          return next;
        });
      }
    } catch (error) {
      if (version === this.loadVersion) {
        console.error('Could not load vehicles', error);
        this.error.set('Could not load vehicles. Please try again.');
      }
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }
}
