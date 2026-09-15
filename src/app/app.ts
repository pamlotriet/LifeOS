import { Component } from '@angular/core';
import {
  IonRouterOutlet,
  IonApp,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonButton,
} from '@ionic/angular';

@Component({
  imports: [
    IonButton,
    IonApp,
    IonRouterOutlet,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  isLoggedIn = false;

  onClick() {
    // Handle login button click
  }
}
