import { signal } from '@angular/core';
import { NutritionService } from '../../../state/nutrition/nutrition.service';
import { GymStore } from '../../../state/gym/gym.store';
import { BudgetStore } from '../../../state/budget/budget.store';
import { BookStore } from '../../../state/books/book-store';
import { PlanningStore } from '../../../state/planning/planning-store';
import { VehicleStore } from '../../../state/vehicles/vehicle-store';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]),
        {provide:NutritionService,useValue:{logs:signal([]),profile:signal({targets:{calories:2000}}),loading:signal(false),error:signal(null)}},
        {provide:GymStore,useValue:{entries:signal([]),loading:signal(false),error:signal(null)}},
        {provide:BudgetStore,useValue:{monthly:signal([]),categories:signal([]),loading:signal(false),error:signal(null)}},
        {provide:BookStore,useValue:{books:signal([]),loading:signal(false),error:signal(null)}},
        {provide:PlanningStore,useValue:{events:signal([]),reminders:signal([]),loading:signal(false),error:signal(null)}},
        {provide:VehicleStore,useValue:{vehicles:signal([]),loading:signal(false),error:signal(null)}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('opens the nutrition tracker directly from Home', () => {
    const link = fixture.nativeElement.querySelector('.featured-space[href="/nutrition"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Calories & macros');
  });

  it('filters spaces by their name', () => {
    component.query.set('books');
    expect(component.rows().map(item=>item.route)).toEqual(['/books']);
    expect(component.featured()).toEqual([]);
  });

  it('shows empty recorded data without sample totals', () => {
    expect(component.calories()).toBe(0);
    expect(component.trainingDays()).toBe(0);
    expect(component.reading()).toBe(0);
    expect(component.metrics()[0].hint).toBe('No food logged today');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
