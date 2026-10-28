import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-month-picker',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppMonthPicker), multi: true }],
  template: `<div class="month-fields"><select [attr.aria-label]="ariaLabel() + ' month'" [value]="month()" [disabled]="disabled()" (change)="choose($any($event.target).value, year())">@for (label of months; track $index) { <option [value]="pad($index + 1)">{{ label }}</option> }</select><select [attr.aria-label]="ariaLabel() + ' year'" [value]="year()" [disabled]="disabled()" (change)="choose(month(), $any($event.target).value)">@for (item of years(); track item) { <option [value]="item">{{ item }}</option> }</select></div>`,
  styles: `:host{display:block;min-width:0;width:100%;max-width:100%}.month-fields{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:8px}select{box-sizing:border-box;min-width:0;width:100%;max-width:100%;min-height:44px;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--foreground);font:inherit;font-size:.85rem;color-scheme:light dark}select:focus-visible{outline:2px solid var(--ring);outline-offset:2px}`,
})
export class AppMonthPicker implements ControlValueAccessor {
  readonly ariaLabel = input('Budget cycle');
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly month = computed(() => this.value().slice(5,7) || this.pad(new Date().getMonth()+1));
  readonly year = computed(() => this.value().slice(0,4) || String(new Date().getFullYear()));
  readonly years = computed(() => { const now = new Date().getFullYear(); const selected = Number(this.year()); return Array.from({length: Math.max(now+5,selected)-Math.min(now-10,selected)+1},(_,i)=>Math.min(now-10,selected)+i); });
  readonly months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  pad(value: number): string { return String(value).padStart(2,'0'); }
  private changed: (value: string) => void = () => {};
  private touched = () => {};
  choose(month: string, year: string): void { if (this.disabled()) return; const value = `${year}-${month}`; this.value.set(value); this.changed(value); this.touched(); }
  writeValue(value: string | null): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (value: string) => void): void { this.changed = fn; }
  registerOnTouched(fn: () => void): void { this.touched = fn; }
  setDisabledState(value: boolean): void { this.disabled.set(value); }
}
