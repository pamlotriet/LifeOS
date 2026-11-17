import {
  Directive,
  DoCheck,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

let nextErrorId = 0;
@Directive({ selector: '[appFieldFeedback]' })
export class FieldFeedback implements OnInit, DoCheck, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly i18n = inject(TranslateService);
  private control?: NgControl | null;
  private message?: HTMLElement;
  private readonly id = `app-field-error-${++nextErrorId}`;
  ngOnInit(): void {
    this.control = this.injector.get(NgControl, null, { self: true });
  }
  ngDoCheck(): void {
    const control = this.control?.control;
    const invalid = !!control?.invalid && !!control.touched;
    const target = this.host.matches('input, textarea, select')
      ? this.host
      : this.host.querySelector('button');
    if (!target || !control) return;
    target.setAttribute('aria-invalid', String(invalid));
    if (invalid) {
      if (!this.message) {
        this.message = this.renderer.createElement('span');
        this.message!.id = this.id;
        this.message!.className = 'app-field-error';
        this.message!.setAttribute('aria-live', 'polite');
        const label = this.host.closest('label');
        if (label?.parentElement)
          this.renderer.insertBefore(label.parentElement, this.message, label.nextSibling);
        else this.renderer.appendChild(this.host.parentElement, this.message);
      }
      const errors = control.errors ?? {};
      const key = errors['required']
        ? 'This field is required.'
        : errors['email']
          ? 'Enter a valid email address.'
          : errors['min']
            ? 'Enter a value at or above the minimum.'
            : errors['max']
              ? 'Enter a value at or below the maximum.'
              : errors['maxlength']
                ? 'This value is too long.'
                : errors['minlength']
                  ? 'This value is too short.'
                  : errors['number']
                    ? 'Enter a valid number.'
                    : 'Check this value.';
      this.message!.textContent = this.i18n.instant(key);
      this.message!.hidden = false;
      const descriptions = new Set(
        (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
      );
      descriptions.add(this.id);
      target.setAttribute('aria-describedby', [...descriptions].join(' '));
    } else if (this.message) {
      this.message.hidden = true;
      const descriptions = (target.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((id) => id && id !== this.id);
      if (descriptions.length) target.setAttribute('aria-describedby', descriptions.join(' '));
      else target.removeAttribute('aria-describedby');
    }
  }
  ngOnDestroy(): void {
    this.message?.remove();
  }
}
