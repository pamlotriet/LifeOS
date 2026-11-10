import { Component, input } from '@angular/core';

/** Shared actions use native buttons so submit, disabled and focus behaviour is preserved. */
@Component({
  selector: 'button[appButton]',
  template: '<ng-content />',
  host: {
    '[class.secondary-action]': 'appearance() === "secondary"',
    '[class.danger-action]': 'appearance() === "danger"',
  },
  styleUrl: './app-button.css',
})
export class AppButton {
  readonly appearance = input<'' | 'primary' | 'secondary' | 'danger'>('primary', { alias: 'appButton' });
}
