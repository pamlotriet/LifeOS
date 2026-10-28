import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { BackButton } from '../../shared/components/back-button/back-button';
import { NutritionSettings } from './nutrition-settings';

@Component({
  selector: 'app-nutrition-profile',
  imports: [IonContent, RouterLink, BackButton, NutritionSettings],
  template: `<ion-content><main>
    <div class="topbar"><app-back-button fallback="/more" /></div>
    <header><span class="eyebrow">Personal wellbeing</span><h1>Your <span>nutrition</span></h1><p>Manage your profile and daily targets in one place.</p></header>
    <nav aria-label="Nutrition pages"><a routerLink="/nutrition">Open calorie diary</a><a routerLink="/planning">Plan meals</a></nav>
    <app-nutrition-settings />
  </main></ion-content>`,
  styles: `:host{display:block}ion-content{--background:var(--background);--color:var(--foreground)}main{max-width:840px;margin:auto;padding:32px 20px 48px}.topbar{border-bottom:1px solid var(--border);padding-bottom:24px;margin-bottom:36px}header{margin-bottom:28px}.eyebrow{font-size:.75rem;font-weight:650;text-transform:uppercase;letter-spacing:.09em;color:var(--primary)}h1{font-size:clamp(2.2rem,4.5vw,3.6rem);font-weight:450;line-height:1.15;letter-spacing:-.035em;margin:12px 0 14px}h1 span{color:var(--primary)}p{color:var(--text-secondary);line-height:1.6;margin:0}nav{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}nav a{display:flex;align-items:center;min-height:44px;padding:8px 16px;border:1px solid var(--border);border-radius:10px;color:var(--primary);text-decoration:none}nav a:focus-visible{outline:2px solid var(--ring);outline-offset:3px}@media(max-width:600px){main{padding:20px 16px 40px}.topbar{margin-bottom:28px}}`,
})
export class NutritionProfile {}
