import { describe, expect, it } from 'vitest';
import { dateStrip, localIso } from './today.service';

describe('Today date helpers', () => {
  it('uses a local ISO date without UTC day shifts', () => expect(localIso(new Date(2026, 8, 1))).toBe('2026-09-01'));
  it('creates a Monday through Sunday date strip', () => {
    const days = dateStrip(new Date(2026, 8, 2));
    expect(days.map(day => day.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(days[0].iso).toBe('2026-08-31');
    expect(dateStrip(new Date(2026, 8, 6))[0].iso).toBe('2026-08-31');
  });
});
