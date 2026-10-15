import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { GYM_DAYS, GymEntry, GymExercise, MUSCLE_GROUPS } from '../../shared/state/gym/gym.model';
import { GymStore } from '../../shared/state/gym/gym.store';

@Component({ selector:'app-gym',imports:[IonContent,FormsModule,RouterLink],templateUrl:'./gym.html',styleUrl:'./gym.css' })
export class Gym {
  @ViewChild(IonContent) private content?:IonContent;
  readonly store=inject(GymStore);
  readonly days=GYM_DAYS;
  readonly muscles=MUSCLE_GROUPS;
  readonly tab=signal<'week'|'library'>('week');
  readonly search=signal('');
  readonly muscle=signal('All');
  readonly exerciseEditor=signal<string|null>(null);
  readonly entryEditor=signal<string|null>(null);
  readonly deleting=signal<string|null>(null);
  readonly error=signal('');
  readonly notice=signal('');
  readonly library=computed(()=>this.store.exercises().filter(e=>(this.muscle()==='All'||e.muscle===this.muscle())&&[e.name,e.muscle,e.equipment].some(value=>value.toLowerCase().includes(this.search().trim().toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name)));
  readonly week=computed(()=>this.days.map((name,day)=>({name,day,entries:this.store.entries().filter(e=>e.day===day).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(entry=>({...entry,exercise:this.store.exercises().find(e=>e.id===entry.exerciseId)}))})));
  readonly trainingDays=computed(()=>this.week().filter(day=>day.entries.length).length);
  exercise:Omit<GymExercise,'id'>=this.blankExercise();
  entry:Omit<GymEntry,'id'>=this.blankEntry(0);
  private blankExercise():Omit<GymExercise,'id'> { return {name:'',muscle:'Full body',equipment:'',sets:3,reps:'8-12',rest:60,notes:''}; }
  private blankEntry(day:number):Omit<GymEntry,'id'> { return {exerciseId:'',day,sets:3,reps:'8-12',rest:60,weight:'',notes:'',order:Date.now()}; }
  private openEditor():void { this.error.set('');this.notice.set('');this.deleting.set(null);void this.content?.scrollToTop(200); }
  editExercise(item?:GymExercise):void { this.exercise=item?{...item}:this.blankExercise();this.exerciseEditor.set(item?.id??'new');this.entryEditor.set(null);this.tab.set('library');this.openEditor(); }
  editEntry(day:number,item?:GymEntry,exerciseId?:string):void {
    if(!this.store.exercises().length){this.editExercise();this.notice.set('Add an exercise to your library first, then use it in your weekly plan.');return;}
    this.entry=item?{...item}:this.blankEntry(day);
    if(!item)this.chooseExercise(exerciseId??this.store.exercises()[0].id);
    this.entryEditor.set(item?.id??'new');this.exerciseEditor.set(null);this.tab.set('week');this.openEditor();
  }
  chooseExercise(id:string):void { const exercise=this.store.exercises().find(e=>e.id===id);if(exercise)this.entry={...this.entry,exerciseId:id,sets:exercise.sets,reps:exercise.reps,rest:exercise.rest}; }
  async saveExercise():Promise<void> {
    this.error.set('');
    try { await this.store.saveExercise(this.exercise,this.exerciseEditor()==='new'?undefined:this.exerciseEditor()!);this.exerciseEditor.set(null);this.notice.set('Exercise saved to your library. Select Use in plan to add it to a workout day.'); }
    catch(error){this.fail(error);}
  }
  async saveEntry():Promise<void> {
    this.error.set('');
    try { await this.store.saveEntry(this.entry,this.entryEditor()==='new'?undefined:this.entryEditor()!);this.entryEditor.set(null);this.notice.set('Weekly plan saved. This routine repeats each week.'); }
    catch(error){this.fail(error);}
  }
  async removeEntry(id:string):Promise<void> {this.error.set('');try{await this.store.removeEntry(id);this.notice.set('Removed from this workout day. The exercise is still in your library.');}catch(error){this.fail(error);}}
  async removeExercise():Promise<void> { const id=this.deleting();if(!id)return;this.error.set('');try{await this.store.removeExercise(id);this.deleting.set(null);this.notice.set('Exercise deleted.');}catch(error){this.fail(error);} }
  private fail(error:unknown):void {this.error.set(error instanceof Error?error.message:'Could not save your gym changes.');}
}
