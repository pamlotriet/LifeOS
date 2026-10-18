import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../shared/state/authentication/authentication.service';
import { FormsModule } from '@angular/forms';
import { NutritionService, defaultProfile } from '../../shared/state/nutrition/nutrition.service';
import { calculateTargets, normalizeProfile } from '../../shared/state/nutrition/nutrition.model';
@Component({
  selector: 'app-nutrition-settings',
  imports: [FormsModule],
  styleUrl: './nutrition-settings.css',
  template: `<section
    class="nutrition-settings rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
  >
    <h2 class="font-bold">Nutrition profile & daily targets</h2>
    <p class="text-sm">
      Daily targets are calculated from your profile and deficit. Calculated fields are read-only. Choose manual entry for any target you want to set yourself. Your details are private to your account.
    </p>
    @if (store.loading()) {
      <p>Loading nutrition settings...</p>
    }
    @if (store.error()) {
      <div class="settings-error" role="alert"><p>{{ store.error() }}</p><button type="button" class="retry-button" (click)="store.reload()">Retry</button></div>
    }
    <form (ngSubmit)="save()" class="space-y-3">
      <label class="block"
        >Name<input class="lifeos-select" name="nutritionName" [value]="auth.displayName()" readonly placeholder="No name on your account"
      /></label>
      <div class="settings-fields">
        <label
          >Age (years)<input
            class="lifeos-select"
            type="number"
            min="18"
            name="age"
            [(ngModel)]="model.age"
        /></label>
        <label
          >Height (cm)<input
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="height"
            [(ngModel)]="model.height"
        /></label>
        <label
          >Weight (kg)<input
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="weight"
            [(ngModel)]="model.weight"
        /></label>
        <label
          >Goal weight (kg)<input
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="goalWeight"
            [(ngModel)]="model.goalWeight"
            placeholder="Blank = maintain weight"
        /></label>
        <label
          >Sex used for calorie estimate<select
            class="lifeos-select"
            name="sex"
            [(ngModel)]="model.sex"
          >
            <option value="">Choose for calculation</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select></label
        >
        <label
          >Activity level<select class="lifeos-select" name="activity" [(ngModel)]="model.activity">
            <option value="sedentary">Sedentary (little exercise)</option>
            <option value="light">Light (1?3 days/week)</option>
            <option value="moderate">Moderate (3?5 days/week)</option>
            <option value="active">Active (6?7 days/week)</option>
          </select></label
        >
        <label>Daily calorie deficit (kcal)
          <input class="lifeos-select" type="number" min="0" step="1" name="calorieDeficit"
            [(ngModel)]="model.calorieDeficit" placeholder="Auto from goal weight" />
          <small>Subtracts from estimated maintenance calories. Enter 0 for maintenance; leave blank to use goal weight. A manual calorie target takes priority.</small>
        </label>
        @for (key of keys; track key) {
          <label class="capitalize"
            >Daily {{ key }} ({{ key === 'calories' ? 'kcal' : 'g' }})
            <input
              class="lifeos-select"
              type="number"
              min="0"
              step="any"
              [name]="'target' + key"
                [attr.aria-label]="'Daily ' + key"
              [readonly]="model.targetOverrides![key] == null"
              [(ngModel)]="model.targetOverrides![key]"
              [placeholder]="preview() ? 'Auto: ' + preview()![key] : 'Auto'"
            />
            @if (preview(); as targets) {
              <small class="block"
                >{{ model.targetOverrides![key] == null ? 'Calculated' : 'Manual' }}:
                {{ targets[key] }} {{ key === 'calories' ? 'kcal' : 'g' }}</small
              >
            }
            <button type="button" class="target-mode" [attr.aria-label]="(model.targetOverrides![key] == null ? 'Set manual ' : 'Calculate ') + key" (click)="toggleTarget(key)">
              {{ model.targetOverrides![key] == null ? 'Set manually' : 'Use calculated target' }}
            </button>
          </label>
        }
      </div>
      @if (calculationError()) {
        <p class="text-sm" role="status">{{ calculationError() }}</p>
      }
      <p class="text-xs text-[var(--text-secondary)]">
        Estimates use the
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
          >Mifflin-St Jeor equation</a
        >
        and your activity level. A lower or higher goal weight adjusts estimated maintenance
        calories by 10% when no deficit is entered. A custom deficit replaces that adjustment. Automatic macros split calorie energy into 25% protein, 45% carbs and 30%
        fat; manual macros leave the remaining calories for automatic fields. These are starting
        estimates for adults.
      </p>
      <button
        type="submit"
        class="primary-button nutrition-save"
        [disabled]="saving() || store.loading() || !!store.error() || !!calculationError()"
      >
        {{ saving() ? 'Saving...' : 'Save nutrition settings' }}
      </button>
    </form>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
  </section>`,
})
export class NutritionSettings {
  readonly store = inject(NutritionService);
  readonly auth = inject(AuthService);
  readonly saving = signal(false);
  readonly message = signal('');
  model = normalizeProfile(defaultProfile());
  readonly keys = ['calories', 'protein', 'carbs', 'fat'] as const;
  constructor() {
    effect(() => {
      this.model = normalizeProfile(structuredClone(this.store.profile()));
    });
  }
  toggleTarget(key: typeof this.keys[number]): void {
    const overrides = this.model.targetOverrides!;
    overrides[key] = overrides[key] == null ? (this.preview()?.[key] ?? 0) : null;
  }
  preview() {
    try {
      return calculateTargets(this.model);
    } catch {
      return null;
    }
  }
  calculationError(): string {
    try {
      calculateTargets(this.model);
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'Check your details.';
    }
  }
  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.message.set('');
    try {
      await this.store.saveProfile({ ...this.model, name: this.auth.displayName() });

    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
