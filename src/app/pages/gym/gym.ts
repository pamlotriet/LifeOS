import { BackButton } from '../../shared/components/back-button/back-button';
import { GymExercisePicker } from './gym-exercise-picker';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular';
import { GYM_DAYS, GymEntry, GymExercise, MUSCLE_GROUPS } from '../../shared/state/gym/gym.model';
import { GymStore } from '../../shared/state/gym/gym.store';
type WorkoutDraft = Omit<GymEntry,'id'|'sets'|'rest'> & { sets:number|null; rest:number|null };

@Component({ selector:'app-gym',imports:[BackButton,IonContent,IonModal,FormsModule,RouterLink,GymExercisePicker],templateUrl:'./gym.html',styleUrls:['./gym.css','./gym-workflow.css','./gym-popup.css'] })
export class Gym {
  readonly mobileSheet=signal(typeof window!=='undefined' && typeof window.matchMedia==='function' && window.matchMedia('(max-width:767px)').matches);
  constructor(){
    if(typeof window==='undefined'||typeof window.matchMedia!=='function')return;
    const media=window.matchMedia('(max-width:767px)');
    const update=()=>this.mobileSheet.set(media.matches);
    media.addEventListener('change',update);
    inject(DestroyRef).onDestroy(()=>media.removeEventListener('change',update));
  }
  readonly store=inject(GymStore);
  readonly days=GYM_DAYS;
  readonly muscles=MUSCLE_GROUPS;
  readonly tab=signal<'week'|'library'>('week');
  readonly today=(new Date().getDay()+6)%7;
  readonly selectedDay=signal(this.today);
  readonly allWeek=signal(false);
  readonly visibleDays=computed(()=>this.allWeek()?this.week():this.week().filter(day=>day.day===this.selectedDay()));
  readonly copySource=signal<number|null>(null);
  copyTarget=(this.today+1)%7;
  readonly search=signal('');
  readonly muscle=signal('All');
  readonly exerciseEditor=signal<string|null>(null);
  readonly entryEditor=signal<string|null>(null);
  readonly deleting=signal<string|null>(null);
  readonly error=signal('');
  readonly notice=signal('');
  readonly createForDay=signal<number|null>(null);
  readonly library=computed(()=>this.store.exercises().filter(e=>(this.muscle()==='All'||e.muscle===this.muscle())&&[e.name,e.muscle,e.equipment].some(value=>value.toLowerCase().includes(this.search().trim().toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name)));
  readonly week=computed(()=>this.days.map((name,day)=>({name,day,entries:this.store.entries().filter(e=>e.day===day).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(entry=>({...entry,exercise:this.store.exercises().find(e=>e.id===entry.exerciseId)}))})));
  readonly trainingDays=computed(()=>this.week().filter(day=>day.entries.length).length);
  exercise:Omit<GymExercise,'id'>=this.blankExercise();
  entry:WorkoutDraft=this.blankEntry(0);
  private blankExercise():Omit<GymExercise,'id'> { return {name:'',muscle:'Full body',equipment:'',notes:''}; }
  private blankEntry(day:number):WorkoutDraft { return {exerciseId:'',day,sets:null,reps:'',rest:null,weight:'',notes:'',order:Date.now()}; }
  private openEditor():void { this.error.set('');this.notice.set('');this.deleting.set(null); }
  editExercise(item?:GymExercise,day?:number):void { this.exercise=item?{name:item.name,muscle:item.muscle,equipment:item.equipment,notes:item.notes}:this.blankExercise();this.createForDay.set(day??null);this.exerciseEditor.set(item?.id??'new');this.entryEditor.set(null);this.tab.set('library');this.openEditor(); }
  closeEditors():void {if(this.store.saving())return;this.cancelExercise();this.entryEditor.set(null);this.error.set('');}
  cancelExercise():void { this.exerciseEditor.set(null);if(this.createForDay()!==null)this.tab.set('week');this.createForDay.set(null); }
  editEntry(day:number,item?:GymEntry,exerciseId?:string):void {
    if(!this.store.exercises().length){this.editExercise(undefined,day);this.notice.set(`Create an exercise first, then set up your ${this.days[day]} workout.`);return;}
    this.selectedDay.set(day);
    this.entry=item?{...item}:this.blankEntry(day);
    if(!item)this.chooseExercise(exerciseId??'');
    this.entryEditor.set(item?.id??'new');this.exerciseEditor.set(null);this.tab.set('week');this.openEditor();
  }
  chooseExercise(id:string):void { if(this.store.exercises().some(e=>e.id===id))this.entry={...this.entry,exerciseId:id}; }
  async saveExercise():Promise<void> {
    this.error.set('');
    try { const day=this.createForDay();const saved=await this.store.saveExercise(this.exercise,this.exerciseEditor()==='new'?undefined:this.exerciseEditor()!);this.exerciseEditor.set(null);this.createForDay.set(null);if(day!==null){this.editEntry(day,undefined,saved.id);this.notice.set(`Exercise created. Set your workout details for ${this.days[day]}.`);}else this.notice.set('Exercise saved. Choose a day to set its sets, reps and rest.'); }
    catch(error){this.fail(error);}
  }
  async saveEntry():Promise<void> {
    this.error.set('');
    try { if(this.entry.sets===null||this.entry.rest===null)throw new Error('Enter sets, reps or duration, and rest time for this workout.');if(!this.entry.exerciseId)throw new Error('Choose an exercise from your library.');await this.store.saveEntry({...this.entry,sets:this.entry.sets,rest:this.entry.rest},this.entryEditor()==='new'?undefined:this.entryEditor()!);this.selectedDay.set(this.entry.day);this.entryEditor.set(null);this.notice.set('Weekly plan saved. This routine repeats each week.'); }
    catch(error){this.fail(error);}
  }
  async removeEntry(id:string):Promise<void> {this.error.set('');try{await this.store.removeEntry(id);this.notice.set('Removed from this workout day. The exercise is still in your library.');}catch(error){this.fail(error);}}
  async removeExercise():Promise<void> { const id=this.deleting();if(!id)return;this.error.set('');try{await this.store.removeExercise(id);this.deleting.set(null);this.notice.set('Exercise deleted.');}catch(error){this.fail(error);} }
  showDay(day:number):void {this.selectedDay.set(day);this.allWeek.set(false);this.entryEditor.set(null);}
  openCopy(day:number):void {this.copySource.set(day);this.copyTarget=(day+1)%7;this.error.set('');}
  async copyDay():Promise<void> {
    const source=this.copySource();if(source===null)return;
    this.error.set('');
    try{await this.store.copyDay(source,this.copyTarget);this.copySource.set(null);this.showDay(this.copyTarget);this.notice.set(`Copied ${this.days[source]} to ${this.days[this.copyTarget]}. Existing exercises were kept.`);}catch(error){this.fail(error);}
  }
  async moveEntry(id:string,direction:-1|1):Promise<void> {this.error.set('');try{await this.store.moveEntry(id,direction);}catch(error){this.fail(error);}}
  private fail(error:unknown):void {this.error.set(error instanceof Error?error.message:'Could not save your gym changes.');}
}
