import { describe, expect, it } from 'vitest';
import { buildWeeklyPlan, WEEKLY_PLAN_ID } from './weekly-plan';
import { validateExercise, validateGymEntry, GymEntry } from './gym.model';
describe('Attached five-day gym plan', () => {
  it('creates the complete ordered Monday-Friday plan including daily stretching', () => {
    const plan = buildWeeklyPlan([], []);
    expect(plan.entries).toHaveLength(94);
    expect(new Set(plan.entries.map((e) => e.day))).toEqual(new Set([0, 1, 2, 3, 4]));
    plan.exercises.forEach((e) => expect(() => validateExercise(e)).not.toThrow());
    plan.entries.forEach((e) => expect(() => validateGymEntry(e)).not.toThrow());
    for (let day = 0; day < 5; day++) {
      const entries = plan.entries.filter((e) => e.day === day);
      expect(entries.filter((e) => e.notes.startsWith('Post-training'))).toHaveLength(5);
      expect(entries.some((e) => e.notes.startsWith('Core.'))).toBe(true);
      expect(entries.map((e) => e.order)).toEqual(entries.map((_, i) => i + 1));
    }
  });
  it('preserves interval recoveries, circuit structure and the optional challenge', () => {
    const plan = buildWeeklyPlan([], []);
    const tuesday = plan.entries.filter((e) => e.day === 1);
    expect(tuesday.find((e) => e.notes.startsWith('Block A'))).toMatchObject({
      sets: 8,
      reps: '30 sec hard',
      rest: 30,
    });
    expect(tuesday.find((e) => e.notes.startsWith('Block B'))).toMatchObject({
      sets: 6,
      reps: '40 sec continuous',
      rest: 20,
    });
    expect(tuesday.find((e) => e.notes.startsWith('Block C'))).toMatchObject({ sets: 6, rest: 45 });
    expect(plan.entries.filter((e) => e.notes.startsWith('10-minute EMOM'))).toHaveLength(5);
    expect(plan.entries.find((e) => e.notes.startsWith('Optional final challenge'))).toMatchObject({
      sets: 5,
      rest: 40,
    });
    expect(
      plan.entries.find(
        (e) => plan.exercises.find((x) => x.id === e.exerciseId)?.name === 'Farmer carry',
      )?.notes,
    ).toContain('Replace with another bike interval');
  });
  it('reuses library exercises, appends to existing workouts and imports idempotently', () => {
    const existing = {
      id: 'my-bike',
      name: 'Bike',
      muscle: 'Cardio',
      equipment: 'My bike',
      notes: 'Keep my notes',
    };
    const entry: GymEntry = {
      id: 'manual',
      exerciseId: existing.id,
      day: 0,
      sets: 1,
      reps: '2 min',
      rest: 0,
      weight: '',
      notes: 'Keep',
      order: 10,
    };
    const plan = buildWeeklyPlan([existing], [entry]);
    expect(plan.exercises.some((e) => e.name === 'Bike')).toBe(false);
    expect(plan.entries.filter((e) => e.day === 0).every((e) => e.order > 10)).toBe(true);
    expect(plan.entries.some((e) => e.exerciseId === 'my-bike')).toBe(true);
    expect(
      buildWeeklyPlan([existing, ...plan.exercises], [entry, ...plan.entries]).entries,
    ).toEqual([]);
    expect(entry.notes).toBe('Keep');
    expect(new Set(plan.entries.map((e) => e.id)).size).toBe(plan.entries.length);
    expect(plan.entries.every((e) => e.id.startsWith(WEEKLY_PLAN_ID))).toBe(true);
  });
  it('resumes a partially saved import without duplicating completed entries', () => {
    const first = buildWeeklyPlan([], []);
    const saved = first.entries.slice(0, 10);
    const remaining = buildWeeklyPlan(first.exercises, saved);
    expect(remaining.exercises).toEqual([]);
    expect(remaining.entries).toHaveLength(84);
    expect(remaining.entries.every(e => !saved.some(s => s.id === e.id))).toBe(true);
    expect(buildWeeklyPlan(first.exercises, [...saved, ...remaining.entries]).entries).toEqual([]);
  });

});
