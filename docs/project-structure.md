# Application structure

```text
src/app/
  shared/
    components/
      app-data-backup/         Full account ZIP download control
      app-input/               Native text, number and multiline fields
      app-button/              Primary, secondary and destructive actions
      app-carousel/            Projected slides, autoplay, desktop arrows and themed scrolling
      app-search/              Ionic search bar with shared styling and signal binding
      app-select/
      app-date-picker/
      app-month-picker/
      app-chart/               Shared Chart.js rendering
      app-skeleton/
      back-button/
      page-header/
      nutrition-summary/
      empty-state/             Translated icon, heading and description for empty lists
    directives/
    utils/
    validators/
  core/
    backups/                   User-scoped export, archive manifest and completeness checks
    authentication/            App-wide authentication and guards
    firebase/                  Firebase configuration and persistence infrastructure
    layout/                    App navigation shell
    navigation/
    refresh/
    theme/
    updates/
  pages/
    books/
      book-form/               Form, modal service, template, styles and tests
      books-library/
      books-shelf/
      finished-books/
      book-tags/
      book-transfer/
      reading-wheel/
      state/                   Book state grouped by responsibility
        book/                  Records, store, persistence and tracking tests
        barcode-scanner/       Camera/photo scanning, decoder and fixtures
        transfer/              Backup import/export and tests
        genres/                Default genre tags
        covers/                Cover and ISBN lookup service
        reading-goal/          Annual goal persistence and tests
    budget/
      finance-export.ts        Selected cycle PDF, CSV and JSON archive (read-only)
      budget-overview/
      budget-account-form/     Dedicated account creation and editing
      budget-transaction-form/
      budget-planned/
      budget-debts/
      budget-categories/
      budget-comparison/
      budget-insights/
      components/              Budget navigation, summary and transactions
        budget-page/           Shared Tailwind page frame and mobile layout rules
        budget-accounts/       Account names, balances and deletion controls
      state/
        budget/
        cycle/
    fuel/
      vehicles/
        add-car/               Add/edit vehicle screen and tests
        state/
          vehicle/             Vehicle state used by all vehicle screens
      refuel-form/
      history/
      consumptions/
      insights/
      fuel-dashboard/
      components/
        fuel-consumption-chart/ Consumption and fuel price panel with metric controls
        fuel-monthly-spend-chart/ Monthly spend panel and recorded totals
        recent-fill-ups/       Latest fill-ups with links to edit their details
      state/
        analytics/             Fuel chart calculations and tests
        refuel/                Refuel models, store, service and tests
      utils/                   Responsive fuel editor presentation
      testing/                 Shared fuel modal test fixtures
    gym/
      components/
      state/
        gym/
        weekly-plan/
    nutrition/
      nutrition-profile/
      nutrition-settings/
      state/
        nutrition/
        calculations/
    passwords/
      password-form/
      password-settings/
      state/
        vault/
        crypto/
        generator/
    planning/
      ingredients/
      planning-meals/
      components/
      state/
        plan/
    recipes/
      components/              Recipe cards and recipe-book export controls
      recipe-form/
      recipe-detail/
      state/
        recipe/
    statistics/
      components/
      state/
        overview/
        books/
        debts/
        vehicles/
    home/
      components/              Overview metric cards and space rows
      state/
        dashboard/             Computed Home metrics and filtered space lists
    more/
```

Feature landing screens can live directly in their feature folder. Additional screens
and reusable feature components each have a folder containing their TypeScript,
template, stylesheet and tests. Group feature state into subfolders by responsibility, keeping tests beside the
code they exercise. Feature state lives with its owning feature even
when another feature consumes its data. Infrastructure and genuinely app-wide
services belong in `core`; `shared/state` has been removed.

`app.routes.ts` contains top-level feature entry points and legacy redirects. It
loads feature route arrays from `pages/<feature>/<feature>.routes.ts` using
`loadChildren`. Tab navigation routes live in `core/layout/tabs-shell/tabs.routes.ts`.
Each route file keeps page components lazy with `loadComponent`; feature paths are
relative to their top-level entry point.

Vehicle state belongs to `fuel/vehicles/state`, rather than `add-car/state`, because
listing, adding, editing, refuelling and statistics use the same vehicle records.
The existing public routes, Firebase collection names and stored data formats are
preserved.

## Central UI controls

Import the standalone component into the consuming component's `imports` array:

```ts
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';
```

Use the aliases in the root `tsconfig.json` for imports between folders:

| Alias             | Directory            |
| ----------------- | -------------------- |
| `@core/*`         | `src/app/core/*`     |
| `@shared/*`       | `src/app/shared/*`   |
| `@pages/*`        | `src/app/pages/*`    |
| `@environments/*` | `src/environments/*` |
| `@app/*`          | `src/app/*`          |
| `@src/*`          | `src/*`              |
| `@public/*`       | `public/*`           |

