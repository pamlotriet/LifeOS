import { Component, input } from '@angular/core';
import { RecipeNutritionSummary, nutritionLabel } from '../state/nutrition/nutrition.model';
@Component({
  selector: 'app-nutrition-summary',
  template: ` <section
    class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2"
    aria-label="Recipe nutrition"
  >
    <p><strong>Per serving:</strong> {{ label(summary().perServing) }}</p>
    <p><strong>Entire recipe:</strong> {{ label(summary().total) }}</p>
    @for (key of extras; track key) {
      @if (summary().perServing[key] !== undefined) {
        <small class="block">{{ key }} per serving: {{ summary().perServing[key]?.toFixed(1) }} {{ key === 'sodium' ? 'mg' : 'g' }}</small>
      }
    }
    @if (!summary().complete) {
      <p role="status">Incomplete nutrition. Totals include calculated ingredients only.</p>
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
