import { inject, Injectable, provideAppInitializer } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  provideTranslateService,
  TranslateLoader,
  TranslateService,
  TranslationObject,
} from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable()
class AppTranslationLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<TranslationObject>(`./i18n/${encodeURIComponent(lang)}.json`);
  }
}

export function provideAppTranslations() {
  return [
    provideHttpClient(),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
      loader: { provide: TranslateLoader, useClass: AppTranslationLoader },
    }),
    provideAppInitializer(() => firstValueFrom(inject(TranslateService).use('en'))),
  ];
}
