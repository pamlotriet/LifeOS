import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [IonContent, IonIcon, RouterLink],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  readonly today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  readonly items = [
    {
      title: 'Fuel',
      description: 'Track fuel costs',
      icon: 'car',
      iconBackground: 'bg-gradient-to-br from-rose-400 to-orange-500',
      iconColor: 'text-white',
      id: 0,
      route: '/fuel',
    },
    {
      title: 'Budget',
      description: 'Manage money',
      icon: 'wallet',
      iconBackground: 'bg-gradient-to-br from-emerald-300 to-emerald-500',
      iconColor: 'text-slate-900',
      id: 1,
    },
    {
      title: 'Books',
      description: 'Read more',
      icon: 'book',
      iconBackground: 'bg-gradient-to-br from-violet-400 to-purple-600',
      iconColor: 'text-white',
      id: 2,
    },
    {
      title: 'Planning',
      description: 'Plan your days',
      icon: 'calendar',
      iconBackground: 'bg-gradient-to-br from-sky-300 to-blue-500',
      iconColor: 'text-slate-900',
      id: 3,
    },
    {
      title: 'Passwords',
      description: 'Stay secure',
      icon: 'lock-closed',
      iconBackground: 'bg-gradient-to-br from-fuchsia-400 to-pink-500',
      iconColor: 'text-slate-900',
      id: 4,
    },
    {
      title: 'Health',
      description: 'Feel your best',
      icon: 'heart',
      iconBackground: 'bg-gradient-to-br from-rose-400 to-pink-500',
      iconColor: 'text-slate-900',
      id: 5,
    },
    {
      title: 'Vehicles',
      description: 'Manage your cars',
      icon: 'car-sport',
      iconBackground: 'bg-gradient-to-br from-cyan-300 to-cyan-500',
      iconColor: 'text-slate-900',
      id: 6,
      route: '/fuel/vehicles',
    },
  ];

  readonly quickActions = [
    { label: 'Add expense', icon: 'cash', iconBackground: 'bg-emerald-300', iconColor: 'text-slate-900' },
    { label: 'Log refuel', icon: 'car', iconBackground: 'bg-orange-400', iconColor: 'text-slate-900', route: '/fuel' },
    { label: 'Add task', icon: 'checkmark', iconBackground: 'bg-sky-400', iconColor: 'text-slate-900' },
    { label: 'Add note', icon: 'document-text', iconBackground: 'bg-violet-400', iconColor: 'text-slate-900' },
  ];
}
