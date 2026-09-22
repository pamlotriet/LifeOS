import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';
import { saRegistrationValidator } from '../../shared/validators/sa-registration.validator';
@Component({
  imports: [IonIcon, ReactiveFormsModule],
  selector: 'app-add-car',
  styleUrl: './add-car.css',
  templateUrl: './add-car.html',
})
export class AddCar {
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly vehicleStore = inject(VehicleStore);

  readonly vehicleForm = this.formBuilder.group({
    make: this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
    model: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/\S/),
    ]),
    year: this.formBuilder.nonNullable.control('', Validators.required),
    registration: this.formBuilder.nonNullable.control('', [
      Validators.required,
      saRegistrationValidator,
    ]),
    fuelType: this.formBuilder.nonNullable.control('', Validators.required),
    tankCapacity: this.formBuilder.control<number | null>(null, Validators.min(0)),
    odometer: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    photoUrl: this.formBuilder.control<string | null>(null),
  });
  readonly photoUrl = toSignal(this.vehicleForm.controls.photoUrl.valueChanges, {
    initialValue: this.vehicleForm.controls.photoUrl.value,
  });
  readonly formStatus = toSignal(this.vehicleForm.statusChanges, {
    initialValue: this.vehicleForm.status,
  });
  readonly submitAttempted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly yearDropdownOpen = signal(false);
  readonly fuelDropdownOpen = signal(false);
  private readonly yearDropdown = viewChild<ElementRef<HTMLElement>>('yearDropdown');
  private readonly fuelDropdown = viewChild<ElementRef<HTMLElement>>('fuelDropdown');
  private readonly latestModelYear = new Date().getFullYear() + 1;
  readonly yearOptions = Array.from({ length: this.latestModelYear - 1899 }, (_, index) =>
    String(this.latestModelYear - index),
  );
  readonly fuelTypes = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];

  @HostListener('document:click', ['$event'])
  closeYearDropdownOnOutsideClick(event: MouseEvent): void {
    if (!this.yearDropdown()?.nativeElement.contains(event.target as Node)) {
      this.yearDropdownOpen.set(false);
    }
    if (!this.fuelDropdown()?.nativeElement.contains(event.target as Node)) {
      this.fuelDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeYearDropdown(): void {
    this.yearDropdownOpen.set(false);
    this.fuelDropdownOpen.set(false);
  }

  selectYear(year: string): void {
    this.vehicleForm.controls.year.setValue(year);
    this.vehicleForm.controls.year.markAsTouched();
    this.yearDropdownOpen.set(false);
  }

  selectFuelType(fuelType: string): void {
    this.vehicleForm.controls.fuelType.setValue(fuelType);
    this.vehicleForm.controls.fuelType.markAsTouched();
    this.fuelDropdownOpen.set(false);
  }

  async submit(): Promise<void> {
    if (this.saving()) return;
    this.submitAttempted.set(true);
    this.vehicleForm.markAllAsTouched();
    if (this.vehicleForm.invalid) return;

    const value = this.vehicleForm.getRawValue();
    if (value.odometer === null) return;

    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.vehicleStore.add({
        make: value.make.trim(),
        model: value.model.trim(),
        year: value.year,
        registration: value.registration.trim().toUpperCase().replace(/\s+/g, ' '),
        fuelType: value.fuelType,
        tankCapacity: value.tankCapacity,
        odometer: value.odometer,
        photoUrl: value.photoUrl,
      });
      await this.router.navigateByUrl('/fuel/vehicles');
    } catch (error) {
      console.error('Could not save vehicle', error);
      this.saveError.set(error instanceof Error ? error.message : 'Could not save vehicle. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/fuel/vehicles');
  }

  pickMedia = async () => {
    try {
      const { results } = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: false,
      });

      const selectedPhoto = results[0];
      if (selectedPhoto?.webPath) {
        this.vehicleForm.controls.photoUrl.setValue(selectedPhoto.webPath);
      }
    } catch (e) {
      const error = e as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('chooseFromGallery failed:', message);
    }
  };
}
