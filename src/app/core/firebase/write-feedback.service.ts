import { Injectable, signal } from '@angular/core';

@Injectable({providedIn:'root'})
export class WriteFeedback {
  readonly message = signal('');
  private pending = new Set<'save'|'delete'>();
  private batchTimer?: ReturnType<typeof setTimeout>;
  private dismissTimer?: ReturnType<typeof setTimeout>;
  success(action:'save'|'delete'):void {
    this.pending.add(action);
    clearTimeout(this.batchTimer);
    this.batchTimer=setTimeout(()=>{
      const message=this.pending.size>1?'Changes saved successfully.':this.pending.has('delete')?'Deleted successfully.':'Saved successfully.';
      this.pending.clear();
      this.message.set(message);
      clearTimeout(this.dismissTimer);
      this.dismissTimer=setTimeout(()=>this.dismiss(),4000);
    },400);
  }
  dismiss():void {clearTimeout(this.dismissTimer);this.message.set('');}
}
