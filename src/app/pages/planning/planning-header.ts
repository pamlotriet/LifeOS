import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButton } from '../../shared/components/back-button/back-button';
@Component({
  selector: 'app-planning-header',
  imports: [RouterLink, BackButton],
  styleUrl: './planning-header.css',
  template: `
    <div class="planning-topbar"><app-back-button fallback="/home" /></div>
    <header><span class="eyebrow">Everyday planning</span><h1>@if (section() === 'ingredients') { Your <span>ingredients</span> } @else if (section() === 'groceries') { Your <span>shopping list</span> } @else { Plan your <span>meals</span> }</h1><p>{{ section() === 'ingredients' ? 'Build a food library for recipes, meals and nutrition.' : section() === 'groceries' ? 'Bring your weekly meals together in one shopping list.' : 'Organise your week, reuse favourites and shop with a plan.' }}</p></header>
    <nav aria-label="Planning sections"><a routerLink="/planning" [attr.aria-current]="section() === 'meals' ? 'page' : null">Meal plan</a><a routerLink="/planning" fragment="groceries" [attr.aria-current]="section() === 'groceries' ? 'page' : null">Shopping list</a><a routerLink="/planning/ingredients" [attr.aria-current]="section() === 'ingredients' ? 'page' : null">Ingredients</a><a routerLink="/recipes">Recipes</a></nav>
  `,
})
export class PlanningHeader { readonly section = input<'meals' | 'groceries' | 'ingredients'>('meals'); }
