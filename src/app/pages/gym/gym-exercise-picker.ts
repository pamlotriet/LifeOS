import { Component, computed, ElementRef, HostListener, input, output, signal, ViewChild } from '@angular/core';
import { GymExercise } from '../../shared/state/gym/gym.model';

@Component({
  selector:'app-gym-exercise-picker',
  template:`
    <button type="button" class="picker-trigger" aria-haspopup="listbox" [attr.aria-expanded]="open()" [disabled]="disabled()" (click)="toggle()"><span>{{ chosen()?.name || 'Choose an exercise' }}<small>{{chosen()?.muscle}}{{chosen()?.equipment ? ' · ' + chosen()?.equipment : ''}}</small></span><span aria-hidden="true">⌄</span></button>
    @if(open()) {
      <div class="picker-menu">
        <input #searchField type="search" aria-label="Search exercise library" placeholder="Search name, muscle or equipment" [value]="query()" (input)="query.set($any($event.target).value); active.set(0)" (keydown)="navigate($event)" role="combobox" aria-autocomplete="list" aria-expanded="true" [attr.aria-controls]="listId" [attr.aria-activedescendant]="matches().length ? listId+'-'+active() : null" />
        <div class="picker-results" role="listbox" [id]="listId" aria-label="Exercise library">
          @for(item of matches();track item.id;let i=$index){<button type="button" role="option" [id]="listId+'-'+i" [attr.aria-selected]="selectedId()===item.id" [class.highlight]="active()===i" (click)="choose(item.id)"><strong>{{item.name}}</strong><small>{{item.muscle}}{{item.equipment ? ' · '+item.equipment : ''}}</small></button>}
          @empty {<p role="status">No matching exercises. Try another name, muscle or equipment.</p>}
        </div>
      </div>
    }
  `,
  styles:`:host{display:block;min-width:0}.picker-trigger{width:100%;min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;text-align:left;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--foreground);font:inherit;font-size:.85rem}.picker-trigger>span:first-child{min-width:0;overflow-wrap:anywhere}small{display:block;color:var(--text-secondary);font-size:.72rem;margin-top:3px}small:empty{display:none}.picker-menu{border:1px solid var(--primary);border-radius:10px;background:var(--card);padding:8px;margin-top:6px}.picker-menu input{width:100%;box-sizing:border-box;min-width:0;min-height:44px;padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--background);color:var(--foreground);font:inherit;font-size:16px}.picker-results{max-height:180px;overflow-y:auto;overscroll-behavior:contain;margin-top:6px}.picker-results button{display:block;width:100%;text-align:left;padding:10px;border:0;border-radius:6px;background:transparent;color:var(--foreground);cursor:pointer;font:inherit;font-size:.82rem}.picker-results button:hover,.picker-results button.highlight,.picker-results button[aria-selected=true]{background:var(--secondary)}.picker-results p{padding:12px;font-size:.8rem;line-height:1.5;color:var(--text-secondary)}button:focus-visible,input:focus-visible{outline:2px solid var(--primary);outline-offset:2px}`,
})
export class GymExercisePicker {
  readonly exercises=input.required<GymExercise[]>();
  readonly selectedId=input('');
  readonly disabled=input(false);
  readonly selected=output<string>();
  readonly open=signal(false);
  readonly query=signal('');
  readonly active=signal(0);
  readonly listId='gym-exercises-'+crypto.randomUUID();
  readonly chosen=computed(()=>this.exercises().find(e=>e.id===this.selectedId()));
  readonly matches=computed(()=>this.exercises().filter(e=>[e.name,e.muscle,e.equipment].join(' ').toLowerCase().includes(this.query().trim().toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)));
  @ViewChild('searchField') private searchField?:ElementRef<HTMLInputElement>;
  constructor(private readonly host:ElementRef<HTMLElement>){}
  toggle():void {this.open.set(!this.open());this.query.set('');this.active.set(0);if(this.open())setTimeout(()=>this.searchField?.nativeElement.focus());}
  choose(id:string):void {if(this.disabled())return;this.selected.emit(id);this.open.set(false);this.host.nativeElement.querySelector<HTMLButtonElement>('.picker-trigger')?.focus();}
  navigate(event:KeyboardEvent):void {
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();this.active.set(Math.max(0,Math.min(this.matches().length-1,this.active()+(event.key==='ArrowDown'?1:-1))));this.host.nativeElement.querySelector('#'+this.listId+'-'+this.active())?.scrollIntoView({block:'nearest'});}
    if(event.key==='Enter'){event.preventDefault();const item=this.matches()[this.active()];if(item)this.choose(item.id);}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.open.set(false);this.host.nativeElement.querySelector<HTMLButtonElement>('.picker-trigger')?.focus();}
  }
  @HostListener('document:click',['$event']) outside(event:MouseEvent):void {if(!this.host.nativeElement.contains(event.target as Node))this.open.set(false);}
}
