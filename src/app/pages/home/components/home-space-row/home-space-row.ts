import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

import { HomeStateService } from '@pages/home/state/dashboard/home-state.service';
import { AppSkeleton } from '@shared/components/app-skeleton/app-skeleton';
@Component({
  selector: 'a[appHomeSpaceRow]',
  imports: [TranslatePipe, AppSkeleton, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-space-row.html',
})
export class HomeSpaceRow {
  readonly space = input.required<ReturnType<HomeStateService['create']>['spaces'][number]>();
  readonly loading = input.required<boolean>();
  readonly summary = input.required<{ key: string; params?: Record<string, unknown> }>();
}
