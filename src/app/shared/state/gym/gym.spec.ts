import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { GymExercise, GymEntry, validateExercise, validateGymEntry } from './gym.model';
import { GymService } from './gym.service';
import { GymStore } from './gym.store';

const exercise:GymExercise={id:'bench',name:'Bench press',muscle:'Chest',equipment:'Barbell',notes:'Keep form consistent'};
const entry:GymEntry={id:'monday',exerciseId:'bench',day:0,sets:4,reps:'6',rest:120,weight:'20 kg',notes:'',order:1};
describe('Gym persistence and validation',()=>{
  it('rejects invalid workouts while allowing duration-based cardio and bodyweight entries',()=>{
    expect(()=>validateExercise(exercise)).not.toThrow();
    expect(()=>validateGymEntry({...entry,sets:0})).toThrow('sets');
    expect(()=>validateGymEntry({...entry,day:7})).toThrow('day');
    expect(()=>validateGymEntry({...entry,rest:-1})).toThrow('rest');
    expect(()=>validateExercise({...exercise,name:' '})).toThrow('name');
  });
  it('saves exercises and workout entries to the signed-in user without leaking IDs into fields',async()=>{
    const updateDocument=vi.fn();
    const service=runInInjectionContext(Injector.create({providers:[{provide:AuthService,useValue:{getSession:async()=>({uid:'me',token:'token'})}},{provide:FirestoreService,useValue:{updateDocument}}]}),()=>new GymService());
    await service.saveExercise({...exercise,name:'  Bench press  '},'bench');
    expect(updateDocument).toHaveBeenCalledWith('users/me/gymExercises/bench',expect.objectContaining({name:{stringValue:'Bench press'}}),'token');
    expect(updateDocument.mock.calls[0][1]).not.toHaveProperty('sets');
    expect(updateDocument.mock.calls[0][1]).not.toHaveProperty('reps');
    expect(updateDocument.mock.calls[0][1]).not.toHaveProperty('rest');
    expect(updateDocument.mock.calls[0][1]).not.toHaveProperty('id');
    await service.saveEntry(entry,'monday');
    expect(updateDocument).toHaveBeenLastCalledWith('users/me/gymPlan/monday',expect.objectContaining({day:{doubleValue:0},sets:{doubleValue:4},exerciseId:{stringValue:'bench'}}),'token');
  });
  function storeFixture() {
    const store=Object.create(GymStore.prototype) as GymStore;
    const service={saveExercise:vi.fn(async(value:GymExercise)=>({...value,id:value.id??'new'})),saveEntry:vi.fn(async(value:GymEntry)=>({...value,id:value.id??'new'})),remove:vi.fn()};
    const auth={userId:vi.fn(()=>'me')};
    Object.assign(store,{service,auth,version:0,exercises:signal([exercise]),entries:signal([entry]),loading:signal(false),saving:signal(false),error:signal('')});
    return {store,service,auth};
  }
  it('prevents deleting library exercises still used by the plan, but preserves the library when removing a workout',async()=>{
    const {store,service}=storeFixture();
    await expect(store.removeExercise('bench')).rejects.toThrow('weekly plan');
    expect(service.remove).not.toHaveBeenCalled();
    await store.removeEntry('monday');
    expect(store.entries()).toEqual([]);expect(store.exercises()).toEqual([exercise]);
    await store.removeExercise('bench');expect(store.exercises()).toEqual([]);
  });
  it('preserves the current plan on failed saves and releases the saving state',async()=>{
    const {store,service}=storeFixture();service.saveEntry.mockRejectedValueOnce(new Error('Offline'));
    await expect(store.saveEntry({...entry,sets:8})).rejects.toThrow('Offline');
    expect(store.entries()).toEqual([entry]);expect(store.saving()).toBe(false);
  });
  it('rejects missing exercise references and duplicate exercise names',async()=>{
    const {store}=storeFixture();
    await expect(store.saveEntry({...entry,exerciseId:'missing'})).rejects.toThrow('existing exercise');
    await expect(store.saveExercise({...exercise,name:'BENCH PRESS'})).rejects.toThrow('already exists');
  });
  it('does not apply a completed save to a different signed-in account',async()=>{
    const {store,service,auth}=storeFixture();service.saveEntry.mockImplementationOnce(async()=>{auth.userId.mockReturnValue('other');return {...entry,sets:8};});
    await expect(store.saveEntry({...entry,sets:8})).rejects.toThrow('account changed');
    expect(store.entries()).toEqual([entry]);
  });
});
