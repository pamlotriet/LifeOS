import { Component, inject } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { TodaySection, TodayService } from '../../shared/state/today/today.service';

@Component({ selector: 'app-today-customise', imports: [IonContent, IonIcon, PageHeader], templateUrl: './today-customise.html', styleUrl: './today-customise.css' })
export class TodayCustomise { readonly today = inject(TodayService); readonly sections: Array<{ id: TodaySection; label: string; icon: string }> = [{ id: 'events', label: "Today's events", icon: 'calendar' }, { id: 'reminders', label: 'Reminders', icon: 'notifications' }, { id: 'dinner', label: 'Dinner plan', icon: 'restaurant-outline' }, { id: 'groceries', label: 'Grocery list', icon: 'restaurant-outline' }, { id: 'budget', label: 'Budget summary', icon: 'wallet' }, { id: 'fuel', label: 'Fuel summary', icon: 'car' }, { id: 'reading', label: 'Reading', icon: 'book' }, { id: 'quickActions', label: 'Quick actions', icon: 'flash' }]; }
