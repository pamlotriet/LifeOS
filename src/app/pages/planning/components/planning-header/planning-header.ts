import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButton } from '../../../../shared/components/back-button/back-button';
@Component({
  selector: 'app-planning-header',
  imports: [TranslatePipe, RouterLink, BackButton],
  styleUrl: './planning-header.css',
  template: `
    <div class="planning-topbar"><app-back-button fallback="/home" /></div>
    <header>
      <span class="eyebrow">{{ 'Everyday planning' | translate }}</span>
      <h1>
        @if (section() === 'ingredients') {
          {{ 'Your' | translate }} <span>{{ 'ingredients' | translate }}</span>
        } @else if (section() === 'groceries') {
          {{ 'Your' | translate }} <span>{{ 'shopping list' | translate }}</span>
        } @else {
          {{ 'Plan your' | translate }} <span>{{ 'meals' | translate }}</span>
        }
      </h1>
      <p>
        {{
          (section() === 'ingredients'
            ? 'Build a food library for recipes, meals and nutrition.'
            : section() === 'groceries'
              ? 'Bring your weekly meals together in one shopping list.'
              : 'Organise your week, reuse favourites and shop with a plan.'
          ) | translate
        }}
      </p>
    </header>
    <nav [attr.aria-label]="'Planning sections' | translate">
      <a routerLink="/planning" [attr.aria-current]="section() === 'meals' ? 'page' : null">{{
        'Meal plan' | translate
      }}</a
      ><a
        routerLink="/planning"
        fragment="groceries"
        [attr.aria-current]="section() === 'groceries' ? 'page' : null"
        >{{ 'Shopping list' | translate }}</a
      ><a
        routerLink="/planning/ingredients"
        [attr.aria-current]="section() === 'ingredients' ? 'page' : null"
        >{{ 'Ingredients' | translate }}</a
      ><a routerLink="/recipes">{{ 'Recipes' | translate }}</a>
    </nav>
  `,
})
export class PlanningHeader {
  readonly section = input<'meals' | 'groceries' | 'ingredients'>('meals');
}
