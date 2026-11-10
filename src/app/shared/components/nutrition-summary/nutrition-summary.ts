import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
import {
  RecipeNutritionSummary,
  nutritionLabel,
} from '../../../pages/nutrition/state/nutrition.model';
@Component({
  imports: [TranslatePipe],
  selector: 'app-nutrition-summary',
  template: ` <section
    class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2"
    [attr.aria-label]="'Recipe nutrition' | translate"
  >
    <p>
      <strong>{{ 'Per serving:' | translate }}</strong>
      {{ label(summary().perServing) | translate }}
    </p>
    <p>
      <strong>{{ 'Entire recipe:' | translate }}</strong> {{ label(summary().total) | translate }}
    </p>
    @for (key of extras; track key) {
      @if (summary().perServing[key] !== undefined) {
        <small class="block">{{
          'messages.count_per_serving_count_count_8d80b9'
            | translate
              : {
                  p0: key,
                  p1: summary().perServing[key]?.toFixed(1),
                  p2: key === 'sodium' ? 'mg' : 'g',
                }
        }}</small>
      }
    }
    @if (!summary().complete) {
      <p role="status">
        {{ 'Incomplete nutrition. Totals include calculated ingredients only.' | translate }}
      </p>
      @for (issue of summary().issues; track $index) {
        <small class="block">{{ issue }}</small>
      }
    }
  </section>`,
})
export class NutritionSummary {
  readonly summary = input.required<RecipeNutritionSummary>();
  readonly label = nutritionLabel;
  readonly extras = ['fibre', 'sugar', 'saturatedFat', 'sodium'] as const;
}
