import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('migrates the old forced-dark default to the light palette once', () => {
    localStorage.setItem('lifeos.theme', 'dark');
    localStorage.setItem('lifeos.theme.version', 'purple-v1');
    const theme = new ThemeService();
    expect(theme.dark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('lifeos.theme.version')).toBe('purple-light-v2');
  });

  it('preserves a later explicit light preference', () => {
    const theme = new ThemeService();
    theme.setDark(false);
    expect(new ThemeService().dark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  it('preserves an explicit dark preference after migration', () => {
    const theme = new ThemeService();
    theme.setDark(true);
    expect(new ThemeService().dark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
