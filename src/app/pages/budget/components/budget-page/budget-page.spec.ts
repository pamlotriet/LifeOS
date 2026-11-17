import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { BudgetPage } from '@pages/budget/components/budget-page/budget-page';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';

@Component({
  imports: [BudgetPage, FormsModule, AppButton, AppInput, RouterLink],
  template: `<main appBudgetPage>
    <a appButton="secondary" routerLink="/budget">Back to Budget</a>
    <form id="projected-budget-form" (ngSubmit)="submissions = submissions + 1">
      <fieldset [disabled]="busy()">
        <label>Account name<input appInput name="name" [(ngModel)]="name" required /></label>
      </fieldset>
    </form>
    <button appButton type="submit" form="projected-budget-form">Save</button>
  </main>`,
})
class BudgetPageHost {
  name = '';
  submissions = 0;
  readonly busy = signal(false);
}

describe('Budget page projection', () => {
  it('preserves parent forms, native link navigation, and external submit buttons', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BudgetPageHost);
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(form.valid).toBe(false);
    input.value = 'Everyday account';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(form.value.name).toBe('Everyday account');
    expect(fixture.componentInstance.name).toBe('Everyday account');
    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe('/budget');
    expect(anchor.classList.contains('secondary-action')).toBe(true);
    const submit = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(submit.form?.id).toBe('projected-budget-form');
    submit.click();
    expect(fixture.componentInstance.submissions).toBe(1);
    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();
    expect(input.matches(':disabled')).toBe(true);
  });
});
