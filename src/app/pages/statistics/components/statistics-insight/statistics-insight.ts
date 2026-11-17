import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

@Component({
  selector: 'section[appStatisticsInsight]',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistics-insight.html',
  styleUrl: './statistics-insight.css',
})
export class StatisticsInsight {
  readonly insight = input.required<string>();
}
