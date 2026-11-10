import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GymExercisePicker } from './gym-exercise-picker';

describe('Gym exercise picker',()=>{
  async function fixture(){
    await TestBed.configureTestingModule({imports:[GymExercisePicker]}).compileComponents();
    const view=TestBed.createComponent(GymExercisePicker);
    view.componentRef.setInput('exercises',[
      {id:'squat',name:'Squat',muscle:'Legs',equipment:'Barbell',notes:''},
      {id:'row',name:'Cable row',muscle:'Back',equipment:'Cable',notes:''},
    ]);
    view.detectChanges();return view;
  }
  it('searches names, muscles and equipment and reports no matches',async()=>{
    const view=await fixture(),p=view.componentInstance;
    for(const query of ['squat','legs','barbell']){p.query.set(query);expect(p.matches().map(e=>e.id)).toEqual(['squat']);}
    p.open.set(true);p.query.set('unknown');view.detectChanges();expect(view.nativeElement.textContent).toContain('No matching exercises');
  });
  it('selects a filtered exercise with the keyboard without submitting the workout',async()=>{
    const view=await fixture(),p=view.componentInstance;let selected='';p.selected.subscribe(id=>selected=id);
    p.open.set(true);p.query.set('back');view.detectChanges();
    const enter=new KeyboardEvent('keydown',{key:'Enter',cancelable:true});p.navigate(enter);
    expect(selected).toBe('row');expect(enter.defaultPrevented).toBe(true);expect(p.open()).toBe(false);
  });
  it('does not select or reset workout data when searching',async()=>{
    const view=await fixture(),p=view.componentInstance;view.componentRef.setInput('selectedId','row');
    p.query.set('legs');expect(p.chosen()?.id).toBe('row');
  });
});
