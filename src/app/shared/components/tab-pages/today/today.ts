import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { TodayService, localIso } from '../../../state/today/today.service';

@Component({ selector: 'app-today', imports: [IonContent, IonIcon, RouterLink], templateUrl: './today.html', styleUrl: './today.css' })
export class Today {
  readonly today = inject(TodayService); readonly isToday = computed(() => this.today.selectedDate() === localIso());
  formatDate(): string { return this.today.day().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  time(value: string): string { return value || 'All day'; }
}
