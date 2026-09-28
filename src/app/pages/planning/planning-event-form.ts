import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PlanningCategory, PlanningEventInput } from '../../shared/state/planning/planning.model';
import { PlanningStore } from '../../shared/state/planning/planning-store';
import { FamilyStore } from '../../shared/state/family/family-store';

@Component({ selector: 'app-planning-event-form', imports: [IonContent, ReactiveFormsModule, AppDatePicker, AppSelect, PageHeader], templateUrl: './planning-event-form.html', styleUrl: './planning.css' })
export class PlanningEventForm {
  private readonly fb = inject(FormBuilder); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); readonly store = inject(PlanningStore); readonly family = inject(FamilyStore); readonly attendees = signal<string[]>([]);
  readonly id = this.route.snapshot.paramMap.get('id'); readonly saving = signal(false); readonly error = signal('');
  readonly categoryOptions = ['Personal', 'Bills', 'Health', 'Work', 'Family', 'Other'].map((x) => ({ value: x, label: x })); readonly repeatOptions = ['Does not repeat', 'Daily', 'Weekly', 'Monthly', 'Yearly'].map((x) => ({ value: x, label: x }));
  readonly form = this.fb.nonNullable.group({ title: ['', Validators.required], date: [this.route.snapshot.queryParamMap.get('date') ?? today(), Validators.required], startTime: ['09:00'], endTime: ['10:00'], location: [''], notes: [''], category: ['Personal'], repeat: ['Does not repeat'], reminder: [true] });
  constructor() { void this.family.reload(); if (this.id) { const item = this.store.events().find((x) => x.id === this.id); if (item) { this.form.patchValue(item); this.attendees.set(item.attendeeIds); } else void this.load(); } }
  async submit(): Promise<void> { this.form.markAllAsTouched(); if (this.form.invalid || this.saving()) return; this.saving.set(true); this.error.set(''); try { const value = this.form.getRawValue(); await this.store.saveEvent({ ...value, category: value.category as PlanningCategory, attendeeIds: this.attendees() } as PlanningEventInput, this.id ?? undefined); await this.router.navigateByUrl('/planning/calendar'); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save event.'); } finally { this.saving.set(false); } }
  async remove(): Promise<void> { if (!this.id) return; await this.store.deleteEvent(this.id); await this.router.navigateByUrl('/planning/calendar'); }
  toggleAttendee(id: string): void { this.attendees.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); }
  private async load(): Promise<void> { await this.store.reload(); const item = this.store.events().find((x) => x.id === this.id); if (item) { this.form.patchValue(item); this.attendees.set(item.attendeeIds); } }
}
function today(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
