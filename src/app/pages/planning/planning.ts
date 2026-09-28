import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PlanningStore } from '../../shared/state/planning/planning-store';

@Component({ selector: 'app-planning', imports: [IonContent, IonIcon, RouterLink], templateUrl: './planning.html', styleUrl: './planning.css' })
export class Planning {
  readonly store = inject(PlanningStore); readonly today = iso(new Date());
  readonly dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  readonly week = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - date.getDay() + 1 + index); return { iso: iso(date), day: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), number: date.getDate() }; });
  readonly todayItems = computed(() => this.store.sortedEvents().filter((item) => item.date === this.today));
  readonly upcoming = computed(() => this.store.sortedEvents().filter((item) => item.date >= this.today).slice(0, 4));
  hasDate(date: string): boolean { return this.store.events().some((item) => item.date === date) || this.store.reminders().some((item) => item.date === date); }
}
function iso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
