import {
  AfterViewInit,
  Directive,
  DoCheck,
  ElementRef,
  inject,
  input,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { FormGroupDirective, NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { FormProtection } from '@core/forms/form-protection.service';

@Directive({ selector: 'form[appForm]', exportAs: 'appForm' })
export class AppForm implements AfterViewInit, DoCheck, OnDestroy {
  readonly saving = input(false, { alias: 'formSaving' });
  readonly validate = input(true, { alias: 'formValidate' });
  readonly value = input<unknown>(undefined, { alias: 'formValue' });
  private readonly element = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly protection = inject(FormProtection);
  private readonly i18n = inject(TranslateService);
  private readonly ngForm = inject(NgForm, { self: true, optional: true });
  private readonly group = inject(FormGroupDirective, { self: true, optional: true });
  private baseline = '';
  private interacted = false;
  private initialized = false;
  private completed = false;
  private readonly summary = this.renderer.createElement('p') as HTMLElement;
  private readonly status = this.renderer.createElement('p') as HTMLElement;
  private readonly disabled = new Map<HTMLButtonElement, boolean>();
  private readonly cleanup: (() => void)[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private get control() {
    return this.group?.control ?? this.ngForm?.control;
  }
  private snapshot(): string {
    return JSON.stringify([this.control?.getRawValue(), this.value()]);
  }

  constructor() {
    this.summary.className = 'app-form-summary';
    this.summary.setAttribute('role', 'alert');
    this.summary.hidden = true;
    this.status.className = 'app-form-status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.status.hidden = true;
    this.renderer.insertBefore(this.element, this.summary, this.element.firstChild);
    this.renderer.appendChild(this.element, this.status);
    this.cleanup.push(
      this.protection.register({
        element: this.element,
        dirty: () => this.dirty(),
        saving: () => this.saving() && !this.completed,
        markSaved: () => this.markSaved(),
      }),
    );
    const interact = () => {
      if (!this.initialized) {
        this.baseline = this.snapshot();
        this.initialized = true;
        clearTimeout(this.timer);
      }
      this.interacted = true;
    };
    for (const event of ['input', 'change', 'click']) {
      this.element.addEventListener(event, interact, true);
      this.cleanup.push(() => this.element.removeEventListener(event, interact, true));
    }
    const submit = (event: Event) => {
      if (!this.saving()) this.completed = false;
      if (this.saving() || (this.validate() && (this.control?.invalid || this.control?.pending))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.saving()) return;
        this.control?.markAllAsTouched();
        this.summary.textContent = this.i18n.instant('Check the highlighted fields before saving.');
        this.summary.hidden = false;
        queueMicrotask(() => {
          const invalid = this.element.querySelector<HTMLElement>(
            'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, app-select.ng-invalid button, app-date-picker.ng-invalid button',
          );
          invalid?.focus();
        });
      } else this.summary.hidden = true;
    };
    this.element.addEventListener('submit', submit, true);
    this.cleanup.push(() => this.element.removeEventListener('submit', submit, true));
    const unload = (event: BeforeUnloadEvent) => {
      if (this.protection.hasChanges()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    this.cleanup.push(() => window.removeEventListener('beforeunload', unload));
  }
  ngAfterViewInit(): void {
    this.timer = setTimeout(() => {
      if (!this.initialized) {
        this.baseline = this.snapshot();
        this.initialized = true;
      }
    }, 0);
  }
  dirty(): boolean {
    return this.initialized && this.interacted && this.snapshot() !== this.baseline;
  }
  markSaved(): void {
    this.completed = true;
    this.baseline = this.snapshot();
    this.interacted = false;
    this.control?.markAsPristine();
    this.summary.hidden = true;
  }
  ngDoCheck(): void {
    if (this.initialized && !this.interacted) this.baseline = this.snapshot();
    this.element.setAttribute('aria-busy', String(this.saving()));
    this.status.hidden = !this.saving();
    this.status.textContent = this.saving() ? this.i18n.instant('Saving...') : '';
    const buttons = [...this.element.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
    if (this.element.id)
      buttons.push(
        ...[...document.querySelectorAll<HTMLButtonElement>('button[form][type="submit"]')].filter(
          (button) => button.getAttribute('form') === this.element.id,
        ),
      );
    for (const button of buttons) {
      if (this.saving()) {
        if (!button.disabled) {
          this.disabled.set(button, false);
          button.disabled = true;
        }
      } else if (this.disabled.has(button)) {
        button.disabled = this.disabled.get(button)!;
        this.disabled.delete(button);
      }
    }
  }
  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.cleanup.forEach((dispose) => dispose());
  }
}

/** Capture before the page's click handler so cancellation never destroys a draft first. */
@Directive({ selector: '[appDiscard]' })
export class AppDiscard implements OnDestroy {
  readonly when = input(true, { alias: 'discardWhen' });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly protection = inject(FormProtection);
  private readonly click = (event: Event) => {
    if (!this.when()) return;
    if (!this.protection.canLeave(this.element.closest('form') ?? undefined)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  constructor() {
    this.element.addEventListener('click', this.click, true);
  }
  ngOnDestroy(): void {
    this.element.removeEventListener('click', this.click, true);
  }
}
