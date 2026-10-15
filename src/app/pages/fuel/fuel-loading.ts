import { Component, input } from '@angular/core';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';
export type FuelLoadingKind='dashboard'|'insights'|'vehicles'|'history'|'vehicle-form'|'refuel-form';
@Component({
  selector:'app-fuel-loading',imports:[AppSkeleton],
  template:`<section class="fuel-loading" role="status" aria-busy="true" [attr.aria-label]="label()"><span class="loading-copy">{{ label() }}</span><div aria-hidden="true">
    @if (kind() === 'dashboard' || kind() === 'insights') {
      <div class="loading-toolbar"><app-skeleton variant="form" [count]="1" /></div>
      <div class="loading-metrics"><app-skeleton variant="cards" [count]="2" /><app-skeleton variant="cards" [count]="2" /></div>
      @if (kind() === 'insights') { <div class="loading-insights"><app-skeleton variant="list" [count]="1" /><app-skeleton variant="list" [count]="1" /></div> }
      <div class="loading-charts"><div><app-skeleton variant="chart" /></div><div><app-skeleton variant="chart" /></div></div>
      <app-skeleton variant="list" [count]="3" />
    } @else if (kind() === 'vehicles') { <app-skeleton variant="list" [count]="3" /> }
    @else if (kind() === 'history') { <app-skeleton variant="form" [count]="2" /><div class="loading-list"><app-skeleton variant="list" [count]="5" /></div> }
    @else { <div class="loading-form">@if (kind() === 'vehicle-form') { <app-skeleton variant="list" [count]="1" /> }<app-skeleton variant="form" [count]="kind() === 'vehicle-form' ? 7 : 8" /></div> }
  </div></section>`,
  styles:`:host{display:block;min-width:0}.fuel-loading{margin:24px 0}.loading-copy{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.loading-toolbar{max-width:540px;margin-bottom:20px}.loading-metrics,.loading-charts,.loading-insights{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:20px}.loading-charts>div{min-width:0;padding:22px;border:1px solid var(--border);border-radius:14px;background:var(--card);min-height:380px}.loading-list{margin-top:18px}.loading-form{display:grid;gap:16px;max-width:900px;margin:auto}@media(max-width:1000px){.loading-charts{grid-template-columns:minmax(0,1fr)}}@media(max-width:600px){.loading-metrics,.loading-insights{grid-template-columns:minmax(0,1fr);gap:10px}.loading-charts>div{padding:16px;min-height:340px}}`,
})
export class FuelLoading {
  readonly kind=input<FuelLoadingKind>('dashboard');
  readonly label=input('Loading fuel content');
}
