import { Component, computed, inject, signal } from '@angular/core';
import { NutritionService } from '../../../state/nutrition/nutrition.service';
import { GymStore } from '../../../state/gym/gym.store';
import { BudgetStore } from '../../../state/budget/budget.store';
import { BookStore } from '../../../state/books/book-store';
import { PlanningStore } from '../../../state/planning/planning-store';
import { VehicleStore } from '../../../state/vehicles/vehicle-store';
import { money, summary } from '../../../state/budget/budget.model';
import { localDate } from '../../../state/nutrition/nutrition.model';
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
  searchOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [IonContent, IonIcon, RouterLink],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly nutrition = inject(NutritionService);
  readonly gym = inject(GymStore);
  readonly budget = inject(BudgetStore);
  readonly books = inject(BookStore);
  readonly planning = inject(PlanningStore);
  readonly vehicles = inject(VehicleStore);
  readonly query = signal('');
  readonly isoToday = localDate();
  readonly calories = computed(() =>
    this.nutrition
      .logs()
      .filter((log) => log.date === this.isoToday)
      .reduce((sum, log) => sum + log.nutrition.calories, 0),
  );
  readonly calorieGoal = computed(() => this.nutrition.profile().targets.calories);
  readonly trainingDays = computed(
    () => new Set(this.gym.entries().map((entry) => entry.day)).size,
  );
  readonly reading = computed(
    () => this.books.books().filter((book) => book.status === 'Reading').length,
  );
  readonly balance = computed(
    () => summary(this.budget.monthly(), this.budget.categories()).remaining,
  );
  readonly rows = computed(() =>
    ['/budget', '/fuel', '/planning', '/books', '/recipes', '/passwords', '/fuel/vehicles']
      .map((route) => this.items.find((item) => item.route === route)!)
      .filter((item) => this.matches(item)),
  );
  readonly featured = computed(() =>
    this.items.filter((item) => [7, 8].includes(item.id) && this.matches(item)),
  );
  readonly metrics = computed(() => {
    const goal = this.calorieGoal(),
      difference = goal - this.calories();
    const gymToday = this.gym
      .entries()
      .filter((entry) => entry.day === (new Date().getDay() + 6) % 7).length;
    return [
      {
        title: 'Calories',
        value: Math.round(this.calories()).toLocaleString('en-ZA'),
        unit: 'kcal',
        hint: !this.nutrition.logs().some((log) => log.date === this.isoToday)
          ? 'No food logged today'
          : goal > 0
            ? `${Math.round(Math.abs(difference))} ${difference >= 0 ? 'under' : 'over'} goal`
            : 'Set your daily goal',
        route: '/nutrition',
        loading: this.nutrition.loading(),
        error: this.nutrition.error(),
      },
      {
        title: 'Workouts',
        value: String(this.trainingDays()),
        unit: 'planned days',
        hint: gymToday ? `${gymToday} exercises planned today` : 'No workout planned today',
        route: '/gym',
        loading: this.gym.loading(),
        error: this.gym.error(),
      },
      {
        title: 'Budget',
        value: money(this.balance()),
        unit: 'balance',
        hint: 'Recorded income less spending & savings',
        route: '/budget',
        loading: this.budget.loading(),
        error: this.budget.error(),
      },
      {
        title: 'Reading',
        value: String(this.reading()),
        unit: 'in progress',
        hint: `${this.books.books().filter((b) => b.status === 'Finished' && b.finishDate.startsWith(this.isoToday.slice(0, 7))).length} finished this month`,
        route: '/books',
        loading: this.books.loading(),
        error: this.books.error(),
      },
    ];
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
      searchOutline,
      arrowForwardOutline,
    });
  }
  matches(item: { title: string; description: string }): boolean {
    return `${item.title} ${item.description}`
      .toLowerCase()
      .includes(this.query().trim().toLowerCase());
  }
  progress(value: number, goal: number): number {
    return goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  }
  spaceLoading(route: string): boolean {
    if (route === '/budget') return this.budget.loading();
    if (route === '/books') return this.books.loading();
    if (route === '/planning') return this.planning.loading();
    if (route === '/fuel/vehicles') return this.vehicles.loading();
    return false;
  }
  detail(route: string): string {
    if (route === '/budget')
      return this.budget.loading()
        ? 'Loading balance...'
        : this.budget.error()
          ? 'Open budget'
          : `${money(this.balance())} balance`;
    if (route === '/books')
      return this.books.loading()
        ? 'Loading library...'
        : this.books.error()
          ? 'Open library'
          : `${this.reading()} in progress`;
    if (route === '/planning')
      return this.planning.loading()
        ? 'Loading plans...'
        : this.planning.error()
          ? 'Open planning'
          : `${this.planning.meals().filter((meal) => meal.date >= this.isoToday).length} planned meals`;
    if (route === '/fuel/vehicles')
      return this.vehicles.loading()
        ? 'Loading vehicles...'
        : this.vehicles.error()
          ? 'Open vehicles'
          : `${this.vehicles.vehicles().length} vehicles`;
    return '';
  }
  readonly today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  readonly items = [
    {
      title: 'Calories & macros',
      description: 'Log food & track daily nutrition',
      icon: 'restaurant-outline',
      iconBackground: 'bg-emerald-500',
      iconColor: 'text-white',
      accent: 'emerald',
      id: 8,
      route: '/nutrition',
    },
    {
      title: 'Gym',
      description: 'Exercises & weekly workouts',
      icon: 'barbell',
      iconBackground: 'bg-violet-500',
      iconColor: 'text-white',
      accent: 'violet',
      id: 7,
      route: '/gym',
    },
    {
      title: 'Fuel',
      description: 'Track fuel costs',
      icon: 'car',
      iconBackground: 'bg-gradient-to-br from-rose-400 to-orange-500',
      iconColor: 'text-white',
      accent: 'rose',
      id: 0,
      route: '/fuel',
    },
    {
      title: 'Budget',
      description: 'Manage money',
      icon: 'wallet',
      iconBackground: 'bg-gradient-to-br from-emerald-300 to-emerald-500',
      iconColor: 'text-slate-900',
      accent: 'emerald',
      id: 1,
      route: '/budget',
    },
    {
      title: 'Books',
      description: 'Read more',
      icon: 'book',
      iconBackground: 'bg-gradient-to-br from-violet-400 to-purple-600',
      iconColor: 'text-white',
      accent: 'violet',
      id: 2,
      route: '/books',
    },
    {
      title: 'Planning',
      description: 'Meals, ingredients & groceries',
      icon: 'calendar',
      iconBackground: 'bg-gradient-to-br from-sky-300 to-blue-500',
      iconColor: 'text-slate-900',
      accent: 'sky',
      id: 3,
      route: '/planning',
    },
    {
      title: 'Passwords',
      description: 'Stay secure',
      icon: 'lock-closed',
      iconBackground: 'bg-gradient-to-br from-fuchsia-400 to-pink-500',
      iconColor: 'text-slate-900',
      accent: 'pink',
      id: 4,
      route: '/passwords',
    },
    {
      title: 'Recipes',
      description: 'Cook your favourites',
      icon: 'restaurant-outline',
      iconBackground: 'bg-gradient-to-br from-amber-300 to-orange-500',
      iconColor: 'text-slate-900',
      accent: 'amber',
      id: 5,
      route: '/recipes',
    },
    {
      title: 'Vehicles',
      description: 'Manage your cars',
      icon: 'car',
      iconBackground: 'bg-gradient-to-br from-cyan-300 to-cyan-500',
      iconColor: 'text-slate-900',
      accent: 'cyan',
      id: 6,
      route: '/fuel/vehicles',
    },
  ];

  readonly quickActions = [
    { label: 'Add expense', icon: 'cash', accent: 'emerald', route: '/budget/transactions/add' },
    { label: 'Log refuel', icon: 'car', accent: 'amber', route: '/fuel' },
    { label: 'Scan book', icon: 'scan-outline', accent: 'violet', route: '/books/scan' },
  ];
}
