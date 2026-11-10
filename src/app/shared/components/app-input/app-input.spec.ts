import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';

@Component({
  imports: [ReactiveFormsModule, AppInput, AppButton],
  template: `
    <form id="shared-controls" [formGroup]="form" (ngSubmit)="submissions = submissions + 1">
      <label for="name">Book title</label
      ><input appInput id="name" formControlName="name" required />
      <input appInput type="number" formControlName="pages" />
      <textarea appInput formControlName="review" aria-label="Review"></textarea>
    </form>
    <button appButton type="submit" form="shared-controls" [disabled]="form.disabled">Next</button>
  `,
})
class FormHost {
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    pages: new FormControl(0, { nonNullable: true }),
    review: new FormControl('', { nonNullable: true }),
  });
  submissions = 0;
}

describe('Shared native form controls', () => {
  it('keeps label associations and reactive form values including numeric inputs', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const name = page.querySelector<HTMLInputElement>('#name')!;
    expect(name.labels?.[0].textContent).toBe('Book title');
    name.value = 'A book';
    name.dispatchEvent(new Event('input'));
    const pages = page.querySelector<HTMLInputElement>('input[type="number"]')!;
    pages.value = '300';
    pages.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name: 'A book',
      pages: 300,
      review: '',
    });
    fixture.componentInstance.form.controls.review.setValue('My review');
    await fixture.whenStable();
    expect(page.querySelector('textarea')?.value).toBe('My review');
  });

  it('preserves native footer submission and disables fields with their form', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.form.controls.name.setValue('A book');
    const submit = page.querySelector<HTMLButtonElement>('button')!;
    expect(submit.textContent).toBe('Next');
    submit.click();
    expect(fixture.componentInstance.submissions).toBe(1);
    fixture.componentInstance.form.disable();
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);
    expect(page.querySelector('textarea')?.disabled).toBe(true);
    expect(submit.disabled).toBe(true);
  });
});
