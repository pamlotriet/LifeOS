import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Gym } from './gym';
import { GymStore } from '../../shared/state/gym/gym.store';
import { GymExercise, GymEntry } from '../../shared/state/gym/gym.model';

describe('Weekly gym planner',()=>{
  const exercise:GymExercise={id:'squat',name:'Squat',muscle:'Legs',equipment:'Barbell',notes:''};
  function fixture() {
    const store={saving:signal(false),exercises:signal([exercise]),entries:signal<GymEntry[]>([]),saveEntry:vi.fn().mockResolvedValue(undefined),saveExercise:vi.fn().mockResolvedValue(undefined)};
    const page=runInInjectionContext(Injector.create({providers:[{provide:GymStore,useValue:store}]}),()=>new Gym());
    return {page,store};
  }
  it('starts each new workout with blank sets, reps and rest',()=>{
    const {page}=fixture();expect(page.week()).toHaveLength(7);expect(page.trainingDays()).toBe(0);
    page.editEntry(2,undefined,'squat');expect(page.entry).toMatchObject({day:2,exerciseId:'squat',sets:null,reps:'',rest:null});
  });
  it('keeps the editor open when saving fails',async()=>{
    const {page,store}=fixture();page.editEntry(1,undefined,'squat');page.entry={...page.entry,sets:3,reps:'10',rest:60};store.saveEntry.mockRejectedValueOnce(new Error('Offline'));
    await page.saveEntry();expect(page.entryEditor()).toBe('new');expect(page.error()).toBe('Offline');
    await page.saveEntry();expect(page.entryEditor()).toBeNull();expect(store.saveEntry).toHaveBeenCalledWith(expect.objectContaining({day:1,exerciseId:'squat'}),undefined);
  });
  it('takes an empty library to exercise creation instead of saving a broken workout',()=>{
    const {page,store}=fixture();store.exercises.set([]);page.editEntry(0);expect(page.tab()).toBe('library');expect(page.exerciseEditor()).toBe('new');expect(page.entryEditor()).toBeNull();
  });
  it('creates an exercise from a day card and returns to that day with blank workout settings',async()=>{
    const {page,store}=fixture();page.editExercise(undefined,3);
    page.exercise={name:'Row',muscle:'Back',equipment:'Cable',notes:''};
    store.saveExercise.mockImplementationOnce(async()=>{const saved={...page.exercise,id:'row'};store.exercises.update(items=>[...items,saved]);return saved;});
    await page.saveExercise();expect(page.tab()).toBe('week');expect(page.entry).toMatchObject({day:3,exerciseId:'row',sets:null,reps:'',rest:null});expect(page.exerciseEditor()).toBeNull();
  });
  it('keeps existing workout values on edit and rejects incomplete new workouts',async()=>{
    const {page,store}=fixture();const existing:GymEntry={id:'entry',exerciseId:'squat',day:0,sets:5,reps:'5',rest:120,weight:'50 kg',notes:'',order:1};
    page.editEntry(0,existing);expect(page.entry).toEqual(existing);
    page.editEntry(2);await page.saveEntry();expect(store.saveEntry).not.toHaveBeenCalled();expect(page.error()).toContain('Enter sets');
  });
});
