import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonItem, IonLabel, IonList, IonPopover } from '@ionic/angular';

export interface TabPopoverItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-tab-popover',
  standalone: true,
  imports: [IonItem, IonLabel, IonList, IonPopover],
  template: `
    <ion-popover [trigger]="triggerId" [dismissOnSelect]="true">
      <ng-template>
        <ion-list>
          @for (item of items; track item.label) {
            <ion-item button detail="false" (click)="select(item)">
              <ion-label>{{ item.label }}</ion-label>
            </ion-item>
          }
        </ion-list>
      </ng-template>
    </ion-popover>
  `,
})
export class TabPopover {
  private readonly router = inject(Router);

  @Input({ required: true }) triggerId = '';
  @Input() items: TabPopoverItem[] = [];
  @Output() itemSelected = new EventEmitter<TabPopoverItem>();

  select(item: TabPopoverItem) {
    this.itemSelected.emit(item);

    if (item.route) {
      void this.router.navigateByUrl(item.route);
    }
  }
}
