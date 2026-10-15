import { BackButton } from '../../shared/components/back-button/back-button';
﻿import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { filter, map } from 'rxjs';
@Component({selector:'app-fuel',imports:[BackButton,IonContent,RouterLink,RouterOutlet],template:`<ion-content><main class="fuel-workspace"><header class="fuel-heading"><app-back-button /><h1>Fuel</h1><p>A clearer view of what it costs to keep moving.</p></header><nav class="fuel-navigation" aria-label="Fuel sections">@for (option of sections; track option.route) { <a [routerLink]="option.route" [class.active]="selected() === option.route" [attr.aria-current]="selected() === option.route ? 'page' : null">{{ option.label }}</a> }</nav><router-outlet /></main></ion-content>`,styleUrl:'./fuel.css'})
export class Fuel {
  private readonly router=inject(Router);
  readonly sections=[{route:'/fuel',label:'Overview'},{route:'/fuel/vehicles',label:'Vehicles'},{route:'/fuel/insights',label:'Trends & insights'},{route:'/fuel/history',label:'Fill-up history'}];
  readonly selected=toSignal(this.router.events.pipe(filter(e=>e instanceof NavigationEnd),map(()=>this.router.url.split('?')[0])),{initialValue:this.router.url.split('?')[0]});
}
