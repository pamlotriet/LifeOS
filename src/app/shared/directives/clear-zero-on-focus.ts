import { Directive, HostListener } from '@angular/core';

@Directive({ selector: '[appClearZeroOnFocus]' })
export class ClearZeroOnFocus {
  @HostListener('document:focusin', ['$event'])
  clearZero(event: FocusEvent): void {
    const input = event.composedPath().find(target => target instanceof HTMLInputElement);
    if (!(input instanceof HTMLInputElement) || input.type !== 'number' || input.readOnly || input.disabled
      || input.value === '' || input.valueAsNumber !== 0) return;

    input.value = '';
    // Keep reactive forms, ngModel, and input handlers in sync with the display.
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
}
