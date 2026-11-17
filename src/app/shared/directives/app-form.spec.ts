import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppForm, AppDiscard } from '@shared/directives/app-form';
import { AppInput } from '@shared/components/app-input/app-input';
import { FormProtection } from '@core/forms/form-protection.service';

@Component({
  imports: [FormsModule, AppForm, AppDiscard, AppInput],
  template: `<form
    appForm
    #ui="appForm"
    [formSaving]="saving()"
    [formValidate]="validate()"
    (ngSubmit)="submitted = submitted + 1"
  >
    <label>Name<input appInput name="name" required [(ngModel)]="name" /></label>
    <button type="submit">Save</button>
    <button appDiscard type="button" (click)="cancelled = true">Cancel</button>
  </form>`,
})
class Host {
  name = '';
  saving = signal(false);
  validate = signal(true);
  submitted = 0;
  cancelled = false;
}

describe('Shared form behavior', () => {
  afterEach(() => vi.restoreAllMocks());
  let fixture: ComponentFixture<Host>;
  let form: HTMLFormElement;
  let input: HTMLInputElement;
  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    form = fixture.nativeElement.querySelector('form');
    input = form.querySelector('input')!;
    // jsdom has no layout; production filters out Ionic's cached hidden pages.
    vi.spyOn(form, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  });
  function enter(value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }
  function submit() {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
  it('blocks invalid saves and associates a visible field error', async () => {
    submit();
    await fixture.whenStable();
    expect(fixture.componentInstance.submitted).toBe(0);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const id = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe('This field is required.');
    expect(form.querySelector('[role="alert"]')?.textContent).toContain('highlighted fields');
    expect(document.activeElement).toBe(input);
  });
  it('clears corrected field feedback without removing unrelated help descriptions', () => {
    input.setAttribute('aria-describedby', 'name-help');
    submit();
    enter('Example');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBe('name-help');
    submit();
    expect(fixture.componentInstance.submitted).toBe(1);
  });
  it('announces saving, disables submit and rejects repeat submit events', () => {
    enter('Example');
    fixture.componentInstance.saving.set(true);
    fixture.detectChanges();
    submit();
    submit();
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(form.querySelector('button')?.disabled).toBe(true);
    expect(form.querySelector('[role="status"]')?.textContent).toBe('Saving...');
    expect(fixture.componentInstance.submitted).toBe(0);
    fixture.componentInstance.saving.set(false);
    fixture.detectChanges();
    expect(form.querySelector('button')?.disabled).toBe(false);
  });
  it('keeps a rejected cancellation and failed save dirty', () => {
    enter('Example');
    const protection = TestBed.inject(FormProtection);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    form.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.cancelled).toBe(false);
    fixture.componentInstance.saving.set(true);
    fixture.detectChanges();
    fixture.componentInstance.saving.set(false);
    fixture.detectChanges();
    expect(protection.hasChanges()).toBe(true);
  });
  it('prompts once on accepted discard and permits subsequent navigation', () => {
    enter('Example');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    form.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    expect(fixture.componentInstance.cancelled).toBe(true);
    expect(TestBed.inject(FormProtection).canLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('allows completed saves to navigate while retaining protection for pending saves and reloads', () => {
    enter('Example');
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    fixture.componentInstance.saving.set(true);
    fixture.detectChanges();
    expect(TestBed.inject(FormProtection).canLeave()).toBe(false);
    fixture.debugElement.query(By.directive(AppForm)).injector.get(AppForm).markSaved();
    expect(TestBed.inject(FormProtection).canLeave()).toBe(true);
    const savedUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(savedUnload);
    expect(savedUnload.defaultPrevented).toBe(false);
  });
  it('allows a multi-step form to run its step-specific validator', () => {
    fixture.componentInstance.validate.set(false);
    fixture.detectChanges();
    submit();
    expect(fixture.componentInstance.submitted).toBe(1);
  });
  it('does not prompt when edits are reverted and unregisters destroyed forms', () => {
    enter('Example');
    enter('');
    expect(TestBed.inject(FormProtection).hasChanges()).toBe(false);
    enter('Another');
    fixture.destroy();
    expect(TestBed.inject(FormProtection).hasChanges()).toBe(false);
  });
});
