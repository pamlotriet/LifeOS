import { Component, input } from '@angular/core';

/** Shared actions retain native button semantics and native link navigation. */
@Component({
  selector: 'button[appButton], a[appButton]',
  template: '<ng-content />',
  host: {
    '[class.secondary-action]': 'appearance() === "secondary"',
    '[class.danger-action]': 'appearance() === "danger"',
  },
  styleUrl: './app-button.css',
})
export class AppButton {
  readonly appearance = input<'' | 'primary' | 'secondary' | 'danger'>('primary', {
    alias: 'appButton',
  });
}
