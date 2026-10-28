import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { Component, computed, inject, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { AppNavigation, pageName } from '../../state/app-navigation.service';

@Component({selector:'app-back-button',imports:[IonIcon],template:`<button type="button" class="app-back-control" [attr.aria-label]="label()" [title]="label()" (click)="navigation.back(fallback())"><ion-icon name="arrow-back-outline" aria-hidden="true" /></button>`,styles:`:host{display:inline-flex;flex-shrink:0}.app-back-control{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:44px;min-width:44px;padding:9px;width:44px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--foreground);font:inherit;font-size:.8rem;font-weight:550;cursor:pointer;white-space:nowrap;transition:background .15s}.app-back-control ion-icon{font-size:22px}.app-back-control:hover{background:var(--muted)}.app-back-control:focus-visible{outline:3px solid var(--ring);outline-offset:3px}.app-back-control:active{background:var(--secondary)}@media(prefers-reduced-motion:reduce){.app-back-control{transition:none}}`})
export class BackButton {
  constructor() { addIcons({ arrowBackOutline }); }
  readonly navigation=inject(AppNavigation);
  readonly fallback=input<string|null>(null);
  readonly label=computed(()=>'Back to '+pageName(this.navigation.destination(this.fallback())));
}
