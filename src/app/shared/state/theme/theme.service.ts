import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(this.initialDarkMode());

  constructor() { this.apply(this.dark()); }

  setDark(enabled: boolean): void {
    this.dark.set(enabled);
    try { if (typeof localStorage !== 'undefined') { localStorage.setItem('lifeos.theme', enabled ? 'dark' : 'light'); localStorage.setItem('lifeos.theme.version', 'purple-light-v2'); } } catch { /* Theme persistence is optional. */ }
    this.apply(enabled);
  }

  private initialDarkMode(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        // Apply the light palette once, including installs with the old forced-dark default.
        // Later explicit light/dark choices remain persistent.
        if (localStorage.getItem('lifeos.theme.version') !== 'purple-light-v2') {
          localStorage.setItem('lifeos.theme', 'light');
          localStorage.setItem('lifeos.theme.version', 'purple-light-v2');
          return false;
        }
        const saved = localStorage.getItem('lifeos.theme');
        if (saved === 'dark' || saved === 'light') return saved === 'dark';
      }
    } catch { /* Use the light default when storage is unavailable. */ }
    return false;
  }

  private apply(enabled: boolean): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', enabled);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', enabled ? '#111318' : '#f6f7f9');
    }
  }
}
