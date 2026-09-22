import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FuelHistory } from './fuel-history';

describe('FuelHistory', () => {
  let component: FuelHistory;
  let fixture: ComponentFixture<FuelHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(FuelHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
