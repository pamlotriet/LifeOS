import { TestBed } from '@angular/core/testing';
import { FoodLog } from '@pages/nutrition/state/nutrition/nutrition.model';
import { NutritionMealCard } from '@pages/nutrition/components/nutrition-meal-card/nutrition-meal-card';

describe('NutritionMealCard', () => {
  it('forwards actions for the exact saved entry and disables repeat/remove while busy', async () => {
    const entry: FoodLog = {
      id: 'saved-rice',
      date: '2026-11-17',
      name: 'Rice',
      amount: '2 servings',
      nutrition: { calories: 400, protein: 8, carbs: 80, fat: 4 },
    };
    const fixture = TestBed.createComponent(NutritionMealCard);
    fixture.componentRef.setInput('meal', 'Dinner');
    fixture.componentRef.setInput('calories', 400);
    fixture.componentRef.setInput('entries', [entry]);
    const edit = vi.fn(),
      repeat = vi.fn(),
      remove = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.logAgain.subscribe(repeat);
    fixture.componentInstance.remove.subscribe(remove);
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.entry-actions button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(edit).toHaveBeenCalledWith(entry);
    expect(repeat).toHaveBeenCalledWith(entry);
    expect(remove).toHaveBeenCalledWith(entry.id);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(true);
    buttons[1].click();
    buttons[2].click();
    expect(repeat).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(entry.nutrition.calories).toBe(400);
  });
});
