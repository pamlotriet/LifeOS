import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PlanningStore } from '../../shared/state/planning/planning-store';

@Component({ selector: 'app-planning-calendar', imports: [IonContent, IonIcon, RouterLink, PageHeader], templateUrl: './planning-calendar.html', styleUrl: './planning.css' })
export class PlanningCalendar {
  readonly store = inject(PlanningStore); private readonly route = inject(ActivatedRoute); readonly month = signal(this.initialMonth()); readonly selected = signal(this.route.snapshot.queryParamMap.get('date') ?? iso(new Date()));
  readonly monthLabel = computed(() => this.month().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  readonly cells = computed(() => { const d = this.month(); const offset = d.getDay(); const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(d.getFullYear(), d.getMonth(), i + 1)))]; });
  readonly entries = computed(() => this.store.sortedEvents().filter((item) => item.date === this.selected()));
  shift(delta: number): void { const d = this.month(); this.month.set(new Date(d.getFullYear(), d.getMonth() + delta, 1)); }
  day(value: string): number { return Number(value.slice(-2)); } hasEntries(value: string): boolean { return this.store.events().some((item) => item.date === value) || this.store.reminders().some((item) => item.date === value); }
  label(): string { return new Date(`${this.selected()}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
  private initialMonth(): Date { const value = this.route.snapshot.queryParamMap.get('date'); const date = value ? new Date(`${value}T12:00:00`) : new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); }
}
function iso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
