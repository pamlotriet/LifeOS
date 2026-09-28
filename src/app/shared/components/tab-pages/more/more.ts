import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [IonContent, IonIcon, RouterLink],
  selector: 'app-more',
  styleUrl: './more.css',
  templateUrl: './more.html',
})
export class More {}
