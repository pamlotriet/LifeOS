import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/** Installs the feature-scoped Budget theme once, including projected child views. */
@Component({
  selector: 'main[appBudgetPage]',
  template: '<ng-content />',
  host: { class: 'budget-page' },
  styleUrls: ['./budget-page.css', './budget-page-layout.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetPage {}
