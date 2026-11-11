import { signal } from '@angular/core';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { GymStore } from '@pages/gym/state/gym/gym.store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BookStore } from '@pages/books/state/book/book-store';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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
      '.featured-space[href="/nutrition"]',
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Calories & macros');
  });

  it('filters spaces by their name', () => {
    component.searchQuery.set('books');
    expect(component.dashboardState.filteredSpaces().map((space) => space.route)).toEqual([
      '/books',
    ]);
    expect(component.dashboardState.featuredSpaces()).toEqual([]);
  });

  it('filters and restores spaces through the reusable search bar', async () => {
    const searchbar = fixture.nativeElement.querySelector('app-search ion-searchbar');
    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'books' } }));
    await fixture.whenStable();
    expect(component.searchQuery()).toBe('books');
    expect(component.dashboardState.filteredSpaces().map((space) => space.route)).toEqual([
      '/books',
    ]);
    expect(component.dashboardState.featuredSpaces()).toEqual([]);

    searchbar.dispatchEvent(new CustomEvent('ionClear'));
    await fixture.whenStable();
    expect(component.searchQuery()).toBe('');
    expect(component.dashboardState.filteredSpaces()).toHaveLength(7);
    expect(component.dashboardState.featuredSpaces()).toHaveLength(2);
  });

  it('shows empty recorded data without sample totals', () => {
    expect(component.dashboardState.calories()).toBe(0);
    expect(component.dashboardState.trainingDays()).toBe(0);
    expect(component.dashboardState.reading()).toBe(0);
    expect(component.dashboardState.overviewMetrics()[0].hint).toBe('home.no_food_logged_today');
  });

  it('updates labels, interpolated totals, search and accessible text from the catalog', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', {
      'home.search_spaces': 'Chercher un espace',
      'home.no_food_logged_today': 'Aucun repas enregistré',
      'home.count_finished_this_month': '{{p0}} livres terminés ce mois',
      'home.books': 'Livres',
      'home.read_more': 'Lire davantage',
      'home.clear_search': 'Effacer la recherche',
    });
    translate.use('fr');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Aucun repas enregistré');
    expect(fixture.nativeElement.textContent).toContain('0 livres terminés ce mois');
    const input = fixture.nativeElement.querySelector('input');
    await vi.waitFor(() => {
      expect(input.placeholder).toBe('Chercher un espace');
      expect(input.getAttribute('aria-label')).toBe('Chercher un espace');
    });
    component.searchQuery.set('livres');
    await fixture.whenStable();
    expect(component.dashboardState.filteredSpaces().map((space) => space.route)).toEqual([
      '/books',
    ]);
    component.searchQuery.set('no matching space');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.home-empty button').textContent).toContain(
      'Effacer la recherche',
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
