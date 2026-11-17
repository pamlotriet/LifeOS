import '@angular/compiler';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import english from '@public/i18n/en.json';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormProtection } from '@core/forms/form-protection.service';

const translationTestProviders = [
  FormProtection,
  provideTranslateService({
    lang: 'en',
    fallbackLang: 'en',
    loader: { provide: TranslateLoader, useValue: { getTranslation: () => of(english) } },
  }),
];

export default translationTestProviders;

export function withTranslations<T>(factory: () => T): T {
  const injector = Injector.create({ providers: translationTestProviders });
  return runInInjectionContext(injector, factory);
}
