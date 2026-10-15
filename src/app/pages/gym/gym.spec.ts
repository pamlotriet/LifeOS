import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Gym } from './gym';
import { GymStore } from '../../shared/state/gym/gym.store';
import { GymExercise, GymEntry } from '../../shared/state/gym/gym.model';

describe('Weekly gym planner',()=>{
  const exercise:GymExercise={id:'squat',name:'Squat',muscle:'Legs',equipment:'Barbell',sets:3,reps:'10',rest:90,notes:''};
  function fixture() {
    const store={exercises:signal([exercise]),entries:signal<GymEntry[]>([]),saveEntry:vi.fn().mockResolvedValue(undefined),saveExercise:vi.fn().mockResolvedValue(undefined)};
    const page=runInInjectionContext(Injector.create({providers:[{provide:GymStore,useValue:store}]}),()=>new Gym());
    return {page,store};
  }
  it('starts with seven free days and copies library defaults into a chosen day',()=>{
    const {page}=fixture();expect(page.week()).toHaveLength(7);expect(page.trainingDays()).toBe(0);
    page.editEntry(2,undefined,'squat');expect(page.entry).toMatchObject({day:2,exerciseId:'squat',sets:3,reps:'10',rest:90});
    page.entry.sets=5;expect(exercise.sets).toBe(3);
  });
  it('keeps the editor open when saving fails',async()=>{
    const {page,store}=fixture();page.editEntry(1);store.saveEntry.mockRejectedValueOnce(new Error('Offline'));
    await page.saveEntry();expect(page.entryEditor()).toBe('new');expect(page.error()).toBe('Offline');
    await page.saveEntry();expect(page.entryEditor()).toBeNull();expect(store.saveEntry).toHaveBeenCalledWith(expect.objectContaining({day:1,exerciseId:'squat'}),undefined);
  });
  it('takes an empty library to exercise creation instead of saving a broken workout',()=>{
    const {page,store}=fixture();store.exercises.set([]);page.editEntry(0);expect(page.tab()).toBe('library');expect(page.exerciseEditor()).toBe('new');expect(page.entryEditor()).toBeNull();
  });
});
