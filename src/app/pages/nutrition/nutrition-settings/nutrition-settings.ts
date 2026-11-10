import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '@core/authentication/authentication.service';
import { FormsModule } from '@angular/forms';
import { NutritionService, defaultProfile } from '@pages/nutrition/state/nutrition.service';
import { calculateTargets, normalizeProfile } from '@pages/nutrition/state/nutrition.model';
@Component({
  selector: 'app-nutrition-settings',
  imports: [TranslatePipe, AppInput, AppButton, FormsModule],
  styleUrl: './nutrition-settings.css',
  template: `<section
    class="nutrition-settings rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
  >
    <h2 class="font-bold">{{ 'Nutrition profile & daily targets' | translate }}</h2>
    <p class="text-sm">
      {{
        'Daily targets are calculated from your profile and deficit. Calculated fields are read-only. Choose manual entry for any target you want to set yourself. Your details are private to your account.'
          | translate
      }}
    </p>
    @if (store.loading()) {
      <p>{{ 'Loading nutrition settings...' | translate }}</p>
    }
    @if (store.error()) {
      <div class="settings-error" role="alert">
        <p>{{ store.error() | translate }}</p>
        <button type="button" class="retry-button" (click)="store.reload()">
          {{ 'Retry' | translate }}
        </button>
      </div>
    }
    <form (ngSubmit)="save()" class="space-y-3">
      <label class="block"
        >{{ 'Name' | translate
        }}<input
          appInput="field"
          class="lifeos-select"
          name="nutritionName"
          [value]="auth.displayName()"
          readonly
          [placeholder]="'No name on your account' | translate"
      /></label>
      <div class="settings-fields">
        <label
          >{{ 'Age (years)' | translate
          }}<input
            appInput="field"
            class="lifeos-select"
            type="number"
            min="18"
            name="age"
            [(ngModel)]="model.age"
        /></label>
        <label
          >{{ 'Height (cm)' | translate
          }}<input
            appInput="field"
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="height"
            [(ngModel)]="model.height"
        /></label>
        <label
          >{{ 'Weight (kg)' | translate
          }}<input
            appInput="field"
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="weight"
            [(ngModel)]="model.weight"
        /></label>
        <label
          >{{ 'Goal weight (kg)' | translate
          }}<input
            appInput="field"
            class="lifeos-select"
            type="number"
            min="1"
            step="any"
            name="goalWeight"
            [(ngModel)]="model.goalWeight"
            [placeholder]="'Blank = maintain weight' | translate"
        /></label>
        <label
          >{{ 'Sex used for calorie estimate' | translate
          }}<select class="lifeos-select" name="sex" [(ngModel)]="model.sex">
            <option value="">{{ 'Choose for calculation' | translate }}</option>
            <option value="female">{{ 'Female' | translate }}</option>
            <option value="male">{{ 'Male' | translate }}</option>
          </select></label
        >
        <label
          >{{ 'Activity level' | translate
          }}<select class="lifeos-select" name="activity" [(ngModel)]="model.activity">
            <option value="sedentary">{{ 'Sedentary (little exercise)' | translate }}</option>
            <option value="light">{{ 'Light (1?3 days/week)' | translate }}</option>
            <option value="moderate">{{ 'Moderate (3?5 days/week)' | translate }}</option>
            <option value="active">{{ 'Active (6?7 days/week)' | translate }}</option>
          </select></label
        >
        <label
          >{{ 'Daily calorie deficit (kcal)' | translate }}
          <input
            appInput="field"
            class="lifeos-select"
            type="number"
            min="0"
            step="1"
            name="calorieDeficit"
            [(ngModel)]="model.calorieDeficit"
            [placeholder]="'Auto from goal weight' | translate"
          />
          <small>{{
            'Subtracts from estimated maintenance calories. Enter 0 for maintenance; leave blank to use goal weight. A manual calorie target takes priority.'
              | translate
          }}</small>
        </label>
        @for (key of keys; track key) {
          <label class="capitalize"
            >{{
              'messages.daily_count_count_a9b9ae'
                | translate: { p0: key, p1: key === 'calories' ? 'kcal' : 'g' }
            }}
            <input
              appInput="field"
              class="lifeos-select"
              type="number"
              min="0"
              step="any"
              [name]="'target' + key"
              [attr.aria-label]="'Daily ' + key | translate"
              [readonly]="model.targetOverrides![key] == null"
              [(ngModel)]="model.targetOverrides![key]"
              [placeholder]="(preview() ? 'Auto: ' + preview()![key] : 'Auto') | translate"
            />
            @if (preview(); as targets) {
              <small class="block"
                >{{ (model.targetOverrides![key] == null ? 'Calculated' : 'Manual') | translate }}:
                {{ targets[key] }} {{ (key === 'calories' ? 'kcal' : 'g') | translate }}</small
              >
            }
            <button
              type="button"
              class="target-mode"
              [attr.aria-label]="
                (model.targetOverrides![key] == null ? 'Set manual ' : 'Calculate ') + key
                  | translate
              "
              (click)="toggleTarget(key)"
            >
              {{
                (model.targetOverrides![key] == null ? 'Set manually' : 'Use calculated target')
                  | translate
              }}
            </button>
          </label>
        }
      </div>
      @if (calculationError()) {
        <p class="text-sm" role="status">{{ calculationError() | translate }}</p>
      }
      <p class="text-xs text-[var(--text-secondary)]">
        {{ 'Estimates use the' | translate }}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
          >{{ 'Mifflin-St Jeor equation' | translate }}</a
        >
        {{
          'and your activity level. A lower or higher goal weight adjusts estimated maintenance calories by 10% when no deficit is entered. A custom deficit replaces that adjustment. Automatic macros split calorie energy into 25% protein, 45% carbs and 30% fat; manual macros leave the remaining calories for automatic fields. These are starting estimates for adults.'
            | translate
        }}
      </p>
      <button
        appButton="primary"
        type="submit"
        class="primary-button nutrition-save"
        [disabled]="saving() || store.loading() || !!store.error() || !!calculationError()"
      >
        {{ (saving() ? 'Saving...' : 'Save nutrition settings') | translate }}
      </button>
    </form>
    @if (message()) {
      <p role="status">{{ message() | translate }}</p>
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
  toggleTarget(key: (typeof this.keys)[number]): void {
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
