import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonIcon } from '@ionic/angular';

@Component({
  imports: [IonCard, IonIcon, RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  items = [
    {
      title: 'Fuel',
      description: 'Log & track fuel costs',
      icon: 'build',
      color: '#28b8ff',
      id: 0,
      route: '/fuel',
    },
    {
      title: 'Budget',
      description: 'Take control of your money',
      icon: 'wallet',
      color: '#42e6c0',
      id: 1,
    },
    {
      title: 'Books',
      description: 'Read more. Live fuller.',
      icon: 'book',
      color: '#a58cff',
      id: 2,
    },
    {
      title: 'Planning',
      description: 'Turn goals into action',
      icon: 'calendar',
      color: '#42caff',
      id: 3,
    },
    {
      title: 'Passwords',
      description: 'Keep your digital life safe',
      icon: 'lock-closed',
      color: '#9c83ff',
      id: 4,
    },
    {
      title: 'Health',
      description: 'A healthier, happier you',
      icon: 'heart',
      color: '#f278d9',
      id: 5,
    },
    {
      title: 'Vehicles',
      description: 'Manage your vehicle information',
      icon: 'car',
      color: '#28b8ff',
      id: 6,
      route: '/fuel/vehicles',
    },
  ];
}
