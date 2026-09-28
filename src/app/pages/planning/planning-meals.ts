import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { GroceryItem } from '../../shared/state/planning/planning.model';
import { PlanningStore } from '../../shared/state/planning/planning-store';

@Component({ selector: 'app-planning-meals', imports: [IonContent, IonIcon, FormsModule, PageHeader], templateUrl: './planning-meals.html', styleUrl: './planning.css' })
export class PlanningMeals {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(PlanningStore); readonly tab = signal<'meals'|'groceries'>(this.route.snapshot.fragment === 'groceries' ? 'groceries' : 'meals'); readonly week = week(); readonly mealTitle = signal(''); readonly mealDetail = signal(''); readonly selectedDate = signal(this.week[0].iso); readonly groceryName = signal(''); readonly grocerySection = signal('Produce');
  readonly groceriesBySection = computed(() => {
    const groups = new Map<string, GroceryItem[]>();
    for (const item of this.store.groceries()) {
      const section = item.section || 'Other';
      groups.set(section, [...(groups.get(section) ?? []), item]);
    }
    return [...groups.entries()];
  });
  meal(date: string) { return this.store.meals().find((item) => item.date === date); }
  async addMeal(): Promise<void> { if (!this.mealTitle().trim()) return; const current = this.meal(this.selectedDate()); await this.store.saveMeal({ date: this.selectedDate(), title: this.mealTitle(), detail: this.mealDetail() }, current?.id); this.mealTitle.set(''); this.mealDetail.set(''); }
  async addGrocery(): Promise<void> { if (!this.groceryName().trim()) return; await this.store.saveGrocery({ name: this.groceryName(), section: this.grocerySection(), checked: false }); this.groceryName.set(''); }
  choose(date: string): void { this.selectedDate.set(date); const item=this.meal(date); this.mealTitle.set(item?.title ?? ''); this.mealDetail.set(item?.detail ?? ''); }
}
function week() { return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1+i);return {iso:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,day:d.toLocaleDateString('en-US',{weekday:'short'}),number:d.getDate()};}); }
