import { TestBed } from '@angular/core/testing';
import { GymDayCard } from '@pages/gym/components/gym-day-card/gym-day-card';
import { GymEntry, GymExercise } from '@pages/gym/state/gym/gym.model';

describe('GymDayCard', () => {
  it('preserves reorder limits and forwards the saved entry for editing', async () => {
    const exercise: GymExercise = {
      id: 'squat',
      name: 'Squat',
      muscle: 'Legs',
      equipment: '',
      notes: '',
    };
    const first: GymEntry & { exercise: GymExercise } = {
      id: 'first',
      exerciseId: exercise.id,
      day: 0,
      sets: 3,
      reps: '8',
      rest: 60,
      weight: '',
      notes: '',
      order: 0,
      exercise,
    };
    const second = { ...first, id: 'second', order: 1 };
    const fixture = TestBed.createComponent(GymDayCard);
    fixture.componentRef.setInput('day', { day: 0, name: 'Monday', entries: [first, second] });
    const move = vi.fn(),
      edit = vi.fn();
    fixture.componentInstance.move.subscribe(move);
    fixture.componentInstance.edit.subscribe(edit);
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('.workout-item') as NodeListOf<HTMLElement>;
    const firstButtons = rows[0].querySelectorAll('button');
    const lastButtons = rows[1].querySelectorAll('button');
    expect(firstButtons[0].disabled).toBe(true);
    expect(lastButtons[1].disabled).toBe(true);
    firstButtons[1].click();
    firstButtons[2].click();
    expect(move).toHaveBeenCalledWith({ id: first.id, direction: 1 });
    expect(edit).toHaveBeenCalledWith(first);
    fixture.componentRef.setInput('saving', true);
    await fixture.whenStable();
    expect([...rows[0].querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
  });
});
