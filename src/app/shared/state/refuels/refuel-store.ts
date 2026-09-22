import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { VehicleStore } from '../vehicles/vehicle-store';
import { calculateRefuels, RefuelEntry, RefuelInput, RefuelRecord, refuelAverages } from './refuel.model';
import { RefuelService } from './refuel.service';

@Injectable({ providedIn: 'root' })
export class RefuelStore {
  private readonly auth = inject(AuthService);
  private readonly vehicles = inject(VehicleStore);
  private readonly service = inject(RefuelService);
  private readonly records = signal<RefuelRecord[]>([]);
  private loadVersion = 0;

  readonly selectedVehicleId = signal<string | null>(null);
  readonly vehicleOptions = this.vehicles.vehicles;
  readonly selectedVehicle = computed(() => this.vehicleOptions().find((vehicle) => vehicle.id === this.selectedVehicleId()) ?? null);
  readonly entries = computed(() => calculateRefuels(this.records()));
  readonly newestFirst = computed(() => [...this.entries()].sort((a, b) => b.dop.localeCompare(a.dop) || b.odometer - a.odometer));
  readonly averages = computed(() => refuelAverages(this.entries()));
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      const uid = this.auth.userId();
      const options = this.vehicleOptions();
      const selected = this.selectedVehicleId();
      untracked(() => {
        if (!uid) {
          this.loadVersion++;
          this.selectedVehicleId.set(null);
          this.records.set([]);
          this.loading.set(false);
        } else if (options.length && !options.some((vehicle) => vehicle.id === selected)) {
          this.selectedVehicleId.set(options[0].id);
        }
      });
    });

    effect(() => {
      const uid = this.auth.userId();
      const vehicleId = this.selectedVehicleId();
      untracked(() => {
        this.records.set([]);
        this.error.set('');
        if (uid && vehicleId) void this.reload();
        else {
          this.loadVersion++;
          this.loading.set(false);
        }
      });
    });
  }

  selectVehicle(id: string): void {
    if (this.vehicleOptions().some((vehicle) => vehicle.id === id)) this.selectedVehicleId.set(id);
  }

  async reload(): Promise<void> {
    const vehicleId = this.selectedVehicleId();
    const uid = this.auth.userId();
    if (!vehicleId || !uid) return;
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.error.set('');
    try {
      const records = await this.service.list(vehicleId);
      if (version === this.loadVersion && this.auth.userId() === uid && this.selectedVehicleId() === vehicleId) this.records.set(records);
    } catch (error) {
      if (version === this.loadVersion) {
        console.error('Could not load refuels', error);
        this.error.set('Could not load refuels. Please try again.');
      }
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }

  async get(vehicleId: string, id: string): Promise<RefuelRecord> {
    return this.records().find((entry) => entry.vehicleId === vehicleId && entry.id === id)
      ?? this.service.get(vehicleId, id);
  }

  async save(vehicleId: string, input: RefuelInput, id?: string): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) throw new Error('Sign in to save a refuel.');
    const saved = id ? await this.service.update(vehicleId, id, input) : await this.service.add(vehicleId, input);
    if (this.auth.userId() === uid && this.selectedVehicleId() === vehicleId) {
      this.records.update((records) => [...records.filter((entry) => entry.id !== id), saved]);
    }
  }

  async delete(vehicleId: string, id: string): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) throw new Error('Sign in to delete a refuel.');
    await this.service.delete(vehicleId, id);
    if (this.auth.userId() === uid && this.selectedVehicleId() === vehicleId) {
      this.records.update((records) => records.filter((entry) => entry.id !== id));
    }
  }

  isFirst(vehicleId: string, odometer: number, id?: string): boolean {
    if (this.selectedVehicleId() !== vehicleId) return false;
    return this.records().filter((entry) => entry.id !== id).every((entry) => entry.odometer > odometer);
  }

  latest(): RefuelEntry | null {
    return this.newestFirst()[0] ?? null;
  }
}
