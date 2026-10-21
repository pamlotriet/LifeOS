import { describe, expect, it } from 'vitest';
import { BookRecord, effectiveTotalPages, locationProgress, locationSessionPages, locationPagesRead, kindleSummary, validateLocationTracking } from './book.model';

const book = (values: Partial<BookRecord> = {}): BookRecord => ({ progressMode: 'locations', totalLocations: 4500, currentLocation: 900, locationsPerPage: 15, pageCount: 0, ...values } as BookRecord);

describe('Kindle location conversions', () => {
  it('estimates totals and equivalent pages from locations', () => {
    expect(effectiveTotalPages(book())).toBe(300);
    expect(effectiveTotalPages(book({totalLocations: 4501}))).toBe(301);
    expect(locationProgress(book())).toBe(0.2);
    expect(kindleSummary(book())).toContain('Location 900 of 4,500');
    expect(kindleSummary(book())).toContain('Page 60 of 300 (estimated)');
    expect(kindleSummary(book())).toContain('20% complete');
  });
  it('uses supplied pages while keeping conversion labeled as estimated', () => {
    expect(effectiveTotalPages(book({pageCount: 400}))).toBe(400);
    expect(kindleSummary(book({pageCount: 400}))).toContain('Page 80 of 400 (estimated)');
  });
  it('sums fractional sessions before rounding and recalculates original locations', () => {
    const entries = Array.from({length: 15}, (_, index) => ({id: String(index), date: '2026-10-21', fromLocation: index, toLocation: index + 1}));
    const original = book({locationEntries: entries});
    expect(locationSessionPages(original, entries[0])).toBeCloseTo(1 / 15);
    expect(locationPagesRead(original)).toBe(1);
    expect(locationPagesRead({...original, locationsPerPage: 5})).toBe(3);
    expect(locationPagesRead({...original, pageCount: 900})).toBe(3);
    expect(entries[0].toLocation).toBe(1);
  });
  it.each([{totalLocations: 0}, {totalLocations: -1}, {locationsPerPage: 0}, {locationsPerPage: Infinity}, {currentLocation: -1}, {currentLocation: 4501}, {pageCount: -2}])('rejects invalid settings %o', values => {
    expect(() => validateLocationTracking(book(values))).toThrow();
  });
  it('handles zero totals defensively and accepts the endpoints', () => {
    expect(locationProgress(book({totalLocations: 0}))).toBe(0);
    expect(locationSessionPages(book({totalLocations: 0}), {id: 'a', date: '', fromLocation: 0, toLocation: 2})).toBe(0);
    expect(() => validateLocationTracking(book({currentLocation: 0}))).not.toThrow();
    expect(() => validateLocationTracking(book({currentLocation: 4500}))).not.toThrow();
  });
});
