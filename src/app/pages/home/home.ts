import { LanguageService } from '@core/i18n/language.service';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { GymStore } from '@pages/gym/state/gym/gym.store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BookStore } from '@pages/books/state/book/book-store';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { money } from '@pages/budget/state/budget/budget.model';
import { localDate } from '@pages/nutrition/state/nutrition/nutrition.model';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AppSearch } from '@shared/components/app-search/app-search';
import { HomeStateService } from '@pages/home/state/dashboard/home-state.service';
import { addIcons } from 'ionicons';
import {
  restaurantOutline,
  barbell,
  wallet,
  car,
  calendar,
  book,
  lockClosed,
  scanOutline,
  cash,
  checkmark,
} from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [TranslatePipe, AppSearch, IonContent, IonIcon, RouterLink],
  providers: [HomeStateService],
  selector: 'app-home',
  templateUrl: './home.html',
  host: { class: 'block' },
})
export class Home {
  private readonly translations = inject(TranslateService);
  private readonly currentLanguage = inject(LanguageService).currentLanguage;

  readonly nutrition = inject(NutritionService);
  readonly gym = inject(GymStore);
  readonly budget = inject(BudgetStore);
  readonly books = inject(BookStore);
  readonly planning = inject(PlanningStore);
  readonly vehicles = inject(VehicleStore);

  readonly searchQuery = signal('');
  readonly todayDate = localDate();
  readonly homeStateService = inject(HomeStateService);

  readonly dashboardState = this.homeStateService.create({
    todayDate: this.todayDate,
    matchesSearchQuery: (space) => this.matchesSearchQuery(space),
  });

  constructor() {
    addIcons({
      restaurantOutline,
      barbell,
      wallet,
      car,
      calendar,
      book,
      lockClosed,
      scanOutline,
      cash,
      checkmark,
    });
  }

  matchesSearchQuery(space: { title: string; description: string }): boolean {
    this.currentLanguage();
    return `${this.translations.instant(space.title)} ${this.translations.instant(space.description)}`
      .toLowerCase()
      .includes(this.searchQuery().trim().toLowerCase());
  }

  calculateProgressPercentage(value: number, goal: number): number {
    return goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  }

  isSpaceLoading(route: string): boolean {
    if (route === '/budget') return this.budget.loading();
    if (route === '/books') return this.books.loading();
    if (route === '/planning') return this.planning.loading();
    if (route === '/fuel/vehicles') return this.vehicles.loading();
    return false;
  }

  getSpaceSummary(route: string): { key: string; params?: Record<string, unknown> } {
    switch (route) {
      case '/budget':
        return this.budget.loading()
          ? { key: 'home.loading_balance' }
          : this.budget.error()
            ? { key: 'home.open_budget' }
            : { key: 'home.count_balance', params: { p0: money(this.dashboardState.balance()) } };
      case '/books':
        return this.books.loading()
          ? { key: 'home.loading_library' }
          : this.books.error()
            ? { key: 'home.open_library' }
            : { key: 'home.count_in_progress', params: { p0: this.dashboardState.reading() } };
      case '/planning':
        return this.planning.loading()
          ? { key: 'home.loading_plans' }
          : this.planning.error()
            ? { key: 'home.open_planning' }
            : {
                key: 'home.count_planned_meals',
                params: {
                  p0: this.planning.meals().filter((meal) => meal.date >= this.todayDate).length,
                },
              };
      case '/fuel/vehicles':
        return this.vehicles.loading()
          ? { key: 'home.loading_vehicles' }
          : this.vehicles.error()
            ? { key: 'home.open_vehicles' }
            : { key: 'home.count_vehicles', params: { p0: this.vehicles.vehicles().length } };
      default:
        return { key: '' };
    }
  }

  readonly formattedToday = computed(() =>
    new Intl.DateTimeFormat(this.currentLanguage(), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date()),
  );

  readonly greetingKey = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'home.good_morning';
    if (hour < 17) return 'home.good_afternoon';
    return 'home.good_evening';
  })();
}
