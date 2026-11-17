import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { RecipeBasicsFields } from '@pages/recipes/components/recipe-basics-fields/recipe-basics-fields';
import { RecipeInput } from '@pages/recipes/state/recipe/recipe.model';
import { addIcons } from 'ionicons';
import { chevronDownOutline } from 'ionicons/icons';

@Component({
  imports: [FormsModule, RecipeBasicsFields],
  template: `<form>
    <fieldset [disabled]="saving()">
      <section
        appRecipeBasicsFields
        [draft]="draft"
        [categories]="[]"
        [selectedCategories]="[]"
        [difficultyOptions]="[]"
      ></section>
    </fieldset>
  </form>`,
})
class FormHost {
  readonly saving = signal(false);
  draft: RecipeInput = {
    title: '',
    description: '',
    category: 'Other',
    cookTime: 10,
    servings: 2,
    difficulty: 'Easy',
    photoUrl: '',
    photoPath: '',
    ingredients: [],
    steps: [],
    tags: [],
    source: '',
    sourceLink: '',
    notes: '',
    favourite: false,
    private: true,
  };
}

describe('RecipeBasicsFields form boundary', () => {
  it('registers original named controls with the parent form and preserves its disabled fieldset', async () => {
    addIcons({ chevronDownOutline });
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    expect(Object.keys(form.controls).sort()).toEqual([
      'cookTime',
      'description',
      'servings',
      'title',
    ]);
    const title = fixture.nativeElement.querySelector('input[name="title"]') as HTMLInputElement;
    title.value = 'Test pasta';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.draft.title).toBe('Test pasta');
    expect(form.value.title).toBe('Test pasta');
    fixture.componentInstance.saving.set(true);
    await fixture.whenStable();
    expect(title.matches(':disabled')).toBe(true);
  });
});
