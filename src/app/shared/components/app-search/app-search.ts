import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { LanguageService } from '@core/i18n/language.service';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { closeCircle, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-search',
  imports: [IonSearchbar, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <ion-searchbar
      class="w-full rounded-xl! border border-border bg-card! p-0! [--background:var(--card)]! [--border-radius:12px]! [--box-shadow:none]! [--color:var(--foreground)] [--icon-color:var(--text-secondary)] [--clear-button-color:var(--text-secondary)] [--placeholder-color:var(--text-secondary)] focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-3 [&_.searchbar-input]:rounded-xl! [&_.searchbar-input]:border-0! [&_.searchbar-input]:bg-transparent! [&_.searchbar-input]:shadow-none! [&_.searchbar-input]:outline-none!"
      mode="md"
      [placeholder]="placeholder() | translate"
      [attr.aria-label]="ariaLabel() || placeholder() | translate"
      [value]="value()"
      [disabled]="disabled()"
      [debounce]="debounce()"
      [searchIcon]="searchIcon"
      [clearIcon]="clearIcon"
      (ionInput)="value.set($event.detail.value ?? '')"
      (ionClear)="value.set('')"
    />
  `,
})
export class AppSearch {
  private readonly i18n = inject(TranslateService);
  private readonly language = inject(LanguageService).currentLanguage;
  private readonly searchbar = viewChild.required(IonSearchbar);
  readonly value = model('');
  readonly placeholder = input.required<string>();
  readonly ariaLabel = input('');
  readonly clearLabel = input('search.clear');
  readonly disabled = input(false);
  readonly debounce = input(0);
  readonly searchIcon = searchOutline;
  readonly clearIcon = closeCircle;

  constructor() {
    afterRenderEffect(() => {
      this.language();
      const label = this.i18n.instant(this.ariaLabel() || this.placeholder());
      const clearLabel = this.i18n.instant(this.clearLabel());
      // Ionic captures inherited ARIA attributes only when it creates the input.
      // Keep the native labels in sync with subsequent language/input changes.
      void this.searchbar()
        .getInputElement()
        .then((input) => {
          input.setAttribute('aria-label', label);
          input
            .closest('ion-searchbar')
            ?.querySelector('.searchbar-clear-button')
            ?.setAttribute('aria-label', clearLabel);
        });
    });
  }
}
