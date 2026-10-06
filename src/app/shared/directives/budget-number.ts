import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

export function parseBudgetNumber(value: string): number | null {
  const text = value.trim().replace(/[\s\u00a0]/g, '');
  if (!text) return null;
  let normal = text;
  if (text.includes(',') && text.includes('.')) {
    normal = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    normal = /^\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
  }
  return /^\d+(\.\d+)?$/.test(normal) ? Number(normal) : NaN;
}

@Directive({
  selector: 'input[appBudgetNumber]',
  host: { type: 'text', inputmode: 'decimal' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BudgetNumber), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BudgetNumber), multi: true },
  ],
})
export class BudgetNumber implements ControlValueAccessor, Validator {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private change: (value: number | null) => void = () => {};
  private touched = () => {};
  writeValue(value: number | null): void { this.input.value = value == null || !Number.isFinite(value) ? '' : String(value); }
  registerOnChange(fn: (value: number | null) => void): void { this.change = fn; }
  registerOnTouched(fn: () => void): void { this.touched = fn; }
  setDisabledState(disabled: boolean): void { this.input.disabled = disabled; }
  @HostListener('input') onInput(): void { this.change(parseBudgetNumber(this.input.value)); }
  @HostListener('blur') onBlur(): void { this.touched(); }
  validate(control: AbstractControl): ValidationErrors | null {
    if (control.value == null) return null;
    if (!Number.isFinite(control.value)) return { number: true };
    const min = this.input.getAttribute('min');
    const max = this.input.getAttribute('max');
    if (min !== null && control.value < Number(min)) return { min: true };
    if (max !== null && control.value > Number(max)) return { max: true };
    return null;
  }
}
