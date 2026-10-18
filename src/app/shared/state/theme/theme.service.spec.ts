import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {localStorage.clear();document.documentElement.classList.remove('dark');});

  it('migrates the previous light preference to the requested purple default once', () => {
    localStorage.setItem('lifeos.theme', 'light');
    const theme = new ThemeService();
    expect(theme.dark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lifeos.theme.version')).toBe('purple-v1');
  });

  it('preserves a later explicit light preference', () => {
    const theme = new ThemeService();
    theme.setDark(false);
    expect(new ThemeService().dark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
