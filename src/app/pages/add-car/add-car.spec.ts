import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AddCar } from './add-car';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';

describe('AddCar', () => {
  let component: AddCar;
  let fixture: ComponentFixture<AddCar>;
  let addVehicle: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    addVehicle = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AddCar],
      providers: [provideRouter([]), { provide: VehicleStore, useValue: { add: addVehicle } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not save an incomplete vehicle', () => {
    component.submit();

    expect(component.vehicleForm.invalid).toBe(true);
    expect(addVehicle).not.toHaveBeenCalled();
  });

  it('saves a valid vehicle and returns to the list', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.vehicleForm.patchValue({
      make: ' Toyota ',
      model: ' Corolla ',
      year: '2024',
      fuelType: 'Petrol',
      odometer: 12500,
    });

    component.submit();

    expect(addVehicle).toHaveBeenCalledWith(
      expect.objectContaining({ make: 'Toyota', model: 'Corolla', year: '2024', odometer: 12500 }),
    );
    expect(navigate).toHaveBeenCalledWith('/fuel/vehicles');
  });
});
