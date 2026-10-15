import { Location } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

export function parentPage(url:string):string {
  const path=url.split(/[?#]/)[0];
  if(path==='/books')return '/home';
  if(path.startsWith('/books/'))return /\/(add|scan)$|\/edit$/.test(path)?'/books/shelf':'/books';
  if(path.startsWith('/budget/'))return '/budget';
  if(path.startsWith('/fuel/refuels/'))return '/fuel/history';
  if(path.startsWith('/fuel/'))return '/fuel';
  if(path.startsWith('/planning/'))return '/planning';
  if(path.startsWith('/recipes/'))return '/recipes';
  if(path==='/settings'||path==='/family')return '/more';
  if(path.startsWith('/passwords/'))return '/passwords';
  if(path==='/today/customise')return '/today';
  return '/home';
}
export function pageName(url:string):string {
  const path=url.split(/[?#]/)[0];
  const names:Record<string,string>={'/home':'Home','/books':'Books','/books/shelf':'Bookshelf','/books/finished':'Finished books','/books/tags':'Tags','/gym':'Gym','/budget':'Budget','/budget/month':'Transactions','/budget/planned':'Planned payments','/budget/comparison':'Planned vs actual','/budget/debts':'Debt','/fuel':'Fuel','/fuel/history':'Refuel history','/fuel/vehicles':'Vehicles','/stats':'Stats','/today':'Today','/planning':'Planning','/more':'More','/wheel':'Wheel'};
  return names[path]??'previous page';
}
@Injectable({providedIn:'root'})
export class AppNavigation {
  private readonly router=inject(Router);
  private readonly location=inject(Location);
  readonly history=signal<string[]>([]);
  private trail:Array<{url:string;id:number}>=[];
  private position=-1;
  private restoredId:number|undefined;
  private pop=false;
  private replace=false;
  constructor(){
    const subscription=this.router.events.subscribe(event=>{
      if(event instanceof NavigationStart){this.pop=event.navigationTrigger==='popstate';this.restoredId=event.restoredState?.navigationId;this.replace=!!this.router.getCurrentNavigation()?.extras.replaceUrl;}
      if(event instanceof NavigationEnd){
        const url=event.urlAfterRedirects;
        if(this.pop){
          const index=this.restoredId!==undefined?this.trail.findIndex(entry=>entry.id===this.restoredId):this.trail.map(entry=>entry.url).lastIndexOf(url);
          if(index>=0){this.position=index;this.trail[index]={url,id:event.id};}
          else{this.trail=[{url,id:event.id}];this.position=0;}
        }else if(this.replace||this.trail[this.position]?.url===url){
          if(this.position<0)this.position=0;
          this.trail[this.position]={url,id:event.id};
        }else{
          this.trail=this.trail.slice(0,this.position+1);this.trail.push({url,id:event.id});this.position++;
        }
        this.history.set(this.trail.slice(0,this.position+1).map(entry=>entry.url));
      }
    });
    inject(DestroyRef).onDestroy(()=>subscription.unsubscribe());
  }
  destination(fallback?:string|null):string {return this.history().at(-2)??fallback??parentPage(this.router.url);}
  back(fallback?:string|null):void {
    if(this.history().length>1)this.location.back();
    else void this.router.navigateByUrl(this.destination(fallback),{replaceUrl:true});
  }
}
