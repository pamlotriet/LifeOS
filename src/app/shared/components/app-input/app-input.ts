import { FieldFeedback } from '@shared/directives/field-feedback';
import { Component, input } from '@angular/core';

/** Native inputs keep their labels, browser behaviour and Angular value accessors. */
@Component({
  hostDirectives: [FieldFeedback],
  selector: 'input[appInput], textarea[appInput]',
  template: '',
  host: { '[class.inline-input]': 'appearance() === "inline"' },
  styleUrl: './app-input.css',
})
export class AppInput {
  readonly appearance = input<'' | 'field' | 'inline'>('field', { alias: 'appInput' });
}
