import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(this.initialDarkMode());

  constructor() { this.apply(this.dark()); }

  setDark(enabled: boolean): void {
    this.dark.set(enabled);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('lifeos.theme', enabled ? 'dark' : 'light'); } catch { /* Theme persistence is optional. */ }
    this.apply(enabled);
  }

  private initialDarkMode(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('lifeos.theme');
        if (saved === 'dark' || saved === 'light') return saved === 'dark';
      }
    } catch { /* Fall through to the device preference. */ }
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private apply(enabled: boolean): void {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', enabled);
  }
}
