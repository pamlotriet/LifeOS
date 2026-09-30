import { Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { RefuelStore } from '../../shared/state/refuels/refuel-store';
import { RefuelInput } from '../../shared/state/refuels/refuel.model';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';

type DecimalInput = number | string | null;

function parseDecimal(value: DecimalInput): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value.trim() === '') return null;
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalMin(minimum: number, required = false): ValidatorFn {
  return (control: AbstractControl<DecimalInput>): ValidationErrors | null => {
    const empty = control.value === null || (typeof control.value === 'string' && control.value.trim() === '');
    if (empty) return required ? { required: true } : null;
    const value = parseDecimal(control.value);
    return value !== null && value >= minimum ? null : { min: { min: minimum, actual: control.value } };
  };
}

@Component({
  selector: 'app-refuel-form',
  imports: [ReactiveFormsModule, IonIcon, AppSelect, AppDatePicker],
  templateUrl: './refuel-form.html',
})
export class RefuelForm {
  private readonly builder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly refuels = inject(RefuelStore);
  readonly entryId = this.route.snapshot.paramMap.get('id');
  readonly routeVehicleId = this.route.snapshot.paramMap.get('vehicleId');
  readonly loading = signal(!!this.entryId);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly confirmDelete = signal(false);
  readonly error = signal('');
  readonly attempted = signal(false);

  readonly form = this.builder.group({
    vehicleId: this.builder.nonNullable.control(this.routeVehicleId ?? this.refuels.selectedVehicleId() ?? '', Validators.required),
    dop: this.builder.nonNullable.control(this.today(), Validators.required),
    pop: this.builder.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
    fuelType: this.builder.nonNullable.control('', Validators.required),
    areaTown: this.builder.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
    odometer: this.builder.control<DecimalInput>(null, decimalMin(0, true)),
    qtyLiters: this.builder.control<DecimalInput>(null, decimalMin(0.001, true)),
    amountPaid: this.builder.control<DecimalInput>(null, decimalMin(0, true)),
    initialRangeKm: this.builder.control<DecimalInput>(null, decimalMin(0.001)),
  });

  readonly fuelTypes = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'ULP 93', 'ULP 95'];
  readonly fuelOptions = this.fuelTypes.map((fuel) => ({ value: fuel, label: fuel }));
  readonly vehicleOptions = computed(() => this.refuels.vehicleOptions().map((vehicle) => ({
    value: vehicle.id, label: vehicle.name, description: `${vehicle.description} · ${vehicle.registration}`, image: vehicle.image,
  })));

  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  constructor() {
    effect(() => {
      const selected = this.refuels.selectedVehicleId();
      if (!this.entryId && selected && !this.form.controls.vehicleId.value) this.form.controls.vehicleId.setValue(selected);
    });
    if (this.entryId && this.routeVehicleId) void this.load(this.routeVehicleId, this.entryId);
  }

  private async load(vehicleId: string, id: string): Promise<void> {
    try {
      const entry = await this.refuels.get(vehicleId, id);
      this.form.patchValue(entry);
      this.refuels.selectVehicle(vehicleId);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load this refuel.');
    } finally {
      this.loading.set(false);
    }
  }

  get pricePerLiter(): number | null {
    const { qtyLiters, amountPaid } = this.form.getRawValue();
    const qty = parseDecimal(qtyLiters);
    const amount = parseDecimal(amountPaid);
    return qty && amount !== null ? amount / qty : null;
  }

  get previewRange(): number | null {
    const { vehicleId, odometer, initialRangeKm } = this.form.getRawValue();
    const currentOdometer = parseDecimal(odometer);
    if (currentOdometer === null) return null;
    const previous = this.refuels.entries()
      .filter((entry) => entry.vehicleId === vehicleId && entry.id !== this.entryId && entry.odometer < currentOdometer)
      .at(-1);
    return previous ? currentOdometer - previous.odometer : parseDecimal(initialRangeKm);
  }

  get previewKmPerLiter(): number | null {
    const qty = parseDecimal(this.form.controls.qtyLiters.value);
    return this.previewRange && qty ? this.previewRange / qty : null;
  }

  get previewLitersPer100Km(): number | null {
    const qty = parseDecimal(this.form.controls.qtyLiters.value);
    return this.previewRange && qty ? qty / this.previewRange * 100 : null;
  }

  number(value: number | null, digits = 2): string {
    return value === null ? '—' : value.toFixed(digits);
  }

  async submit(): Promise<void> {
    if (this.saving() || this.deleting() || this.loading()) return;
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const odometer = parseDecimal(value.odometer);
    const qtyLiters = parseDecimal(value.qtyLiters);
    const amountPaid = parseDecimal(value.amountPaid);
    if (odometer === null || qtyLiters === null || amountPaid === null) return;
    const input: RefuelInput = {
      dop: value.dop,
      pop: value.pop.trim(),
      fuelType: value.fuelType,
      areaTown: value.areaTown.trim(),
      odometer,
      qtyLiters,
      amountPaid,
      initialRangeKm: parseDecimal(value.initialRangeKm),
    };
    this.saving.set(true);
    this.error.set('');
    try {
      await this.refuels.save(value.vehicleId, input, this.entryId ?? undefined);
      this.refuels.selectVehicle(value.vehicleId);
      await this.router.navigateByUrl('/fuel/history');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save the refuel.');
    } finally {
      this.saving.set(false);
    }
  }

  async delete(): Promise<void> {
    if (!this.entryId || !this.routeVehicleId || this.deleting()) return;
    this.deleting.set(true);
    this.error.set('');
    try {
      await this.refuels.delete(this.routeVehicleId, this.entryId);
      await this.router.navigateByUrl('/fuel/history');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not delete the refuel.');
      this.confirmDelete.set(false);
    } finally {
      this.deleting.set(false);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl(this.entryId ? '/fuel/history' : '/fuel');
  }
}
