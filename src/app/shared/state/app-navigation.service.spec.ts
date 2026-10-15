import '@angular/compiler';
import { Location } from '@angular/common';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppNavigation, parentPage } from './app-navigation.service';

describe('In-app back navigation',()=>{
  function fixture(){
    const events=new Subject<any>();const back=vi.fn();
    const router={events,url:'/books/add',navigateByUrl:vi.fn(),getCurrentNavigation:vi.fn(()=>({extras:{replaceUrl:false}}))};
    const service=runInInjectionContext(Injector.create({providers:[{provide:Router,useValue:router},{provide:Location,useValue:{back}},{provide:DestroyRef,useValue:{onDestroy:vi.fn()}}]}),()=>new AppNavigation());
    const visit=(id:number,url:string,trigger:'imperative'|'popstate'='imperative')=>{events.next(new NavigationStart(id,url,trigger));router.url=url;events.next(new NavigationEnd(id,url,url));};
    return {service,router,visit,back};
  }
  it('uses an internal parent when a bookmark opens a page directly',()=>{
    const {service,visit,router,back}=fixture();visit(1,'/books/add');service.back();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/books/shelf',{replaceUrl:true});expect(back).not.toHaveBeenCalled();
  });
  it('returns to the actual previous page rather than a fixed parent',()=>{
    const {service,visit,back,router}=fixture();visit(1,'/home');visit(2,'/books/shelf?format=Kindle');visit(3,'/books/example/edit');
    expect(service.destination('/books')).toBe('/books/shelf?format=Kindle');service.back('/books');expect(back).toHaveBeenCalledOnce();expect(router.navigateByUrl).not.toHaveBeenCalled();
    visit(4,'/books/shelf?format=Kindle','popstate');expect(service.history()).toEqual(['/home','/books/shelf?format=Kindle']);
  });
  it('does not put replaced form pages back in the history stack',()=>{
    const {service,visit,router}=fixture();visit(1,'/books/shelf');visit(2,'/books/add');router.getCurrentNavigation.mockReturnValue({extras:{replaceUrl:true}});visit(3,'/books');
    expect(service.history()).toEqual(['/books/shelf','/books']);
  });
  it('uses an explicit fallback only when no previous in-app page exists',()=>{
    const {service,visit,router}=fixture();visit(1,'/budget/month');service.back('/budget');expect(router.navigateByUrl).toHaveBeenCalledWith('/budget',{replaceUrl:true});
  });
  it('retains the previous page after using browser back then forward',()=>{
    const {service,visit}=fixture();visit(1,'/home');visit(2,'/books');visit(3,'/books/shelf');
    visit(4,'/books','popstate');expect(service.destination()).toBe('/home');
    visit(5,'/books/shelf','popstate');expect(service.destination()).toBe('/books');
  });
  it.each([['/gym','/home'],['/budget/planned','/budget'],['/planning/events/add','/planning'],['/fuel/refuels/car/one/edit','/fuel/history'],['/books/one/edit','/books/shelf'],['/recipes/add','/recipes']])('finds a safe parent for %s',(url,parent)=>{expect(parentPage(url)).toBe(parent);});
});
