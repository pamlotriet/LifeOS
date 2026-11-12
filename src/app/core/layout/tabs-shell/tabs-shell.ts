import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  statsChartOutline,
  calendarOutline,
  discOutline,
  ellipsisHorizontal,
} from 'ionicons/icons';
import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-tabs-shell',
  imports: [TranslatePipe, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  templateUrl: './tabs-shell.html',
})
export class TabsShell {
  readonly tabs = [
    { path: 'home', label: 'Home', icon: 'home-outline', highlighted: false },
    { path: 'stats', label: 'Stats', icon: 'stats-chart-outline', highlighted: false },
    { path: 'planning', label: 'Planning', icon: 'calendar-outline', highlighted: true },
    { path: 'wheel', label: 'Wheel', icon: 'disc-outline', highlighted: false },
    { path: 'more', label: 'More', icon: 'ellipsis-horizontal', highlighted: false },
  ] as const;

  constructor() {
    addIcons({ homeOutline, statsChartOutline, calendarOutline, discOutline, ellipsisHorizontal });
  }
}
