import { Component, computed, effect, ElementRef, forwardRef, HostListener, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular';

const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-date-picker',
  imports: [IonIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppDatePicker), multi: true }],
  template: `
    <div class="relative" [class.z-50]="open()">
      <button type="button" [attr.aria-label]="ariaLabel()" [attr.aria-expanded]="open()" aria-haspopup="dialog" [disabled]="disabled()" (click)="toggle()"
        class="flex min-h-11 w-full items-center gap-3 rounded-xl border border-[#315b7e] bg-gradient-to-r from-[#143755] to-[#102b47] px-3 text-left text-base text-white outline-none focus-visible:border-cyan-300 disabled:opacity-50">
        <ion-icon name="calendar-outline" class="shrink-0 text-cyan-300" aria-hidden="true"></ion-icon><span class="min-w-0 flex-1 truncate" [class.text-[#91aecd]]="!value()">{{ formatted() || placeholder() }}</span><ion-icon name="chevron-down-outline" class="shrink-0 text-[#afc9e7]" aria-hidden="true"></ion-icon>
      </button>
      @if (open()) { <div role="dialog" [attr.aria-label]="ariaLabel()" class="absolute top-full z-50 mt-1 w-full min-w-[270px] max-w-[340px] rounded-xl border border-[#315b7e] bg-[#123451] p-3 text-white shadow-[0_14px_32px_rgba(0,0,0,0.4)]" [class.left-0]="align() === 'left'" [class.right-0]="align() === 'right'">
        <div class="mb-3 flex items-center justify-between"><button type="button" aria-label="Previous month" (click)="shiftMonth(-1)" [disabled]="mode() !== 'days'" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#1c486a] disabled:opacity-30"><ion-icon name="chevron-back"></ion-icon></button><button type="button" (click)="mode.set('years')" class="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-[#1c486a]">{{ monthLabel() }} ▾</button><button type="button" aria-label="Next month" (click)="shiftMonth(1)" [disabled]="mode() !== 'days'" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#1c486a] disabled:opacity-30"><ion-icon name="chevron-forward"></ion-icon></button></div>
        @if (mode() === 'years') { <div class="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">@for (year of years; track year) { <button type="button" (click)="selectYear(year)" class="rounded-lg py-2 text-sm hover:bg-[#1c486a]" [class.bg-[#1c486a]]="viewMonth().getFullYear() === year">{{ year }}</button> }</div> }
        @else if (mode() === 'months') { <div class="grid grid-cols-3 gap-1">@for (month of months; track $index) { <button type="button" (click)="selectMonth($index)" class="rounded-lg py-3 text-sm hover:bg-[#1c486a]">{{ month }}</button> }</div> }
        @else {
        <div class="grid grid-cols-7 text-center text-[11px] text-[#a9c2db]">@for (day of weekdays; track day) { <span class="py-1">{{ day }}</span> }</div>
        <div class="grid grid-cols-7 gap-0.5 text-center text-sm">@for (day of days(); track $index) { @if (day) { <button type="button" [attr.aria-label]="dateLabel(day)" [attr.aria-pressed]="isSelected(day)" (click)="choose(day)" class="grid h-9 place-items-center rounded-lg hover:bg-[#1c486a]" [class]="isSelected(day) ? 'bg-cyan-400 font-bold text-[#062642]' : 'text-white'">{{ day }}</button> } @else { <span></span> } }</div>
        }
        <div class="mt-2 flex justify-between border-t border-[#315b7e] pt-2"><button type="button" (click)="chooseToday()" class="text-xs text-cyan-300">Today</button>@if (clearable()) { <button type="button" (click)="chooseEmpty()" class="text-xs text-[#b5cbe2]">Clear date</button> }</div>
      </div> }
    </div>
  `,
})
export class AppDatePicker implements ControlValueAccessor {
  readonly placeholder = input('Select date');
  readonly ariaLabel = input('Select date');
  readonly selectedValue = input<string | undefined>(undefined);
  readonly clearable = input(false);
  readonly align = input<'left' | 'right'>('left');
  readonly value = signal('');
  readonly valueChange = output<string>();
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  readonly years = Array.from({ length: new Date().getFullYear() - 1897 }, (_, index) => new Date().getFullYear() + 2 - index);
  readonly mode = signal<'days' | 'months' | 'years'>('days');
  readonly viewMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly monthLabel = computed(() => this.viewMonth().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }));
  readonly formatted = computed(() => this.value() ? new Date(`${this.value()}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  readonly days = computed(() => {
    const month = this.viewMonth();
    const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(0), ...Array.from({ length }, (_, index) => index + 1)] as number[];
  });
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  constructor(private readonly element: ElementRef<HTMLElement>) {
    effect(() => { const selected = this.selectedValue(); if (selected !== undefined) this.value.set(selected); });
  }
  toggle(): void { if (!this.open()) { this.viewMonth.set(this.value() ? new Date(`${this.value()}T12:00:00`) : new Date()); this.mode.set('days'); } this.open.set(!this.open()); this.onTouched(); }
  shiftMonth(delta: number): void { const month = this.viewMonth(); this.viewMonth.set(new Date(month.getFullYear(), month.getMonth() + delta, 1)); }
  selectYear(year: number): void { this.viewMonth.set(new Date(year, this.viewMonth().getMonth(), 1)); this.mode.set('months'); }
  selectMonth(month: number): void { this.viewMonth.set(new Date(this.viewMonth().getFullYear(), month, 1)); this.mode.set('days'); }
  dateLabel(day: number): string { return new Date(this.viewMonth().getFullYear(), this.viewMonth().getMonth(), day).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }); }
  isSelected(day: number): boolean { return this.value() === localIso(new Date(this.viewMonth().getFullYear(), this.viewMonth().getMonth(), day)); }
  choose(day: number): void { this.set(localIso(new Date(this.viewMonth().getFullYear(), this.viewMonth().getMonth(), day))); }
  chooseToday(): void { this.set(localIso(new Date())); }
  chooseEmpty(): void { this.set(''); }
  private set(value: string): void { this.value.set(value); this.onChange(value); this.onTouched(); this.valueChange.emit(value); this.open.set(false); }
  writeValue(value: string | null): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(value: boolean): void { this.disabled.set(value); }
  @HostListener('document:click', ['$event'])
  outside(event: MouseEvent): void { if (!this.element.nativeElement.contains(event.target as Node)) this.open.set(false); }
  @HostListener('document:keydown.escape')
  escape(): void { this.open.set(false); }
}
