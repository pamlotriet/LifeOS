import { PasswordStore } from '@pages/passwords/state/vault/password-store';
import { RefuelStore } from '@pages/fuel/state/refuel/refuel-store';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { signal } from '@angular/core';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { GymStore } from '@pages/gym/state/gym/gym.store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BookStore } from '@pages/books/state/book/book-store';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from '@pages/home/home';
import { TranslateService } from '@ngx-translate/core';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  afterEach(() => TestBed.inject(TranslateService).use('en'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: PasswordStore,
          useValue: {
            records: signal([]),
            vault: { crypto: { unlocked: signal(false) } },
            loading: signal(false),
            error: signal(''),
          },
        },
        {
          provide: RefuelStore,
          useValue: {
            entries: signal([]),
            selectedVehicle: signal(null),
            loading: signal(false),
            error: signal(''),
          },
        },
        {
          provide: RecipeStore,
          useValue: { recipes: signal([]), loading: signal(false), error: signal('') },
        },
        {
          provide: NutritionService,
          useValue: {
            logs: signal([]),
            profile: signal({ targets: { calories: 2000 } }),
            loading: signal(false),
            error: signal(null),
          },
        },
        {
          provide: GymStore,
          useValue: { entries: signal([]), loading: signal(false), error: signal(null) },
        },
        {
          provide: BudgetStore,
          useValue: {
            monthly: signal([]),
            categories: signal([]),
            loading: signal(false),
            error: signal(null),
          },
        },
        {
          provide: BookStore,
          useValue: { books: signal([]), loading: signal(false), error: signal(null) },
        },
        {
          provide: PlanningStore,
          useValue: { meals: signal([]), loading: signal(false), error: signal(null) },
        },
        {
          provide: VehicleStore,
          useValue: { vehicles: signal([]), loading: signal(false), error: signal(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('opens the nutrition tracker directly from Home', () => {
    const link = fixture.nativeElement.querySelector(
      '.metric-card[href="/nutrition"]',
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Calories');
    expect(link.querySelector('progress')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.featured-spaces')).toBeNull();
  });

  it('shows empty recorded data without sample totals', () => {
    expect(component.dashboardState.calories()).toBe(0);
    expect(component.dashboardState.trainingDays()).toBe(0);
    expect(component.dashboardState.reading()).toBe(0);
    expect(component.dashboardState.overviewMetrics()[0].hint).toBe('home.no_food_logged_today');
  });

  it('shows reusable placeholders while metrics load and replaces them with data', async () => {
    const nutrition = TestBed.inject(NutritionService);
    (nutrition.loading as ReturnType<typeof signal<boolean>>).set(true);
    await fixture.whenStable();
    const calorieCard = fixture.nativeElement.querySelector('.metric-card');
    expect(calorieCard.getAttribute('aria-busy')).toBe('true');
    expect(calorieCard.querySelectorAll('app-skeleton[aria-hidden="true"]')).toHaveLength(2);
    expect(calorieCard.querySelector('.sr-only').textContent).toContain('Loading Calories');
    expect(calorieCard.querySelector('.metric-value')).toBeNull();

    (nutrition.loading as ReturnType<typeof signal<boolean>>).set(false);
    await fixture.whenStable();
    expect(calorieCard.querySelector('app-skeleton')).toBeNull();
    expect(calorieCard.querySelector('.metric-value')).toBeTruthy();
  });

  it('updates labels and interpolated totals from the catalog', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', {
      'home.no_food_logged_today': 'Aucun repas enregistré',
      'home.count_finished_this_month': '{{p0}} livres terminés ce mois',
      'home.books': 'Livres',
      'home.read_more': 'Lire davantage',
    });
    translate.use('fr');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Aucun repas enregistré');
    expect(fixture.nativeElement.textContent).toContain('0 livres terminés ce mois');
    expect(fixture.nativeElement.querySelector('app-search')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.space-row')).toHaveLength(7);
  });

  it('provides metrics for all spaces except passwords', () => {
    const metrics = component.dashboardState.overviewMetrics();
    for (const space of component.homeStateService.spaceLinks.filter(
      (space) => space.route !== '/passwords',
    )) {
      expect(metrics.some((metric) => metric.route === space.route)).toBe(true);
    }
    expect(metrics.some((metric) => metric.route === '/passwords')).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.metric-card')).toHaveLength(8);
    expect(fixture.nativeElement.querySelector('.space-row[href="/passwords"]')).toBeTruthy();
  });

  it('shows a summary for every space, including a locked vault', () => {
    for (const space of component.dashboardState.spaces) {
      const summary = fixture.nativeElement.querySelector(
        `.space-row[href="${space.route}"] small`,
      );
      expect(summary.textContent.trim()).not.toBe('');
    }
    expect(component.getSpaceSummary('/passwords').key).toBe('home.vault_locked');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
