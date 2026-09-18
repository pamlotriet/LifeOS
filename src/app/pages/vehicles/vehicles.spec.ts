import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Vehicles } from './vehicles';

describe('Vehicles', () => {
  let component: Vehicles;
  let fixture: ComponentFixture<Vehicles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vehicles],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Vehicles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
