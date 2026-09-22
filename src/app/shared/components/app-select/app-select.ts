import { Component, computed, ElementRef, forwardRef, HostListener, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular';

export interface SelectOption { value: string; label: string; description?: string; image?: string | null; }

@Component({
  selector: 'app-select',
  imports: [IonIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelect), multi: true }],
  template: `
    <div class="relative" [class.z-50]="open()">
      <button type="button" [attr.aria-label]="ariaLabel()" aria-haspopup="listbox" [attr.aria-expanded]="open()" [disabled]="disabled()"
        (click)="open.set(!open()); onTouched()"
        class="flex min-h-11 w-full items-center gap-3 rounded-xl border border-[#315b7e] bg-gradient-to-r from-[#143755] to-[#102b47] px-3 py-2 text-left text-base text-white outline-none focus-visible:border-cyan-300 disabled:opacity-50">
        @if (selected()?.image) { <img [src]="selected()?.image" alt="" class="h-10 w-14 shrink-0 rounded-lg object-cover" /> }
        @else if (selected()?.description) { <span class="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-[#204765]"><ion-icon name="car-sport-outline" class="text-xl text-cyan-300" aria-hidden="true"></ion-icon></span> }
        <span class="min-w-0 flex-1"><span class="block truncate" [class.text-[#91aecd]]="!selected()">{{ selected()?.label || placeholder() }}</span>@if (selected()?.description) { <span class="block truncate text-xs text-[#a9c2db]">{{ selected()?.description }}</span> }</span>
        <ion-icon name="chevron-down-outline" class="shrink-0 text-[#afc9e7]" aria-hidden="true"></ion-icon>
      </button>
      @if (open()) { <div role="listbox" [attr.aria-label]="ariaLabel()" class="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#315b7e] bg-[#123451] p-1 shadow-[0_14px_32px_rgba(0,0,0,0.35)]">
        @for (option of options(); track option.value) { <button type="button" role="option" [attr.aria-selected]="currentValue() === option.value" (click)="choose(option.value)" class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-white hover:bg-[#1c486a] focus-visible:bg-[#1c486a]" [class.bg-[#1c486a]]="currentValue() === option.value">
          @if (option.image) { <img [src]="option.image" alt="" class="h-10 w-14 shrink-0 rounded-lg object-cover" /> }
          @else if (option.description) { <span class="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-[#204765]"><ion-icon name="car-sport-outline" class="text-xl text-cyan-300" aria-hidden="true"></ion-icon></span> }
          <span class="min-w-0 flex-1"><span class="block truncate font-semibold">{{ option.label }}</span>@if (option.description) { <span class="block truncate text-xs text-[#a9c2db]">{{ option.description }}</span> }</span>
          @if (currentValue() === option.value) { <ion-icon name="checkmark" class="text-cyan-300" aria-hidden="true"></ion-icon> }
        </button> }
      </div> }
    </div>
  `,
})
export class AppSelect implements ControlValueAccessor {
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('Select an option');
  readonly ariaLabel = input('Select an option');
  readonly selectedValue = input<string | undefined>(undefined);
  readonly value = signal('');
  readonly currentValue = computed(() => this.selectedValue() ?? this.value());
  readonly valueChange = output<string>();
  readonly open = signal(false);
  readonly disabled = signal(false);
  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor(private readonly element: ElementRef<HTMLElement>) {}
  selected(): SelectOption | undefined { return this.options().find((option) => option.value === this.currentValue()); }
  choose(value: string): void { this.value.set(value); this.onChange(value); this.onTouched(); this.valueChange.emit(value); this.open.set(false); }
  writeValue(value: string | number | null): void { this.value.set(value === null ? '' : String(value)); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(value: boolean): void { this.disabled.set(value); }
  @HostListener('document:click', ['$event'])
  outside(event: MouseEvent): void { if (!this.element.nativeElement.contains(event.target as Node)) this.open.set(false); }
  @HostListener('document:keydown.escape')
  escape(): void { this.open.set(false); }
}
