import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Vehicles } from './vehicles';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';

describe('Vehicles', () => {
  let component: Vehicles;
  let fixture: ComponentFixture<Vehicles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vehicles],
      providers: [
        provideRouter([]),
        { provide: VehicleStore, useValue: {
          vehicles: signal([]), loading: signal(false), error: signal(''),
          reload: vi.fn(),
        } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Vehicles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows an empty state when Firebase has no vehicles', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No vehicles yet');
  });
});
