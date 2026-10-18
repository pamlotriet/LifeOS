import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(this.initialDarkMode());

  constructor() { this.apply(this.dark()); }

  setDark(enabled: boolean): void {
    this.dark.set(enabled);
    try { if (typeof localStorage !== 'undefined') { localStorage.setItem('lifeos.theme', enabled ? 'dark' : 'light'); localStorage.setItem('lifeos.theme.version', 'purple-v1'); } } catch { /* Theme persistence is optional. */ }
    this.apply(enabled);
  }

  private initialDarkMode(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        // Apply the requested reference palette once, including existing installs.
        // Later explicit light/dark choices remain persistent.
        if (localStorage.getItem('lifeos.theme.version') !== 'purple-v1') {
          localStorage.setItem('lifeos.theme', 'dark');
          localStorage.setItem('lifeos.theme.version', 'purple-v1');
          return true;
        }
        const saved = localStorage.getItem('lifeos.theme');
        if (saved === 'dark' || saved === 'light') return saved === 'dark';
      }
    } catch { /* Use the purple default when storage is unavailable. */ }
    return true;
  }

  private apply(enabled: boolean): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', enabled);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', enabled ? '#0d0a18' : '#f5f2fb');
    }
  }
}
