import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import english from '@public/i18n/en.json';

@Component({
  imports: [TranslatePipe],
  template: `<button [attr.aria-label]="'Search spaces' | translate">
      {{ 'Loading {{p0}}' | translate: { p0: ('Gym' | translate) } }}
    </button>
    <p>
      {{ 'messages.count_books_and_count_tags_in_this_8c6694' | translate: { p0: 2, p1: 3 } }}
    </p>`,
})
class TranslationFixture {}

describe('Application translations', () => {
  it('loads English messages and interpolates complete phrases', () => {
    const translate = TestBed.inject(TranslateService);
    expect(translate.instant('Your spaces')).toBe('Your spaces');
    expect(translate.instant('Loading {{p0}}', { p0: 'Gym' })).toBe('Loading Gym');
    expect(english['Unavailable']).toBe('Unavailable');
  });

  it('updates visible text and accessible labels when the language changes', () => {
    const fixture = TestBed.createComponent(TranslationFixture);
    const translate = TestBed.inject(TranslateService);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Loading Gym');
    expect(button.getAttribute('aria-label')).toBe('Search spaces');
    expect(fixture.nativeElement.querySelector('p').textContent.trim()).toBe(
      '2 books and 3 tags in this backup.',
    );
    translate.setTranslation('test', {
      'Search spaces': 'Chercher',
      'Loading {{p0}}': 'Chargement : {{p0}}',
      Gym: 'Sport',
    });
    translate.use('test');
    fixture.detectChanges();
    expect(button.textContent?.trim()).toBe('Chargement : Sport');
    expect(button.getAttribute('aria-label')).toBe('Chercher');
  });
});
