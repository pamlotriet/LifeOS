import { Component, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  chevronDownOutline,
  chevronBack,
  chevronForward,
  wallet,
  book,
  scanOutline,
} from 'ionicons/icons';
import { provideIonicAngular } from '@ionic/angular/provide';
import { IonApp } from '@ionic/angular/ion-app';
import { AuthService } from '@core/authentication/authentication.service';
import { provideAppTranslations } from '@core/i18n/translation.providers';
import { BudgetDebts } from '@pages/budget/budget-debts/budget-debts';
import { BudgetTransactionForm } from '@pages/budget/budget-transaction-form/budget-transaction-form';
import { BudgetService } from '@pages/budget/state/budget/budget.service';
import { AddBookSheet } from '@pages/books/book-form/add-book-sheet.service';
import { BookStore } from '@pages/books/state/book/book-store';
import { OpenLibraryCoverService } from '@pages/books/state/covers/open-library-cover.service';
import { BookBarcodeScannerService } from '@pages/books/state/barcode-scanner/book-barcode-scanner.service';
import { BookInput, BookRecord } from '@pages/books/state/book/book.model';
import { BooksLibrary } from '@pages/books/books-library/books-library';
import { ReadingGoalService } from '@pages/books/state/reading-goal/reading-goal.service';
import { BudgetOverview } from '@pages/budget/budget-overview/budget-overview';
import { PlanningMeals } from '@pages/planning/planning-meals/planning-meals';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import {
  NutritionService,
  defaultProfile,
} from '@pages/nutrition/state/nutrition/nutrition.service';
import { MealPlanItem, GroceryItem } from '@pages/planning/state/plan/planning.model';
import { AppButton } from '@shared/components/app-button/app-button';
import { protectFormRoutes } from '@core/forms/form-protection.service';
import {
  BudgetTransaction,
  DEFAULT_CATEGORIES,
  TransactionInput,
  validateTransaction,
} from '@pages/budget/state/budget/budget.model';

// Separate entry point: no production config, authentication, analytics or service worker.
class MemoryBudget {
  private transactions: BudgetTransaction[] = [];
  async load() {
    return {
      transactions: structuredClone(this.transactions),
      categories: DEFAULT_CATEGORIES,
      plans: [],
      debts: [
        {
          id: 'fixture-loan',
          name: 'Example loan',
          type: 'loan',
          openingBalance: 1000,
          annualInterestRate: 0,
          openingOverride: null,
        },
      ],
      accounts: [],
      spendingBalances: [],
      cycleStartDay: 1,
    };
  }
  async saveTransaction(input: TransactionInput, id = crypto.randomUUID()) {
    validateTransaction(input);
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (new URLSearchParams(location.search).has('failSave'))
      throw new Error('Fixture payment could not be saved. Retry.');
    const saved = { ...input, id };
    this.transactions = [...this.transactions.filter((item) => item.id !== id), saved];
    return structuredClone(saved);
  }
  async deleteTransaction(id: string) {
    this.transactions = this.transactions.filter((item) => item.id !== id);
  }
  async saveSpendingBalance() {}
  async saveSavingsBalance() {}
}

class MemoryBooks {
  readonly books = signal<BookRecord[]>(
    location.pathname === '/library'
      ? [
          {
            id: 'reading-example',
            title: 'Reading example',
            author: 'Example author',
            status: 'Reading',
            progressMode: 'pages',
            progress: 25,
            pageCount: 200,
            pageProgress: 50,
            copies: [],
            finishDate: '',
            coverUrl: '',
            category: 'Fantasy',
            seriesName: '',
            moodTagIds: [],
            genreTagIds: [],
            isbn: '',
            publicationDate: '',
            rating: 0,
            spiceRating: 0,
            wheelSelected: false,
            favourite: false,
            wouldRecommend: false,
            reread: false,
            seriesNumber: null,
            startDate: '',
            yearRead: null,
            review: '',
          },
        ]
      : [],
  );
  readonly sortedBooks = this.books;
  readonly loading = signal(false);
  readonly error = signal('');
  async reload() {}
  readonly tags = signal([]);
  async saveBook(book: BookInput) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    this.books.update((books) => [...books, { ...book, id: crypto.randomUUID() }]);
  }
  async setReadingPosition(id: string, page: number, count: number) {
    this.books.update((books) =>
      books.map((book) =>
        book.id === id
          ? { ...book, pageProgress: page, progress: Math.round((page / count) * 100) }
          : book,
      ),
    );
  }
}

class MemoryPlanning {
  readonly meals = signal<MealPlanItem[]>([]);
  readonly groceries = signal<GroceryItem[]>([
    { id: 'tomatoes', name: 'Tomatoes', section: 'Produce', checked: false },
  ]);
  readonly loading = signal(false);
  readonly error = signal('');
  async reload() {}
  async saveMeal(input: Omit<MealPlanItem, 'id'>, id = crypto.randomUUID()) {
    this.meals.update((items) => [...items.filter((item) => item.id !== id), { ...input, id }]);
  }
  async saveGrocery(item: GroceryItem) {
    this.groceries.update((items) => [...items.filter((old) => old.id !== item.id), item]);
  }
  async deleteGrocery(id: string) {
    this.groceries.update((items) => items.filter((item) => item.id !== id));
  }
  async toggleGrocery(item: GroceryItem) {
    await this.saveGrocery({ ...item, checked: !item.checked });
  }
}

@Component({
  imports: [AppButton],
  template: `<main style="padding:24px">
    <button appButton (click)="sheet.open()">Add book</button>
    @for (book of store.books(); track $index) {
      <p>{{ book.title }}</p>
    }
  </main>`,
})
class BookModalFixture {
  readonly sheet = inject(AddBookSheet);
  readonly store = inject(BookStore);
}

addIcons({
  calendarOutline,
  chevronDownOutline,
  chevronBack,
  chevronForward,
  wallet,
  book,
  scanOutline,
});

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet /></ion-app>',
})
class BrowserFixtureApp {}

void bootstrapApplication(BrowserFixtureApp, {
  providers: [
    provideIonicAngular({ animated: false }),
    provideAppTranslations(),
    { provide: AuthService, useValue: { userId: signal('browser-fixture-only') } },
    { provide: BudgetService, useClass: MemoryBudget },
    { provide: BookStore, useClass: MemoryBooks },
    { provide: ReadingGoalService, useValue: { get: async () => 12, save: async () => {} } },
    { provide: PlanningStore, useClass: MemoryPlanning },
    {
      provide: RecipeStore,
      useValue: {
        sorted: () => [{ id: 'soup', title: 'Soup' }],
        recipes: () => [{ id: 'soup', title: 'Soup' }],
        loading: () => false,
        error: () => '',
      },
    },
    {
      provide: NutritionService,
      useValue: {
        foods: () => [],
        logs: () => [],
        profile: defaultProfile,
        loading: () => false,
        error: () => '',
      },
    },
    {
      provide: OpenLibraryCoverService,
      useValue: { find: async () => null, lookupByIsbn: async () => null },
    },
    { provide: BookBarcodeScannerService, useValue: { scan: async () => null } },
    provideRouter(
      protectFormRoutes([
        { path: 'budget/debts', component: BudgetDebts },
        { path: 'budget/transactions/add', component: BudgetTransactionForm },
        { path: 'books', component: BookModalFixture },
        { path: 'library', component: BooksLibrary },
        { path: 'budget', component: BudgetOverview },
        { path: 'planning', component: PlanningMeals },
        { path: 'budget/month', redirectTo: 'books' },
        { path: '**', redirectTo: 'budget/debts' },
      ]),
    ),
  ],
});
