import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { GymEntry, GymExercise } from './gym.model';
import { GymService } from './gym.service';

@Injectable({ providedIn:'root' })
export class GymStore {
  private readonly auth=inject(AuthService);
  private readonly service=inject(GymService);
  private version=0;
  readonly exercises=signal<GymExercise[]>([]);
  readonly entries=signal<GymEntry[]>([]);
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly error=signal('');
  constructor() {
    inject(RefreshCoordinator).register(()=>this.reload());
    effect(()=>{ const uid=this.auth.userId();untracked(()=>{ ++this.version;this.exercises.set([]);this.entries.set([]);this.error.set('');this.loading.set(false);if(uid)void this.reload(); }); });
  }
  async reload():Promise<void> {
    if(this.saving())return;
    const version=++this.version;this.loading.set(true);this.error.set('');
    try { const data=await this.service.load();if(version===this.version){this.exercises.set(data.exercises);this.entries.set(data.entries);} }
    catch(error){if(version===this.version)this.error.set(error instanceof Error?error.message:'Could not load your gym plan.');}
    finally{if(version===this.version)this.loading.set(false);}
  }
  private async mutate<T>(operation:()=>Promise<T>,apply:(value:T)=>void):Promise<T> {
    if(this.loading()||this.error())throw new Error('Load your gym data before making changes.');
    if(this.saving())throw new Error('Wait for the current change to finish saving.');
    const uid=this.auth.userId();this.saving.set(true);
    try { const value=await operation();if(uid!==this.auth.userId())throw new Error('Your account changed. Reopen Gym to continue.');++this.version;apply(value);return value; }
    finally{this.saving.set(false);}
  }
  async saveExercise(input:Omit<GymExercise,'id'>,id?:string):Promise<GymExercise> {
    if(this.exercises().some(e=>e.id!==id&&e.name.trim().toLowerCase()===input.name.trim().toLowerCase()))throw new Error('An exercise with this name already exists. Edit it or use a different name.');
    return this.mutate(()=>this.service.saveExercise(input,id),saved=>this.exercises.update(items=>[...items.filter(e=>e.id!==saved.id),saved]));
  }
  async saveEntry(input:Omit<GymEntry,'id'>,id?:string):Promise<void> {
    if(!this.exercises().some(e=>e.id===input.exerciseId))throw new Error('Choose an existing exercise.');
    await this.mutate(()=>this.service.saveEntry(input,id),saved=>this.entries.update(items=>[...items.filter(e=>e.id!==saved.id),saved]));
  }
  async removeEntry(id:string):Promise<void> {
    await this.mutate(()=>this.service.remove('gymPlan',id),()=>this.entries.update(items=>items.filter(e=>e.id!==id)));
  }
  async removeExercise(id:string):Promise<void> {
    if(this.entries().some(e=>e.exerciseId===id))throw new Error('Remove this exercise from your weekly plan before deleting it from the library.');
    await this.mutate(()=>this.service.remove('gymExercises',id),()=>this.exercises.update(items=>items.filter(e=>e.id!==id)));
  }
}
