import { AppCarousel } from '@shared/components/app-carousel/app-carousel';
import { PasswordStore } from '@pages/passwords/state/vault/password-store';
import { AppSkeleton } from '@shared/components/app-skeleton/app-skeleton';
import { LanguageService } from '@core/i18n/language.service';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { GymStore } from '@pages/gym/state/gym/gym.store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BookStore } from '@pages/books/state/book/book-store';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { money } from '@pages/budget/state/budget/budget.model';
import { localDate } from '@pages/nutrition/state/nutrition/nutrition.model';
import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
  checkmark,
} from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [AppCarousel, TranslatePipe, AppSkeleton, IonContent, IonIcon, RouterLink],
  providers: [HomeStateService],
  selector: 'app-home',
  templateUrl: './home.html',
  host: { class: 'block' },
})
export class Home {
  private readonly currentLanguage = inject(LanguageService).currentLanguage;

  readonly nutrition = inject(NutritionService);
  readonly gym = inject(GymStore);
  readonly budget = inject(BudgetStore);
  readonly books = inject(BookStore);
  readonly planning = inject(PlanningStore);
  readonly vehicles = inject(VehicleStore);
  readonly passwords = inject(PasswordStore);

  readonly todayDate = localDate();
  readonly homeStateService = inject(HomeStateService);

  readonly dashboardState = this.homeStateService.create({
    todayDate: this.todayDate,
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
      checkmark,
    });
  }

  calculateProgressPercentage(value: number, goal: number): number {
    return goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  }

  isSpaceLoading(route: string): boolean {
    if (route === '/passwords') return this.passwords.loading();
    if (route === '/fuel' || route === '/recipes') {
      return !!this.dashboardState.overviewMetrics().find((metric) => metric.route === route)
        ?.loading;
    }
    if (route === '/budget') return this.budget.loading();
    if (route === '/books') return this.books.loading();
    if (route === '/planning') return this.planning.loading();
    if (route === '/fuel/vehicles') return this.vehicles.loading();
    return false;
  }

  getSpaceSummary(route: string): { key: string; params?: Record<string, unknown> } {
    switch (route) {
      case '/fuel':
      case '/recipes': {
        const metric = this.dashboardState.overviewMetrics().find((item) => item.route === route)!;
        return metric.error
          ? { key: 'home.open_this_space_to_retry' }
          : route === '/fuel'
            ? {
                key: 'home.count_fuel_spent',
                params: { p0: metric.value, p1: metric.hintParams?.p0 },
              }
            : { key: 'home.count_saved_recipes', params: { p0: metric.value } };
      }
      case '/passwords':
        return this.passwords.error()
          ? { key: 'home.open_this_space_to_retry' }
          : this.passwords.vault.crypto.unlocked()
            ? { key: 'home.count_saved_passwords', params: { p0: this.passwords.records().length } }
            : { key: 'home.vault_locked' };
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
