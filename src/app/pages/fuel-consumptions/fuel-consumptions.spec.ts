import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FuelConsumptions } from './fuel-consumptions';

describe('FuelConsumptions', () => {
  let component: FuelConsumptions;
  let fixture: ComponentFixture<FuelConsumptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelConsumptions],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FuelConsumptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
