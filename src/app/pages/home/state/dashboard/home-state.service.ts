import { Injectable, computed, inject } from '@angular/core';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { GymStore } from '@pages/gym/state/gym/gym.store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BookStore } from '@pages/books/state/book/book-store';
import { money, summary } from '@pages/budget/state/budget/budget.model';

@Injectable()
export class HomeStateService {
  private readonly nutrition = inject(NutritionService);
  private readonly gym = inject(GymStore);
  private readonly budget = inject(BudgetStore);
  private readonly books = inject(BookStore);

  create(context: {
    todayDate: string;
    matchesSearchQuery: (space: { title: string; description: string }) => boolean;
  }) {
    const calories = computed(() =>
      this.nutrition
        .logs()
        .filter((log) => log.date === context.todayDate)
        .reduce((sum, log) => sum + log.nutrition.calories, 0),
    );
    const calorieGoal = computed(() => this.nutrition.profile().targets.calories);
    const trainingDays = computed(() => new Set(this.gym.entries().map((entry) => entry.day)).size);
    const reading = computed(
      () => this.books.books().filter((book) => book.status === 'Reading').length,
    );
    const balance = computed(
      () => summary(this.budget.monthly(), this.budget.categories()).remaining,
    );
    const filteredSpaces = computed(() =>
      ['/budget', '/fuel', '/planning', '/books', '/recipes', '/passwords', '/fuel/vehicles']
        .map((route) => this.spaceLinks.find((space) => space.route === route)!)
        .filter((space) => context.matchesSearchQuery(space)),
    );
    const featuredSpaces = computed(() =>
      this.spaceLinks.filter(
        (space) => [7, 8].includes(space.id) && context.matchesSearchQuery(space),
      ),
    );
    const overviewMetrics = computed(() => {
      const goal = calorieGoal(),
        caloriesRemaining = goal - calories();
      const exercisesPlannedTodayCount = this.gym
        .entries()
        .filter((entry) => entry.day === (new Date().getDay() + 6) % 7).length;
      return [
        {
          title: 'home.calories',
          value: Math.round(calories()).toLocaleString('en-ZA'),
          unit: 'home.kcal',
          hint: !this.nutrition.logs().some((log) => log.date === context.todayDate)
            ? 'home.no_food_logged_today'
            : goal > 0
              ? caloriesRemaining >= 0
                ? 'home.count_under_goal'
                : 'home.count_over_goal'
              : 'home.set_your_daily_goal',
          hintParams: { p0: Math.round(Math.abs(caloriesRemaining)) },
          route: '/nutrition',
          loading: this.nutrition.loading(),
          error: this.nutrition.error(),
        },
        {
          title: 'home.workouts',
          value: String(trainingDays()),
          unit: 'home.planned_days',
          hint: exercisesPlannedTodayCount
            ? 'home.count_exercises_planned_today'
            : 'home.no_workout_planned_today',
          hintParams: { p0: exercisesPlannedTodayCount },
          route: '/gym',
          loading: this.gym.loading(),
          error: this.gym.error(),
        },
        {
          title: 'home.budget',
          value: money(balance()),
          unit: 'home.balance',
          hint: 'home.recorded_income_less_spending_savings',
          route: '/budget',
          loading: this.budget.loading(),
          error: this.budget.error(),
        },
        {
          title: 'home.reading',
          value: String(reading()),
          unit: 'home.in_progress',
          hint: 'home.count_finished_this_month',
          hintParams: {
            p0: this.books
              .books()
              .filter(
                (b) =>
                  b.status === 'Finished' && b.finishDate.startsWith(context.todayDate.slice(0, 7)),
              ).length,
          },
          route: '/books',
          loading: this.books.loading(),
          error: this.books.error(),
        },
      ];
    });

    return {
      calories,
      calorieGoal,
      trainingDays,
      reading,
      balance,
      filteredSpaces,
      featuredSpaces,
      overviewMetrics,
    };
  }

  readonly spaceLinks = [
    {
      title: 'home.calories_macros',
      description: 'home.log_food_track_daily_nutrition',
      icon: 'restaurant-outline',
      iconBackground: 'bg-emerald-500',
      iconColor: 'text-white',
      accent: 'emerald',
      id: 8,
      route: '/nutrition',
    },
    {
      title: 'home.gym',
      description: 'home.exercises_weekly_workouts',
      icon: 'barbell',
      iconBackground: 'bg-violet-500',
      iconColor: 'text-white',
      accent: 'violet',
      id: 7,
      route: '/gym',
    },
    {
      title: 'home.fuel',
      description: 'home.track_fuel_costs',
      icon: 'car',
      iconBackground: 'bg-gradient-to-br from-rose-400 to-orange-500',
      iconColor: 'text-white',
      accent: 'rose',
      id: 0,
      route: '/fuel',
    },
    {
      title: 'home.budget',
      description: 'home.manage_money',
      icon: 'wallet',
      iconBackground: 'bg-gradient-to-br from-emerald-300 to-emerald-500',
      iconColor: 'text-slate-900',
      accent: 'emerald',
      id: 1,
      route: '/budget',
    },
    {
      title: 'home.books',
      description: 'home.read_more',
      icon: 'book',
      iconBackground: 'bg-gradient-to-br from-violet-400 to-purple-600',
      iconColor: 'text-white',
      accent: 'violet',
      id: 2,
      route: '/books',
    },
    {
      title: 'home.planning',
      description: 'home.meals_ingredients_groceries',
      icon: 'calendar',
      iconBackground: 'bg-gradient-to-br from-sky-300 to-blue-500',
      iconColor: 'text-slate-900',
      accent: 'sky',
      id: 3,
      route: '/planning',
    },
    {
      title: 'home.passwords',
      description: 'home.stay_secure',
      icon: 'lock-closed',
      iconBackground: 'bg-gradient-to-br from-fuchsia-400 to-pink-500',
      iconColor: 'text-slate-900',
      accent: 'pink',
      id: 4,
      route: '/passwords',
    },
    {
      title: 'home.recipes',
      description: 'home.cook_your_favourites',
      icon: 'restaurant-outline',
      iconBackground: 'bg-gradient-to-br from-amber-300 to-orange-500',
      iconColor: 'text-slate-900',
      accent: 'amber',
      id: 5,
      route: '/recipes',
    },
    {
      title: 'home.vehicles',
      description: 'home.manage_your_cars',
      icon: 'car',
      iconBackground: 'bg-gradient-to-br from-cyan-300 to-cyan-500',
      iconColor: 'text-slate-900',
      accent: 'cyan',
      id: 6,
      route: '/fuel/vehicles',
    },
  ];

  readonly quickActions = [
    {
      label: 'home.add_expense',
      icon: 'cash',
      accent: 'emerald',
      route: '/budget/transactions/add',
    },
    { label: 'home.log_refuel', icon: 'car', accent: 'amber', route: '/fuel' },
    { label: 'home.scan_book', icon: 'scan-outline', accent: 'violet', route: '/books/scan' },
  ];
}
