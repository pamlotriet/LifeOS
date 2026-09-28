import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PlanningCategory } from '../../shared/state/planning/planning.model';
import { PlanningStore } from '../../shared/state/planning/planning-store';

@Component({ selector: 'app-planning-reminders', imports: [IonContent, IonIcon, FormsModule, AppDatePicker, AppSelect, PageHeader], templateUrl: './planning-reminders.html', styleUrl: './planning.css' })
export class PlanningReminders {
  readonly store = inject(PlanningStore); readonly category = signal('All'); readonly showForm = signal(false); readonly saving = signal(false); readonly title = signal(''); readonly date = signal(today()); readonly time = signal('09:00'); readonly newCategory = signal('Personal');
  readonly categories = ['All', 'Personal', 'Bills', 'Health', 'Work', 'Family']; readonly categoryOptions = this.categories.slice(1).map((x) => ({ value: x, label: x }));
  readonly filtered = computed(() => this.store.sortedReminders().filter((item) => this.category() === 'All' || item.category === this.category()));
  readonly upcoming = computed(() => this.filtered().filter((x) => x.date <= today())); readonly later = computed(() => this.filtered().filter((x) => x.date > today()));
  async add(): Promise<void> { if (!this.title().trim() || this.saving()) return; this.saving.set(true); try { await this.store.saveReminder({ title: this.title(), date: this.date(), time: this.time(), category: this.newCategory() as PlanningCategory, completed: false }); this.title.set(''); this.showForm.set(false); } finally { this.saving.set(false); } }
  format(date: string): string { return date === today() ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }); }
}
function today(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
