import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  imports: [IonContent, IonIcon, RouterLink],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date());

  readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  readonly items = [
    { title: 'Fuel', description: 'Track fuel costs', icon: 'car', iconBackground: 'bg-gradient-to-br from-rose-400 to-orange-500', iconColor: 'text-white', accent: 'rose', id: 0, route: '/fuel' },
    { title: 'Budget', description: 'Manage money', icon: 'wallet', iconBackground: 'bg-gradient-to-br from-emerald-300 to-emerald-500', iconColor: 'text-slate-900', accent: 'emerald', id: 1 },
    { title: 'Books', description: 'Read more', icon: 'book', iconBackground: 'bg-gradient-to-br from-violet-400 to-purple-600', iconColor: 'text-white', accent: 'violet', id: 2, route: '/books' },
    { title: 'Planning', description: 'Plan your days', icon: 'calendar', iconBackground: 'bg-gradient-to-br from-sky-300 to-blue-500', iconColor: 'text-slate-900', accent: 'sky', id: 3 },
    { title: 'Passwords', description: 'Stay secure', icon: 'lock-closed', iconBackground: 'bg-gradient-to-br from-fuchsia-400 to-pink-500', iconColor: 'text-slate-900', accent: 'pink', id: 4, route: '/passwords' },
    { title: 'Recipes', description: 'Cook your favourites', icon: 'restaurant-outline', iconBackground: 'bg-gradient-to-br from-amber-300 to-orange-500', iconColor: 'text-slate-900', accent: 'amber', id: 5, route: '/recipes' },
    { title: 'Vehicles', description: 'Manage your cars', icon: 'car-sport', iconBackground: 'bg-gradient-to-br from-cyan-300 to-cyan-500', iconColor: 'text-slate-900', accent: 'cyan', id: 6, route: '/fuel/vehicles' },
  ];

  readonly quickActions = [
    { label: 'Add expense', icon: 'cash', accent: 'emerald' },
    { label: 'Log refuel', icon: 'car', accent: 'amber', route: '/fuel' },
    { label: 'Add task', icon: 'checkmark', accent: 'sky' },
    { label: 'Scan book', icon: 'scan-outline', accent: 'violet', route: '/books/scan' },
  ];
}