Use aliases for all application module imports, including same-folder, static,
type-only and lazy imports and test mocks. Template and stylesheet URLs remain
relative to their component. Prefer explicit component imports.

```html
<label for="title">Title</label>
<input appInput id="title" formControlName="title" placeholder="Book title" />
<textarea appInput formControlName="review" aria-label="Review"></textarea>
<button appButton type="submit" [disabled]="saving()">Save</button>
<button appButton="secondary" type="button" (click)="cancel()">Cancel</button>
<button appButton="danger" type="button" (click)="remove()">Delete</button>
```

These are components attached to native controls: labels, numeric value accessors,
reactive forms, `ngModel`, validation, attributes, event bindings and external-form
submit buttons continue to work without an extra wrapper or custom value accessor.
Do not add a separate `AppInput` component tag: use the native input or textarea.

Update `shared/components/app-input/app-input.css` to change the common field
treatment and `app-button/app-button.css` to change common actions. Keep layout
classes such as width and margins on the consuming screen. Avoid copying colours,
borders, padding and focus styles into each template.

Use `appInput="inline"` inside an existing input frame, such as a search field.
The `--app-input-height`, `--app-input-padding`, `--app-input-radius`,
`--app-input-font-size`, `--app-input-background` and `--app-input-border` properties
allow intentional exceptions. File pickers, checkboxes, radio buttons, sliders,
colour pickers and the large reading-position input retain their specialised UI.
Use the existing shared select/date/month components for those controls.

Domain-specific UI belongs in `pages/<feature>/components/<component>/`. Promote
stateless UI used across features into `shared/components/<component>/`; do not
move whole page screens into `shared`. Keep business logic in feature state rather
than shared controls.

Presentational components take signal inputs and emit user actions to their page.
Use `model()` when a form field must remain bound to page state. The page keeps
loading, persistence, filtering, export workflows and error handling. For example,
the vault form emits an unlock action; the Passwords page still owns vault access.

Components such as `a[appRecipeCard]`, `article[appFoodLogRow]` and
`section[appNutritionMealCard]` attach to existing semantic elements. Keep route
bindings and layout classes on these host elements. Their internal styling belongs
with the component; page-scoped styles cannot reach a child's template.

Feature presentation components include finished-book covers and rows, Budget
insight cards, refuel history cards, gym and meal-planning summaries, Home metric
cards and space rows, nutrition progress, meal cards, food rows and recent history,
vault unlock forms and password rows, recipe cards and book export panels, and
book statistics, statistics KPIs and insights. These use `OnPush` change detection.

The book editor also separates its detail hero, owned copies, reading dates,
basics fields and tracking choice. The recipe editor separates basics, photos,
ingredient rows, quick ingredient creation, scaling, method editing and nutrition
totals. Gym day and exercise-library cards emit edit, reorder, copy and removal
actions. Budget separates debt cards and payment rows, comparison totals, category
tables and details, and the planning forecast.

When extracting controls from a template-driven form, forward the parent
`ControlContainer` through `viewProviders` so named controls remain registered with
the original form. Keep native field names and disabled fieldsets intact. Pass the
existing `FormGroup` to reactive field sections; pass asynchronously updated display
values such as matched covers explicitly so `OnPush` views refresh when they change.

## Startup performance

Import Ionic components and controllers from their public individual entry points,
such as `@ionic/angular/ion-content`, `@ionic/angular/modal-controller` and
`@ionic/angular/provide`. This keeps unrelated Ionic controls out of the bootstrap
dependency graph. Use the same entry points in tests to preserve DI token identity.

Firebase application initialization remains synchronous for session restoration.
Optional analytics loads dynamically after application stability, during browser
idle time (with a delayed fallback). Failures must not block startup or sign-in.
Home uses its existing per-card skeletons while feature data loads, rather than
holding the global splash screen until every feature request has completed.

Run `npm.cmd run build:stats`, then `npm.cmd run analyze:bundle` to inspect the
bootstrap's static JavaScript and stylesheet graph. Dynamic route and analytics
chunks are excluded from that total; the active route still downloads its own
dependencies when visited. The service worker retains its existing offline
prefetch behavior.

## Validation

Run `npm.cmd run build` and `npm.cmd test -- --watch=false` after moving files.
Update static and lazy imports, template/style references and test fixture paths
together. A structural refactor must not rename routes or change persisted records.

## Skeleton placeholders

Import `AppSkeleton` from `@shared/components/app-skeleton/app-skeleton`.
Use Tailwind dimensions for individual placeholders; rectangles and circles are
decorative, so keep an accessible loading message on the surrounding region.

```html
<app-skeleton variant="rectangle" class="h-8 w-30" />
<app-skeleton variant="circle" class="size-12" />
```

Existing `list`, `cards`, `grid`, `form` and `chart` variants remain available.
