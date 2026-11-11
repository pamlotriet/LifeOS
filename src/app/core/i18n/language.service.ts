import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translations = inject(TranslateService);

  readonly currentLanguage = toSignal(
    this.translations.onLangChange.pipe(map((event) => event.lang)),
    { initialValue: this.translations.getCurrentLang() || 'en' },
  );
}
