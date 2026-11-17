import { TestBed } from '@angular/core/testing';
import { MealEditor } from '@pages/planning/components/meal-editor/meal-editor';

describe('Extracted meal editor bindings', () => {
  function fixture() {
    const view = TestBed.createComponent(MealEditor);
    for (const [name, value] of Object.entries({
      date: '2026-11-17',
      category: 'Dinner',
      categories: ['Dinner'],
      recipes: [{ id: 'soup', title: 'Soup' }],
      foods: [{ id: 'rice', name: 'Rice', archived: false }],
    }))
      view.componentRef.setInput(name, value);
    view.detectChanges();
    return view;
  }
  it('updates the selected ID before notifying the parent to populate linked nutrition', async () => {
    const view = fixture();
    await view.whenStable();
    const selected: string[] = [];
    view.componentInstance.recipeSelected.subscribe(() =>
      selected.push(view.componentInstance.recipeId()),
    );
    const select = view.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    select.value = 'soup';
    select.dispatchEvent(new Event('change'));
    expect(selected).toEqual(['soup']);
  });
  it('preserves title changes through its model and blocks saving while busy', async () => {
    const view = fixture();
    await view.whenStable();
    const title = [...view.nativeElement.querySelectorAll('input')].find(
      (input: HTMLInputElement) => input.closest('label')!.textContent!.includes('Meal name'),
    ) as HTMLInputElement;
    title.value = 'Dinner for two';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    view.detectChanges();
    expect(view.componentInstance.title()).toBe('Dinner for two');
    const save = vi.fn();
    view.componentInstance.save.subscribe(save);
    const button = [...view.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent!.includes('Save meal'),
    ) as HTMLButtonElement;
    view.componentRef.setInput('busy', true);
    view.detectChanges();
    button.click();
    expect(save).not.toHaveBeenCalled();
    view.componentRef.setInput('busy', false);
    view.detectChanges();
    button.click();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
